import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { auth } from 'express-oauth2-jwt-bearer';
import { lambdaService } from './lambdaService'
// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Auth0 JWT validation middleware (we'll enable this later)
// const jwtCheck = auth({
//   audience: process.env.AUTH0_AUDIENCE,
//   issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
// });

// Health check endpoint (no auth required)
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// RACE ENDPOINTS
// ============================================

// Get upcoming races for the next 2 weeks (MotoGP + F1)
app.get('/api/races/upcoming', async (req: Request, res: Response) => {
    try {
        // TODO: Call MotoGP and F1 Lambda functions
        // For now, return mock data
        const mockRaces = {
            motogp: [
                {
                    name: 'Mock MotoGP Race',
                    date: '2024-12-01',
                    location: 'Mock Circuit',
                    country: 'Spain'
                }
            ],
            f1: [
                {
                    name: 'Mock F1 Grand Prix',
                    date: '2024-12-05',
                    location: 'Mock Street Circuit',
                    country: 'Monaco'
                }
            ]
        };

        res.json(mockRaces);
    } catch (error) {
        console.error('Error fetching races:', error);
        res.status(500).json({ error: 'Failed to fetch race data' });
    }
});

// ============================================
// WEATHER ENDPOINT
// ============================================

// Get weather for user's location
app.get('/api/weather', async (req: Request, res: Response) => {
    try {
        // Get location from query params or use default
        const { lat, lon, city } = req.query;

        const weatherData = await lambdaService.getWeather({ lat: lat as string, lon: lon as string, city: city as string });

        res.json(weatherData);
    } catch (error) {
        console.error('Error fetching weather:', error);
        res.status(500).json({ error: 'Failed to fetch weather data' });
    }
});

// ============================================
// USER PREFERENCES ENDPOINTS
// ============================================

// Get user preferences
app.get('/api/preferences', async (req: Request, res: Response) => {
    try {
        // TODO: Get user ID from Auth0 token
        // TODO: Fetch from MongoDB
        const mockPreferences = {
            favoriteTeams: ['Ferrari', 'Ducati'],
            notifications: true,
            theme: 'dark'
        };

        res.json(mockPreferences);
    } catch (error) {
        console.error('Error fetching preferences:', error);
        res.status(500).json({ error: 'Failed to fetch preferences' });
    }
});

// Update user preferences
app.put('/api/preferences', async (req: Request, res: Response) => {
    try {
        const preferences = req.body;

        // TODO: Get user ID from Auth0 token
        // TODO: Update in MongoDB

        res.json({ message: 'Preferences updated successfully', preferences });
    } catch (error) {
        console.error('Error updating preferences:', error);
        res.status(500).json({ error: 'Failed to update preferences' });
    }
});

// ============================================
// FILE UPLOAD ENDPOINTS
// ============================================

// Get user's uploaded files metadata
app.get('/api/files', async (req: Request, res: Response) => {
    try {
        // TODO: Get user ID from Auth0 token
        // TODO: Fetch file metadata from MongoDB
        const mockFiles = [
            {
                id: '1',
                filename: 'example.pdf',
                uploadDate: '2024-11-20',
                size: 1024000,
                url: 'https://mock-s3-url.com/file.pdf'
            }
        ];

        res.json(mockFiles);
    } catch (error) {
        console.error('Error fetching files:', error);
        res.status(500).json({ error: 'Failed to fetch files' });
    }
});

// Upload file to S3
app.post('/api/files/upload', async (req: Request, res: Response) => {
    try {
        // TODO: Get user ID from Auth0 token
        // TODO: Call File Handler Lambda to upload to S3
        // TODO: Save metadata to MongoDB

        res.json({
            message: 'File uploaded successfully',
            fileId: 'mock-file-id',
            url: 'https://mock-s3-url.com/uploaded-file.pdf'
        });
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});

// Delete file from S3
app.delete('/api/files/:fileId', async (req: Request, res: Response) => {
    try {
        const { fileId } = req.params;

        // TODO: Get user ID from Auth0 token
        // TODO: Verify file belongs to user
        // TODO: Call File Handler Lambda to delete from S3
        // TODO: Remove metadata from MongoDB

        res.json({ message: 'File deleted successfully' });
    } catch (error) {
        console.error('Error deleting file:', error);
        res.status(500).json({ error: 'Failed to delete file' });
    }
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Health check available at http://localhost:${PORT}/health`);
});

export default app;