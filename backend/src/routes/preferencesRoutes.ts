import { Router, Request, Response } from 'express';
import { databaseService } from '../database';

const router = Router();

// GET /api/preferences - Get user preferences
router.get('/', async (req: Request, res: Response) => {
    try {
        const userId = req.auth?.payload.sub;

        if (!userId) {
            return res.status(401).json({ error: 'User ID not found in token' });
        }

        const preferences = await databaseService.getUserPreferences(userId);

        if (!preferences) {
            return res.json({
                favoriteTeams: [],
                notifications: true,
                theme: 'dark',
                measurementUnits: 'imperial'
            });
        }

        res.json(preferences);
    } catch (error) {
        console.error('Error fetching preferences:', error);
        res.status(500).json({ error: 'Failed to fetch preferences' });
    }
});

// PUT /api/preferences - Update user preferences
router.put('/', async (req: Request, res: Response) => {
    try {
        const userId = req.auth?.payload.sub;

        if (!userId) {
            return res.status(401).json({ error: 'User ID not found in token' });
        }

        const { favoriteTeams, notifications, theme, measurementUnits } = req.body;

        const preferences = await databaseService.updateUserPreferences(userId, {
            favoriteTeams,
            notifications,
            theme,
            measurementUnits,
        });

        res.json({ message: 'Preferences updated successfully', preferences });
    } catch (error) {
        console.error('Error updating preferences:', error);
        res.status(500).json({ error: 'Failed to update preferences' });
    }
});

export default router;
