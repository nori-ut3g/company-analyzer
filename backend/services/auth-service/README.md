# Auth Service

Authentication and authorization service for the EDINET Analysis System.

## Description

This service handles user authentication, authorization, session management, and access control for the entire EDINET Analysis System. It provides JWT-based authentication, role-based access control (RBAC), and integration with external identity providers.

## API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `POST /auth/refresh` - Refresh access token
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password

### User Management
- `GET /users/profile` - Get current user profile
- `PUT /users/profile` - Update user profile
- `POST /users/change-password` - Change password
- `DELETE /users/account` - Delete account

### OAuth2/SSO
- `GET /auth/google` - Google OAuth login
- `GET /auth/google/callback` - Google OAuth callback
- `GET /auth/microsoft` - Microsoft OAuth login
- `GET /auth/microsoft/callback` - Microsoft OAuth callback

### Admin Endpoints
- `GET /admin/users` - List all users
- `GET /admin/users/:id` - Get user details
- `PUT /admin/users/:id` - Update user
- `DELETE /admin/users/:id` - Delete user
- `POST /admin/users/:id/roles` - Assign roles

### Authorization
- `POST /auth/verify` - Verify token
- `GET /auth/permissions` - Get user permissions
- `POST /auth/check-permission` - Check specific permission

## Environment Variables

```env
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/auth_db

# JWT Configuration
JWT_SECRET=your-secret-key
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
JWT_ISSUER=edinet-analysis-system

# Session
SESSION_SECRET=your-session-secret
SESSION_TIMEOUT=1800000

# Redis (for session store)
REDIS_URL=redis://localhost:6379

# OAuth Providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret

# Email Service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-password
EMAIL_FROM=noreply@edinet-analysis.com

# Security
BCRYPT_ROUNDS=10
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=900000
PASSWORD_MIN_LENGTH=8
REQUIRE_2FA=false

# CORS
ALLOWED_ORIGINS=http://localhost:3000,https://app.example.com
```

## Setup Instructions

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up PostgreSQL database:
   ```bash
   npm run db:migrate
   ```

3. Configure environment variables

4. Start the service:
   ```bash
   npm start
   ```

## Development Notes

- Node.js with TypeScript
- Passport.js for authentication strategies
- JWT for stateless authentication
- Redis for session management
- Bcrypt for password hashing
- Express-rate-limit for brute force protection
- Nodemailer for email notifications

## User Roles

### Default Roles
- `admin` - Full system access
- `analyst` - Can perform analyses and generate reports
- `viewer` - Read-only access to reports
- `guest` - Limited trial access

### Permissions
```json
{
  "admin": ["*"],
  "analyst": [
    "analysis:create",
    "analysis:read",
    "report:create",
    "report:read",
    "company:read"
  ],
  "viewer": [
    "analysis:read",
    "report:read",
    "company:read"
  ],
  "guest": [
    "company:read",
    "report:read:limited"
  ]
}
```

## Security Features

### Password Policy
- Minimum 8 characters
- Must contain uppercase, lowercase, number
- Password history (no reuse of last 5)
- Expiry after 90 days (configurable)

### Account Security
- Account lockout after failed attempts
- Email verification required
- Two-factor authentication (optional)
- Session timeout
- IP whitelisting (optional)

### Token Management
- Short-lived access tokens (15 min)
- Long-lived refresh tokens (7 days)
- Token revocation support
- Refresh token rotation

## Database Schema

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  name VARCHAR(255),
  role VARCHAR(50),
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  token VARCHAR(255),
  expires_at TIMESTAMP,
  created_at TIMESTAMP
);

-- Audit log
CREATE TABLE auth_audit_log (
  id UUID PRIMARY KEY,
  user_id UUID,
  action VARCHAR(100),
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP
);
```

## API Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "analyst"
    },
    "tokens": {
      "accessToken": "jwt...",
      "refreshToken": "jwt...",
      "expiresIn": 900
    }
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "AUTH_FAILED",
    "message": "Invalid credentials",
    "details": {}
  }
}
```