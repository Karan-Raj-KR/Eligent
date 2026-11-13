import { LandingPage } from "@/components/landing-page";
import { SignedInHomeRedirect } from "@/components/signed-in-home-redirect";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata("home", "/");

export default function HomePage() {
  return (
    <>
      <SignedInHomeRedirect />
      <LandingPage />
    </>
  );
}
