import { Router, Request, Response } from 'express';
import WorldConfig from '../models/WorldConfig';
import { jwtCheck } from '../middleware/auth';

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

export default router;
