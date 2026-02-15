import { Types } from 'mongoose';
import UserPreferences, { IUserPreferences } from './models/UserPreferences';
import Bucket, { IBucket } from './models/Bucket';
import Card, { ICard, ICardLabel, ICardReminder } from './models/Card';
import IntakeSession, { IIntakeSession, IParsedIdea } from './models/IntakeSession';

// Re-export interfaces for consumers (brainDumpRoutes, etc.)
export type { IBucket as Bucket, ICard as Card, IParsedIdea as ParsedIdea, IIntakeSession as IntakeSession };

const DEFAULT_BUCKETS = [
    { name: 'Work', color: '#3b82f6', order: 0 },
    { name: 'Music', color: '#8b5cf6', order: 1 },
    { name: 'Social', color: '#ec4899', order: 2 },
    { name: 'Motorcycles', color: '#f97316', order: 3 },
    { name: 'Health', color: '#22c55e', order: 4 },
    { name: 'Ideas', color: '#eab308', order: 5 },
    { name: 'Unsorted', color: '#6b7280', order: 99 }
];

class DatabaseService {
    // ==================== User Preferences ====================

    async getUserPreferences(userId: string): Promise<IUserPreferences | null> {
        return UserPreferences.findOne({ userId });
    }

    async updateUserPreferences(
        userId: string,
        preferences: Partial<IUserPreferences>
    ): Promise<IUserPreferences> {
        const result = await UserPreferences.findOneAndUpdate(
            { userId },
            { $set: { ...preferences, userId } },
            { upsert: true, new: true }
        );

        if (!result) {
            throw new Error('Failed to update preferences');
        }

        return result;
    }

    // ==================== Bucket Operations ====================

    async getUserBuckets(userId: string): Promise<IBucket[]> {
        return Bucket.find({ userId }).sort({ order: 1 });
    }

    async createDefaultBuckets(userId: string): Promise<IBucket[]> {
        const buckets = DEFAULT_BUCKETS.map(b => ({
            ...b,
            userId,
            isDefault: true
        }));

        return Bucket.insertMany(buckets);
    }

    async ensureUserHasBuckets(userId: string): Promise<IBucket[]> {
        const existing = await this.getUserBuckets(userId);
        if (existing.length === 0) {
            return this.createDefaultBuckets(userId);
        }
        return existing;
    }

    async createBucket(userId: string, data: Partial<IBucket>): Promise<IBucket> {
        // Get next order number
        const maxBucket = await Bucket.findOne({ userId }).sort({ order: -1 });
        const nextOrder = maxBucket ? maxBucket.order + 1 : 0;

        return Bucket.create({
            userId,
            name: data.name || 'New Bucket',
            color: data.color || '#6b7280',
            order: data.order ?? nextOrder,
            isDefault: false
        });
    }

    async updateBucket(userId: string, bucketId: string, data: Partial<IBucket>): Promise<IBucket | null> {
        return Bucket.findOneAndUpdate(
            { _id: new Types.ObjectId(bucketId), userId },
            { $set: data },
            { new: true }
        );
    }

    async deleteBucket(userId: string, bucketId: string): Promise<void> {
        // Get or create Unsorted bucket
        let unsortedBucket = await Bucket.findOne({ userId, name: 'Unsorted' });
        let unsortedBucketId: Types.ObjectId;

        if (!unsortedBucket) {
            const newBucket = await this.createBucket(userId, { name: 'Unsorted', color: '#6b7280', order: 99 });
            unsortedBucketId = newBucket._id;
        } else {
            unsortedBucketId = unsortedBucket._id;
        }

        // Move cards to Unsorted
        await Card.updateMany(
            { userId, bucketId: new Types.ObjectId(bucketId) },
            { $set: { bucketId: unsortedBucketId } }
        );

        // Delete bucket
        await Bucket.deleteOne({ _id: new Types.ObjectId(bucketId), userId });
    }

    async reorderBuckets(userId: string, orderedIds: string[]): Promise<void> {
        const bulkOps = orderedIds.map((id, index) => ({
            updateOne: {
                filter: { _id: new Types.ObjectId(id), userId },
                update: { $set: { order: index } }
            }
        }));

        await Bucket.bulkWrite(bulkOps);
    }

    // ==================== Card Operations ====================

    async getAllCards(userId: string): Promise<ICard[]> {
        return Card.find({ userId }).sort({ order: 1 });
    }

    async getCardsByBucket(userId: string, bucketId: string): Promise<ICard[]> {
        return Card.find({ userId, bucketId: new Types.ObjectId(bucketId) }).sort({ order: 1 });
    }

    async getCard(userId: string, cardId: string): Promise<ICard | null> {
        return Card.findOne({ _id: new Types.ObjectId(cardId), userId });
    }

    async createCard(userId: string, data: Partial<ICard>): Promise<ICard> {
        const bucketId = data.bucketId || new Types.ObjectId();

        // Get next order number within bucket
        const maxCard = await Card.findOne({ userId, bucketId }).sort({ order: -1 });
        const nextOrder = maxCard ? maxCard.order + 1 : 0;

        return Card.create({
            userId,
            bucketId,
            title: data.title || 'Untitled',
            content: data.content || '',
            labels: data.labels || [],
            order: data.order ?? nextOrder,
            isActionable: data.isActionable ?? false,
            priority: data.priority,
            reminder: data.reminder,
            sourceIntakeId: data.sourceIntakeId
        });
    }

    async updateCard(userId: string, cardId: string, data: Partial<ICard>): Promise<ICard | null> {
        // Handle bucketId conversion if provided as string
        const updateData: any = { ...data };
        if (data.bucketId && typeof data.bucketId === 'string') {
            updateData.bucketId = new Types.ObjectId(data.bucketId as unknown as string);
        }

        return Card.findOneAndUpdate(
            { _id: new Types.ObjectId(cardId), userId },
            { $set: updateData },
            { new: true }
        );
    }

    async deleteCard(userId: string, cardId: string): Promise<void> {
        await Card.deleteOne({ _id: new Types.ObjectId(cardId), userId });
    }

    async moveCard(userId: string, cardId: string, toBucketId: string, newOrder: number): Promise<ICard | null> {
        return Card.findOneAndUpdate(
            { _id: new Types.ObjectId(cardId), userId },
            { $set: { bucketId: new Types.ObjectId(toBucketId), order: newOrder } },
            { new: true }
        );
    }

    async reorderCards(userId: string, bucketId: string, orderedIds: string[]): Promise<void> {
        const bulkOps = orderedIds.map((id, index) => ({
            updateOne: {
                filter: { _id: new Types.ObjectId(id), userId },
                update: { $set: { order: index, bucketId: new Types.ObjectId(bucketId) } }
            }
        }));

        await Card.bulkWrite(bulkOps);
    }

    // ==================== Intake Operations ====================

    async createIntakeSession(userId: string, rawContent: string, filename?: string): Promise<IIntakeSession> {
        return IntakeSession.create({
            userId,
            rawContent,
            filename,
            parsedIdeas: [],
            status: 'pending'
        });
    }

    async updateIntakeSession(sessionId: string, data: Partial<IIntakeSession>): Promise<IIntakeSession | null> {
        return IntakeSession.findByIdAndUpdate(
            sessionId,
            { $set: data },
            { new: true }
        );
    }

    async getIntakeSession(userId: string, sessionId: string): Promise<IIntakeSession | null> {
        return IntakeSession.findOne({ _id: new Types.ObjectId(sessionId), userId });
    }
}

export const databaseService = new DatabaseService();
