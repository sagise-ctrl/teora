import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { BookOpen, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Confirm() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function confirmEmail() {
      const params = new URLSearchParams(window.location.search);
      const tokenHash = params.get("token_hash");
      const nextPath = params.get("next");

      if (!tokenHash) {
        setStatus("error");
        setErrorMessage("Missing confirmation token");
        return;
      }

      try {
        const { supabase } = await import("@/lib/supabase");
        if (!supabase) {
          setStatus("error");
          setErrorMessage("Supabase not configured");
          return;
        }

        const { error } = await supabase.auth.verifyOtp({
          type: "email",
          token: tokenHash,
        } as Parameters<typeof supabase.auth.verifyOtp>[0]);

        if (error) {
          setStatus("error");
          setErrorMessage(error.message);
          return;
        }

        setStatus("success");
        setTimeout(() => {
          setLocation(nextPath ?? "/");
        }, 2000);
      } catch (err) {
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Confirmation failed");
      }
    }

    confirmEmail();
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
            <h2 className="text-xl font-semibold text-foreground">Verifying your email...</h2>
            <p className="text-muted-foreground">Please wait a moment.</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100">
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Email confirmed!</h2>
            <p className="text-muted-foreground">
              Your account has been verified. Redirecting you now...
            </p>
            <Button onClick={() => setLocation("/")} variant="outline">
              Go to Dashboard
            </Button>
          </>
        )}

        {status === "error" && (
          <>
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-destructive/10">
              <XCircle className="w-7 h-7 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Confirmation failed</h2>
            <p className="text-muted-foreground">{errorMessage}</p>
            <Button onClick={() => setLocation("/login")} variant="outline">
              Go to Sign in
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
