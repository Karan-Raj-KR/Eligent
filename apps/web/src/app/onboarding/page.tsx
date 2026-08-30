"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, CircleDot, Circle, Shield } from "lucide-react";
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

/* ------------------------------------------------------------------ */
/* Section progress indicator data                                     */
/* ------------------------------------------------------------------ */

const SECTIONS = [
  { id: "about", num: "01", label: "About you" },
  { id: "academics", num: "02", label: "Academics" },
  { id: "background", num: "03", label: "Background" },
  { id: "optional", num: "04", label: "Optional" },
] as const;

/* ------------------------------------------------------------------ */
/* Loading / matching checklist items                                   */
/* ------------------------------------------------------------------ */

const MATCH_STEPS = [
  "Reading your academic profile",
  "Checking eligibility criteria",
  "Finding matching opportunities",
  "Preparing your results",
] as const;

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

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

/* ================================================================== */
/* OnboardingPage                                                      */
/* ================================================================== */

export default function OnboardingPage() {
  const { user, setProfile } = useEligent();
  const router = useRouter();

  /* ---------- form state ---------- */
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
  const [saveError, setSaveError] = useState<string | null>(null);

  /* ---------- loading / matching state ---------- */
  const [phase, setPhase] = useState<"form" | "matching" | "ready">("form");
  const [matchStep, setMatchStep] = useState(0);
  const apiDoneRef = useRef(false);

  const numericIncome = Number(income.replace(/,/g, ""));
  const isEditing = Boolean(user);

  /* ---------- which section is "active" (scroll-spy-like) ---------- */
  const [activeSection, setActiveSection] = useState("about");
  useEffect(() => {
    function onScroll() {
      for (const s of [...SECTIONS].reverse()) {
        const el = document.getElementById(`section-${s.id}`);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top < window.innerHeight * 0.45) {
            setActiveSection(s.id);
            return;
          }
        }
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ---------- matching-step animation ---------- */
  useEffect(() => {
    if (phase !== "matching") return;
    const timer = setInterval(() => {
      setMatchStep((prev) => {
        const next = prev + 1;
        // If API is done and we've shown all steps → go to "ready"
        if (next >= MATCH_STEPS.length && apiDoneRef.current) {
          clearInterval(timer);
          setPhase("ready");
          return prev;
        }
        // Don't advance past the last step unless API is done
        if (next >= MATCH_STEPS.length) return prev;
        return next;
      });
    }, 700);
    return () => clearInterval(timer);
  }, [phase]);

  /* ---------- auto-navigate when "ready" ---------- */
  useEffect(() => {
    if (phase !== "ready") return;
    const t = setTimeout(() => router.push("/matches"), 1400);
    return () => clearTimeout(t);
  }, [phase, router]);

  /* ---------- validation ---------- */
  function validate(): boolean {
    const next: FormErrors = {};
    if (!name.trim()) next.name = "Tell us your name.";
    const c = Number(cgpa);
    if (cgpa === "" || Number.isNaN(c) || c < 0 || c > 10)
      next.cgpa = "Please enter a CGPA between 0 and 10.";
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

  /* ---------- submit ---------- */
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

    // Enter matching phase
    setPhase("matching");
    setMatchStep(0);
    apiDoneRef.current = false;
    setSaveError(null);

    try {
      await setProfile(profile);
      apiDoneRef.current = true;
    } catch (err) {
      // Go back to form on error
      setPhase("form");
      setSaveError(
        err instanceof Error
          ? err.message
          : "Something went wrong while checking your profile.",
      );
    }
  }

  /* ================================================================ */
  /* MATCHING / LOADING PHASE                                          */
  /* ================================================================ */

  if (phase === "matching" || phase === "ready") {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4">
        <div className="w-full max-w-lg text-center">
          {/* Progress bar */}
          <div className="mx-auto mb-10 h-1 w-64 overflow-hidden rounded-full bg-line/60">
            <div
              className="h-full rounded-full bg-cobalt transition-all duration-700 ease-out"
              style={{
                width:
                  phase === "ready"
                    ? "100%"
                    : `${((matchStep + 1) / MATCH_STEPS.length) * 85}%`,
              }}
            />
          </div>

          {/* Headline */}
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            {phase === "ready"
              ? "Your matches are ready."
              : "Finding opportunities for you."}
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-[0.95rem] leading-relaxed text-muted">
            {phase === "ready"
              ? "Let's see what you qualify for."
              : "Checking your profile against official eligibility criteria."}
          </p>

          {/* Checklist */}
          <div className="mx-auto mt-10 max-w-xs space-y-4 text-left">
            {MATCH_STEPS.map((label, i) => {
              const isDone =
                phase === "ready" ? true : i < matchStep;
              const isActive =
                phase !== "ready" && i === matchStep;
              return (
                <div
                  key={label}
                  className="flex items-center gap-3 transition-opacity duration-300"
                  style={{ opacity: isDone || isActive ? 1 : 0.35 }}
                >
                  {isDone ? (
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-lime text-lime-ink">
                      <Check size={14} strokeWidth={3} />
                    </span>
                  ) : isActive ? (
                    <span className="grid size-6 shrink-0 place-items-center text-cobalt">
                      <CircleDot size={18} className="animate-pulse" />
                    </span>
                  ) : (
                    <span className="grid size-6 shrink-0 place-items-center text-soft">
                      <Circle size={18} />
                    </span>
                  )}
                  <span
                    className={`text-[0.92rem] font-medium ${
                      isDone
                        ? "text-ink"
                        : isActive
                          ? "text-cobalt font-semibold"
                          : "text-soft"
                    }`}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Error retry (if it somehow fails during matching) */}
          {saveError && (
            <div className="mt-8">
              <p
                role="alert"
                className="text-[0.88rem] font-semibold text-coral-deep"
              >
                {saveError}
              </p>
              <button
                type="button"
                onClick={() => {
                  setPhase("form");
                  setSaveError(null);
                }}
                className="mt-3 text-[0.88rem] font-semibold text-cobalt hover:underline"
              >
                ← Go back and try again
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ================================================================ */
  /* FORM PHASE — two-column layout                                    */
  /* ================================================================ */

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16 lg:px-8 lg:py-20">
      {/* ---------------------------------------------------------- */}
      {/* LEFT — Welcome / Introduction                               */}
      {/* ---------------------------------------------------------- */}
      <div className="lg:sticky lg:top-28 lg:self-start">
        <p className="kicker text-cobalt">Welcome to ELIGENT</p>

        <h1 className="mt-4 font-display text-[2.3rem] font-bold leading-[1.08] tracking-tight text-ink sm:text-[2.7rem]">
          Let&apos;s find what you&apos;re eligible for.
        </h1>

        <p className="mt-4 max-w-sm text-[0.98rem] leading-relaxed text-muted">
          Tell us a little about yourself. We&apos;ll compare your profile with
          opportunities and show you what actually fits.
        </p>

        {/* Trust panel */}
        <div className="mt-8 rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-clay-sm)]">
          <div className="flex items-center gap-2.5 text-[0.78rem] font-bold uppercase tracking-[0.08em] text-soft">
            <Shield size={14} className="text-cobalt" aria-hidden />
            Your information
          </div>
          <p className="mt-2.5 text-[0.86rem] leading-relaxed text-muted">
            Used to check eligibility against official criteria.
          </p>
          <ul className="mt-3.5 space-y-2">
            {["Deterministic", "Transparent", "Student-first"].map((t) => (
              <li key={t} className="flex items-center gap-2.5 text-[0.86rem] font-medium text-ink">
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-lime/70 text-lime-ink">
                  <Check size={11} strokeWidth={3} />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        {/* Progress indicator — visual only */}
        <nav aria-label="Form sections" className="mt-8 hidden lg:block">
          <div className="space-y-1">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() =>
                  document
                    .getElementById(`section-${s.id}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${
                  activeSection === s.id
                    ? "bg-cobalt-tint text-cobalt"
                    : "text-muted hover:text-ink"
                }`}
              >
                <span
                  className={`font-display text-[0.72rem] font-bold tracking-wider ${
                    activeSection === s.id ? "text-cobalt" : "text-soft"
                  }`}
                >
                  {s.num}
                </span>
                <span className="text-[0.88rem] font-semibold">{s.label}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>

      {/* ---------------------------------------------------------- */}
      {/* RIGHT — Form                                                 */}
      {/* ---------------------------------------------------------- */}
      <ClayCard className="p-6 sm:p-9">
        <form onSubmit={handleSubmit} noValidate className="space-y-8">
          {/* ---- Section 1: About You ---- */}
          <fieldset id="section-about" className="space-y-5">
            <legend className="flex items-baseline gap-2.5 pb-2">
              <span className="font-display text-[0.7rem] font-bold tracking-[0.1em] text-cobalt">
                01
              </span>
              <span className="font-display text-[1.05rem] font-bold tracking-tight text-ink">
                About you
              </span>
            </legend>

            <ClayField label="Full name" htmlFor="full-name" hint="What should we call you?">
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
          </fieldset>

          <div className="h-px bg-line/60" aria-hidden />

          {/* ---- Section 2: Academics ---- */}
          <fieldset id="section-academics" className="space-y-5">
            <legend className="flex items-baseline gap-2.5 pb-2">
              <span className="font-display text-[0.7rem] font-bold tracking-[0.1em] text-cobalt">
                02
              </span>
              <span className="font-display text-[1.05rem] font-bold tracking-tight text-ink">
                Academics
              </span>
            </legend>

            <div className="grid gap-5 sm:grid-cols-2">
              <ClayField label="CGPA" htmlFor="cgpa" hint="Your current CGPA, out of 10">
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
                hint="Most opportunities state cutoffs as percentages"
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

              <ClayField label="Year of study" htmlFor="year" hint="Which year are you currently in?">
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

              <ClayField label="Branch" htmlFor="branch" hint="Your current course / branch">
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
            </div>
          </fieldset>

          <div className="h-px bg-line/60" aria-hidden />

          {/* ---- Section 3: Background ---- */}
          <fieldset id="section-background" className="space-y-5">
            <legend className="flex items-baseline gap-2.5 pb-2">
              <span className="font-display text-[0.7rem] font-bold tracking-[0.1em] text-cobalt">
                03
              </span>
              <span className="font-display text-[1.05rem] font-bold tracking-tight text-ink">
                Background
              </span>
            </legend>

            <div className="grid gap-5 sm:grid-cols-2">
              <ClayField label="State" htmlFor="state" hint="Where is your institution located?">
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
            </div>

            <ClayField
              label="Annual family income"
              htmlFor="income"
              hint={
                numericIncome > 0
                  ? `That's about ${inrCompact(numericIncome)} per year. This helps us check income-based eligibility.`
                  : "Approximate annual household income. This helps us check income-based eligibility."
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
          </fieldset>

          <div className="h-px bg-line/60" aria-hidden />

          {/* ---- Section 4: Optional ---- */}
          <fieldset id="section-optional" className="space-y-5">
            <legend className="flex items-baseline gap-2.5 pb-2">
              <span className="font-display text-[0.7rem] font-bold tracking-[0.1em] text-soft">
                04
              </span>
              <span className="font-display text-[1.05rem] font-bold tracking-tight text-ink">
                Optional
              </span>
              <span className="ml-1 rounded-md bg-surface px-2 py-0.5 text-[0.7rem] font-semibold text-soft shadow-[var(--shadow-clay-sm)]">
                skip if you prefer
              </span>
            </legend>

            <div className="grid gap-5 sm:grid-cols-2">
              <ClayField label="Category" htmlFor="category" optional hint="Some opportunities are restricted by category">
                <ClaySelect
                  id="category"
                  name="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">Prefer not to say</option>
                  {(["General", "OBC", "SC", "ST", "EWS", "Other"] as const).map(
                    (cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ),
                  )}
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
          </fieldset>

          {/* ---- CTA ---- */}
          <div className="pt-4">
            <ClayButton
              type="submit"
              variant="primary"
              block
              size="lg"
              icon={<ArrowRight size={18} />}
            >
              {isEditing ? "Update & find my matches" : "Find my matches"}
            </ClayButton>

            {saveError && (
              <div className="mt-4 rounded-xl border border-coral-tint-2 bg-coral-tint p-4" role="alert">
                <p className="text-[0.88rem] font-semibold text-coral-deep">
                  {saveError}
                </p>
                <button
                  type="button"
                  onClick={() => setSaveError(null)}
                  className="mt-2 text-[0.84rem] font-semibold text-cobalt hover:underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            <p className="mt-3 text-center text-[0.82rem] text-soft">
              Eligibility checking is free.
            </p>
          </div>
        </form>
      </ClayCard>
    </div>
  );
}