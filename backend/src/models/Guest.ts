import mongoose, { Schema, Document } from 'mongoose';

export interface IGuest extends Document {
  passCode: string;           // reference to pass used
  username: string;           // auto-generated username
  passwordHash?: string;      // optional password (or use session tokens)
  sessionToken?: string;      // optional session token alternative
  expiresAt: Date;            // inherited from pass expiry
  createdAt: Date;
  appContext?: string;        // which app they're accessing (braindump, homecontrol, etc)
}

const GuestSchema: Schema = new Schema({
  passCode: {
    type: String,
    required: true,
    ref: 'Pass'
  },
  username: {
    type: String,
    required: true,
    unique: true
  },
  passwordHash: {
    type: String
  },
  sessionToken: {
    type: String,
    unique: true,
    sparse: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  appContext: {
    type: String
  }
});

// Index for pass code lookups
GuestSchema.index({ passCode: 1 });

// Note: sessionToken already has unique: true in schema — no duplicate index needed.

// Compound index for expiry cleanup
GuestSchema.index({ expiresAt: 1, createdAt: 1 });

export default mongoose.model<IGuest>('Guest', GuestSchema);
