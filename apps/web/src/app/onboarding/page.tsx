"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiSend, isAuthError } from "@/lib/api";

const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
  "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi",
  "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];
const YEARS = ["1", "2", "3", "4", "5"];
const INSTITUTION_TYPES = ["government", "private", "aided", "deemed"];
const CATEGORIES = ["general", "obc", "sc", "st", "ews"];
const GENDERS = ["female", "male", "other"];

// Radix Select cannot hold an empty string value, so optional fields opt out
// through a sentinel that is mapped back to null on submit.
const UNSET = "__unset__";

type Form = {
  full_name: string; cgpa: string; percentage: string; year_of_study: string; branch: string;
  state: string; annual_family_income: string; institution_type: string; category: string; gender: string;
};

const EMPTY: Form = {
  full_name: "", cgpa: "", percentage: "", year_of_study: "", branch: "", state: "",
  annual_family_income: "", institution_type: "", category: UNSET, gender: UNSET,
};

type Errors = Partial<Record<keyof Form, string>>;

function text(value: string): string | null {
  const trimmed = value.trim();
  return trimmed && trimmed !== UNSET ? trimmed : null;
}

/** Never send "" for a numeric column — Postgres rejects it. */
function num(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Blank is allowed everywhere except the name — a blank field is "not stated",
 * which the engine reads as unknown and reports honestly. What is not allowed is
 * a value that is present but impossible, because that silently produces wrong
 * verdicts rather than an honest "we could not check this".
 */
function validate(form: Form): Errors {
  const errors: Errors = {};
  if (!form.full_name.trim()) errors.full_name = "Please enter your name — the application forms need it.";

  const ranges: Array<[keyof Form, number, number, string]> = [
    ["percentage", 0, 100, "Percentage must be between 0 and 100."],
    ["cgpa", 0, 10, "CGPA must be between 0 and 10."],
    ["annual_family_income", 0, Number.MAX_SAFE_INTEGER, "Income cannot be negative."],
  ];
  for (const [field, min, max, message] of ranges) {
    const raw = form[field].trim();
    if (!raw) continue;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < min || value > max) errors[field] = message;
  }
  return errors;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-sm font-medium text-destructive">
      {message}
    </p>
  );
}

export default function Onboarding() {
  const router = useRouter();
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const set = (key: keyof Form) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    // Clear a field's error as soon as the person starts fixing it.
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  };

  async function save() {
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).some((k) => found[k as keyof Form])) {
      // Put the first bad field on screen rather than failing silently below the fold.
      const first = formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']");
      first?.scrollIntoView({ block: "center" });
      first?.focus?.();
      return;
    }

    setSaving(true);
    setSubmitError(null);
    try {
      const result = await apiSend("/api/profile", "POST", {
        full_name: form.full_name.trim(),
        cgpa: num(form.cgpa),
        percentage: num(form.percentage),
        year_of_study: num(form.year_of_study),
        branch: text(form.branch),
        state: text(form.state),
        annual_family_income: num(form.annual_family_income),
        institution_type: text(form.institution_type),
        category: text(form.category),
        gender: text(form.gender),
      });
      if (!result.ok) {
        setSubmitError(result.error);
        return;
      }
      router.push("/matches");
    } finally {
      // Always clears, on every path.
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 sm:py-12">
      <div ref={formRef} className="mx-auto w-full max-w-2xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Your profile</h1>
          <p className="text-sm text-muted-foreground">
            Entered once, checked against every scholarship. Leave anything blank and we will say we
            could not check it — we never guess a number on your behalf.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Academic details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input
                id="full_name"
                value={form.full_name}
                onChange={(e) => set("full_name")(e.target.value)}
                placeholder="As it appears on your marksheet"
                aria-invalid={Boolean(errors.full_name)}
                aria-describedby={errors.full_name ? "err-full_name" : undefined}
                className={errors.full_name ? "border-destructive" : undefined}
              />
              <FieldError id="err-full_name" message={errors.full_name} />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="percentage">Class 12 percentage</Label>
                <Input
                  id="percentage" type="number" inputMode="decimal" min="0" max="100" step="0.01"
                  value={form.percentage} onChange={(e) => set("percentage")(e.target.value)}
                  placeholder="e.g. 82.4"
                  aria-invalid={Boolean(errors.percentage)}
                  aria-describedby={errors.percentage ? "err-percentage" : undefined}
                  className={errors.percentage ? "border-destructive" : undefined}
                />
                <FieldError id="err-percentage" message={errors.percentage} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cgpa">Current CGPA</Label>
                <Input
                  id="cgpa" type="number" inputMode="decimal" min="0" max="10" step="0.01"
                  value={form.cgpa} onChange={(e) => set("cgpa")(e.target.value)}
                  placeholder="e.g. 8.4"
                  aria-invalid={Boolean(errors.cgpa)}
                  aria-describedby={errors.cgpa ? "err-cgpa" : undefined}
                  className={errors.cgpa ? "border-destructive" : undefined}
                />
                <FieldError id="err-cgpa" message={errors.cgpa} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="year_of_study">Year of study</Label>
                <Select value={form.year_of_study} onValueChange={set("year_of_study")}>
                  <SelectTrigger id="year_of_study" className="h-11">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map((y) => (
                      <SelectItem key={y} value={y}>Year {y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch">Branch or stream</Label>
                <Input
                  id="branch" value={form.branch} onChange={(e) => set("branch")(e.target.value)}
                  placeholder="e.g. Computer Science"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Background</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="annual_family_income">Annual family income (₹)</Label>
                <Input
                  id="annual_family_income" type="number" inputMode="numeric" min="0" step="1000"
                  value={form.annual_family_income}
                  onChange={(e) => set("annual_family_income")(e.target.value)}
                  placeholder="e.g. 400000"
                  aria-invalid={Boolean(errors.annual_family_income)}
                  aria-describedby={errors.annual_family_income ? "err-income" : undefined}
                  className={errors.annual_family_income ? "border-destructive" : undefined}
                />
                <FieldError id="err-income" message={errors.annual_family_income} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Select value={form.state} onValueChange={set("state")}>
                  <SelectTrigger id="state" className="h-11">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="institution_type">Institution type</Label>
                <Select value={form.institution_type} onValueChange={set("institution_type")}>
                  <SelectTrigger id="institution_type" className="h-11">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {INSTITUTION_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Optional</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm text-muted-foreground">
              Self-declared, and never required to see your matches. Some scholarships are reserved for
              specific categories — filling these in lets us check those too.
            </p>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={form.category} onValueChange={set("category")}>
                  <SelectTrigger id="category" className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNSET}>Prefer not to say</SelectItem>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c} className="uppercase">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select value={form.gender} onValueChange={set("gender")}>
                  <SelectTrigger id="gender" className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNSET}>Prefer not to say</SelectItem>
                    {GENDERS.map((g) => (
                      <SelectItem key={g} value={g} className="capitalize">{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {submitError ? (
          isAuthError(submitError) ? (
            <div className="space-y-3 rounded-lg border bg-card p-6 text-center">
              <p className="font-medium">You&rsquo;re signed out.</p>
              <p className="text-sm text-muted-foreground">Sign in again to save your profile.</p>
              <Button size="touch" asChild><Link href="/">Sign in</Link></Button>
            </div>
          ) : (
            <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {submitError}
            </p>
          )
        ) : null}

        <Button className="w-full" size="lg" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "See my matches"}
        </Button>
      </div>
    </main>
  );
}
