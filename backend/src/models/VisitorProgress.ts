import mongoose, { Schema, Document } from 'mongoose';

export interface IVisitorProgress extends Document {
  passCode: string;
  collectibles: string[];
  achievements: string[];
  buildingsVisited: string[];
  npcsInteracted: string[];
  dialogueCount: number;
  timeSpent: number;
  lastPosition: {
    x: number;
    y: number;
  };
  firstVisit: Date;
  lastVisit: Date;
}

const VisitorProgressSchema = new Schema<IVisitorProgress>({
  passCode: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  collectibles: {
    type: [String],
    default: []
  },
  achievements: {
    type: [String],
    default: []
  },
  buildingsVisited: {
    type: [String],
    default: []
  },
  npcsInteracted: {
    type: [String],
    default: []
  },
  dialogueCount: {
    type: Number,
    default: 0
  },
  timeSpent: {
    type: Number,
    default: 0
  },
  lastPosition: {
    type: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 }
    },
    default: { x: 0, y: 0 }
  },
  firstVisit: {
    type: Date,
    default: Date.now
  },
  lastVisit: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

export const VisitorProgress = mongoose.model<IVisitorProgress>('VisitorProgress', VisitorProgressSchema);
