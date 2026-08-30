"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, UserRound, Sparkles, AlertCircle } from "lucide-react";
import { useEligent } from "@/components/provider";
import { ClayBadge, ClayButton, ClayCard, ClayField, ClayInput, ClaySelect } from "@/components/clay";
import {
  BRANCH_OPTIONS,
  CATEGORY_OPTIONS,
  GENDER_OPTIONS,
  INSTITUTION_TYPE_OPTIONS,
  STATE_OPTIONS,
  YEAR_OPTIONS,
} from "@/lib/form-options";
import type { UserProfile } from "@/lib/types";

export default function ProfilePage() {
  const { user, setProfile, hydrated, signedIn } = useEligent();
  const router = useRouter();

  const [name, setName] = useState(user?.name ?? "");
  const [cgpa, setCgpa] = useState(user?.cgpa ? String(user.cgpa) : "");
  const [percentage, setPercentage] = useState(user?.percentage ? String(user.percentage) : "");
  const [year, setYear] = useState(user?.year ? String(user.year) : "3");
  const [branch, setBranch] = useState(user?.branch ?? "Computer Science");
  const [state, setState] = useState(user?.state ?? "Karnataka");
  const [income, setIncome] = useState(user?.income ? String(user.income) : "250000");
  const [institutionType, setInstitutionType] = useState(user?.institutionType ?? "Government");
  const [category, setCategory] = useState(user?.category ?? "General");
  const [gender, setGender] = useState(user?.gender ?? "Male");
  const [skills, setSkills] = useState(user?.skills?.join(", ") ?? "React, TypeScript, Python");
  const [interests, setInterests] = useState(user?.interests?.join(", ") ?? "AI, Open Source, Hackathons");

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (hydrated && !signedIn) {
    router.replace("/signin");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSavedSuccess(false);

    if (!name.trim()) {
      setError("Full name is required");
      return;
    }

    const parsedCgpa = parseFloat(cgpa);
    if (isNaN(parsedCgpa) || parsedCgpa < 0 || parsedCgpa > 10) {
      setError("Please enter a valid CGPA between 0.0 and 10.0");
      return;
    }

    const parsedIncome = parseFloat(income);
    if (isNaN(parsedIncome) || parsedIncome < 0) {
      setError("Please enter a valid annual family income");
      return;
    }

    setSaving(true);
    try {
      const updated: UserProfile = {
        name: name.trim(),
        cgpa: parsedCgpa,
        percentage: percentage ? parseFloat(percentage) : undefined,
        year: parseInt(year, 10),
        branch,
        state,
        income: parsedIncome,
        institutionType: institutionType as UserProfile["institutionType"],
        category: category as UserProfile["category"],
        gender,
        skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
        interests: interests.split(",").map((s) => s.trim()).filter(Boolean),
      };

      await setProfile(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header Banner */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <ClayBadge tone="cobalt" className="!px-3 !py-1.5 !text-[0.82rem]">
            STUDENT PROFILE
          </ClayBadge>
          <span className="text-[0.85rem] font-semibold text-muted">
            Matching Hub
          </span>
        </div>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          My Profile &amp; Preferences
        </h1>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-muted">
          Keep your academic and interest details up to date to get matched with real opportunities.
        </p>
      </div>

      {/* Info Callout */}
      <ClayCard className="mb-8 p-5 sm:p-6 !bg-cobalt-tint/40 !border-cobalt/20">
        <div className="flex items-start gap-3.5">
          <div aria-hidden className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-cobalt text-white">
            <Sparkles size={18} />
          </div>
          <div>
            <p className="font-display text-[0.98rem] font-bold text-ink">
              Your profile powers opportunity matching
            </p>
            <p className="mt-1 text-[0.86rem] leading-relaxed text-muted">
              ELIGENT evaluates your profile against official criteria for scholarships, hackathons, and events.
              Free checks use these exact figures without guessing.
            </p>
          </div>
        </div>
      </ClayCard>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        <ClayCard className="p-6 sm:p-8 space-y-6">
          <h2 className="font-display text-xl font-bold text-ink flex items-center gap-2">
            <UserRound size={20} className="text-cobalt" />
            Academic &amp; Personal Info
          </h2>

          <div className="grid gap-6 sm:grid-cols-2">
            <ClayField label="Full name" htmlFor="profile-name">
              <ClayInput
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Priya Sharma"
              />
            </ClayField>

            <ClayField label="CGPA (out of 10)" htmlFor="profile-cgpa">
              <ClayInput
                id="profile-cgpa"
                value={cgpa}
                onChange={(e) => setCgpa(e.target.value)}
                required
                placeholder="e.g. 8.5"
              />
            </ClayField>

            <ClayField label="Year of study" htmlFor="profile-year">
              <ClaySelect
                id="profile-year"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              >
                {YEAR_OPTIONS.map((y) => (
                  <option key={y.value} value={y.value}>
                    {y.label}
                  </option>
                ))}
              </ClaySelect>
            </ClayField>

            <ClayField label="Branch / Major" htmlFor="profile-branch">
              <ClaySelect
                id="profile-branch"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
              >
                {BRANCH_OPTIONS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </ClaySelect>
            </ClayField>

            <ClayField label="State of domicile" htmlFor="profile-state">
              <ClaySelect
                id="profile-state"
                value={state}
                onChange={(e) => setState(e.target.value)}
              >
                {STATE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </ClaySelect>
            </ClayField>

            <ClayField label="Annual family income (₹)" htmlFor="profile-income">
              <ClayInput
                id="profile-income"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                required
                placeholder="e.g. 250000"
              />
            </ClayField>

            <ClayField label="Institution type" htmlFor="profile-institution">
              <ClaySelect
                id="profile-institution"
                value={institutionType}
                onChange={(e) => setInstitutionType(e.target.value as UserProfile["institutionType"])}
              >
                {INSTITUTION_TYPE_OPTIONS.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </ClaySelect>
            </ClayField>

            <ClayField label="Category" htmlFor="profile-category">
              <ClaySelect
                id="profile-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as UserProfile["category"])}
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </ClaySelect>
            </ClayField>

            <ClayField label="Gender" htmlFor="profile-gender">
              <ClaySelect
                id="profile-gender"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                {GENDER_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </ClaySelect>
            </ClayField>

            <ClayField label="12th / Diploma Percentage" htmlFor="profile-percentage" optional>
              <ClayInput
                id="profile-percentage"
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                placeholder="e.g. 88.5"
              />
            </ClayField>
          </div>

          <div className="border-t border-line/60 pt-6 space-y-6">
            <h3 className="font-display text-lg font-bold text-ink">
              Skills &amp; Interests (Optional)
            </h3>
            <p className="text-[0.84rem] text-muted -mt-4">
              Comma-separated terms used to recommend matching hackathons, events, and internships.
            </p>

            <div className="grid gap-6 sm:grid-cols-2">
              <ClayField label="Skills" htmlFor="profile-skills" optional>
                <ClayInput
                  id="profile-skills"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="e.g. React, Python, Machine Learning"
                />
              </ClayField>

              <ClayField label="Interests" htmlFor="profile-interests" optional>
                <ClayInput
                  id="profile-interests"
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  placeholder="e.g. Open Source, Cloud, Hackathons"
                />
              </ClayField>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-[#ffd0da] bg-coral-tint/70 p-4 text-[0.88rem] text-coral-deep flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {savedSuccess && (
            <div className="rounded-xl border border-[#c7f36b] bg-lime-tint/70 p-4 text-[0.88rem] font-semibold text-ink flex items-center gap-2">
              <Check size={16} className="text-lime-ink" />
              Profile updated successfully! Matches recalculated.
            </div>
          )}

          <div className="pt-2 flex items-center justify-end">
            <ClayButton
              variant="primary"
              type="submit"
              size="lg"
              disabled={saving}
            >
              {saving ? "Saving changes…" : "Update profile"}
            </ClayButton>
          </div>
        </ClayCard>
      </form>
    </div>
  );
}
