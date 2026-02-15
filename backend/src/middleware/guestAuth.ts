import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface GuestPayload {
  role: 'guest';
  passCode: string;
  passLabel: string;
  iat?: number;
  exp?: number;
}

// Extend Express Request to include guest context
declare global {
  namespace Express {
    interface Request {
      guest?: GuestPayload;
    }
  }
}

export const guestJwtCheck = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No guest token provided'
      });
    }

    const token = authHeader.split(' ')[1];
    const guestSecret = process.env.GUEST_JWT_SECRET;

    if (!guestSecret) {
      console.error('GUEST_JWT_SECRET not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const decoded = jwt.verify(token, guestSecret) as GuestPayload;

    if (decoded.role !== 'guest') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Invalid token role'
      });
    }

    // Attach guest context to request
    req.guest = decoded;
    next();

  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Your access has expired. Please request a new code.'
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Guest token verification failed'
      });
    }

    console.error('Guest auth error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
};
