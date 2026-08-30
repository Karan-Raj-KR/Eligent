// Standalone self-check for the money path:
//   npx tsx --conditions=react-server --env-file=.env.local src/lib/razorpay.test.mts
// Hits Razorpay's TEST api to create one throwaway order, then round-trips the
// signature. Run from apps/web.
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { APPLY_MODE_PAISE, createOrder, isValidPaymentSignature } from "./razorpay.js";

const order = await createOrder(`selfcheck_${Date.now()}`);
assert.match(order.id, /^order_/);
assert.equal(order.amount, APPLY_MODE_PAISE);
assert.equal(order.currency, "INR");

const paymentId = "pay_selfcheck";
const good = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
  .update(`${order.id}|${paymentId}`)
  .digest("hex");

assert.equal(isValidPaymentSignature(order.id, paymentId, good), true);
assert.equal(isValidPaymentSignature(order.id, paymentId, good.replace(/.$/, "0")), false);
assert.equal(isValidPaymentSignature(order.id, "pay_other", good), false);
assert.equal(isValidPaymentSignature(order.id, paymentId, "short"), false);

console.log(`razorpay: ok (${order.id}, ${order.amount} paise)`);
