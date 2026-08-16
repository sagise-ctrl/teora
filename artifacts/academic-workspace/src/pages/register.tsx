import { useState } from "react";
import { Link, useLocation, useSearchParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { BookOpen, Loader2, Eye, EyeOff, CheckCircle2, Users } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
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

const formSchema = z
  .object({
    displayName: z.string().optional(),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof formSchema>;

export default function Register() {
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { register: doRegister } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const referralCode = searchParams.get("ref") ?? undefined;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(data: FormValues) {
    setGlobalError(null);
    try {
      await doRegister(
        data.email,
        data.password,
        data.displayName || undefined,
        referralCode
      );
      setSuccess(true);
      toast({
        title: "Account created!",
        description: referralCode
          ? "Your account has been created. Check your email to verify your account."
          : "You can now sign in.",
      });
      setTimeout(() => setLocation("/login"), 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Registration failed";
      setGlobalError(msg);
      toast({ variant: "destructive", title: "Registration failed", description: msg });
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100">
            <CheckCircle2 className="w-7 h-7 text-emerald-600" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Check your email</h2>
          <p className="text-muted-foreground">
            We sent a confirmation link to your email. Click it to activate your account, then sign in.
          </p>
          <Link href="/login">
            <Button variant="outline">Go to Sign in</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
            <BookOpen className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-primary tracking-tight">Teora</h1>
          <p className="text-muted-foreground mt-1">AI Academic Workspace</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-8 shadow-md space-y-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-accent to-primary opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-accent/[0.02] pointer-events-none" />
          <div>
            <h2 className="text-xl font-semibold text-foreground">Create account</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Start your academic writing journey with AI assistance.
            </p>
          </div>

          {referralCode && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-sm text-emerald-700">
              <Users className="w-4 h-4 shrink-0" />
              <span>You were invited by a friend</span>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {globalError && (
                <div className="bg-destructive/10 text-destructive text-sm rounded-md px-4 py-2">
                  {globalError}
                </div>
              )}

              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name <span className="text-muted-foreground">(optional)</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Your name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                          placeholder="Min. 6 characters"
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

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        {...field}
                      />
                    </FormControl>
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
                    Creating account...
                  </>
                ) : (
                  "Create account"
                )}
              </Button>
            </form>
          </Form>

          <div className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login">
              <span className="text-primary font-medium hover:underline cursor-pointer">
                Sign in
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
