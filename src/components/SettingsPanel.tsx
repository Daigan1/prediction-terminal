"use client";

import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { upsertApiKey, fetchApiKeys } from "@/lib/db";
import { X, Key, LogOut, Save, Loader2, User } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import AuthModal from "./AuthModal";
import type { Exchange } from "@/types";

export default function SettingsPanel() {
  const { settingsOpen, setSettingsOpen, apiKeys, setApiKeys } = useStore();
  const { user, loading: authLoading, signOut } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Load API keys from Supabase when user logs in
  const loadKeys = useCallback(async () => {
    if (!user) return;
    try {
      const rows = await fetchApiKeys();
      const patch: Record<string, Record<string, string>> = {};
      for (const r of rows) {
        if (r.exchange === "polymarket") {
          patch[r.exchange] = { apiKey: r.api_key };
        } else {
          patch[r.exchange] = { apiKey: r.api_key, secret: r.api_secret };
        }
      }
      if (Object.keys(patch).length) setApiKeys(patch);
    } catch {
      // ignore – table may not exist yet
    }
  }, [user, setApiKeys]);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const handleSaveKeys = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const exchanges: { exchange: Exchange; key: string; secret: string }[] = [
        { exchange: "kalshi", key: apiKeys.kalshi.apiKey, secret: apiKeys.kalshi.secret },
        { exchange: "polymarket", key: apiKeys.polymarket.apiKey, secret: "" },
        { exchange: "gemini", key: apiKeys.gemini.apiKey, secret: apiKeys.gemini.secret },
      ];
      for (const e of exchanges) {
        if (e.key || e.secret) {
          await upsertApiKey(e.exchange, e.key, e.secret);
        }
      }
      setSaveMsg("Saved");
      setTimeout(() => setSaveMsg(null), 2000);
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!settingsOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={() => setSettingsOpen(false)}
        />

        <div className="relative w-full max-w-lg border border-terminal-border rounded-lg bg-terminal-panel shadow-2xl max-h-[80vh] overflow-auto">
          <div className="flex items-center justify-between px-4 py-3 border-b border-terminal-border sticky top-0 bg-terminal-panel z-10">
            <div className="flex items-center gap-2">
              <Key className="w-3.5 h-3.5 text-terminal-accent" />
              <span className="text-xs font-bold text-terminal-accent">
                SETTINGS
              </span>
            </div>
            <button
              onClick={() => setSettingsOpen(false)}
              className="text-terminal-muted hover:text-terminal-text"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-6">
            {/* Account section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-bold tracking-wider text-terminal-accent">
                  ACCOUNT
                </span>
                <div className="flex-1 h-px bg-terminal-border" />
              </div>

              {authLoading ? (
                <div className="flex items-center gap-2 text-xs text-terminal-muted">
                  <Loader2 className="w-3 h-3 animate-spin" /> Loading...
                </div>
              ) : user ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-terminal-green" />
                    <span className="text-xs text-terminal-text">
                      {user.email}
                    </span>
                  </div>
                  <button
                    onClick={signOut}
                    className="flex items-center gap-1 px-2 py-1 rounded border border-terminal-border text-[10px] text-terminal-muted hover:text-terminal-red hover:border-terminal-red/30"
                  >
                    <LogOut className="w-3 h-3" />
                    SIGN OUT
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] text-terminal-muted leading-relaxed">
                    Sign in to save API keys and paper trades across sessions.
                  </p>
                  <button
                    onClick={() => setAuthModalOpen(true)}
                    className="px-3 py-1.5 rounded text-xs font-bold bg-terminal-accent/20 text-terminal-accent border border-terminal-accent/30 hover:bg-terminal-accent/30"
                  >
                    SIGN IN / CREATE ACCOUNT
                  </button>
                </div>
              )}
            </div>

            {/* API keys info */}
            <p className="text-[11px] text-terminal-muted leading-relaxed">
              API keys are required for live trading and balance fetching.
              Market data is available without keys.
              {user && " Keys are saved to your account."}
            </p>

            {/* Kalshi */}
            <ExchangeSection
              name="KALSHI"
              color="text-blue-400"
              fields={[
                {
                  label: "API Key",
                  value: apiKeys.kalshi.apiKey,
                  onChange: (v: string) =>
                    setApiKeys({ kalshi: { ...apiKeys.kalshi, apiKey: v } }),
                },
                {
                  label: "Secret",
                  value: apiKeys.kalshi.secret,
                  onChange: (v: string) =>
                    setApiKeys({ kalshi: { ...apiKeys.kalshi, secret: v } }),
                },
              ]}
            />

            {/* Polymarket */}
            <ExchangeSection
              name="POLYMARKET"
              color="text-purple-400"
              fields={[
                {
                  label: "API Key",
                  value: apiKeys.polymarket.apiKey,
                  onChange: (v: string) =>
                    setApiKeys({ polymarket: { apiKey: v } }),
                },
              ]}
            />

            {/* Gemini */}
            <ExchangeSection
              name="GEMINI"
              color="text-cyan-400"
              fields={[
                {
                  label: "API Key",
                  value: apiKeys.gemini.apiKey,
                  onChange: (v: string) =>
                    setApiKeys({ gemini: { ...apiKeys.gemini, apiKey: v } }),
                },
                {
                  label: "Secret",
                  value: apiKeys.gemini.secret,
                  onChange: (v: string) =>
                    setApiKeys({ gemini: { ...apiKeys.gemini, secret: v } }),
                },
              ]}
            />

            {/* Save button (only when logged in) */}
            {user && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveKeys}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold bg-terminal-green/20 text-terminal-green border border-terminal-green/30 hover:bg-terminal-green/30 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Save className="w-3 h-3" />
                  )}
                  SAVE TO ACCOUNT
                </button>
                {saveMsg && (
                  <span
                    className={`text-[11px] ${
                      saveMsg === "Saved"
                        ? "text-terminal-green"
                        : "text-terminal-red"
                    }`}
                  >
                    {saveMsg}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </>
  );
}

function ExchangeSection({
  name,
  color,
  fields,
}: {
  name: string;
  color: string;
  fields: { label: string; value: string; onChange: (v: string) => void }[];
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-[10px] font-bold tracking-wider ${color}`}>
          {name}
        </span>
        <div className="flex-1 h-px bg-terminal-border" />
      </div>
      <div className="space-y-3">
        {fields.map((field) => (
          <ApiKeyField key={field.label} {...field} />
        ))}
      </div>
    </div>
  );
}

function ApiKeyField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);

  return (
    <div>
      <label className="text-[10px] text-terminal-muted block mb-1">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter ${label.toLowerCase()}...`}
          className="flex-1 bg-terminal-bg border border-terminal-border rounded px-3 py-1.5 text-xs text-terminal-text focus:outline-none focus:border-terminal-accent placeholder:text-terminal-muted/50"
        />
        <button
          onClick={() => setShow(!show)}
          className="px-2 py-1.5 rounded border border-terminal-border text-[10px] text-terminal-muted hover:text-terminal-text"
        >
          {show ? "HIDE" : "SHOW"}
        </button>
      </div>
    </div>
  );
}
