"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const YEARS = ["freshman", "sophomore", "junior", "senior", "grad"] as const;
const STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"] as const;

type ApplicantForm = {
  email: string;
  gpa: string;
  sat: string;
  act: string;
  income: string;
  state: string;
  major: string;
  year: (typeof YEARS)[number];
  firstGen: boolean;
  military: boolean;
  disability: boolean;
};

export default function Home() {
  const [step, setStep] = useState<"auth" | "profile" | "results">("auth");
  const [email, setEmail] = useState("");
  const [form, setForm] = useState<ApplicantForm>({
    email: "", gpa: "", sat: "", act: "", income: "", state: "", major: "", year: "freshman",
    firstGen: false, military: false, disability: false,
  });
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function signIn() {
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    if (!error) setStep("profile");
  }

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("applicants").select("*").eq("user_id", user.id).single();
    if (data) {
      setForm({
        email: data.email,
        gpa: data.gpa?.toString() ?? "",
        sat: data.sat?.toString() ?? "",
        act: data.act?.toString() ?? "",
        income: data.income?.toString() ?? "",
        state: data.state,
        major: data.major,
        year: data.year,
        firstGen: data.first_gen,
        military: data.military,
        disability: data.disability,
      });
    }
  }

  async function saveProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("applicants").upsert({
      user_id: user.id,
      email: form.email,
      gpa: form.gpa ? parseFloat(form.gpa) : null,
      sat: form.sat ? parseInt(form.sat) : null,
      act: form.act ? parseInt(form.act) : null,
      income: form.income ? parseInt(form.income) : null,
      state: form.state,
      major: form.major,
      year: form.year,
      first_gen: form.firstGen,
      military: form.military,
      disability: form.disability,
    });
    await runEvaluation();
  }

  async function runEvaluation() {
    setLoading(true);
    const res = await fetch("/api/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setResults(data);
    setStep("results");
    setLoading(false);
  }

  if (step === "auth") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Opportunity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@school.edu" required />
            </div>
            <Button className="w-full" onClick={signIn} disabled={!email}>Send Magic Link</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "profile") {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="gpa">GPA (0-4.0)</Label>
                  <Input id="gpa" type="number" step="0.01" min="0" max="4" value={form.gpa} onChange={e => setForm({...form, gpa: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sat">SAT (400-1600)</Label>
                  <Input id="sat" type="number" min="400" max="1600" value={form.sat} onChange={e => setForm({...form, sat: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="act">ACT (1-36)</Label>
                  <Input id="act" type="number" min="1" max="36" value={form.act} onChange={e => setForm({...form, act: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="income">Family Income ($)</Label>
                  <Input id="income" type="number" min="0" value={form.income} onChange={e => setForm({...form, income: e.target.value})} />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Select value={form.state} onValueChange={v => setForm({...form, state: v})}>
                    <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                    <SelectContent>
                      {STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="major">Major</Label>
                  <Input id="major" value={form.major} onChange={e => setForm({...form, major: e.target.value})} placeholder="Computer Science" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">Year</Label>
                  <Select value={form.year} onValueChange={v => setForm({...form, year: v as any})}>
                    <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
                    <SelectContent>
                      {YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Flags</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={form.firstGen} onChange={e => setForm({...form, firstGen: e.target.checked})} className="rounded" /> First Gen</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={form.military} onChange={e => setForm({...form, military: e.target.checked})} className="rounded" /> Military</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={form.disability} onChange={e => setForm({...form, disability: e.target.checked})} className="rounded" /> Disability</label>
                </div>
              </div>
              <Button className="w-full" onClick={saveProfile} disabled={loading}>{loading ? "Evaluating..." : "Find Scholarships"}</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Your Matches</h1>
          <Button variant="outline" onClick={() => setStep("profile")}>Edit Profile</Button>
        </div>
        <div className="space-y-4">
          {results.filter((r: any) => r.status === "eligible").map((r: any) => (
            <Card key={r.scholarship.id} className="border-green-500">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{r.scholarship.name}</h3>
                    <p className="text-sm text-muted-foreground">{r.scholarship.provider} • ${r.scholarship.amount.toLocaleString()}</p>
                  </div>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">Eligible</span>
                </div>
                <Button asChild className="mt-2">
                  <a href={r.scholarship.url} target="_blank" rel="noopener noreferrer">Open Application</a>
                </Button>
              </CardContent>
            </Card>
          ))}
          {results.filter((r: any) => r.status === "near-miss").map((r: any) => (
            <Card key={r.scholarship.id} className="border-yellow-500">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{r.scholarship.name}</h3>
                    <p className="text-sm text-muted-foreground">{r.scholarship.provider} • ${r.scholarship.amount.toLocaleString()}</p>
                  </div>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">Near Miss</span>
                </div>
                <p className="text-sm text-yellow-700 mt-2">{r.gap.message}</p>
                <Button variant="outline" asChild className="mt-2">
                  <a href={r.scholarship.url} target="_blank" rel="noopener noreferrer">View Anyway</a>
                </Button>
              </CardContent>
            </Card>
          ))}
          {results.filter((r: any) => r.status === "rejected").map((r: any) => (
            <Card key={r.scholarship.id} className="border-red-500">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{r.scholarship.name}</h3>
                    <p className="text-sm text-muted-foreground">{r.scholarship.provider} • ${r.scholarship.amount.toLocaleString()}</p>
                  </div>
                  <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">Not Eligible</span>
                </div>
                <p className="text-sm text-red-700 mt-2">{r.clause.message}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}