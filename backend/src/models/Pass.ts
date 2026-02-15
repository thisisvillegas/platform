import mongoose, { Schema, Document } from 'mongoose';

export interface IPass extends Document {
  code: string;           // unique 8-char alphanumeric
  label: string;          // human-readable identifier
  expiresAt: Date;        // when this pass expires
  usedCount: number;      // how many times validated
  createdAt: Date;
  revokedAt?: Date;       // if manually revoked
}

const PassSchema: Schema = new Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    length: 8,
    match: /^[A-Z0-9]{8}$/
  },
  label: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  usedCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  revokedAt: {
    type: Date
  }
});

// Note: `code` already has unique: true in schema, which creates an index automatically.
// No need for a duplicate .index({ code: 1 }) call.

export default mongoose.model<IPass>('Pass', PassSchema);
