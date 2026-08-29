// From the Eligent merge. CAUTION: opportunity.amount in our schema is TEXT
// ("Up to 2,00,000"), never a number — see lib/gap.ts. Never call these on it;
// they exist for numeric values like a profile's own income figure.

/** "50000" -> "₹50,000" */
export function inr(amount: number): string {
  return "₹" + amount.toLocaleString("en-IN");
}

/** "250000" -> "₹2.5L" */
export function inrCompact(amount: number): string {
  if (amount >= 100000) {
    const lakhs = amount / 100000;
    return `₹${Number.isInteger(lakhs) ? lakhs : lakhs.toFixed(1)}L`;
  }
  if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(0)}k`;
  }
  return inr(amount);
}

export function cgpa(value: number): string {
  return value.toFixed(1);
}