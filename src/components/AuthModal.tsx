"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { X, LogIn, UserPlus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AuthModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const err =
      mode === "login"
        ? await signIn(email, password)
        : await signUp(email, password);

    setLoading(false);

    if (err) {
      setError(err);
    } else if (mode === "signup") {
      setSuccess("Check your email to confirm your account.");
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm border border-terminal-border rounded-lg bg-terminal-panel shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-terminal-border">
          <div className="flex items-center gap-2">
            {mode === "login" ? (
              <LogIn className="w-3.5 h-3.5 text-terminal-accent" />
            ) : (
              <UserPlus className="w-3.5 h-3.5 text-terminal-accent" />
            )}
            <span className="text-xs font-bold text-terminal-accent">
              {mode === "login" ? "SIGN IN" : "CREATE ACCOUNT"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-terminal-muted hover:text-terminal-text"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="text-[10px] text-terminal-muted block mb-1">
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-terminal-bg border border-terminal-border rounded px-3 py-1.5 text-xs text-terminal-text focus:outline-none focus:border-terminal-accent placeholder:text-terminal-muted/50"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="text-[10px] text-terminal-muted block mb-1">
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-terminal-bg border border-terminal-border rounded px-3 py-1.5 text-xs text-terminal-text focus:outline-none focus:border-terminal-accent placeholder:text-terminal-muted/50"
              placeholder="Min 6 characters"
            />
          </div>

          {error && (
            <p className="text-[11px] text-terminal-red">{error}</p>
          )}
          {success && (
            <p className="text-[11px] text-terminal-green">{success}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded text-xs font-bold bg-terminal-accent/20 text-terminal-accent border border-terminal-accent/30 hover:bg-terminal-accent/30 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-3 h-3 animate-spin" />}
            {mode === "login" ? "SIGN IN" : "CREATE ACCOUNT"}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError(null);
              setSuccess(null);
            }}
            className="w-full text-[11px] text-terminal-muted hover:text-terminal-text text-center"
          >
            {mode === "login"
              ? "Don't have an account? Sign up"
              : "Already have an account? Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
