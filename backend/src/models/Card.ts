import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICardLabel {
    name: string;
    color: string;
}

export interface ICardReminder {
    remindAt: Date;
    pushedToApple: boolean;
    appleReminderId?: string;
    pushedAt?: Date;
}

export interface ICard extends Document {
    _id: Types.ObjectId;
    userId: string;
    bucketId: Types.ObjectId;
    title: string;
    content: string;
    labels: ICardLabel[];
    order: number;
    isActionable: boolean;
    priority?: 'low' | 'medium' | 'high';
    reminder?: ICardReminder;
    sourceIntakeId?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const CardSchema: Schema = new Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    bucketId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'Bucket'
    },
    title: {
        type: String,
        default: 'Untitled'
    },
    content: {
        type: String,
        default: ''
    },
    labels: [{
        name: String,
        color: String
    }],
    order: {
        type: Number,
        default: 0
    },
    isActionable: {
        type: Boolean,
        default: false
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high']
    },
    reminder: {
        remindAt: Date,
        pushedToApple: { type: Boolean, default: false },
        appleReminderId: String,
        pushedAt: Date
    },
    sourceIntakeId: {
        type: Schema.Types.ObjectId,
        ref: 'IntakeSession'
    }
}, {
    timestamps: true,
    collection: 'braindump-cards'
});

// Compound index for user's cards in a bucket
CardSchema.index({ userId: 1, bucketId: 1, order: 1 });

export default mongoose.model<ICard>('Card', CardSchema);
