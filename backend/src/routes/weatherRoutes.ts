import { Router, Request, Response } from 'express';
import { lambdaService } from '../lambdaService';

const router = Router();

// Get weather for user's location
router.get('/', async (req: Request, res: Response) => {
    try {
        const { lat, lon, city, units } = req.query;

        const weatherData = await lambdaService.getWeather({
            lat: lat as string,
            lon: lon as string,
            city: city as string,
            units: (units as 'metric' | 'imperial') || 'imperial'
        });

        res.json(weatherData);
    } catch (error) {
        console.error('Error fetching weather:', error);
        res.status(500).json({ error: 'Failed to fetch weather data' });
    }
});

export default router;
