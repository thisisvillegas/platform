import { MongoClient, Db, Collection } from 'mongodb';

interface UserPreferences {
    userId: string;
    favoriteTeams?: string[];
    notifications?: boolean;
    theme?: string;
    measurementUnits?: 'metric' | 'imperial';
    createdAt: Date;
    updatedAt: Date;
}

class DatabaseService {
    private client: MongoClient;
    private db: Db | null = null;

    constructor() {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            throw new Error('MONGODB_URI environment variable is not set');
        }
        this.client = new MongoClient(uri);
    }

    async connect(): Promise<void> {
        try {
            await this.client.connect();
            this.db = this.client.db('racing-dashboard');
            console.log('✅ Connected to MongoDB');
        } catch (error) {
            console.error('❌ MongoDB connection error:', error);
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        await this.client.close();
        console.log('Disconnected from MongoDB');
    }

    getPreferencesCollection(): Collection<UserPreferences> {
        if (!this.db) {
            throw new Error('Database not connected');
        }
        return this.db.collection<UserPreferences>('preferences');
    }

    async getUserPreferences(userId: string): Promise<UserPreferences | null> {
        const collection = this.getPreferencesCollection();
        return await collection.findOne({ userId });
    }

    async updateUserPreferences(
        userId: string,
        preferences: Partial<UserPreferences>
    ): Promise<UserPreferences> {
        const collection = this.getPreferencesCollection();

        const now = new Date();
        const updateData = {
            ...preferences,
            userId,
            updatedAt: now,
        };

        const result = await collection.findOneAndUpdate(
            { userId },
            {
                $set: updateData,
                $setOnInsert: { createdAt: now },
            },
            {
                upsert: true,
                returnDocument: 'after',
            }
        );

        if (!result) {
            throw new Error('Failed to update preferences');
        }

        return result;
    }
}

export const databaseService = new DatabaseService();