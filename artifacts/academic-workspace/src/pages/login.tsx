import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { BookOpen, Loader2, Eye, EyeOff } from "lucide-react";
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

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type FormValues = z.infer<typeof formSchema>;

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const { login } = useAuth();
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
            <h2 className="text-xl font-semibold text-foreground">Sign in</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Enter your credentials to access your workspace.
            </p>
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
            Don't have an account?{" "}
            <Link href="/register">
              <span className="text-primary font-medium hover:underline cursor-pointer">
                Create one
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
