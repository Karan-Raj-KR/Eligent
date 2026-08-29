"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { apiSend, isAuthError } from "@/lib/api";

// Matches supabase/migrations/…_initial_schema.sql exactly.
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
  full_name: string;
  cgpa: string;
  percentage: string;
  year_of_study: string;
  branch: string;
  state: string;
  annual_family_income: string;
  institution_type: string;
  category: string;
  gender: string;
};

const EMPTY: Form = {
  full_name: "", cgpa: "", percentage: "", year_of_study: "", branch: "", state: "",
  annual_family_income: "", institution_type: "", category: UNSET, gender: UNSET,
};

/** "" and the opt-out sentinel both mean "not stated", which the engine reads as unknown. */
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

export default function Onboarding() {
  const router = useRouter();
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof Form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  async function save() {
    if (!form.full_name.trim()) {
      setError("Please enter your name.");
      return;
    }
    setSaving(true);
    setError(null);
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
        setError(result.error);
        return;
      }
      router.push("/matches");
    } finally {
      // Always clears, on every path, including the redirect.
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen p-4 py-10">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Your profile</h1>
          <p className="text-sm text-muted-foreground">
            Entered once, checked against every scholarship. Anything you leave blank simply
            can&rsquo;t be checked — we&rsquo;ll say so rather than guess.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Academic details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input
                id="full_name"
                value={form.full_name}
                onChange={(e) => set("full_name")(e.target.value)}
                placeholder="As it appears on your marksheet"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="percentage">Class 12 percentage</Label>
                <Input
                  id="percentage" type="number" inputMode="decimal" min="0" max="100" step="0.01"
                  value={form.percentage}
                  onChange={(e) => set("percentage")(e.target.value)}
                  placeholder="e.g. 82.4"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cgpa">Current CGPA</Label>
                <Input
                  id="cgpa" type="number" inputMode="decimal" min="0" max="10" step="0.01"
                  value={form.cgpa}
                  onChange={(e) => set("cgpa")(e.target.value)}
                  placeholder="e.g. 8.4"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="year_of_study">Year of study</Label>
                <Select value={form.year_of_study} onValueChange={set("year_of_study")}>
                  <SelectTrigger id="year_of_study">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map((y) => (
                      <SelectItem key={y} value={y}>
                        Year {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch">Branch or stream</Label>
                <Input
                  id="branch" value={form.branch}
                  onChange={(e) => set("branch")(e.target.value)}
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
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="annual_family_income">Annual family income (₹)</Label>
                <Input
                  id="annual_family_income" type="number" inputMode="numeric" min="0" step="1000"
                  value={form.annual_family_income}
                  onChange={(e) => set("annual_family_income")(e.target.value)}
                  placeholder="e.g. 400000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Select value={form.state} onValueChange={set("state")}>
                  <SelectTrigger id="state">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="institution_type">Institution type</Label>
                <Select value={form.institution_type} onValueChange={set("institution_type")}>
                  <SelectTrigger id="institution_type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {INSTITUTION_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">
                        {t}
                      </SelectItem>
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
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Self-declared, and never required to see your matches. Some scholarships are reserved
              for specific categories — filling these in lets us check those too.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={form.category} onValueChange={set("category")}>
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNSET}>Prefer not to say</SelectItem>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c} className="uppercase">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select value={form.gender} onValueChange={set("gender")}>
                  <SelectTrigger id="gender">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNSET}>Prefer not to say</SelectItem>
                    {GENDERS.map((g) => (
                      <SelectItem key={g} value={g} className="capitalize">
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {error ? (
          isAuthError(error) ? (
            <div className="space-y-2 rounded-md border p-4 text-center">
              <p className="font-medium">You&rsquo;re signed out.</p>
              <p className="text-sm text-muted-foreground">Sign in again to save your profile.</p>
              <Button size="sm" asChild>
                <Link href="/">Sign in</Link>
              </Button>
            </div>
          ) : (
            <p role="alert" className="text-sm text-destructive">
              {error}
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
