import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useSearchParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Eye, EyeOff, CheckCircle2, Users, Check, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { TeoraLogo } from "@/components/brand/teora-logo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { customFetch } from "@/lib/api-client-react";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

const formSchema = z
  .object({
    username: z
      .string()
      .min(1, "Username wajib diisi")
      .regex(USERNAME_REGEX, "3-30 karakter, huruf, angka, dan underscore saja"),
    displayName: z.string().optional(),
    email: z.string().email("Email tidak valid"),
    password: z.string().min(6, "Password minimal 6 karakter"),
    confirmPassword: z.string(),
    agreeToS: z.boolean().refine((val) => val === true, {
      message: "Anda harus menyetujui Syarat Layanan dan Kebijakan Privasi",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Password tidak cocok",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof formSchema>;

export default function Register() {
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [usernameChecked, setUsernameChecked] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const { register: doRegister } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const usernameCheckTimer = useRef<ReturnType<typeof setTimeout>>();

  const referralCode = searchParams.get("ref") ?? undefined;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      displayName: "",
      email: "",
      password: "",
      confirmPassword: "",
      agreeToS: false,
    },
  });

  const watchedUsername = form.watch("username");

  // Check username availability after user stops typing (debounced)
  useEffect(() => {
    const username = watchedUsername?.trim().toLowerCase();
    if (!username || !USERNAME_REGEX.test(username)) {
      setUsernameAvailable(null);
      setUsernameChecked(false);
      return;
    }

    if (usernameCheckTimer.current) {
      clearTimeout(usernameCheckTimer.current);
    }

    setUsernameChecking(true);
    setUsernameChecked(false);

    usernameCheckTimer.current = setTimeout(async () => {
      try {
        const res = await customFetch<{ available: boolean; username: string }>(
          `/api/auth/check-username?username=${encodeURIComponent(username)}`
        );
        setUsernameAvailable(res.available);
        setUsernameChecked(true);
      } catch {
        setUsernameAvailable(null);
        setUsernameChecked(true);
      } finally {
        setUsernameChecking(false);
      }
    }, 500);

    return () => {
      if (usernameCheckTimer.current) clearTimeout(usernameCheckTimer.current);
    };
  }, [watchedUsername]);

  async function onSubmit(data: FormValues) {
    if (usernameAvailable === false) {
      setGlobalError("Username is already taken. Please choose another.");
      return;
    }

    setGlobalError(null);
    try {
      await doRegister(
        data.email,
        data.password,
        data.username.toLowerCase().trim(),
        data.displayName || undefined,
        referralCode
      );
      setSuccess(true);
      toast({
        title: "Akun berhasil dibuat!",
        description: referralCode
          ? "Akun telah dibuat. Periksa email untuk verifikasi sebelum login."
          : "Silakan login dengan email dan password Anda.",
      });
      setTimeout(() => setLocation("/login"), 2000);
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      const friendly = mapErrorToIndonesian(raw);
      setGlobalError(friendly);
      form.reset();
      toast({
        variant: "destructive",
        title: "Registrasi gagal",
        description: friendly,
      });
    }
  }

  function mapErrorToIndonesian(raw: string): string {
    const lower = raw.toLowerCase();
    if (lower.includes("already") || lower.includes("already exists") || lower.includes("email already") || lower.includes("already been")) {
      return "Email ini sudah terdaftar. Silakan login atau gunakan email lain.";
    }
    if (lower.includes("invalid login") || lower.includes("invalid credentials")) {
      return "Email atau password salah.";
    }
    if (lower.includes("email not confirmed") || lower.includes("not confirmed")) {
      return "Email belum dikonfirmasi. Periksa email Anda untuk tautan verifikasi.";
    }
    if (lower.includes("rate limit") || lower.includes("too many requests")) {
      return "Terlalu banyak percobaan. Tunggu beberapa saat sebelum mencoba lagi.";
    }
    return raw;
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <div className="flex-grow flex items-center justify-center p-4">
          <div className="w-full max-w-md text-center space-y-6">
            <div className="flex justify-center">
              <TeoraLogo size="lg" />
            </div>
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
        <footer className="py-4 text-center text-xs text-muted-foreground border-t border-border">
          <div className="flex items-center justify-center gap-4">
            <span>© 2024 Teora: Empowering Academic Excellence</span>
            <span>·</span>
            <a href="#" className="hover:text-foreground transition-colors">Help Center</a>
            <span>·</span>
            <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
          </div>
        </footer>
      </div>
    );
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
              Start your journey
            </h1>
            <p className="text-muted-foreground mt-2">
              Empowering Academic Excellence through Artificial Intelligence.
            </p>
          </div>

          {/* Register form card */}
          <div className="bg-card border border-border rounded-xl p-8 shadow-sm space-y-6 relative overflow-hidden">
            {/* Top gradient accent line */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#2D79FF] via-[#8E54E9] to-[#2D79FF]" />

            <div>
              <h2 className="text-xl font-semibold text-foreground">Create account</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Mulai perjalanan menulis akademik Anda bersama Teora.
              </p>
            </div>

            {referralCode && (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-sm text-emerald-700">
                <Users className="w-4 h-4 shrink-0" />
                <span>Anda diundang oleh teman</span>
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
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Username <span className="text-destructive">*</span>
                      </FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input
                            placeholder="e.g. john_doe"
                            className="pr-10"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              setUsernameChecked(false);
                              setUsernameAvailable(null);
                            }}
                          />
                        </FormControl>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {usernameChecking ? (
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                          ) : usernameChecked && usernameAvailable === true ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : usernameChecked && usernameAvailable === false ? (
                            <X className="w-4 h-4 text-destructive" />
                          ) : null}
                        </div>
                      </div>
                      {usernameChecked && usernameAvailable === false && (
                        <p className="text-xs text-destructive">Username already taken</p>
                      )}
                      {usernameChecked && usernameAvailable === true && (
                        <p className="text-xs text-emerald-600">Username available</p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Display Name <span className="text-muted-foreground">(optional)</span>
                      </FormLabel>
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

                <FormField
                  control={form.control}
                  name="agreeToS"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md p-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="mt-0.5"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-normal cursor-pointer">
                          Saya menyetujui{" "}
                          <Link href="/terms" className="text-primary hover:underline">
                            Syarat Layanan
                          </Link>{" "}
                          dan{" "}
                          <Link href="/privacy" className="text-primary hover:underline">
                            Kebijakan Privasi
                          </Link>{" "}
                          Teora
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  variant="gradient"
                  className="w-full font-medium shadow-sm"
                  disabled={form.formState.isSubmitting || usernameAvailable === false}
                >
                  {form.formState.isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Membuat akun...
                    </>
                  ) : (
                    "Buat akun"
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

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-muted-foreground border-t border-border">
        <div className="flex items-center justify-center gap-4">
          <span>&copy; 2026 Teora</span>
          <span>&middot;</span>
          <Link href="/bantuan" className="hover:text-foreground transition-colors">Pusat Bantuan</Link>
          <span>&middot;</span>
          <Link href="/privacy" className="hover:text-foreground transition-colors">Kebijakan Privasi</Link>
        </div>
      </footer>
    </div>
  );
}
