"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

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

export function UserMenu() {
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function refresh() {
      try {
        const response = await fetch("/api/me", { credentials: "same-origin", cache: "no-store", signal: controller.signal });
        if (response.status === 401) { setUsername(null); setError(""); return; }
        const body = await readResponse(response);
        setUsername(body.username);
        setError("");
      } catch {
        if (!controller.signal.aborted) setError("Could not load your session. Please refresh.");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void refresh();
    window.addEventListener(authChanged, refresh);
    return () => { controller.abort(); window.removeEventListener(authChanged, refresh); };
  }, []);

  async function logout() {
    setPending(true);
    setError("");
    try {
      await readResponse(await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }));
      setUsername(null);
      window.dispatchEvent(new Event(authChanged));
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
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
