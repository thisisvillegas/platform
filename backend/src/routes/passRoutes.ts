import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import Pass from '../models/Pass';
import { jwtCheck } from '../middleware/auth';

const router = express.Router();

// Helper: Generate unique 8-char alphanumeric code
async function generateUniqueCode(): Promise<string> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code: string;
  let exists = true;

  while (exists) {
    code = Array.from({ length: 8 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('');

    const found = await Pass.findOne({ code });
    exists = !!found;
  }

  return code!;
}

// POST /api/passes - Create new pass (Auth0 protected)
router.post('/', jwtCheck, async (req: Request, res: Response) => {
  try {
    const { label, expiresInDays } = req.body;

    if (!label || expiresInDays === undefined || expiresInDays === null) {
      return res.status(400).json({
        error: 'Missing required fields: label, expiresInDays'
      });
    }

    const days = Number(expiresInDays);
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      return res.status(400).json({
        error: 'expiresInDays must be an integer between 1 and 365'
      });
    }

    const code = await generateUniqueCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const pass = new Pass({
      code,
      label,
      expiresAt
    });

    await pass.save();

    res.status(201).json({
      code: pass.code,
      label: pass.label,
      expiresAt: pass.expiresAt,
      usedCount: pass.usedCount,
      createdAt: pass.createdAt
    });

  } catch (error) {
    console.error('Error creating pass:', error);
    res.status(500).json({ error: 'Failed to create pass' });
  }
});

// GET /api/passes - List all passes (Auth0 protected)
router.get('/', jwtCheck, async (req: Request, res: Response) => {
  try {
    const passes = await Pass.find({ revokedAt: null })
      .sort({ createdAt: -1 });

    const now = new Date();
    const passesWithStatus = passes.map(pass => ({
      id: pass._id,
      code: pass.code,
      label: pass.label,
      expiresAt: pass.expiresAt,
      usedCount: pass.usedCount,
      createdAt: pass.createdAt,
      status: pass.expiresAt < now ? 'expired' : 'active'
    }));

    res.json(passesWithStatus);

  } catch (error) {
    console.error('Error fetching passes:', error);
    res.status(500).json({ error: 'Failed to fetch passes' });
  }
});

// DELETE /api/passes/:id - Revoke pass (Auth0 protected)
router.delete('/:id', jwtCheck, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const pass = await Pass.findById(id);
    if (!pass) {
      return res.status(404).json({ error: 'Pass not found' });
    }

    if (pass.revokedAt) {
      return res.status(400).json({ error: 'Pass already revoked' });
    }

    pass.revokedAt = new Date();
    await pass.save();

    res.json({
      message: 'Pass revoked successfully',
      code: pass.code
    });

  } catch (error) {
    console.error('Error revoking pass:', error);
    res.status(500).json({ error: 'Failed to revoke pass' });
  }
});

// POST /api/passes/validate - Public endpoint (NO auth required)
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Missing required field: code' });
    }

    // Find pass by code
    const pass = await Pass.findOne({ code: code.toUpperCase() });

    if (!pass) {
      return res.status(404).json({
        error: 'Invalid access code',
        message: 'Code not found'
      });
    }

    // Check if revoked
    if (pass.revokedAt) {
      return res.status(403).json({
        error: 'Access code revoked',
        message: 'This code has been revoked'
      });
    }

    // Check if expired
    const now = new Date();
    if (pass.expiresAt < now) {
      return res.status(403).json({
        error: 'Access code expired',
        message: 'This code expired on ' + pass.expiresAt.toLocaleDateString()
      });
    }

    // Increment usage count
    pass.usedCount += 1;
    await pass.save();

    // Generate guest JWT
    const guestSecret = process.env.GUEST_JWT_SECRET;
    if (!guestSecret) {
      throw new Error('GUEST_JWT_SECRET not configured');
    }

    const token = jwt.sign(
      {
        role: 'guest',
        passCode: pass.code,
        passLabel: pass.label
      },
      guestSecret,
      {
        expiresIn: Math.floor((pass.expiresAt.getTime() - now.getTime()) / 1000)
      }
    );

    res.json({
      token,
      pass: {
        code: pass.code,
        label: pass.label,
        expiresAt: pass.expiresAt
      }
    });

  } catch (error) {
    console.error('Error validating pass:', error);
    res.status(500).json({ error: 'Failed to validate pass' });
  }
});

export default router;
