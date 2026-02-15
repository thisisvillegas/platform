#!/usr/bin/env ts-node

/**
 * Cleanup Expired Passes and Guest Accounts
 *
 * This script removes:
 * - Passes that have expired (expiresAt < now)
 * - Passes that have been manually revoked (revokedAt is set)
 * - Guest accounts that have expired (expiresAt < now)
 *
 * Can be run manually or scheduled via cron.
 *
 * Usage:
 *   ts-node backend/scripts/cleanup-expired.ts
 *   or
 *   npm run cleanup
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Pass from '../src/models/Pass';
import Guest from '../src/models/Guest';

// Load environment variables
dotenv.config();

async function cleanupExpired() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error('❌ MONGODB_URI environment variable not set');
    process.exit(1);
  }

  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri, { dbName: 'racing-dashboard' });
    console.log('✅ Connected to MongoDB\n');

    const now = new Date();

    // ==================== Cleanup Passes ====================
    console.log('🧹 Cleaning up expired and revoked passes...');

    const passDeleteResult = await Pass.deleteMany({
      $or: [
        { expiresAt: { $lt: now } },      // Expired passes
        { revokedAt: { $exists: true } }  // Revoked passes
      ]
    });

    console.log(`✅ Deleted ${passDeleteResult.deletedCount} passes`);

    // ==================== Cleanup Guest Accounts ====================
    console.log('\n🧹 Cleaning up expired guest accounts...');

    const guestDeleteResult = await Guest.deleteMany({
      expiresAt: { $lt: now }
    });

    console.log(`✅ Deleted ${guestDeleteResult.deletedCount} guest accounts`);

    // ==================== Summary ====================
    console.log('\n📊 Cleanup Summary:');
    console.log(`   Passes deleted: ${passDeleteResult.deletedCount}`);
    console.log(`   Guest accounts deleted: ${guestDeleteResult.deletedCount}`);
    console.log(`   Total records deleted: ${passDeleteResult.deletedCount + guestDeleteResult.deletedCount}`);

    // Close connection
    await mongoose.disconnect();
    console.log('\n✅ Cleanup complete. Database connection closed.');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Cleanup failed:', error);

    // Ensure connection is closed on error
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    process.exit(1);
  }
}

// Run cleanup
cleanupExpired();
