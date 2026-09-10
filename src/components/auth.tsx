"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeedbackRequestError, readFeedbackResponse } from "@/lib/client-data";

const authChanged = "nuri-auth-change";
const buttonClass = "rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50";

function decodeBase64url(value: string): ArrayBuffer {
  return Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/")), character => character.charCodeAt(0)).buffer;
}

function encodeBase64url(value: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(value))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function readResponse(response: Response) {
  const body = await response.json();
  if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "Sign-in failed. Please try again.");
  return body;
}

export function PasskeySignInButton({ onSuccess }: { onSuccess?: (username: string) => void }) {
  const [username, setUsername] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const clearSuccess = () => setSuccess("");
    window.addEventListener(authChanged, clearSuccess);
    return () => window.removeEventListener(authChanged, clearSuccess);
  }, []);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    setSuccess("");
    try {
      if (!window.isSecureContext || !window.PublicKeyCredential || !navigator.credentials) {
        throw new Error("Passkeys need a supported browser and a secure HTTPS connection.");
      }
      if (location.hostname !== "nuri.com" && !location.hostname.endsWith(".nuri.com")) {
        throw new Error("Nuri passkeys are only available on an HTTPS nuri.com site.");
      }
      const { challengeId, options } = await readResponse(await fetch("/api/auth/challenge", {
        method: "POST", credentials: "same-origin", cache: "no-store",
      }));
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: decodeBase64url(options.challenge),
          rpId: options.rpId, userVerification: "required", timeout: options.timeout,
          // Discoverable credentials: do not restrict which Nuri passkey the user can select.
        },
      }) as PublicKeyCredential | null;
      if (!credential) throw new Error("No passkey was selected. Please try again.");
      const assertion = credential.response as AuthenticatorAssertionResponse;
      const result = await readResponse(await fetch("/api/auth/verify", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId, username,
          response: {
            id: credential.id, rawId: encodeBase64url(credential.rawId), type: credential.type,
            response: {
              clientDataJSON: encodeBase64url(assertion.clientDataJSON),
              authenticatorData: encodeBase64url(assertion.authenticatorData),
              signature: encodeBase64url(assertion.signature),
              userHandle: assertion.userHandle ? encodeBase64url(assertion.userHandle) : null,
            },
            clientExtensionResults: {},
          },
        }),
      }));
      window.dispatchEvent(new Event(authChanged));
      setSuccess(`Signed in as ${result.username}.`);
      onSuccess?.(result.username);
    } catch (error) {
      if (error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "AbortError")) {
        setError("Passkey sign-in was cancelled or timed out. Please try again.");
      } else {
        setError(error instanceof Error ? error.message : "Sign-in failed. Please try again.");
      }
    } finally { setPending(false); }
  }

  return (
    <form onSubmit={signIn} className="space-y-4" aria-busy={pending}>
      <div className="space-y-2">
        <label htmlFor="passkey-username" className="block text-sm font-medium">Feedback username</label>
        <input id="passkey-username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false}
          value={username} onChange={event => setUsername(event.target.value)} required minLength={3} maxLength={32}
          pattern="[a-zA-Z0-9][a-zA-Z0-9_.\-]{2,31}" disabled={pending} aria-describedby="username-help"
          className="w-full rounded-lg border border-border bg-background px-3 py-3 text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent" />
        <p id="username-help" className="text-sm text-muted">Use 3–32 letters, numbers, dots, underscores or hyphens, starting with a letter or number. This display name is self-declared, not a verified Nuri account name.</p>
      </div>
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Waiting for your passkey…" : "Sign in with Nuri passkey"}
      </button>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {success && <p role="status" className="text-sm text-foreground">{success}</p>}
    </form>
  );
}

type AuthState = { username: string | null; loading: boolean; error: string; refresh: () => void };
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let controller: AbortController;
    async function refresh() {
      controller?.abort();
      const current = new AbortController();
      controller = current;
      // Fail closed while rechecking, including after a logout or expired POST.
      setLoading(true);
      setUsername(null);
      setError("");
      try {
        const response = await fetch("/api/me", { credentials: "same-origin", cache: "no-store", signal: current.signal });
        if (response.status === 401) return;
        const body = await readResponse(response);
        if (typeof body.username !== "string" || !body.username) throw new Error("Invalid session.");
        if (!current.signal.aborted) setUsername(body.username);
      } catch {
        if (!current.signal.aborted) setError("Could not load your session. Please try again.");
      } finally { if (!current.signal.aborted) setLoading(false); }
    }
    void refresh();
    window.addEventListener(authChanged, refresh);
    return () => {
      controller?.abort();
      window.removeEventListener(authChanged, refresh);
    };
  }, []);

  return <AuthContext.Provider value={{ username, loading, error, refresh: () => window.dispatchEvent(new Event(authChanged)) }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const state = useContext(AuthContext);
  if (!state) throw new Error("AuthProvider is required.");
  return state;
}

export function HeaderAuth() {
  const { username, loading, error } = useAuth();
  return (
    <div className="min-w-0 text-sm" aria-live="polite">
      {loading ? <span>Checking session…</span> : <Link href="/login" className="inline-block min-h-12 max-w-full break-words rounded-lg px-2 py-3 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-700">
        {username ? `Signed in as ${username}` : "Sign in"}
      </Link>}
      {error && <p role="alert" className="text-red-700">Session unavailable. Open Sign in to retry.</p>}
    </div>
  );
}

export function UserMenu() {
  const { username, loading, error: sessionError, refresh } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function logout() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      await readResponse(await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }));
      refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Sign-out failed. Please try again."); }
    finally { setPending(false); }
  }

  return (
    <div className="space-y-3" aria-live="polite">
      {loading ? <p className="text-sm text-muted">Checking your session…</p> : username ? (
        <div className="flex flex-wrap items-center gap-4">
          <span className="break-all text-sm">Signed in as <strong>{username}</strong></span>
          <button type="button" onClick={logout} disabled={pending} className={buttonClass}>{pending ? "Signing out…" : "Log out"}</button>
          <Link href="/feedback" className="text-sm underline underline-offset-4">Give feedback</Link>
        </div>
      ) : <p className="text-sm text-muted">You are not signed in.</p>}
      {(error || sessionError) && <p role="alert" className="text-sm text-red-700">{error || sessionError}</p>}
      {sessionError && <Button variant="outline" onClick={refresh}>Retry session</Button>}
    </div>
  );
}

export function FeedbackVote({ id, count, title, onVoted }: { id: string; count: number; title: string; onVoted: () => void }) {
  const { username, loading, error: sessionError, refresh } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function vote() {
    if (!username || loading || sessionError || pending) return;
    setPending(true);
    setError("");
    try {
      await readFeedbackResponse(await fetch(`/api/feedback/${id}/vote`, { method: "POST", credentials: "same-origin", cache: "no-store" }));
      onVoted();
    } catch (error) {
      if (error instanceof FeedbackRequestError && error.status === 401) refresh();
      setError(error instanceof Error ? error.message : "Could not record your vote. Please try again.");
    } finally { setPending(false); }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">{count} {count === 1 ? "vote" : "votes"}. Counts reflect GitHub App reactions, not one vote per person.</p>
      {loading ? <p role="status">Checking your session…</p> : sessionError ? <><p role="alert">{sessionError}</p><Button variant="outline" onClick={refresh}>Retry session</Button></> : username ? (
        <Button variant="outline" onClick={vote} disabled={pending} aria-label={`Upvote ${title}`}><ChevronUp aria-hidden="true" className="size-5" />{pending ? "Saving vote…" : "Upvote"}</Button>
      ) : <><p>Sign in to vote.</p><PasskeySignInButton /></>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
