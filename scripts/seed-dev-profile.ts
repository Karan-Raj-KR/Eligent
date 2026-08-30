/**
 * DEV MODE SEED SCRIPT
 *
 * This script upserts a fixed dev profile for testing dev-mode authentication bypass.
 * The profile corresponds to the year-1/72%/6.4L profile from HANDOFF that produces
 * near-miss matches (Reliance UG eligible, others near-miss).
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm tsx scripts/seed-dev-profile.ts
 *
 * The dev profile ID is the same as the fixed ID injected in middleware.ts.
 */

import { createClient } from '@supabase/supabase-js';

const DEV_USER_ID = '00000000-0000-0000-0000-000000000001';

async function seedDevProfile() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
    console.error("Put them in the environment and re-run.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  console.log(`Upserting dev profile for user: ${DEV_USER_ID}`);

  const { data, error } = await supabase
    .from('profile')
    .upsert(
      {
        id: DEV_USER_ID,
        full_name: 'Dev Mode User',
        cgpa: 7.8,
        percentage: null,
        year_of_study: 1,
        branch: 'CSE',
        state: 'Karnataka',
        annual_family_income: 640000,
        institution_type: 'private',
        category: 'general',
        gender: 'male',
      },
      {
        onConflict: 'id',
      }
    )
    .select()
    .single();

  if (error) {
    console.error('Error upserting dev profile:', error);
    throw error;
  }

  console.log('✓ Dev profile upserted successfully:');
  console.log(`  ID: ${data.id}`);
  console.log(`  Name: ${data.full_name}`);
  console.log(`  CGPA: ${data.cgpa}`);
  console.log(`  Year of Study: ${data.year_of_study}`);
  console.log(`  Branch: ${data.branch}`);
  console.log(`  State: ${data.state}`);
  console.log(`  Annual Family Income: ₹${data.annual_family_income.toLocaleString('en-IN')}`);
  console.log(`  Institution Type: ${data.institution_type}`);
  console.log(`  Category: ${data.category}`);
  console.log(`  Gender: ${data.gender}`);

  // Check for existing applications for this user to ensure matches can be computed
  const { data: applications, error: appError } = await supabase
    .from('application')
    .select('id, opportunity_id, status')
    .eq('user_id', DEV_USER_ID);

  if (appError) {
    console.error('Error fetching applications:', appError);
    throw appError;
  }

  if (applications && applications.length > 0) {
    console.log(`\nFound ${applications.length} application(s) for dev user:`);
    applications.forEach((app) => {
      console.log(`  - Application ${app.id}: ${app.status} (for opportunity ${app.opportunity_id})`);
    });
  } else {
    console.log('\nNo applications found for dev user yet.');
    console.log('The /matches page will show 0 applications.');
  }

  console.log('\nNow you can:');
  console.log('1. Set NEXT_PUBLIC_DEV_MODE=true in apps/web/.env.local');
  console.log('2. Run "pnpm --filter web dev"');
  console.log('3. Load http://localhost:3000 onboarding');
  console.log('4. Complete onboarding with CGPA=7.8, Year=1, Branch=CSE, State=Karnataka, Income=640000');
  console.log('5. Visit /matches - should see 3 buckets with real data (Reliance UG eligible, Kotak/Reliance PG near-miss)');
}

seedDevProfile()
  .then(() => {
    console.log('\n✅ Seed completed successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Seed failed:', err);
    process.exit(1);
  });
