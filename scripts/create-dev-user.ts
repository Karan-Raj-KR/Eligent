/**
 * DEV MODE: Create a dev user in Supabase for testing
 *
 * This script creates a Supabase auth user with the specified dev ID.
 * The dev profile will then reference this ID.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm tsx scripts/create-dev-user.ts
 */

import { createClient } from '@supabase/supabase-js';

const DEV_USER_ID = '00000000-0000-0000-0000-000000000001';

async function createDevUser() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  console.log(`Creating dev user: ${DEV_USER_ID}`);

  // Create the user directly with the service role (this bypasses email/phone requirements)
  const { data, error } = await supabase.auth.admin.createUser({
    id: DEV_USER_ID,
    email: 'dev@eligent.test',
    email_confirm: true,
    user_metadata: {
      full_name: 'Dev Mode User',
      cgpa: 7.8,
      year_of_study: 1,
      branch: 'CSE',
      state: 'Karnataka',
      annual_family_income: 640000,
      institution_type: 'private',
      category: 'general',
      gender: 'male',
    },
    password: 'dev-pass-123',
    app_metadata: {
      dev_user: true,
    },
  });

  if (error) {
    console.error('Error creating dev user:', error);
    // If the user already exists (different reasons), that's okay for dev mode
    if (error.code === '23505') {
      console.log('✓ Dev user already exists (this is fine for dev mode)');
      return;
    }
    throw error;
  }

  if (data) {
    console.log('✓ Dev user created successfully:');
    console.log(`  ID: ${data.user.id}`);
    console.log(`  Email: ${data.user.email}`);
  }
}

createDevUser()
  .then(() => {
    console.log('\n✅ User creation completed');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Failed to create dev user:', err);
    process.exit(1);
  });
