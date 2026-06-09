"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData(e.currentTarget);

      const result = await signIn("credentials", {
        email: fd.get("email"),
        password: fd.get("password"),
        rememberMe: String(rememberMe),
        redirect: false,
      });

      if (result?.error) {
        toast.error("Invalid email or password.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setForgotLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json() as { resetUrl: string | null };
      setResetUrl(data.resetUrl);
    } catch {
      toast.error("Something went wrong. Try again.");
    } finally {
      setForgotLoading(false);
    }
  }

  async function handleCopy() {
    if (!resetUrl) return;
    await navigator.clipboard.writeText(resetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <Zap className="h-6 w-6 text-primary" strokeWidth={2.5} />
          <span className="text-2xl font-bold tracking-widest uppercase">Redline</span>
        </div>

        <div className="rounded border border-border bg-card p-8">
          <h1 className="text-lg font-semibold mb-6">Sign in</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="h-4 w-4 cursor-pointer accent-primary"
              />
              <label htmlFor="rememberMe" className="text-sm text-muted-foreground cursor-pointer select-none">
                Remember me
              </label>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          {/* Forgot password */}
          {!showForgot ? (
            <button
              type="button"
              onClick={() => setShowForgot(true)}
              className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Forgot password?
            </button>
          ) : (
            <div className="mt-5 pt-5 border-t border-border">
              {resetUrl === undefined || resetUrl === null && !forgotLoading && !resetUrl ? (
                <form onSubmit={handleForgotSubmit} className="space-y-3">
                  <p className="text-sm font-medium">Reset your password</p>
                  <Input
                    type="email"
                    required
                    placeholder="Your email address"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    autoComplete="email"
                  />
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1" disabled={forgotLoading} size="sm">
                      {forgotLoading ? "Generating…" : "Get reset link"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => { setShowForgot(false); setForgotEmail(""); setResetUrl(null); }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : resetUrl ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium">Reset link generated</p>
                  <p className="text-xs text-muted-foreground">
                    Copy this link and open it in your browser. Expires in 1 hour.
                  </p>
                  <div
                    className="rounded px-3 py-2 text-xs font-mono break-all"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                  >
                    {resetUrl}
                  </div>
                  <Button
                    type="button"
                    className="w-full"
                    size="sm"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <><Check className="h-3.5 w-3.5 mr-1.5" />Copied!</>
                    ) : (
                      <><Copy className="h-3.5 w-3.5 mr-1.5" />Copy link</>
                    )}
                  </Button>
                  <button
                    type="button"
                    className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => { setShowForgot(false); setForgotEmail(""); setResetUrl(null); }}
                  >
                    Done
                  </button>
                </div>
              ) : (
                // No account found — don't leak, just show a neutral message
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    If that email has an account, a reset link has been generated. Check with your admin.
                  </p>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => { setShowForgot(false); setForgotEmail(""); setResetUrl(null); }}
                  >
                    Back to sign in
                  </button>
                </div>
              )}
            </div>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            No account?{" "}
            <Link href="/register" className="text-primary hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
