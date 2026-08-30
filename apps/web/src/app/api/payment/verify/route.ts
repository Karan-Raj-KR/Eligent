import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSessionUser } from "@/lib/supabase/server";
import { isValidPaymentSignature, APPLY_MODE_PAISE } from "@/lib/razorpay";

// Current disclosure version string. Bump this whenever the disclosure copy
// materially changes so we know which version a buyer agreed to.
const DISCLOSURE_VERSION = "2026-08-30-v1";

// Service-role client — bypasses RLS so we can INSERT into `purchase` without
// needing the buyer's cookie to satisfy a policy. The secret never leaves this
// server module.
function getAdminClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set");
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

// The only thing that may unlock Apply Mode. A mismatched or missing signature
// is a hard 400 — never a partial success.
export async function POST(request: Request) {
  const { user } = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const orderId = body.razorpay_order_id;
  const paymentId = body.razorpay_payment_id;
  const signature = body.razorpay_signature;
  const email = body.email;
  const disclosureAccepted = body.disclosure_accepted;

  if (typeof orderId !== "string" || typeof paymentId !== "string" || typeof signature !== "string") {
    return NextResponse.json({ error: "missing payment fields" }, { status: 400 });
  }
  if (typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "missing email" }, { status: 400 });
  }
  if (disclosureAccepted !== true) {
    return NextResponse.json({ error: "disclosure must be accepted" }, { status: 400 });
  }

  let valid: boolean;
  try {
    valid = isValidPaymentSignature(orderId, paymentId, signature);
  } catch (err) {
    console.error("[payment/verify] signature check threw:", err);
    return NextResponse.json({ error: "Could not verify payment." }, { status: 500 });
  }

  if (!valid) {
    console.warn("[payment/verify] signature mismatch", { orderId, paymentId });
    return NextResponse.json({ error: "signature mismatch" }, { status: 400 });
  }

  // Record the purchase server-side. This is the source-of-truth entitlement:
  // the `purchase` table survives a cache clear and works across devices.
  try {
    const admin = getAdminClient();
    const { error: insertError } = await admin.from("purchase").insert({
      user_id: user.id,
      email,
      razorpay_payment_id: paymentId,
      amount: APPLY_MODE_PAISE,
      disclosure_accepted: true,
      disclosure_version: DISCLOSURE_VERSION,
    });
    if (insertError) {
      // A UNIQUE violation means the payment was already recorded (double-submit
      // or a webhook retry). Treat as success.
      if (insertError.code !== "23505") {
        console.error("[payment/verify] insert failed:", insertError);
        // Don't block the unlock — the signature was valid. Log and continue.
      }
    }
  } catch (err) {
    // DB write failures must not block the unlock — the payment is real.
    console.error("[payment/verify] purchase row write failed:", err);
  }

  return NextResponse.json({ verified: true, payment_id: paymentId });
}
