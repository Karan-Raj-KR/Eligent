import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignInButton } from "@/components/sign-in-button";
import { currentUser } from "@/lib/session";

export default async function Home() {
  const { supabase, user } = await currentUser();

  if (user && supabase) {
    // Straight past the landing page for someone already signed in — to their
    // matches if they have a profile, to onboarding if they do not.
    let hasProfile = false;
    try {
      const { data } = await supabase.from("profile").select("id").eq("id", user.id).maybeSingle();
      hasProfile = Boolean(data);
    } catch {
      // Treat an unreadable profile as "not set up yet" rather than failing the
      // page; onboarding is safe to show twice, a 500 is not.
    }
    redirect(hasProfile ? "/matches" : "/onboarding");
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-4xl font-bold tracking-tight">Eligent</h1>
          <p className="text-muted-foreground">
            Stop applying to scholarships you were never eligible for.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">How it works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="space-y-3 text-sm text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">1. Tell us your marks once.</span> Your
                CGPA, percentage, year, and family income.
              </li>
              <li>
                <span className="font-medium text-foreground">2. We do the arithmetic.</span> Every
                scholarship is sorted into eligible, near miss, or rejected — with the exact clause
                that ruled you out.
              </li>
              <li>
                <span className="font-medium text-foreground">3. Near misses show the gap.</span> Not
                &ldquo;you don&rsquo;t qualify&rdquo;, but &ldquo;you are 3% short&rdquo;.
              </li>
            </ol>
            <SignInButton />
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          We never submit an application for you. You always press the button.
        </p>
      </div>
    </main>
  );
}
