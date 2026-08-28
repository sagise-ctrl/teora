import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { BookOpen, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { customFetch, setAuthTokenGetter } from "../lib/api-client-react";
import { setStoredToken } from "../lib/session";

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function handleOAuthCallback() {
      try {
        // Google OAuth appends tokens as URL hash fragments.
        // Parse them manually — no SDK needed.
        const hash = window.location.hash.slice(1);
        if (!hash) {
          setState("error");
          setErrorMessage("Tidak ada token dari Google. Silakan coba lagi.");
          return;
        }

        const params = new URLSearchParams(hash);
        const accessToken = params.get("access_token");
        if (!accessToken) {
          setState("error");
          setErrorMessage("Token tidak ditemukan. Silakan coba lagi.");
          return;
        }

        const refreshToken = params.get("refresh_token");

        // Call backend to validate token + create/update local user record.
        const result = await customFetch<{ id: string }>("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ access_token: accessToken, refresh_token: refreshToken }),
        });

        if ("error" in result) {
          setState("error");
          setErrorMessage("Login gagal: " + (result as { error: string }).error);
          return;
        }

        // Store token and register as auth getter so customFetch attaches it
        // as "Authorization: Bearer <token>" to all subsequent API calls.
        setStoredToken(accessToken);
        setAuthTokenGetter(() => Promise.resolve(accessToken));

        // Clear the URL hash so the token doesn't linger in the address bar.
        window.history.replaceState(null, "", window.location.pathname);

        setState("success");
        setTimeout(() => setLocation("/"), 800);
      } catch (err) {
        console.error("[auth-callback]", err);
        setState("error");
        setErrorMessage(err instanceof Error ? err.message : "Terjadi kesalahan. Silakan coba lagi.");
      }
    }

    handleOAuthCallback();
  }, [setLocation]);

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
            <Button onClick={() => setLocation("/login")} variant="outline">
              Kembali ke Login
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
