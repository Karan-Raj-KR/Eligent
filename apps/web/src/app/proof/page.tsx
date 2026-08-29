import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createServerSupabase } from "@/lib/supabase/server";

export const metadata = {
  title: "How eligibility is decided · Cutoff",
  description: "Eligibility is arithmetic, not AI. Here is exactly how it is decided.",
};

// Read fresh: this page's whole purpose is to show what is actually in the
// database right now.
export const dynamic = "force-dynamic";

interface SeedCriterionRow {
  field: string;
  operator: string;
  value: unknown;
  display_text: string | null;
  source_text: string | null;
}

interface ExampleRow {
  name: string;
  url: string | null;
  criterion: SeedCriterionRow[] | null;
}

/** The six operators the schema permits. Mirrors the CHECK constraint. */
const OPERATORS: Array<{ op: string; means: string; example: string }> = [
  { op: "gte", means: "at least", example: "percentage gte 75 — you need 75 or more" },
  { op: "lte", means: "at most", example: "annual_family_income lte 600000 — 6,00,000 or less" },
  { op: "eq", means: "exactly", example: "year_of_study eq 1 — first year only" },
  { op: "in", means: "one of", example: "state in [Bihar, Odisha] — either state qualifies" },
  { op: "not_in", means: "none of", example: "branch not_in [MBA] — MBA is excluded" },
  { op: "between", means: "within a range", example: "cgpa between [7, 9] — inclusive on both ends" },
];

function formatValue(value: unknown): string {
  if (Array.isArray(value)) return `[${value.join(", ")}]`;
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** One real seeded criterion, or null when the database has none. Never invented. */
async function loadExample(): Promise<{ opportunity: ExampleRow; criterion: SeedCriterionRow } | null> {
  try {
    const supabase = await createServerSupabase();
    // opportunity and criterion are world-readable by RLS policy, so this works
    // signed out too — the trust page should not require an account.
    const { data, error } = await supabase
      .from("opportunity")
      .select("name, url, criterion(field, operator, value, display_text, source_text)")
      .limit(20);
    if (error || !Array.isArray(data)) return null;

    for (const row of data as ExampleRow[]) {
      const withQuote = (row?.criterion ?? []).find((c) => c?.source_text?.trim());
      if (row?.name && withQuote) return { opportunity: row, criterion: withQuote };
    }
    return null;
  } catch {
    // Unreachable database — fall through to the empty state, never a 500.
    return null;
  }
}

export default async function ProofPage() {
  const example = await loadExample();

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-2xl space-y-10">
        <header className="space-y-3">
          <Link href="/matches" className="text-sm text-muted-foreground underline underline-offset-2">
            ← Back to matches
          </Link>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Eligibility is arithmetic, not AI.</h1>
          <p className="text-base text-muted-foreground">
            No model decides whether you qualify. A verdict is a comparison between a number on your
            profile and a number written on the scholarship&rsquo;s own page — and we will show you both.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">A criterion is four things</h2>
          <p className="text-sm text-muted-foreground">
            A field, an operator, a value, and the sentence it came from. Nothing else. If a
            requirement cannot be written this way, it is not stored, and it never affects a verdict.
          </p>

          {example ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium text-muted-foreground">
                  A real one, from {example.opportunity.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <dl className="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-2 text-sm">
                  <dt className="text-muted-foreground">field</dt>
                  <dd className="font-mono">{example.criterion.field}</dd>
                  <dt className="text-muted-foreground">operator</dt>
                  <dd className="font-mono">{example.criterion.operator}</dd>
                  <dt className="text-muted-foreground">value</dt>
                  <dd className="font-mono">{formatValue(example.criterion.value)}</dd>
                </dl>
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Quoted verbatim from the page
                  </p>
                  <blockquote className="border-l-4 border-neutral-border pl-4 text-base font-medium leading-snug">
                    &ldquo;{example.criterion.source_text}&rdquo;
                  </blockquote>
                  {hostOf(example.opportunity.url) ? (
                    <p className="text-xs text-muted-foreground">
                      Source:{" "}
                      <a
                        href={example.opportunity.url ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-2"
                      >
                        {hostOf(example.opportunity.url)}
                      </a>
                    </p>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="space-y-2 p-8 text-center">
                <p className="font-medium">No criteria are loaded yet.</p>
                <p className="text-sm text-muted-foreground">
                  There is nothing in the database to show you, and we will not make up an example on a
                  page about not making things up. Load the seed data and this fills itself in.
                </p>
              </CardContent>
            </Card>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">The six operators</h2>
          <p className="text-sm text-muted-foreground">
            This is the entire vocabulary. There is no seventh.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[30rem] border-collapse text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-4 font-medium">Operator</th>
                  <th className="py-2 pr-4 font-medium">Means</th>
                  <th className="py-2 font-medium">Example</th>
                </tr>
              </thead>
              <tbody>
                {OPERATORS.map((o) => (
                  <tr key={o.op} className="border-b last:border-b-0">
                    <td className="py-2 pr-4 font-mono">{o.op}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{o.means}</td>
                    <td className="py-2 font-mono text-xs text-muted-foreground">{o.example}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">Three verdicts, decided by subtraction</h2>
          <div className="space-y-3">
            <div className="rounded-lg border border-positive-border bg-positive-soft p-4">
              <p className="font-semibold text-positive">Eligible</p>
              <p className="text-sm">Every criterion passed. No subtraction left to do.</p>
            </div>
            <div className="rounded-lg border border-attention-border bg-attention-soft p-4">
              <p className="font-semibold text-attention">Near miss</p>
              <p className="text-sm">
                Every failure is numeric and lands within 10% of the threshold — or the only failure is
                being exactly one year early. Anything else is not a near miss.
              </p>
            </div>
            <div className="rounded-lg border border-neutral-border bg-neutral-soft p-4">
              <p className="font-semibold">Not eligible</p>
              <p className="text-sm">
                A criterion failed that arithmetic cannot close: a category you are not in, or a field
                your profile does not state. A missing value is never guessed and never rounded in your
                favour — it counts as a failure and says so.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">Where the quote comes from</h2>
          <p className="text-sm text-muted-foreground">
            A language model reads each scholarship page once, offline, and proposes criteria. It is
            never trusted. Every proposal must quote a sentence that appears <em>verbatim</em> on the
            fetched page; the quote is checked character by character against the page text, and a
            criterion that fails that check is discarded and logged rather than stored. Values that
            arrive as prose rather than numbers are rejected too — never interpreted.
          </p>
          <p className="text-sm text-muted-foreground">
            Nothing that decides your verdict runs a model. The comparison is arithmetic, it runs on our
            server, and it would produce the same answer offline.
          </p>
        </section>

        <div className="flex flex-wrap gap-3 border-t pt-6">
          <Button size="touch" asChild>
            <Link href="/matches">Back to my matches</Link>
          </Button>
          <Button size="touch" variant="outline" asChild>
            <Link href="/onboarding">Edit my profile</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
