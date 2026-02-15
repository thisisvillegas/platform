import mongoose, { Schema, Document } from 'mongoose';

export interface IWorldConfig extends Document {
  activeTheme: string;
  themeMode: 'auto' | 'manual';
  updatedAt: Date;
}

const WorldConfigSchema: Schema = new Schema({
  activeTheme: {
    type: String,
    default: 'default'
  },
  themeMode: {
    type: String,
    enum: ['auto', 'manual'],
    default: 'auto'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model<IWorldConfig>('WorldConfig', WorldConfigSchema);
