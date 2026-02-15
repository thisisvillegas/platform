import dotenv from "dotenv";

// Load environment variables
dotenv.config();

import "./instrument";
import * as Sentry from "@sentry/node";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";
import { jwtCheck } from "./middleware/auth";
import brainDumpRoutes from "./routes/brainDumpRoutes";
import serverRoutes from "./routes/serverRoutes";
import passRoutes from "./routes/passRoutes";
import guestRoutes from "./routes/guestRoutes";
import worldRoutes from "./routes/worldRoutes";
import weatherRoutes from "./routes/weatherRoutes";
import preferencesRoutes from "./routes/preferencesRoutes";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware: CORS restricted to known origins
const allowedOrigins = [
    'https://platform.thisisvillegas.com',
    'https://api-pi.thisisvillegas.com',
    ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:4200', 'http://localhost:3000'] : [])
];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (server-to-server, curl, health checks)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

// Middleware: JSON body parser with explicit size limit
app.use(express.json({ limit: '1mb' }));

// Rate limiter for public pass validation endpoint
const passValidateRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,                   // 20 attempts per window per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many validation attempts. Try again later.' }
});

// Rate limiter for server stats (prevent polling abuse)
const statsRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60,             // ~1 req/sec (overlay polls every 2s = 30/min)
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests' }
});

// Connect Mongoose (single connection for all models)
const mongoUri = process.env.MONGODB_URI;
if (mongoUri) {
    mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
        heartbeatFrequencyMS: 10000,
    })
        .then(() => console.log('✅ Mongoose connected'))
        .catch(err => console.error('❌ Mongoose connection error:', err));

    mongoose.connection.on('disconnected', () => {
        console.warn('⚠️ Mongoose disconnected — will auto-reconnect');
    });
    mongoose.connection.on('reconnected', () => {
        console.log('✅ Mongoose reconnected');
    });
} else {
    console.error('❌ MONGODB_URI not set — database will not be available');
}

// Health check endpoint (no auth required)
app.get("/health", (req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString(), version: "v1.0.42" });
});

// Server stats (rate-limited, no auth — used by frontend overlay)
app.use("/api/server", statsRateLimit, serverRoutes);

// World theme (GET is public, PUT is Auth0 protected)
app.use("/api/world", worldRoutes);

// Pass validation is public (rate-limited), CRUD operations are Auth0 protected
app.use("/api/passes/validate", passValidateRateLimit);
app.use("/api/passes", passRoutes);

// Guest account routes (guest JWT required)
app.use("/api/guest", guestRoutes);

// Apply Auth0 JWT check to all other /api routes
app.use("/api", jwtCheck);

// Brain Dump routes
app.use("/api/brain-dump", brainDumpRoutes);

// Weather endpoint (Auth0 protected — sits after jwtCheck)
app.use("/api/weather", weatherRoutes);

// User preferences (Auth0 protected — sits after jwtCheck)
app.use("/api/preferences", preferencesRoutes);

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
// START SERVER + GRACEFUL SHUTDOWN
// ============================================

const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Health check available at  https://api.thisisvillegas.com/health`);
});

async function gracefulShutdown(signal: string): Promise<void> {
    console.log(`\n${signal} received. Starting graceful shutdown...`);

    server.close(() => {
        console.log('HTTP server closed');
    });

    try {
        await mongoose.disconnect();
        console.log('Mongoose disconnected');
    } catch (err) {
        console.error('Error disconnecting Mongoose:', err);
    }

    console.log('Graceful shutdown complete');
    process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
