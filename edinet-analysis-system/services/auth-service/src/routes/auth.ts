import { Router, Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { authService } from '../services/authService';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .message('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  name: Joi.string().min(2).max(100).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const verifyEmailSchema = Joi.object({
  token: Joi.string().required(),
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().min(8).max(128).required()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .message('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).max(128).required()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .message('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
});

// Routes
router.post(
  '/register',
  validate(registerSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.register(req.body);
    res.status(201).json({
      message: 'Registration successful. Please check your email to verify your account.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  })
);

router.post(
  '/verify-email',
  validate(verifyEmailSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await authService.verifyEmail(req.body.token);
    res.json({
      message: 'Email verified successfully. You can now log in.',
    });
  })
);

router.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = req.ip || req.connection.remoteAddress || '';

    const { user, tokens, sessionId } = await authService.login({
      ...req.body,
      userAgent,
      ipAddress,
    });

    // Set session cookie
    res.cookie('sessionId', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      tokens,
    });
  })
);

router.post(
  '/logout',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const sessionId = req.cookies.sessionId;
    if (sessionId) {
      await authService.logout(sessionId);
    }

    res.clearCookie('sessionId');
    res.json({
      message: 'Logout successful',
    });
  })
);

router.post(
  '/refresh-token',
  validate(refreshTokenSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const tokens = await authService.refreshTokens(req.body.refreshToken);
    res.json({
      message: 'Tokens refreshed successfully',
      tokens,
    });
  })
);

router.post(
  '/forgot-password',
  validate(forgotPasswordSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await authService.requestPasswordReset(req.body.email);
    res.json({
      message: 'If the email exists, a password reset link has been sent.',
    });
  })
);

router.post(
  '/reset-password',
  validate(resetPasswordSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await authService.resetPassword(req.body.token, req.body.password);
    res.json({
      message: 'Password reset successful. You can now log in with your new password.',
    });
  })
);

router.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await authService.changePassword(
      req.user.userId,
      req.body.currentPassword,
      req.body.newPassword
    );
    res.json({
      message: 'Password changed successfully',
    });
  })
);

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    res.json({
      user: req.user,
    });
  })
);

router.get(
  '/sessions',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const sessions = await authService.getUserSessions(req.user.userId);
    res.json({
      sessions: sessions.map((session) => ({
        sessionId: session.sessionId,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
      })),
    });
  })
);

router.delete(
  '/sessions/:sessionId',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    await authService.revokeSession(req.user.userId, req.params.sessionId);
    res.json({
      message: 'Session revoked successfully',
    });
  })
);

router.delete(
  '/sessions',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    await authService.revokeAllSessions(req.user.userId);
    res.clearCookie('sessionId');
    res.json({
      message: 'All sessions revoked successfully',
    });
  })
);

export default router;