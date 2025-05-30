import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User } from '../models/User';
import { Session } from '../models/Session';
import { tokenService } from './tokenService';
import { emailService } from './emailService';
import { redisClient } from '../config/redis';
import {
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
  ConflictError,
} from '../utils/ApiError';
import { logger } from '../utils/logger';

interface RegisterData {
  email: string;
  password: string;
  name: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

class AuthService {
  private readonly SALT_ROUNDS = 10;
  private readonly VERIFICATION_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
  private readonly RESET_TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour
  private readonly SESSION_EXPIRY = 30 * 24 * 60 * 60; // 30 days in seconds

  async register(data: RegisterData): Promise<User> {
    const { email, password, name } = data;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);

    // Create verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiry = new Date(Date.now() + this.VERIFICATION_TOKEN_EXPIRY);

    // Create user
    const user = await User.create({
      email,
      password: hashedPassword,
      name,
      verificationToken,
      verificationTokenExpiry,
      isEmailVerified: false,
      isActive: true,
    });

    // Send verification email
    await emailService.sendVerificationEmail(user.email, user.name, verificationToken);

    // Remove sensitive data
    user.password = undefined;
    user.verificationToken = undefined;

    logger.info(`User registered: ${user.email}`);

    return user;
  }

  async verifyEmail(token: string): Promise<void> {
    const user = await User.findOne({
      where: {
        verificationToken: token,
      },
    });

    if (!user) {
      throw new BadRequestError('Invalid or expired verification token');
    }

    if (user.verificationTokenExpiry < new Date()) {
      throw new BadRequestError('Verification token has expired');
    }

    // Update user
    await user.update({
      isEmailVerified: true,
      verificationToken: null,
      verificationTokenExpiry: null,
    });

    logger.info(`Email verified for user: ${user.email}`);
  }

  async login(data: LoginData): Promise<{ user: User; tokens: TokenPair; sessionId: string }> {
    const { email, password } = data;

    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      throw new UnauthorizedError('Please verify your email before logging in');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedError('Your account has been deactivated');
    }

    // Update last login
    await user.update({ lastLoginAt: new Date() });

    // Generate tokens
    const tokens = await tokenService.generateTokenPair(user);

    // Create session
    const sessionId = crypto.randomBytes(32).toString('hex');
    const session = await Session.create({
      sessionId,
      userId: user.id,
      refreshToken: tokens.refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      userAgent: '', // Should be passed from request
      ipAddress: '', // Should be passed from request
    });

    // Store session in Redis
    await redisClient.setex(
      `session:${sessionId}`,
      this.SESSION_EXPIRY,
      JSON.stringify({
        userId: user.id,
        email: user.email,
        role: user.role,
      })
    );

    // Remove sensitive data
    user.password = undefined;

    logger.info(`User logged in: ${user.email}`);

    return { user, tokens, sessionId };
  }

  async logout(sessionId: string): Promise<void> {
    // Remove session from database
    await Session.destroy({ where: { sessionId } });

    // Remove session from Redis
    await redisClient.del(`session:${sessionId}`);

    logger.info(`Session logged out: ${sessionId}`);
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    // Verify refresh token
    const payload = await tokenService.verifyRefreshToken(refreshToken);

    // Find session
    const session = await Session.findOne({
      where: { refreshToken },
      include: [User],
    });

    if (!session) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    if (session.expiresAt < new Date()) {
      throw new UnauthorizedError('Refresh token has expired');
    }

    // Generate new token pair
    const tokens = await tokenService.generateTokenPair(session.user);

    // Update session with new refresh token
    await session.update({
      refreshToken: tokens.refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    logger.info(`Tokens refreshed for user: ${session.user.email}`);

    return tokens;
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      // Don't reveal if user exists
      logger.warn(`Password reset requested for non-existent email: ${email}`);
      return;
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + this.RESET_TOKEN_EXPIRY);

    // Update user
    await user.update({
      passwordResetToken: resetToken,
      passwordResetExpiry: resetTokenExpiry,
    });

    // Send reset email
    await emailService.sendPasswordResetEmail(user.email, user.name, resetToken);

    logger.info(`Password reset requested for user: ${user.email}`);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await User.findOne({
      where: {
        passwordResetToken: token,
      },
    });

    if (!user) {
      throw new BadRequestError('Invalid or expired reset token');
    }

    if (user.passwordResetExpiry < new Date()) {
      throw new BadRequestError('Reset token has expired');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

    // Update user
    await user.update({
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpiry: null,
    });

    // Invalidate all sessions
    await Session.destroy({ where: { userId: user.id } });

    // Send confirmation email
    await emailService.sendPasswordResetConfirmation(user.email, user.name);

    logger.info(`Password reset for user: ${user.email}`);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

    // Update user
    await user.update({ password: hashedPassword });

    logger.info(`Password changed for user: ${user.email}`);
  }

  async getSession(sessionId: string): Promise<any> {
    // Check Redis first
    const cachedSession = await redisClient.get(`session:${sessionId}`);
    if (cachedSession) {
      return JSON.parse(cachedSession);
    }

    // Check database
    const session = await Session.findOne({
      where: { sessionId },
      include: [User],
    });

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedError('Invalid or expired session');
    }

    // Cache in Redis
    const sessionData = {
      userId: session.user.id,
      email: session.user.email,
      role: session.user.role,
    };

    await redisClient.setex(
      `session:${sessionId}`,
      this.SESSION_EXPIRY,
      JSON.stringify(sessionData)
    );

    return sessionData;
  }

  async getUserSessions(userId: string): Promise<Session[]> {
    return Session.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
    });
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const session = await Session.findOne({
      where: { userId, sessionId },
    });

    if (!session) {
      throw new NotFoundError('Session not found');
    }

    await session.destroy();
    await redisClient.del(`session:${sessionId}`);

    logger.info(`Session revoked: ${sessionId}`);
  }

  async revokeAllSessions(userId: string): Promise<void> {
    const sessions = await Session.findAll({ where: { userId } });

    // Remove from Redis
    await Promise.all(
      sessions.map((session) => redisClient.del(`session:${session.sessionId}`))
    );

    // Remove from database
    await Session.destroy({ where: { userId } });

    logger.info(`All sessions revoked for user: ${userId}`);
  }
}

export const authService = new AuthService();