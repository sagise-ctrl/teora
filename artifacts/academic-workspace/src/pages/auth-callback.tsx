import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { BookOpen, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { customFetch } from "../lib/api-client-react";

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function handleOAuthCallback() {
      try {
        const { supabase } = await import("@/lib/supabase");
        if (!supabase) {
          setStatus("error");
          setErrorMessage("Supabase not configured");
          return;
        }

        // Supabase SDK auto-detects session from URL hash on page load
        // (detectSessionInUrl: true by default). getSession() returns it.
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          setStatus("error");
          setErrorMessage(error.message);
          return;
        }

        if (!data.session) {
          setStatus("error");
          setErrorMessage("No session found. Please try signing in again.");
          return;
        }

        const { access_token, refresh_token } = data.session;

        // Sync with backend so the httpOnly cookies are set and a local users row exists.
        // Same endpoint used by email/password login — uses onConflictDoUpdate so OAuth
        // users (who may never hit /register) get a local record created on first login.
        await customFetch("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ access_token, refresh_token }),
        });

        setStatus("success");
        setTimeout(() => setLocation("/"), 800);
      } catch (err) {
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Authentication failed");
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

        {status === "loading" && (
          <>
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
            <h2 className="text-xl font-semibold text-foreground">Signing you in...</h2>
            <p className="text-muted-foreground">Please wait a moment.</p>
          </>
        )}

        {status === "success" && (
          <>
            <h2 className="text-xl font-semibold text-foreground">Welcome to Teora!</h2>
            <p className="text-muted-foreground">Redirecting you to the dashboard...</p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-destructive/10">
              <XCircle className="w-7 h-7 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Sign in failed</h2>
            <p className="text-muted-foreground">{errorMessage}</p>
            <Button onClick={() => setLocation("/login")} variant="outline">
              Back to Sign in
            </Button>
          </>
        )}
      </div>
    </div>
  );
}