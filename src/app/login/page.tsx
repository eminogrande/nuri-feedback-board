import type { Metadata } from "next";
import { PasskeySignInButton, UserMenu } from "@/components/auth";

export const metadata: Metadata = { title: "Sign in | Nuri Feedback" };

export default function LoginPage() {
  return (
    <section className="container mx-auto max-w-lg space-y-8 px-4 py-12">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">Sign in to Nuri Feedback</h1>
        <p className="text-muted">Use your linked Nuri passkey to submit feedback and vote. Browsing the board does not require an account.</p>
      </div>
      <UserMenu />
      <PasskeySignInButton />
    </section>
  );
}
