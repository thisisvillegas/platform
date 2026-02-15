import mongoose, { Schema, Document } from 'mongoose';

export interface IUserPreferences extends Document {
    userId: string;
    favoriteTeams?: string[];
    notifications?: boolean;
    theme?: string;
    measurementUnits?: 'metric' | 'imperial';
    createdAt: Date;
    updatedAt: Date;
}

const UserPreferencesSchema: Schema = new Schema({
    userId: {
        type: String,
        required: true,
        unique: true
    },
    favoriteTeams: {
        type: [String],
        default: []
    },
    notifications: {
        type: Boolean,
        default: true
    },
    theme: {
        type: String,
        default: 'dark'
    },
    measurementUnits: {
        type: String,
        enum: ['metric', 'imperial'],
        default: 'imperial'
    }
}, {
    timestamps: true,
    collection: 'preferences'
});

export default mongoose.model<IUserPreferences>('UserPreferences', UserPreferencesSchema);
