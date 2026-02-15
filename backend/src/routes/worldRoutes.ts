import { Router, Request, Response } from 'express';
import WorldConfig from '../models/WorldConfig';
import { jwtCheck } from '../middleware/auth';
import { VisitorProgress } from '../models/VisitorProgress';
import { guestJwtCheck } from '../middleware/guestAuth';

const router = Router();

const VALID_THEMES = ['default', 'night', 'valentine', 'christmas', 'autumn', 'halloween'];

// GET /api/world/theme - Public endpoint, returns active theme
router.get('/theme', async (req: Request, res: Response) => {
  try {
    // Get or create world config (single document)
    let config = await WorldConfig.findOne();

    if (!config) {
      config = await WorldConfig.create({
        activeTheme: 'default',
        themeMode: 'auto',
        updatedAt: new Date()
      });
    }

    // If auto mode, determine theme based on server time
    if (config.themeMode === 'auto') {
      const hour = new Date().getHours();
      const autoTheme = (hour >= 6 && hour < 18) ? 'default' : 'night';

      return res.json({
        theme: autoTheme,
        mode: 'auto'
      });
    }

    // Manual mode: return stored theme
    res.json({
      theme: config.activeTheme,
      mode: 'manual'
    });
  } catch (error) {
    console.error('Error fetching world theme:', error);
    res.status(500).json({ error: 'Failed to fetch world theme' });
  }
});

// PUT /api/world/theme - Auth0 protected endpoint, sets active theme
router.put('/theme', jwtCheck, async (req: Request, res: Response) => {
  try {
    const { theme, mode } = req.body;

    // Validate theme
    if (theme && !VALID_THEMES.includes(theme)) {
      return res.status(400).json({
        error: 'Invalid theme',
        validThemes: VALID_THEMES
      });
    }

    // Validate mode
    if (mode && !['auto', 'manual'].includes(mode)) {
      return res.status(400).json({
        error: 'Invalid mode',
        validModes: ['auto', 'manual']
      });
    }

    // Get or create config
    let config = await WorldConfig.findOne();

    if (!config) {
      config = await WorldConfig.create({
        activeTheme: theme || 'default',
        themeMode: mode || 'manual',
        updatedAt: new Date()
      });
    } else {
      // Update existing config
      if (theme) config.activeTheme = theme;
      if (mode) config.themeMode = mode;
      config.updatedAt = new Date();
      await config.save();
    }

    res.json({
      activeTheme: config.activeTheme,
      themeMode: config.themeMode,
      updatedAt: config.updatedAt
    });
  } catch (error) {
    console.error('Error updating world theme:', error);
    res.status(500).json({ error: 'Failed to update world theme' });
  }
});

// POST /api/world/progress - Save visitor progress (guest JWT protected)
router.post('/progress', guestJwtCheck, async (req: Request, res: Response) => {
  try {
    const passCode = req.guest?.passCode;
    if (!passCode) {
      return res.status(401).json({ error: 'Guest authentication required' });
    }

    const {
      collectibles,
      achievements,
      buildingsVisited,
      npcsInteracted,
      dialogueCount,
      timeSpent,
      lastPosition
    } = req.body;

    // Upsert visitor progress
    const progress = await VisitorProgress.findOneAndUpdate(
      { passCode },
      {
        collectibles: collectibles || [],
        achievements: achievements || [],
        buildingsVisited: buildingsVisited || [],
        npcsInteracted: npcsInteracted || [],
        dialogueCount: dialogueCount || 0,
        timeSpent: timeSpent || 0,
        lastPosition: lastPosition || { x: 0, y: 0 },
        lastVisit: new Date()
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    res.json({
      success: true,
      progress: {
        collectibles: progress.collectibles,
        achievements: progress.achievements,
        buildingsVisited: progress.buildingsVisited,
        npcsInteracted: progress.npcsInteracted,
        dialogueCount: progress.dialogueCount,
        timeSpent: progress.timeSpent,
        lastPosition: progress.lastPosition,
        lastVisit: progress.lastVisit
      }
    });
  } catch (error) {
    console.error('Error saving visitor progress:', error);
    res.status(500).json({ error: 'Failed to save progress' });
  }
});

// GET /api/world/progress - Load visitor progress (guest JWT protected)
router.get('/progress', guestJwtCheck, async (req: Request, res: Response) => {
  try {
    const passCode = req.guest?.passCode;
    if (!passCode) {
      return res.status(401).json({ error: 'Guest authentication required' });
    }

    const progress = await VisitorProgress.findOne({ passCode });

    if (!progress) {
      // No saved progress, return empty state
      return res.json({
        success: true,
        progress: {
          collectibles: [],
          achievements: [],
          buildingsVisited: [],
          npcsInteracted: [],
          dialogueCount: 0,
          timeSpent: 0,
          lastPosition: { x: 0, y: 0 },
          firstVisit: null,
          lastVisit: null
        }
      });
    }

    res.json({
      success: true,
      progress: {
        collectibles: progress.collectibles,
        achievements: progress.achievements,
        buildingsVisited: progress.buildingsVisited,
        npcsInteracted: progress.npcsInteracted,
        dialogueCount: progress.dialogueCount,
        timeSpent: progress.timeSpent,
        lastPosition: progress.lastPosition,
        firstVisit: progress.firstVisit,
        lastVisit: progress.lastVisit
      }
    });
  } catch (error) {
    console.error('Error loading visitor progress:', error);
    res.status(500).json({ error: 'Failed to load progress' });
  }
});

export default router;
