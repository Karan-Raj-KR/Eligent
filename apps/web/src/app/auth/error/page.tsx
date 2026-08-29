import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// /auth/callback redirects here when the OAuth code exchange fails. Before this
// existed that redirect landed on a 404.
export default function AuthError() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign-in didn&rsquo;t complete</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Google sent us back without a usable session. This is almost always an expired link or a
            cancelled consent screen — trying again usually works.
          </p>
          <Button asChild className="w-full">
            <Link href="/">Back to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
