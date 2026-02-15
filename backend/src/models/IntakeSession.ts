import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IParsedIdea {
    title: string;
    content: string;
    suggestedBucket: string;
    isActionable: boolean;
    suggestedLabels: string[];
    suggestedReminder?: string;
}

export interface IIntakeSession extends Document {
    _id: Types.ObjectId;
    userId: string;
    rawContent: string;
    filename?: string;
    parsedIdeas: IParsedIdea[];
    status: 'pending' | 'parsed' | 'processed' | 'failed';
    claudeModel?: string;
    processingTimeMs?: number;
    errorMessage?: string;
    createdAt: Date;
    updatedAt: Date;
}

const IntakeSessionSchema: Schema = new Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    rawContent: {
        type: String,
        required: true
    },
    filename: String,
    parsedIdeas: [{
        title: String,
        content: String,
        suggestedBucket: String,
        isActionable: Boolean,
        suggestedLabels: [String],
        suggestedReminder: String
    }],
    status: {
        type: String,
        enum: ['pending', 'parsed', 'processed', 'failed'],
        default: 'pending'
    },
    claudeModel: String,
    processingTimeMs: Number,
    errorMessage: String
}, {
    timestamps: true,
    collection: 'braindump-intakes'
});

export default mongoose.model<IIntakeSession>('IntakeSession', IntakeSessionSchema);
