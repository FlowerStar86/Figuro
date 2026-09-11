import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in to Figuro" },
      {
        name: "description",
        content:
          "Create your Figuro account to keep your own lessons, subjects, study materials and learning progress in one private place.",
      },
      { property: "og:title", content: "Sign in to Figuro" },
      {
        property: "og:description",
        content: "Your lessons, materials and progress, saved to your own account.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Already signed in? Go straight to the lesson shelf.
  useEffect(() => {
    let cancelled = false;
    void supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session) void navigate({ to: "/lessons", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        void navigate({ to: "/lessons", replace: true });
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "signup") {
        const { data, error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name.trim() || email.split("@")[0] },
          },
        });
        if (err) setError(err.message);
        else if (!data.session) setNotice("Check your email to confirm your account, then sign in.");
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (err) setError(err.message);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setError("Google sign-in didn't work. Try again or use your email.");
      return;
    }
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-6 py-12">
      <Link to="/" className="mb-8 text-center text-sm text-muted-foreground hover:text-foreground">
        ← Figuro
      </Link>

      <h1 className="mb-2 text-3xl font-medium text-balance">
        {mode === "signin" ? "Welcome back" : "Create your Figuro account"}
      </h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Your lessons, subjects, study materials and progress stay private to your account.
      </p>

      <button
        type="button"
        onClick={() => void google()}
        className="mb-4 rounded-xl bg-card px-4 py-3 text-sm font-medium ring-1 ring-border transition-colors hover:bg-surface"
      >
        Continue with Google
      </button>

      <div className="mb-4 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or use email
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-3">
        {mode === "signup" && (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            aria-label="Your name"
            className="rounded-xl bg-card px-4 py-3 text-base ring-1 ring-border outline-none focus:ring-primary"
          />
        )}
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@school.edu"
          aria-label="Email"
          className="rounded-xl bg-card px-4 py-3 text-base ring-1 ring-border outline-none focus:ring-primary"
        />
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          aria-label="Password"
          className="rounded-xl bg-card px-4 py-3 text-base ring-1 ring-border outline-none focus:ring-primary"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground ring-1 ring-primary transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "One moment…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded-xl px-4 py-3 text-sm text-destructive ring-1 ring-destructive/30">
          {error}
        </p>
      )}
      {notice && (
        <p className="mt-4 rounded-xl bg-surface px-4 py-3 text-sm text-muted-foreground">
          {notice}
        </p>
      )}

      <button
        type="button"
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setError(null);
          setNotice(null);
        }}
        className="mt-6 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        {mode === "signin"
          ? "New to Figuro? Create an account"
          : "Already have an account? Sign in"}
      </button>
    </div>
  );
}
