"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChecklistSkeleton } from "@/components/skeletons";
import { apiGet, apiSend, isAuthError } from "@/lib/api";
import type { ApplicationDetail, Requirement } from "@/lib/types";

function SourceTag({ source }: { source: Requirement["source"] }) {
  const official = source === "official";
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
        official ? "bg-primary text-primary-foreground" : "border border-primary text-primary"
      }`}
    >
      {official ? "On the official list" : "Reported by students"}
    </span>
  );
}

function RequirementRow({
  requirement,
  applicationId,
  onChange,
}: {
  requirement: Requirement;
  applicationId: string;
  onChange: (next: Requirement) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle(checked: boolean) {
    const previous = requirement.user_has;
    setSaving(true);
    setError(null);
    onChange({ ...requirement, user_has: checked }); // optimistic
    try {
      const result = await apiSend<Requirement>(`/api/application/${applicationId}/requirement`, "PATCH", {
        requirement_id: requirement.id,
        user_has: checked,
      });
      if (!result.ok) {
        onChange({ ...requirement, user_has: previous }); // roll back
        setError(result.error);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="space-y-1 border-b py-1.5 last:border-b-0">
      <label className="flex min-h-11 cursor-pointer items-center gap-3 py-1">
        <input
          type="checkbox"
          className="h-5 w-5 shrink-0 rounded border-input accent-primary"
          checked={requirement.user_has === true}
          disabled={saving}
          onChange={(e) => void toggle(e.target.checked)}
        />
        <span className="min-w-0 flex-1 text-sm leading-snug">{requirement.document_type}</span>
        <SourceTag source={requirement.source} />
      </label>
      {error ? (
        <p role="alert" className="pl-8 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </li>
  );
}

export default function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [detail, setDetail] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiGet<ApplicationDetail>(`/api/application/${id}`);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDetail(result.data);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const requirements = detail?.requirements ?? [];
  const opportunity = detail?.application?.opportunity ?? null;
  const official = requirements.filter((r) => r.source === "official");
  const community = requirements.filter((r) => r.source === "community");
  const ready = requirements.filter((r) => r.user_has === true).length;

  function replace(next: Requirement) {
    setDetail((current) =>
      current
        ? { ...current, requirements: current.requirements.map((r) => (r.id === next.id ? next : r)) }
        : current,
    );
  }

  return (
    <main className="min-h-screen p-4 py-10">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/matches">← Back to matches</Link>
        </Button>

        {loading ? <ChecklistSkeleton /> : null}

        {error ? (
          <Card>
            <CardContent className="space-y-3 p-8 text-center">
              {isAuthError(error) ? (
                <>
                  <p className="font-medium">You&rsquo;re signed out.</p>
                  <p className="text-sm text-muted-foreground">Sign in again to open this application.</p>
                  <div className="flex justify-center pt-2">
                    <Button size="touch" asChild>
                      <Link href="/">Sign in</Link>
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="font-medium">We couldn&rsquo;t open this application.</p>
                  <p role="alert" className="text-sm text-muted-foreground">
                    {error}
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 pt-2">
                    <Button variant="outline" size="touch" onClick={() => void load()}>
                      Try again
                    </Button>
                    <Button variant="ghost" size="touch" asChild>
                      <Link href="/matches">Back to matches</Link>
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ) : null}

        {!loading && !error ? (
          <>
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight">
                {opportunity?.name ?? "Your application"}
              </h1>
              {opportunity ? (
                <p className="text-sm text-muted-foreground">
                  {[opportunity.provider, opportunity.amount].filter(Boolean).join(" · ")}
                </p>
              ) : null}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Documents{" "}
                  <span className="text-base font-normal text-muted-foreground">
                    ({ready} of {requirements.length} ready)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {requirements.length === 0 ? (
                  <p className="py-2 text-sm text-muted-foreground">
                    No documents are listed for this scholarship yet. Check the official page before
                    you start — and report it if they ask for something we didn&rsquo;t show.
                  </p>
                ) : (
                  <div className="space-y-6">
                    {official.length > 0 ? (
                      <div>
                        <p className="pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          From the official list
                        </p>
                        <ul>
                          {official.map((r) => (
                            <RequirementRow key={r.id} requirement={r} applicationId={id} onChange={replace} />
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {community.length > 0 ? (
                      <div>
                        <p className="pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Reported by other students
                        </p>
                        <p className="pb-1 text-xs text-muted-foreground">
                          Not on the official list. Students told us the portal asked for these anyway.
                        </p>
                        <ul>
                          {community.map((r) => (
                            <RequirementRow key={r.id} requirement={r} applicationId={id} onChange={replace} />
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>

            {opportunity?.url ? (
              <Button asChild className="w-full" size="lg">
                <a href={opportunity.url} target="_blank" rel="noopener noreferrer">
                  Open the application form
                </a>
              </Button>
            ) : null}
            <p className="text-center text-xs text-muted-foreground">
              We never submit anything for you. You fill in the last field and press submit yourself.
            </p>
          </>
        ) : null}
      </div>
    </main>
  );
}
