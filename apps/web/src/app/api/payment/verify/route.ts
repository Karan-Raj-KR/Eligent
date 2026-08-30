import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { isValidPaymentSignature } from "@/lib/razorpay";

// The only thing that may unlock Apply Mode. A mismatched or missing signature
// is a hard 400 — never a partial success.
export async function POST(request: Request) {
  const { user } = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const orderId = body.razorpay_order_id;
  const paymentId = body.razorpay_payment_id;
  const signature = body.razorpay_signature;

  if (typeof orderId !== "string" || typeof paymentId !== "string" || typeof signature !== "string") {
    return NextResponse.json({ error: "missing payment fields" }, { status: 400 });
  }

  let valid: boolean;
  try {
    valid = isValidPaymentSignature(orderId, paymentId, signature);
  } catch (err) {
    console.error("[payment/verify]", err);
    return NextResponse.json({ error: "Could not verify payment." }, { status: 500 });
  }

  if (!valid) {
    console.warn("[payment/verify] signature mismatch", { orderId, paymentId });
    return NextResponse.json({ error: "signature mismatch" }, { status: 400 });
  }

  // ponytail: unlock stays client-side (localStorage), as it already was before
  // payment existed — no `payment` table, no migration. Add one (payment row +
  // RLS + a server-read entitlement) when Apply Mode must survive a cache clear
  // or a second device.
  return NextResponse.json({ verified: true, payment_id: paymentId });
}
