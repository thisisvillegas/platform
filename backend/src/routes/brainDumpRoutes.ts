import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import multer from 'multer';
import { databaseService, Bucket, Card, ParsedIdea } from '../database';
import { claudeService } from '../services/claudeService';
import { appleRemindersService } from '../services/appleRemindersService';

// Configure multer for file uploads (memory storage for text files)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['text/plain', 'text/markdown', 'text/x-markdown'];
        const allowedExtensions = ['.txt', '.md', '.markdown'];
        const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));

        if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Only .txt and .md files are allowed'));
        }
    }
});

const router = Router();

// ==================== Bucket Endpoints ====================

// GET /api/brain-dump/buckets - List all user's buckets
router.get('/buckets', async (req: Request, res: Response) => {
    try {
        const userId = req.auth?.payload.sub;
        if (!userId) {
            return res.status(401).json({ error: 'User ID not found in token' });
        }

        // Ensure user has default buckets on first access
        const buckets = await databaseService.ensureUserHasBuckets(userId);
        res.json(buckets);
    } catch (error) {
        console.error('Error fetching buckets:', error);
        res.status(500).json({ error: 'Failed to fetch buckets' });
    }
});

// POST /api/brain-dump/buckets - Create a new bucket
router.post('/buckets', async (req: Request, res: Response) => {
    try {
        const userId = req.auth?.payload.sub;
        if (!userId) {
            return res.status(401).json({ error: 'User ID not found in token' });
        }

        const { name, color } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Bucket name is required' });
        }

        const bucket = await databaseService.createBucket(userId, { name, color });
        res.status(201).json(bucket);
    } catch (error) {
        console.error('Error creating bucket:', error);
        res.status(500).json({ error: 'Failed to create bucket' });
    }
});

// PUT /api/brain-dump/buckets/:id - Update bucket
router.put('/buckets/:id', async (req: Request, res: Response) => {
    try {
        const userId = req.auth?.payload.sub;
        if (!userId) {
            return res.status(401).json({ error: 'User ID not found in token' });
        }

        const { id } = req.params;
        const { name, color, order } = req.body;

        const bucket = await databaseService.updateBucket(userId, id, { name, color, order });
        if (!bucket) {
            return res.status(404).json({ error: 'Bucket not found' });
        }

        res.json(bucket);
    } catch (error) {
        console.error('Error updating bucket:', error);
        res.status(500).json({ error: 'Failed to update bucket' });
    }
});

// DELETE /api/brain-dump/buckets/:id - Delete bucket
router.delete('/buckets/:id', async (req: Request, res: Response) => {
    try {
        const userId = req.auth?.payload.sub;
        if (!userId) {
            return res.status(401).json({ error: 'User ID not found in token' });
        }

        const { id } = req.params;
        await databaseService.deleteBucket(userId, id);
        res.json({ message: 'Bucket deleted successfully' });
    } catch (error) {
        console.error('Error deleting bucket:', error);
        res.status(500).json({ error: 'Failed to delete bucket' });
    }
});

// PUT /api/brain-dump/buckets/reorder - Reorder buckets
router.put('/buckets/reorder', async (req: Request, res: Response) => {
    try {
        const userId = req.auth?.payload.sub;
        if (!userId) {
            return res.status(401).json({ error: 'User ID not found in token' });
        }

        const { orderedIds } = req.body;
        if (!Array.isArray(orderedIds)) {
            return res.status(400).json({ error: 'orderedIds must be an array' });
        }

        await databaseService.reorderBuckets(userId, orderedIds);
        res.json({ message: 'Buckets reordered successfully' });
    } catch (error) {
        console.error('Error reordering buckets:', error);
        res.status(500).json({ error: 'Failed to reorder buckets' });
    }
});

// ==================== Card Endpoints ====================

// GET /api/brain-dump/cards - List all cards (optionally filter by bucket)
router.get('/cards', async (req: Request, res: Response) => {
    try {
        const userId = req.auth?.payload.sub;
        if (!userId) {
            return res.status(401).json({ error: 'User ID not found in token' });
        }

        const { bucketId } = req.query;

        let cards: Card[];
        if (bucketId && typeof bucketId === 'string') {
            cards = await databaseService.getCardsByBucket(userId, bucketId);
        } else {
            cards = await databaseService.getAllCards(userId);
        }

        res.json(cards);
    } catch (error) {
        console.error('Error fetching cards:', error);
        res.status(500).json({ error: 'Failed to fetch cards' });
    }
});

// GET /api/brain-dump/cards/:id - Get single card
router.get('/cards/:id', async (req: Request, res: Response) => {
    try {
        const userId = req.auth?.payload.sub;
        if (!userId) {
            return res.status(401).json({ error: 'User ID not found in token' });
        }

        const { id } = req.params;
        const card = await databaseService.getCard(userId, id);

        if (!card) {
            return res.status(404).json({ error: 'Card not found' });
        }

        res.json(card);
    } catch (error) {
        console.error('Error fetching card:', error);
        res.status(500).json({ error: 'Failed to fetch card' });
    }
});

// POST /api/brain-dump/cards - Create a new card
router.post('/cards', async (req: Request, res: Response) => {
    try {
        const userId = req.auth?.payload.sub;
        if (!userId) {
            return res.status(401).json({ error: 'User ID not found in token' });
        }

        const { bucketId, title, content, labels, isActionable, priority, reminder } = req.body;

        if (!bucketId) {
            return res.status(400).json({ error: 'bucketId is required' });
        }

        const card = await databaseService.createCard(userId, {
            bucketId: new Types.ObjectId(bucketId),
            title,
            content,
            labels,
            isActionable,
            priority,
            reminder
        });

        res.status(201).json(card);
    } catch (error) {
        console.error('Error creating card:', error);
        res.status(500).json({ error: 'Failed to create card' });
    }
});

// PUT /api/brain-dump/cards/:id - Update card
router.put('/cards/:id', async (req: Request, res: Response) => {
    try {
        const userId = req.auth?.payload.sub;
        if (!userId) {
            return res.status(401).json({ error: 'User ID not found in token' });
        }

        const { id } = req.params;
        const { title, content, labels, isActionable, priority, reminder, bucketId } = req.body;

        const updateData: Partial<Card> = {};
        if (title !== undefined) updateData.title = title;
        if (content !== undefined) updateData.content = content;
        if (labels !== undefined) updateData.labels = labels;
        if (isActionable !== undefined) updateData.isActionable = isActionable;
        if (priority !== undefined) updateData.priority = priority;
        if (reminder !== undefined) updateData.reminder = reminder;
        if (bucketId !== undefined) updateData.bucketId = new Types.ObjectId(bucketId);

        const card = await databaseService.updateCard(userId, id, updateData);
        if (!card) {
            return res.status(404).json({ error: 'Card not found' });
        }

        res.json(card);
    } catch (error) {
        console.error('Error updating card:', error);
        res.status(500).json({ error: 'Failed to update card' });
    }
});

// DELETE /api/brain-dump/cards/:id - Delete card
router.delete('/cards/:id', async (req: Request, res: Response) => {
    try {
        const userId = req.auth?.payload.sub;
        if (!userId) {
            return res.status(401).json({ error: 'User ID not found in token' });
        }

        const { id } = req.params;
        await databaseService.deleteCard(userId, id);
        res.json({ message: 'Card deleted successfully' });
    } catch (error) {
        console.error('Error deleting card:', error);
        res.status(500).json({ error: 'Failed to delete card' });
    }
});

// PUT /api/brain-dump/cards/:id/move - Move card to different bucket
router.put('/cards/:id/move', async (req: Request, res: Response) => {
    try {
        const userId = req.auth?.payload.sub;
        if (!userId) {
            return res.status(401).json({ error: 'User ID not found in token' });
        }

        const { id } = req.params;
        const { toBucketId, order } = req.body;

        if (!toBucketId) {
            return res.status(400).json({ error: 'toBucketId is required' });
        }

        const card = await databaseService.moveCard(userId, id, toBucketId, order ?? 0);
        if (!card) {
            return res.status(404).json({ error: 'Card not found' });
        }

        res.json(card);
    } catch (error) {
        console.error('Error moving card:', error);
        res.status(500).json({ error: 'Failed to move card' });
    }
});

// PUT /api/brain-dump/cards/reorder - Reorder cards within a bucket
router.put('/cards/reorder', async (req: Request, res: Response) => {
    try {
        const userId = req.auth?.payload.sub;
        if (!userId) {
            return res.status(401).json({ error: 'User ID not found in token' });
        }

        const { bucketId, orderedIds } = req.body;

        if (!bucketId || !Array.isArray(orderedIds)) {
            return res.status(400).json({ error: 'bucketId and orderedIds are required' });
        }

        await databaseService.reorderCards(userId, bucketId, orderedIds);
        res.json({ message: 'Cards reordered successfully' });
    } catch (error) {
        console.error('Error reordering cards:', error);
        res.status(500).json({ error: 'Failed to reorder cards' });
    }
});

// ==================== Intake Endpoints ====================

// POST /api/brain-dump/intake/parse - Parse text content with Claude
router.post('/intake/parse', async (req: Request, res: Response) => {
    try {
        const userId = req.auth?.payload.sub;
        if (!userId) {
            return res.status(401).json({ error: 'User ID not found in token' });
        }

        const { content } = req.body;
        if (!content || typeof content !== 'string') {
            return res.status(400).json({ error: 'Content is required' });
        }

        // Create intake session
        const session = await databaseService.createIntakeSession(userId, content);

        // Get user's existing buckets for Claude context
        const buckets = await databaseService.ensureUserHasBuckets(userId);
        const bucketNames = buckets.map(b => b.name);

        try {
            // Parse with Claude
            const result = await claudeService.parseBrainDump(content, bucketNames);

            // Update session with parsed ideas
            const updatedSession = await databaseService.updateIntakeSession(session._id!.toString(), {
                parsedIdeas: result.ideas,
                status: 'parsed',
                claudeModel: result.model,
                processingTimeMs: result.processingTimeMs
            });

            res.json(updatedSession);
        } catch (parseError: any) {
            // Update session with error
            await databaseService.updateIntakeSession(session._id!.toString(), {
                status: 'failed',
                errorMessage: parseError.message
            });

            res.status(500).json({ error: parseError.message, sessionId: session._id });
        }
    } catch (error) {
        console.error('Error parsing content:', error);
        res.status(500).json({ error: 'Failed to parse content' });
    }
});

// POST /api/brain-dump/intake/upload - Upload file for parsing
router.post('/intake/upload', upload.single('file'), async (req: Request, res: Response) => {
    try {
        const userId = req.auth?.payload.sub;
        if (!userId) {
            return res.status(401).json({ error: 'User ID not found in token' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'File is required' });
        }

        const content = req.file.buffer.toString('utf-8');
        const filename = req.file.originalname;

        // Create intake session
        const session = await databaseService.createIntakeSession(userId, content, filename);

        // Get user's existing buckets for Claude context
        const buckets = await databaseService.ensureUserHasBuckets(userId);
        const bucketNames = buckets.map(b => b.name);

        try {
            // Parse with Claude
            const result = await claudeService.parseBrainDump(content, bucketNames);

            // Update session with parsed ideas
            const updatedSession = await databaseService.updateIntakeSession(session._id!.toString(), {
                parsedIdeas: result.ideas,
                status: 'parsed',
                claudeModel: result.model,
                processingTimeMs: result.processingTimeMs
            });

            res.json(updatedSession);
        } catch (parseError: any) {
            // Update session with error
            await databaseService.updateIntakeSession(session._id!.toString(), {
                status: 'failed',
                errorMessage: parseError.message
            });

            res.status(500).json({ error: parseError.message, sessionId: session._id });
        }
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({ error: 'Failed to upload and parse file' });
    }
});

// GET /api/brain-dump/intake/:id - Get intake session
router.get('/intake/:id', async (req: Request, res: Response) => {
    try {
        const userId = req.auth?.payload.sub;
        if (!userId) {
            return res.status(401).json({ error: 'User ID not found in token' });
        }

        const { id } = req.params;
        const session = await databaseService.getIntakeSession(userId, id);

        if (!session) {
            return res.status(404).json({ error: 'Intake session not found' });
        }

        res.json(session);
    } catch (error) {
        console.error('Error fetching intake session:', error);
        res.status(500).json({ error: 'Failed to fetch intake session' });
    }
});

// POST /api/brain-dump/intake/:id/confirm - Create cards from parsed ideas
router.post('/intake/:id/confirm', async (req: Request, res: Response) => {
    try {
        const userId = req.auth?.payload.sub;
        if (!userId) {
            return res.status(401).json({ error: 'User ID not found in token' });
        }

        const { id } = req.params;
        const { ideas } = req.body;

        if (!Array.isArray(ideas)) {
            return res.status(400).json({ error: 'ideas array is required' });
        }

        const session = await databaseService.getIntakeSession(userId, id);
        if (!session) {
            return res.status(404).json({ error: 'Intake session not found' });
        }

        // Get user's buckets to map names to IDs
        const buckets = await databaseService.ensureUserHasBuckets(userId);
        const bucketMap = new Map(buckets.map(b => [b.name.toLowerCase(), b._id!]));

        // Create cards from confirmed ideas
        const createdCards: Card[] = [];

        for (const idea of ideas) {
            // Find bucket by name (case-insensitive) or use Unsorted
            const bucketName = (idea.bucketName || idea.suggestedBucket || 'Unsorted').toLowerCase();
            let bucketId = bucketMap.get(bucketName);

            if (!bucketId) {
                bucketId = bucketMap.get('unsorted');
            }

            if (!bucketId) {
                // Create Unsorted bucket if it doesn't exist
                const unsortedBucket = await databaseService.createBucket(userId, {
                    name: 'Unsorted',
                    color: '#6b7280',
                    order: 99
                });
                bucketId = unsortedBucket._id!;
                bucketMap.set('unsorted', bucketId);
            }

            // Create the card
            const card = await databaseService.createCard(userId, {
                bucketId: bucketId,
                title: idea.title,
                content: idea.content,
                labels: (idea.labels || idea.suggestedLabels || []).map((name: string) => ({
                    name,
                    color: '#6b7280' // Default gray, user can customize
                })),
                isActionable: idea.isActionable ?? false,
                reminder: idea.reminder ? {
                    remindAt: new Date(idea.reminder),
                    pushedToApple: false
                } : undefined,
                sourceIntakeId: session._id
            });

            createdCards.push(card);
        }

        // Mark session as processed
        await databaseService.updateIntakeSession(id, { status: 'processed' });

        res.json({
            message: `Created ${createdCards.length} cards`,
            cards: createdCards
        });
    } catch (error) {
        console.error('Error confirming intake:', error);
        res.status(500).json({ error: 'Failed to create cards from intake' });
    }
});

// ==================== Apple Reminders Endpoints ====================

// GET /api/brain-dump/reminders/status - Check Apple Reminders integration status
router.get('/reminders/status', async (req: Request, res: Response) => {
    try {
        const status = await appleRemindersService.checkIntegrationStatus();
        res.json(status);
    } catch (error) {
        console.error('Error checking reminders status:', error);
        res.status(500).json({ error: 'Failed to check reminders status' });
    }
});

// POST /api/brain-dump/reminders/push - Push a card to Apple Reminders
router.post('/reminders/push', async (req: Request, res: Response) => {
    try {
        const userId = req.auth?.payload.sub;
        if (!userId) {
            return res.status(401).json({ error: 'User ID not found in token' });
        }

        const { cardId } = req.body;
        if (!cardId) {
            return res.status(400).json({ error: 'cardId is required' });
        }

        // Get the card
        const card = await databaseService.getCard(userId, cardId);
        if (!card) {
            return res.status(404).json({ error: 'Card not found' });
        }

        // Create the reminder
        const result = await appleRemindersService.createReminder({
            title: card.title,
            notes: card.content,
            dueDate: card.reminder?.remindAt ? new Date(card.reminder.remindAt) : undefined,
            listName: 'Brain Dump'
        });

        if (!result.success) {
            return res.status(500).json({ error: result.error || 'Failed to create reminder' });
        }

        // Update the card with reminder info
        await databaseService.updateCard(userId, cardId, {
            reminder: {
                remindAt: card.reminder?.remindAt || new Date(),
                pushedToApple: true,
                appleReminderId: result.reminderId,
                pushedAt: new Date()
            }
        });

        res.json({
            success: true,
            reminderId: result.reminderId,
            message: 'Reminder created in Apple Reminders'
        });
    } catch (error) {
        console.error('Error pushing to reminders:', error);
        res.status(500).json({ error: 'Failed to push to Apple Reminders' });
    }
});

// POST /api/brain-dump/reminders/push-batch - Push multiple cards to Apple Reminders
router.post('/reminders/push-batch', async (req: Request, res: Response) => {
    try {
        const userId = req.auth?.payload.sub;
        if (!userId) {
            return res.status(401).json({ error: 'User ID not found in token' });
        }

        const { cardIds } = req.body;
        if (!Array.isArray(cardIds) || cardIds.length === 0) {
            return res.status(400).json({ error: 'cardIds array is required' });
        }

        const results: { cardId: string; success: boolean; reminderId?: string; error?: string }[] = [];

        for (const cardId of cardIds) {
            const card = await databaseService.getCard(userId, cardId);
            if (!card) {
                results.push({ cardId, success: false, error: 'Card not found' });
                continue;
            }

            const result = await appleRemindersService.createReminder({
                title: card.title,
                notes: card.content,
                dueDate: card.reminder?.remindAt ? new Date(card.reminder.remindAt) : undefined,
                listName: 'Brain Dump'
            });

            if (result.success) {
                await databaseService.updateCard(userId, cardId, {
                    reminder: {
                        remindAt: card.reminder?.remindAt || new Date(),
                        pushedToApple: true,
                        appleReminderId: result.reminderId,
                        pushedAt: new Date()
                    }
                });
            }

            results.push({
                cardId,
                success: result.success,
                reminderId: result.reminderId,
                error: result.error
            });
        }

        const successCount = results.filter(r => r.success).length;
        res.json({
            message: `Pushed ${successCount} of ${cardIds.length} reminders`,
            results
        });
    } catch (error) {
        console.error('Error pushing batch to reminders:', error);
        res.status(500).json({ error: 'Failed to push batch to Apple Reminders' });
    }
});

export default router;
