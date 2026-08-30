"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { useEligent } from "@/components/provider";
import {
  ClayButton,
  ClayCard,
  ClayField,
  ClayInput,
  ClaySelect,
} from "@/components/clay";
import { BRANCH_OPTIONS, STATE_OPTIONS } from "@/lib/form-options";
import { inrCompact } from "@/lib/format";
import type {
  Category,
  InstitutionType,
  UserProfile,
} from "@/lib/types";

interface FormErrors {
  name?: string;
  cgpa?: string;
  percentage?: string;
  year?: string;
  branch?: string;
  state?: string;
  income?: string;
  institutionType?: string;
}

export default function OnboardingPage() {
  const { user, setProfile } = useEligent();
  const router = useRouter();

  const [name, setName] = useState(user?.name ?? "");
  const [cgpa, setCgpa] = useState(user ? String(user.cgpa) : "");
  const [percentage, setPercentage] = useState(
    user?.percentage != null ? String(user.percentage) : "",
  );
  const [gender, setGender] = useState(user?.gender ?? "");
  const [year, setYear] = useState(user ? String(user.year) : "");
  const [branch, setBranch] = useState(user?.branch ?? "");
  const [state, setState] = useState(user?.state ?? "");
  const [income, setIncome] = useState(user ? String(user.income) : "");
  const [institutionType, setInstitutionType] = useState(
    user?.institutionType ?? "",
  );
  const [category, setCategory] = useState(user?.category ?? "");
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const numericIncome = Number(income.replace(/,/g, ""));
  const isEditing = Boolean(user);

  function validate(): boolean {
    const next: FormErrors = {};
    if (!name.trim()) next.name = "Tell us your name.";
    const c = Number(cgpa);
    if (cgpa === "" || Number.isNaN(c) || c < 0 || c > 10)
      next.cgpa = "CGPA must be between 0 and 10.";
    const pct = Number(percentage);
    if (percentage === "" || Number.isNaN(pct) || pct < 0 || pct > 100)
      next.percentage = "Percentage must be between 0 and 100.";
    if (!year) next.year = "Select your year of study.";
    if (!branch) next.branch = "Select your branch.";
    if (!state) next.state = "Select your state.";
    if (income === "" || Number.isNaN(numericIncome) || numericIncome <= 0)
      next.income = "Enter your annual family income.";
    if (!institutionType) next.institutionType = "Select your institution type.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const profile: UserProfile = {
      name: name.trim(),
      cgpa: Number(cgpa),
      year: Number(year),
      branch,
      state,
      income: numericIncome,
      institutionType: institutionType as InstitutionType,
      category: (category || "General") as Category,
      percentage: Number(percentage),
      gender: gender || null,
    };
    setSaving(true);
    setSaveError(null);
    try {
      // Persists to Postgres and refreshes matches before we navigate, so
      // /matches never renders against a profile the server hasn't stored.
      await setProfile(profile);
      router.push("/matches");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_1.15fr] lg:gap-16 lg:px-8 lg:py-20">
      <div className="lg:sticky lg:top-28 lg:self-start">
        <p className="kicker text-cobalt">Your profile</p>
        <h1 className="mt-4 font-display text-4xl font-bold leading-[1.05] tracking-tight text-ink sm:text-[2.75rem]">
          Tell us about yourself.
        </h1>
        <p className="mt-4 max-w-sm text-[1rem] leading-relaxed text-muted">
          We'll match you against opportunity eligibility criteria — official,
          published ones only.
        </p>
        <div className="mt-8 flex items-start gap-3 rounded-2xl border border-line bg-surface px-4 py-4 shadow-[var(--shadow-clay-sm)]">
          <Sparkles size={18} className="mt-0.5 shrink-0 text-cobalt" aria-hidden />
          <p className="text-[0.85rem] leading-relaxed text-muted">
            Your details are used only to check criteria. Eligibility stays
            free and deterministic.
          </p>
        </div>
      </div>

      <ClayCard className="p-6 sm:p-9">
        <form onSubmit={handleSubmit} noValidate className="grid gap-5">
          <ClayField label="Full name" htmlFor="full-name">
            <ClayInput
              id="full-name"
              name="full-name"
              autoComplete="name"
              placeholder="e.g. Aarav Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              invalid={Boolean(errors.name)}
              aria-invalid={Boolean(errors.name)}
            />
            {errors.name && (
              <p className="text-[0.82rem] font-medium text-coral-deep" role="alert">
                {errors.name}
              </p>
            )}
          </ClayField>

          <div className="grid gap-5 sm:grid-cols-2">
            <ClayField
              label="CGPA"
              htmlFor="cgpa"
              hint="Out of 10, up to one decimal"
            >
              <ClayInput
                id="cgpa"
                name="cgpa"
                inputMode="decimal"
                placeholder="e.g. 8.4"
                value={cgpa}
                onChange={(e) => setCgpa(e.target.value)}
                invalid={Boolean(errors.cgpa)}
                aria-invalid={Boolean(errors.cgpa)}
              />
              {errors.cgpa && (
                <p className="text-[0.82rem] font-medium text-coral-deep" role="alert">
                  {errors.cgpa}
                </p>
              )}
            </ClayField>
            <ClayField
              label="Aggregate percentage"
              htmlFor="percentage"
              hint="Most opportunities state their cutoff as a percentage"
            >
              <ClayInput
                id="percentage"
                name="percentage"
                inputMode="decimal"
                placeholder="e.g. 82"
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                invalid={Boolean(errors.percentage)}
                aria-invalid={Boolean(errors.percentage)}
              />
              {errors.percentage && (
                <p className="text-[0.82rem] font-medium text-coral-deep" role="alert">
                  {errors.percentage}
                </p>
              )}
            </ClayField>
            <ClayField
              label="Year of study"
              htmlFor="year"
              hint="Current academic year"
            >
              <ClaySelect
                id="year"
                name="year"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                invalid={Boolean(errors.year)}
                aria-invalid={Boolean(errors.year)}
              >
                <option value="">Select year</option>
                {[1, 2, 3, 4, 5].map((y) => (
                  <option key={y} value={y}>
                    Year {y}
                  </option>
                ))}
              </ClaySelect>
              {errors.year && (
                <p className="text-[0.82rem] font-medium text-coral-deep" role="alert">
                  {errors.year}
                </p>
              )}
            </ClayField>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <ClayField label="Branch" htmlFor="branch">
              <ClaySelect
                id="branch"
                name="branch"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                invalid={Boolean(errors.branch)}
                aria-invalid={Boolean(errors.branch)}
              >
                <option value="">Select branch</option>
                {BRANCH_OPTIONS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </ClaySelect>
              {errors.branch && (
                <p className="text-[0.82rem] font-medium text-coral-deep" role="alert">
                  {errors.branch}
                </p>
              )}
            </ClayField>
            <ClayField label="State" htmlFor="state" hint="Where you're domiciled">
              <ClaySelect
                id="state"
                name="state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                invalid={Boolean(errors.state)}
                aria-invalid={Boolean(errors.state)}
              >
                <option value="">Select state</option>
                {STATE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </ClaySelect>
              {errors.state && (
                <p className="text-[0.82rem] font-medium text-coral-deep" role="alert">
                  {errors.state}
                </p>
              )}
            </ClayField>
          </div>

          <ClayField
            label="Annual family income"
            htmlFor="income"
            hint={
              numericIncome > 0
                ? `That's about ${inrCompact(numericIncome)} per year.`
                : "Enter in ₹, e.g. 250000"
            }
          >
            <div className="relative">
              <span
                aria-hidden
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[0.95rem] font-semibold text-soft"
              >
                ₹
              </span>
              <ClayInput
                id="income"
                name="income"
                inputMode="numeric"
                placeholder="250000"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                className="!pl-9"
                invalid={Boolean(errors.income)}
                aria-invalid={Boolean(errors.income)}
              />
            </div>
            {errors.income && (
              <p className="text-[0.82rem] font-medium text-coral-deep" role="alert">
                {errors.income}
              </p>
            )}
          </ClayField>

          <div className="grid gap-5 sm:grid-cols-2">
            <ClayField label="Institution type" htmlFor="institution-type">
              <ClaySelect
                id="institution-type"
                name="institution-type"
                value={institutionType}
                onChange={(e) => setInstitutionType(e.target.value)}
                invalid={Boolean(errors.institutionType)}
                aria-invalid={Boolean(errors.institutionType)}
              >
                <option value="">Select type</option>
                {(["Government", "Private", "Aided"] as const).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </ClaySelect>
              {errors.institutionType && (
                <p className="text-[0.82rem] font-medium text-coral-deep" role="alert">
                  {errors.institutionType}
                </p>
              )}
            </ClayField>
            <ClayField label="Category" htmlFor="category" optional>
              <ClaySelect
                id="category"
                name="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">Prefer not to say</option>
                {(
                  ["General", "OBC", "SC", "ST", "EWS", "Other"] as const
                ).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </ClaySelect>
            </ClayField>
            <ClayField
              label="Gender"
              htmlFor="gender"
              optional
              hint="Some opportunities are restricted by gender"
            >
              <ClaySelect
                id="gender"
                name="gender"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="">Prefer not to say</option>
                {(["Male", "Female", "Other"] as const).map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </ClaySelect>
            </ClayField>
          </div>

          <div className="pt-2">
            <ClayButton
              type="submit"
              variant="primary"
              block
              size="lg"
              disabled={saving}
              icon={<ArrowRight size={18} />}
            >
              {saving
                ? "Saving…"
                : isEditing
                  ? "Update details & see matches"
                  : "See what I qualify for"}
            </ClayButton>
            {saveError && (
              <p role="alert" className="mt-3 text-center text-[0.85rem] font-semibold text-coral-deep">
                {saveError}
              </p>
            )}
            <p className="mt-3 text-center text-[0.8rem] text-soft">
              Evaluated against official criteria only
            </p>
          </div>
        </form>
      </ClayCard>
    </div>
  );
}