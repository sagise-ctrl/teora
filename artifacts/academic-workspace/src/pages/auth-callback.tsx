import { useEffect, useState } from "react";
import { BookOpen, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { customFetch, setAuthTokenGetter } from "../lib/api-client-react";
import { setStoredToken, setStoredRefreshToken } from "../lib/session";

export default function AuthCallback() {
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function handleOAuthCallback() {
      try {
        // Supabase may use either flow:
        //   - PKCE:    redirect contains ?code=…  (exchanged via SDK)
        //   - Implicit: redirect hash contains #access_token=…&refresh_token=…
        // Try PKCE first (modern default), then fall back to implicit.

        let accessToken: string | null = null;
        let refreshToken: string | null = null;

        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");

        if (code) {
          // PKCE flow — exchange code for session via Supabase SDK.
          const { supabase } = await import("../lib/supabase");
          if (!supabase) throw new Error("Supabase not configured");
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error || !data.session) {
            throw new Error(error?.message ?? "Gagal menukar kode OAuth.");
          }
          accessToken = data.session.access_token;
          refreshToken = data.session.refresh_token;
        } else {
          // Implicit flow — parse tokens from URL hash.
          const hash = window.location.hash.slice(1);
          const hashParams = new URLSearchParams(hash);
          accessToken = hashParams.get("access_token");
          refreshToken = hashParams.get("refresh_token");
        }

        console.log("[auth-callback] tokens received", {
          flow: code ? "PKCE" : "implicit",
          hasAccessToken: !!accessToken,
          accessTokenPrefix: accessToken ? accessToken.slice(0, 12) + "..." : null,
          hasRefreshToken: !!refreshToken,
          refreshTokenPrefix: refreshToken ? refreshToken.slice(0, 8) + "..." : null,
        });

        if (!accessToken) {
          setState("error");
          setErrorMessage("Token tidak ditemukan. Silakan coba lagi.");
          return;
        }

        // Call backend to validate token + create/update local user record.
        const result = await customFetch<{ id: string }>("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ access_token: accessToken, refresh_token: refreshToken ?? undefined }),
        });

        if ("error" in result) {
          setState("error");
          setErrorMessage("Login gagal: " + (result as { error: string }).error);
          return;
        }

        // Store token and register as auth getter so customFetch attaches it
        // as "Authorization: Bearer <token>" to all subsequent API calls.
        setStoredToken(accessToken);
        if (refreshToken) setStoredRefreshToken(refreshToken);
        setAuthTokenGetter(() => Promise.resolve(accessToken));

        // Clear the URL hash/query so the token doesn't linger in the address bar.
        window.history.replaceState(null, "", window.location.pathname);

        setState("success");
        // Full page reload — AuthProvider must remount so it picks up the
        // new access_token and calls /api/auth/me. wouter's setLocation
        // only swaps the path; React state (including AuthProvider's user)
        // stays stale and ProtectedRoute would bounce back to /login.
        setTimeout(() => (window.location.href = "/landing-admin"), 800);
      } catch (err) {
        console.error("[auth-callback]", err);
        setState("error");
        setErrorMessage(err instanceof Error ? err.message : "Terjadi kesalahan. Silakan coba lagi.");
      }
    }

    handleOAuthCallback();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
          <BookOpen className="w-7 h-7 text-primary" />
        </div>

        {state === "loading" && (
          <>
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
            <h2 className="text-xl font-semibold text-foreground">Memproses login...</h2>
            <p className="text-muted-foreground">Mohon tunggu sebentar.</p>
          </>
        )}

        {state === "success" && (
          <>
            <h2 className="text-xl font-semibold text-foreground">Selamat datang di Teora!</h2>
            <p className="text-muted-foreground">Mengalihkan ke dashboard...</p>
          </>
        )}

        {state === "error" && (
          <>
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-destructive/10">
              <XCircle className="w-7 h-7 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Login gagal</h2>
            <p className="text-muted-foreground">{errorMessage}</p>
            <Button onClick={() => (window.location.href = "/login")} variant="outline">
              Kembali ke Login
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
