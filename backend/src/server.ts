import dotenv from "dotenv";

// Load environment variables
dotenv.config();

import "./instrument";
import * as Sentry from "@sentry/node";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import mongoose from "mongoose";
import { lambdaService } from "./lambdaService";
import { databaseService } from "./database";
import { jwtCheck } from "./middleware/auth";
import brainDumpRoutes from "./routes/brainDumpRoutes";
import serverRoutes from "./routes/serverRoutes";
import passRoutes from "./routes/passRoutes";
import guestRoutes from "./routes/guestRoutes";
import worldRoutes from "./routes/worldRoutes";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB (native driver for legacy collections)
databaseService.connect().catch(console.error);

// Connect Mongoose (for Pass and Guest models)
const mongoUri = process.env.MONGODB_URI;
if (mongoUri) {
    mongoose.connect(mongoUri, { dbName: 'racing-dashboard' })
        .then(() => console.log('✅ Mongoose connected'))
        .catch(err => console.error('❌ Mongoose connection error:', err));
}

// Health check endpoint (no auth required)
app.get("/health", (req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString(), version: "v1.0.42" });
});

// Server stats (no auth required - internal only)
app.use("/api/server", serverRoutes);

// World theme (GET is public, PUT is Auth0 protected)
app.use("/api/world", worldRoutes);

// Pass validation is public, CRUD operations are Auth0 protected
app.use("/api/passes", passRoutes);

// Guest account routes (guest JWT required)
app.use("/api/guest", guestRoutes);

// Apply Auth0 JWT check to all other /api routes
app.use("/api", jwtCheck);

// Brain Dump routes
app.use("/api/brain-dump", brainDumpRoutes);

app.get("/api/test-error", (req: Request, res: Response) => {
    throw new Error("This is a test error for Sentry!");
});

// ============================================++
// RACE ENDPOINTS
// ============================================

// Get upcoming races for the next 2 weeks (MotoGP + F1)
app.get("/api/races/upcoming", async (req: Request, res: Response) => {
    try {
        const mockRaces = {
            motogp: [
                {
                    name: "Mock MotoGP Race",
                    date: "2024-12-01",
                    location: "Mock Circuit",
                    country: "Spain"
                }
            ],
            f1: [
                {
                    name: "Mock F1 Grand Prix",
                    date: "2024-12-05",
                    location: "Mock Street Circuit",
                    country: "Monaco"
                }
            ]
        };

        res.json(mockRaces);
    } catch (error) {
        console.error("Error fetching races:", error);
        res.status(500).json({ error: "Failed to fetch race data" });
    }
});

// ============================================
// WEATHER ENDPOINT
// ============================================

// Get weather for user's location
app.get("/api/weather", async (req: Request, res: Response) => {
    try {
        const { lat, lon, city, units } = req.query;

        const weatherData = await lambdaService.getWeather({
            lat: lat as string,
            lon: lon as string,
            city: city as string,
            units: (units as "metric" | "imperial") || "imperial"
        });

        res.json(weatherData);
    } catch (error) {
        console.error("Error fetching weather:", error);
        res.status(500).json({ error: "Failed to fetch weather data" });
    }
});

// ============================================
// USER PREFERENCES ENDPOINTS
// ============================================

app.get("/api/preferences", async (req: Request, res: Response) => {
    try {
        const userId = req.auth?.payload.sub;

        if (!userId) {
            return res.status(401).json({ error: "User ID not found in token" });
        }

        const preferences = await databaseService.getUserPreferences(userId);

        if (!preferences) {
            return res.json({
                favoriteTeams: [],
                notifications: true,
                theme: "dark",
                measurementUnits: "imperial"
            });
        }

        res.json(preferences);
    } catch (error) {
        console.error("Error fetching preferences:", error);
        res.status(500).json({ error: "Failed to fetch preferences" });
    }
});

app.put("/api/preferences", async (req: Request, res: Response) => {
    try {
        const userId = req.auth?.payload.sub;

        if (!userId) {
            return res.status(401).json({ error: "User ID not found in token" });
        }

        const { favoriteTeams, notifications, theme, measurementUnits } = req.body;

        const preferences = await databaseService.updateUserPreferences(userId, {
            favoriteTeams,
            notifications,
            theme,
            measurementUnits,
        });

        res.json({ message: "Preferences updated successfully", preferences });
    } catch (error) {
        console.error("Error updating preferences:", error);
        res.status(500).json({ error: "Failed to update preferences" });
    }
});

// ============================================
// FILE UPLOAD ENDPOINTS
// ============================================

app.get("/api/files", async (req: Request, res: Response) => {
    try {
        const mockFiles = [
            {
                id: "1",
                filename: "example.pdf",
                uploadDate: "2024-11-20",
                size: 1024000,
                url: "https://mock-s3-url.com/file.pdf"
            }
        ];

        res.json(mockFiles);
    } catch (error) {
        console.error("Error fetching files:", error);
        res.status(500).json({ error: "Failed to fetch files" });
    }
});

app.post("/api/files/upload", async (req: Request, res: Response) => {
    try {
        res.json({
            message: "File uploaded successfully",
            fileId: "mock-file-id",
            url: "https://mock-s3-url.com/uploaded-file.pdf"
        });
    } catch (error) {
        console.error("Error uploading file:", error);
        res.status(500).json({ error: "Failed to upload file" });
    }
});

app.delete("/api/files/:fileId", async (req: Request, res: Response) => {
    try {
        const { fileId } = req.params;
        res.json({ message: "File deleted successfully" });
    } catch (error) {
        console.error("Error deleting file:", error);
        res.status(500).json({ error: "Failed to delete file" });
    }
});

// ============================================
// ERROR HANDLING
// ============================================

Sentry.setupExpressErrorHandler(app);

app.use((req: Request, res: Response) => {
    res.status(404).json({ error: "Route not found" });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Health check available at  https://api.thisisvillegas.com/health`);
});

export default app;
