-- Purchase table: records every verified Apply Mode payment.
-- Inserts happen server-side via the service-role client (bypasses RLS).
-- Users can read their own rows to restore entitlement across devices.

CREATE TABLE IF NOT EXISTS purchase (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        REFERENCES auth.users(id),
  email               text        NOT NULL,
  razorpay_payment_id text        NOT NULL UNIQUE,
  amount              integer     NOT NULL,           -- in paise
  disclosure_accepted boolean     NOT NULL DEFAULT false,
  disclosure_version  text        NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE purchase ENABLE ROW LEVEL SECURITY;

-- Owners can read their own rows (e.g. to restore entitlement on a new device).
-- Inserts and updates happen through the service-role client, so no policy needed.
CREATE POLICY "owner can read own purchase"
  ON purchase FOR SELECT
  USING (auth.uid() = user_id);
