import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { TeoraLogo } from "@/components/brand/teora-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type FormValues = z.infer<typeof formSchema>;

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { login, signInWithOAuth } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(data: FormValues) {
    setGlobalError(null);
    try {
      await login(data.email, data.password);
      toast({ title: "Welcome back!", description: "You are now logged in." });
      setLocation("/");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login failed";
      setGlobalError(msg);
      toast({ variant: "destructive", title: "Login failed", description: msg });
    }
  }

  async function onGoogleSignIn() {
    setGlobalError(null);
    setIsGoogleLoading(true);
    try {
      await signInWithOAuth("google");
      // Browser navigates away to Google; control does not return here on success.
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Google sign-in failed";
      setGlobalError(msg);
      toast({ variant: "destructive", title: "Google sign-in failed", description: msg });
      setIsGoogleLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-grow flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          {/* Header with logo */}
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <TeoraLogo size="lg" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-primary tracking-tight">
              Welcome to Teora
            </h1>
            <p className="text-muted-foreground mt-2">
              Empowering Academic Excellence through Artificial Intelligence.
            </p>
          </div>

          {/* Login form card */}
          <div className="bg-card border border-border rounded-xl p-8 shadow-sm space-y-6 relative overflow-hidden">
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#2D79FF] via-[#8E54E9] to-[#2D79FF]" />

            <div>
              <h2 className="text-xl font-semibold text-foreground">Sign in</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Enter your credentials to access your workspace.
              </p>
            </div>

            {/* Google login button */}
            <Button
              type="button"
              variant="outline"
              className="w-full font-medium"
              onClick={onGoogleSignIn}
              disabled={isGoogleLoading}
            >
              {isGoogleLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting to Google...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Continue with Google
                </>
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">OR</span>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {globalError && (
                  <div className="bg-destructive/10 text-destructive text-sm rounded-md px-4 py-2">
                    {globalError}
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="you@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className="pr-10"
                            {...field}
                          />
                        </FormControl>
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  variant="gradient"
                  className="w-full font-medium shadow-sm"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </form>
            </Form>

            <div className="text-center text-sm text-muted-foreground">
              New to Teora?{" "}
              <Link href="/register">
                <span className="text-primary font-medium hover:underline cursor-pointer">
                  Create an account
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-muted-foreground border-t border-border">
        <div className="flex items-center justify-center gap-4">
          <span>© 2024 Teora: Empowering Academic Excellence</span>
          <span>·</span>
          <a href="#" className="hover:text-foreground transition-colors">Help Center</a>
          <span>·</span>
          <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          <span>·</span>
          <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
        </div>
      </footer>
    </div>
  );
}
