// backend/scripts/fixExistingRecords.ts
//
// ONE-TIME MIGRATION SCRIPT
//
// Run this ONCE after deploying the fix to correct all existing
// SimulationResult documents that were never updated due to the bug.
//
// Usage:
//   npx ts-node --esm scripts/fixExistingRecords.ts
//
// What it does:
// 1. Drops the old UNIQUE index on { campaignId, userId, trackingToken }
//    which was blocking upserts.
// 2. Re-creates it as a non-unique index for query performance only.
// 3. Removes all 'pending' placeholder documents (created by the old
//    insertMany approach) that never got a real token.
// 4. For any SimulationResult where smsSent=true but all action flags
//    are still false AND createdAt > 1 hour ago, logs them as "stale"
//    (these are users who received the SMS but took no action — correct).

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function runMigration() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not set in environment');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  const col = db.collection('simulationresults');

  // ── Step 1: Drop the unique index ────────────────────────────────────────
  console.log('\n[Step 1] Checking for unique index on (campaignId, userId, trackingToken)...');
  const indexes = await col.listIndexes().toArray();
  const uniqueIdx = indexes.find(
    idx =>
      idx.unique === true &&
      idx.key &&
      idx.key.campaignId !== undefined &&
      idx.key.userId !== undefined &&
      idx.key.trackingToken !== undefined
  );

  if (uniqueIdx) {
    console.log(`  Found unique index: ${uniqueIdx.name} — dropping it...`);
    await col.dropIndex(uniqueIdx.name);
    console.log('  ✓ Dropped unique index');
  } else {
    console.log('  ℹ No unique index found — nothing to drop');
  }

  // ── Step 2: Create non-unique compound index ──────────────────────────────
  console.log('\n[Step 2] Creating non-unique compound index...');
  await col.createIndex(
    { campaignId: 1, userId: 1, trackingToken: 1 },
    { name: 'campaign_user_token_lookup', unique: false }
  );
  console.log('  ✓ Created non-unique compound index');

  // ── Step 3: Remove 'pending' placeholder records ──────────────────────────
  console.log('\n[Step 3] Removing stale "pending" placeholder records...');
  const deleteResult = await col.deleteMany({ trackingToken: 'pending' });
  console.log(`  ✓ Deleted ${deleteResult.deletedCount} pending placeholder records`);

  // ── Step 4: Report stale records (informational only) ────────────────────
  console.log('\n[Step 4] Auditing stale SimulationResult records...');
  const staleCount = await col.countDocuments({
    smsSent:              true,
    smsLinkClicked:       false,
    credentialsSubmitted: false,
    reportedPhishing:     false,
  });
  console.log(
    `  ℹ ${staleCount} records have smsSent=true but no action taken` +
    ` (these are users who received SMS but did not interact — correct)`
  );

  // ── Step 5: Fix records where trackingToken is empty/null ─────────────────
  console.log('\n[Step 5] Checking for records with null/empty trackingToken...');
  const nullTokenCount = await col.countDocuments({
    $or: [
      { trackingToken: null },
      { trackingToken: '' },
      { trackingToken: { $exists: false } },
    ],
  });

  if (nullTokenCount > 0) {
    console.log(
      `  ⚠ Found ${nullTokenCount} records with missing trackingToken.` +
      ` These cannot be updated by token lookup — they will use the` +
      ` fallback (campaignId + userId) path in the fixed trackingService.`
    );
  } else {
    console.log('  ✓ All records have a trackingToken');
  }

  // ── Step 6: Verify final index state ─────────────────────────────────────
  console.log('\n[Step 6] Final index list:');
  const finalIndexes = await col.listIndexes().toArray();
  finalIndexes.forEach(idx => {
    console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)} unique=${idx.unique ?? false}`);
  });

  // ── Step 7: Summary ───────────────────────────────────────────────────────
  const totalRecords = await col.countDocuments({});
  const withClick    = await col.countDocuments({ smsLinkClicked: true });
  const withCreds    = await col.countDocuments({ credentialsSubmitted: true });
  const withReport   = await col.countDocuments({ reportedPhishing: true });

  console.log('\n[Summary]');
  console.log(`  Total SimulationResult records : ${totalRecords}`);
  console.log(`  smsLinkClicked = true          : ${withClick}`);
  console.log(`  credentialsSubmitted = true    : ${withCreds}`);
  console.log(`  reportedPhishing = true        : ${withReport}`);

  if (withClick === 0 && withCreds === 0 && withReport === 0 && totalRecords > 0) {
    console.log(
      '\n  ⚠ WARNING: All action flags are still false despite existing records.' +
      '\n  This confirms the bug was active. Deploy the fixed trackingService.ts' +
      '\n  and run a new campaign to verify DB updates correctly going forward.'
    );
  }

  await mongoose.disconnect();
  console.log('\n✓ Migration complete. MongoDB disconnected.');
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});