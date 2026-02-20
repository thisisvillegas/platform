import express, { Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import Guest from '../models/Guest';
import { guestJwtCheck } from '../middleware/guestAuth';

const router = express.Router();

// POST /api/guest/auto - Auto-provision anonymous guest (public, no auth)
router.post('/auto', async (req: Request, res: Response) => {
  try {
    const guestSecret = process.env.GUEST_JWT_SECRET;
    if (!guestSecret) {
      throw new Error('GUEST_JWT_SECRET not configured');
    }

    // Generate a unique anonymous pass code
    const anonId = `anon-${crypto.randomBytes(6).toString('hex')}`;

    const token = jwt.sign(
      {
        role: 'guest',
        passCode: anonId,
        passLabel: 'Anonymous Visitor'
      },
      guestSecret,
      { expiresIn: '24h' }
    );

    res.json({ token });
  } catch (error) {
    console.error('Error creating auto guest:', error);
    res.status(500).json({ error: 'Failed to create guest session' });
  }
});

// Helper: Generate unique guest username
async function generateGuestUsername(passCode: string): Promise<string> {
  const suffix = crypto.randomBytes(3).toString('hex'); // 6 chars
  let username: string;
  let exists = true;

  while (exists) {
    username = `guest-${passCode.substring(0, 4)}-${suffix}`;
    const found = await Guest.findOne({ username });
    exists = !!found;
    if (exists) {
      // Regenerate suffix if collision
      const newSuffix = crypto.randomBytes(3).toString('hex');
      username = `guest-${passCode.substring(0, 4)}-${newSuffix}`;
    }
  }

  return username!;
}

// POST /api/guest/create - Create guest account (requires guest JWT)
router.post('/create', guestJwtCheck, async (req: Request, res: Response) => {
  try {
    const { appContext } = req.body;
    const guestPayload = req.guest!; // Attached by guestJwtCheck

    // Check if guest already exists for this pass
    const existing = await Guest.findOne({
      passCode: guestPayload.passCode,
      appContext: appContext || null
    });

    if (existing) {
      // Return existing guest account
      return res.json({
        username: existing.username,
        sessionToken: existing.sessionToken,
        expiresAt: existing.expiresAt,
        message: 'Using existing guest account'
      });
    }

    // Generate new guest account
    const username = await generateGuestUsername(guestPayload.passCode);
    const sessionToken = crypto.randomBytes(32).toString('hex');

    // Extract expiry from JWT exp claim (Unix timestamp in seconds)
    const expiresAt = guestPayload.exp
      ? new Date(guestPayload.exp * 1000)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // fallback: 7 days

    const guest = new Guest({
      passCode: guestPayload.passCode,
      username,
      sessionToken,
      expiresAt,
      appContext: appContext || null
    });

    await guest.save();

    res.status(201).json({
      username: guest.username,
      sessionToken: guest.sessionToken,
      expiresAt: guest.expiresAt,
      message: 'Guest account created'
    });

  } catch (error) {
    console.error('Error creating guest account:', error);
    res.status(500).json({ error: 'Failed to create guest account' });
  }
});

// GET /api/guest/me - Get current guest info (requires guest JWT)
router.get('/me', guestJwtCheck, async (req: Request, res: Response) => {
  try {
    const guestPayload = req.guest!;

    const guest = await Guest.findOne({ passCode: guestPayload.passCode });

    if (!guest) {
      return res.status(404).json({
        error: 'Guest account not found',
        message: 'Create an account first via /api/guest/create'
      });
    }

    res.json({
      username: guest.username,
      passCode: guest.passCode,
      expiresAt: guest.expiresAt,
      appContext: guest.appContext,
      createdAt: guest.createdAt
    });

  } catch (error) {
    console.error('Error fetching guest info:', error);
    res.status(500).json({ error: 'Failed to fetch guest info' });
  }
});

export default router;
