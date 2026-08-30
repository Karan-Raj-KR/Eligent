"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Plus } from "lucide-react";
import { useEligent } from "@/components/provider";
import { ClayBadge, ClayButton, ClayCard, ClayField, ClayInput, ClaySelect } from "@/components/clay";

const TYPE_OPTIONS = [
  { label: "Hackathon", value: "hackathon" },
  { label: "Scholarship / Grant", value: "scholarship" },
  { label: "Internship", value: "internship" },
  { label: "Job", value: "job" },
  { label: "Event / Conference", value: "event" },
  { label: "Competition", value: "competition" },
  { label: "Fellowship", value: "fellowship" },
  { label: "Workshop / Course", value: "workshop" },
];

const LOCATION_OPTIONS = [
  { label: "India", value: "india" },
  { label: "Abroad", value: "abroad" },
  { label: "Online / Remote", value: "online" },
];

export default function CreateOpportunityPage() {
  const { signedIn, hydrated } = useEligent();
  const router = useRouter();

  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [category, setCategory] = useState("hackathon");
  const [locationType, setLocationType] = useState("india");
  const [deadline, setDeadline] = useState("");
  const [amount, setAmount] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (hydrated && !signedIn) {
    router.replace("/signin");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Title is required");
      return;
    }
    if (!url.trim()) {
      setError("Application URL is required");
      return;
    }

    try {
      new URL(url.trim());
    } catch {
      setError("Please enter a valid URL (including http:// or https://)");
      return;
    }

    if (!description.trim()) {
      setError("Description is required");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          organization: organization.trim(),
          category,
          location_type: locationType,
          deadline: deadline || null,
          amount: amount.trim() || null,
          url: url.trim(),
          description: description.trim(),
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Couldn't create this opportunity.");
      }

      setSubmittedSuccess(true);
      setTimeout(() => {
        router.push("/opportunities/my");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create this opportunity.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <ClayBadge tone="cobalt" className="!px-3 !py-1.5 !text-[0.82rem]">
            CREATOR PORTAL
          </ClayBadge>
          <span className="text-[0.85rem] font-semibold text-muted">
            Post an opportunity
          </span>
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Create an opportunity.
        </h1>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-muted">
          Share a scholarship, hackathon, internship, or event with ELIGENT students.
        </p>
      </div>

      {/* Info Box */}
      <ClayCard className="mb-8 p-5 !bg-surface/60 !border-line/70">
        <p className="text-[0.86rem] leading-relaxed text-muted">
          <strong className="text-ink">Publishing status:</strong> Submissions start in{" "}
          <span className="font-semibold text-cobalt">Pending review</span>. Once reviewed for validity, they become discoverable across the platform.
        </p>
      </ClayCard>

      {/* Form */}
      <ClayCard className="p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <ClayField label="Opportunity Title" htmlFor="opp-title">
              <ClayInput
                id="opp-title"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. AI Innovation Hackathon 2026"
              />
            </ClayField>

            <ClayField label="Organization / Host" htmlFor="opp-org" optional>
              <ClayInput
                id="opp-org"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="e.g. ABC Technologies"
              />
            </ClayField>

            <ClayField label="Opportunity Type" htmlFor="opp-type">
              <ClaySelect
                id="opp-type"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </ClaySelect>
            </ClayField>

            <ClayField label="Location Format" htmlFor="opp-location">
              <ClaySelect
                id="opp-location"
                value={locationType}
                onChange={(e) => setLocationType(e.target.value)}
              >
                {LOCATION_OPTIONS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </ClaySelect>
            </ClayField>

            <ClayField label="Official Application / Registration URL" htmlFor="opp-url">
              <ClayInput
                id="opp-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                placeholder="https://..."
              />
            </ClayField>

            <ClayField label="Deadline" htmlFor="opp-deadline" optional>
              <ClayInput
                id="opp-deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </ClayField>

            <ClayField label="Prize / Amount / Stipend" htmlFor="opp-amount" optional>
              <ClayInput
                id="opp-amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. ₹2.5 Lakh Prize Pool or ₹35,000 / month"
              />
            </ClayField>

            <ClayField label="Tags (comma-separated)" htmlFor="opp-tags" optional>
              <ClayInput
                id="opp-tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g. AI, Software, Innovation"
              />
            </ClayField>
          </div>

          <ClayField label="Description & Requirements" htmlFor="opp-desc">
            <textarea
              id="opp-desc"
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              placeholder="Describe what students will build/do, team size requirements, or who is eligible to apply..."
              className="clay-input w-full p-4 text-[0.92rem]"
            />
          </ClayField>

          {error && (
            <div className="rounded-xl border border-[#ffd0da] bg-coral-tint/70 p-4 text-[0.88rem] text-coral-deep flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {submittedSuccess && (
            <div className="rounded-xl border border-[#c7f36b] bg-lime-tint/70 p-4 text-[0.88rem] font-semibold text-ink flex items-center gap-2">
              <CheckCircle2 size={16} className="text-lime-ink" />
              Submitted for review! Redirecting to your created items...
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-3">
            <ClayButton
              variant="soft"
              type="button"
              onClick={() => router.back()}
            >
              Cancel
            </ClayButton>
            <ClayButton
              variant="primary"
              type="submit"
              size="lg"
              disabled={submitting}
              icon={<Plus size={16} />}
            >
              {submitting ? "Submitting..." : "Submit opportunity"}
            </ClayButton>
          </div>
        </form>
      </ClayCard>
    </div>
  );
}
