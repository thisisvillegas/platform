import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IBucket extends Document {
    _id: Types.ObjectId;
    userId: string;
    name: string;
    color: string;
    order: number;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const BucketSchema: Schema = new Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        default: 'New Bucket'
    },
    color: {
        type: String,
        default: '#6b7280'
    },
    order: {
        type: Number,
        default: 0
    },
    isDefault: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    collection: 'braindump-buckets'
});

// Compound index for user's ordered buckets
BucketSchema.index({ userId: 1, order: 1 });

export default mongoose.model<IBucket>('Bucket', BucketSchema);
