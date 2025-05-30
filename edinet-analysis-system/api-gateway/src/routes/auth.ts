import { Router, Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { config } from '../config';
import { ApiError } from '../utils/ApiError';

const router = Router();

// Proxy auth requests to auth service
const authServiceProxy = async (req: Request, res: Response, next: NextFunction, endpoint: string) => {
  try {
    const response = await axios({
      method: req.method,
      url: `${config.services.authService}/auth/${endpoint}`,
      data: req.body,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    res.status(response.status).json(response.data);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      next(new ApiError(503, 'Auth service unavailable'));
    }
  }
};

// Login
router.post('/login', (req: Request, res: Response, next: NextFunction) => {
  authServiceProxy(req, res, next, 'login');
});

// Register
router.post('/register', (req: Request, res: Response, next: NextFunction) => {
  authServiceProxy(req, res, next, 'register');
});

// Refresh token
router.post('/refresh', (req: Request, res: Response, next: NextFunction) => {
  authServiceProxy(req, res, next, 'refresh');
});

// Logout
router.post('/logout', (req: Request, res: Response, next: NextFunction) => {
  authServiceProxy(req, res, next, 'logout');
});

// Verify email
router.post('/verify-email', (req: Request, res: Response, next: NextFunction) => {
  authServiceProxy(req, res, next, 'verify-email');
});

// Forgot password
router.post('/forgot-password', (req: Request, res: Response, next: NextFunction) => {
  authServiceProxy(req, res, next, 'forgot-password');
});

// Reset password
router.post('/reset-password', (req: Request, res: Response, next: NextFunction) => {
  authServiceProxy(req, res, next, 'reset-password');
});

export default router;