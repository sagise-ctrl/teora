import { useState, useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { Link, Redirect } from "wouter";
import { motion, useScroll, useTransform } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { TeoraLogo } from "@/components/brand/teora-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Brain,
  BookOpen,
  Library,
  MessageSquare,
  FileDown,
  ArrowRight,
  CheckCircle2,
  Star,
  ChevronRight,
  Zap,
  Shield,
  Users,
  Clock,
  GraduationCap,
  Sparkles,
  Quote,
  Play,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Animation variants ───────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] },
  }),
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: (delay = 0) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] },
  }),
};

// ─── Data ───────────────────────────────────────────────────────────────────

const stats = [
  { value: "12.000+", label: "Mahasiswa & Pengajar aktif" },
  { value: "4.9", label: "Rating rata-rata", suffix: "/5" },
  { value: "98%", label: "Tingkat pemahaman setelah pakai" },
  { value: "50.000+", label: "Tugas dikerjakan" },
];

const problems = [
  {
    icon: Clock,
    title: "Terlalu banyak waktu untuk memahami materi dasar",
    description:
      "Sebelum mulai mengerjakan tugas, kamu harus memahami materinya dulu. Tapi referensi berserakan dan waktu terbatas.",
  },
  {
    icon: MessageSquare,
    title: "AI generatif sering kasih jawaban tanpa penjelasan",
    description:
      "Chatbot AI menjawab soal, tapi tidak membantu kamu memahami JALAN BERPIKIRnya. Nilai bagus, pemahaman nol.",
  },
  {
    icon: FileDown,
    title: "Susah merangkum dan menyitasi referensi",
    description:
      "Pustaka digital banyak, tapi mengelola referensi dan membuat sitasi yang benar memakan waktu berjam-jam.",
  },
];

const features = [
  {
    icon: Brain,
    title: "Task Mentor",
    description:
      "Pahami tugas akademik selangkah demi selangkah, dengan AI yang menjelaskan dasar materinya.",
    color: "from-blue-500/20 to-purple-500/20",
    accent: "text-blue-500",
    badge: "Bestseller",
  },
  {
    icon: BookOpen,
    title: "Practice",
    description:
      "Quiz berdasarkan topik tugas Anda, dengan sistem pengulangan yang membantu Anda mengingat.",
    color: "from-purple-500/20 to-pink-500/20",
    accent: "text-purple-500",
    badge: null,
  },
  {
    icon: Library,
    title: "Pustaka Saya",
    description:
      "Kelola pustaka referensi dengan Auto-Cite dan format sitasi otomatis.",
    color: "from-emerald-500/20 to-teal-500/20",
    accent: "text-emerald-500",
    badge: null,
  },
  {
    icon: MessageSquare,
    title: "AI Assistant",
    description:
      "Tanya tentang tugas, AI bantu Anda memahami selangkah demi selangkah.",
    color: "from-amber-500/20 to-orange-500/20",
    accent: "text-amber-500",
    badge: "Baru",
  },
  {
    icon: FileDown,
    title: "Export",
    description:
      "Hasilkan dokumen siap submit dalam format DOCX, PDF, atau PPTX.",
    color: "from-rose-500/20 to-red-500/20",
    accent: "text-rose-500",
    badge: null,
  },
  {
    icon: GraduationCap,
    title: "Assessment Tools",
    description:
      "Bantu pengajar siapkan soal, rubrik penilaian, dan materi ajar lebih cepat.",
    color: "from-cyan-500/20 to-blue-500/20",
    accent: "text-cyan-500",
    badge: "Untuk Pengajar",
  },
];

const steps = [
  {
    number: "01",
    title: "Tulis topik tugas Anda",
    description:
      "Mulai dengan topik tugas, judul, atau materi yang ingin Anda pahami. Teora membantu Anda menguraikan langkah-langkah pengerjaan.",
    visual: (
      <div className="relative bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-2xl p-6 border border-white/10">
        <div className="space-y-3">
          <div className="h-3 w-48 rounded-full bg-white/10" />
          <div className="h-3 w-36 rounded-full bg-white/10" />
          <div className="h-3 w-44 rounded-full bg-white/10" />
          <div className="mt-4 h-8 w-full rounded-lg bg-gradient-to-r from-[#2D79FF]/30 to-[#8E54E9]/30 border border-[#2D79FF]/30 flex items-center px-3 gap-2">
            <Sparkles className="w-4 h-4 text-[#2D79FF]" />
            <span className="text-sm text-white/70">Teora menganalisis topik Anda...</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    number: "02",
    title: "Teora membimbing selangkah demi selangkah",
    description:
      "Lewati setiap tahap dengan bimbingan AI yang menunjukkan LOGIKA di balik setiap langkah, selangkah demi selangkah sampai paham.",
    visual: (
      <div className="relative bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-2xl p-6 border border-white/10">
        <div className="space-y-3">
          {[
            { label: "Langkah 1", text: "Identifikasi jenis tugas", done: true },
            { label: "Langkah 2", text: "Kumpulkan referensi", done: true },
            { label: "Langkah 3", text: "Susun kerangka", done: false },
          ].map((step) => (
            <div
              key={step.label}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border",
                step.done
                  ? "bg-green-500/10 border-green-500/30"
                  : "bg-white/5 border-white/10"
              )}
            >
              {step.done ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-[#2D79FF] flex-shrink-0 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-[#2D79FF]" />
                </div>
              )}
              <div>
                <p className="text-xs text-white/50">{step.label}</p>
                <p className={cn("text-sm", step.done ? "text-white" : "text-white/60")}>
                  {step.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    number: "03",
    title: "hasilkan dokumen siap submit",
    description:
      "Setelah memahami dan mengerjakan, export hasil ke format yang dibutuhkan: DOCX, PDF, atau PPTX. Lengkap dengan sitasi otomatis.",
    visual: (
      <div className="relative bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-2xl p-6 border border-white/10">
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: "DOCX", color: "blue" },
            { icon: "PDF", color: "red" },
            { icon: "PPTX", color: "orange" },
          ].map((f) => (
            <div
              key={f.icon}
              className="aspect-square rounded-xl border border-white/10 flex flex-col items-center justify-center gap-2 bg-white/5 hover:bg-white/10 transition-colors"
            >
              <FileDown className={cn("w-8 h-8", f.color === "blue" ? "text-blue-400" : f.color === "red" ? "text-red-400" : "text-orange-400")} />
              <span className="text-xs text-white/60 font-mono">{f.icon}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs text-green-400">
          <CheckCircle2 className="w-4 h-4" />
          <span>Dokumen siap submit dengan Auto-Cite aktif</span>
        </div>
      </div>
    ),
  },
];

const testimonials = [
  {
    name: "Rina Wijaya",
    role: "Mahasiswa S1 Pendidikan Bahasa",
    university: "Universitas Indonesia",
    avatar: "R",
    color: "from-blue-500 to-purple-500",
    quote:
      "Sebelum pakai Teora, saya butuh 3 hari untuk satu tugas karena harus belajar duluan dari nol. Sekarang 1 hari cukup. Teora bantu saya fokuskan waktu ke HAL YANG PENTING.",
    rating: 5,
  },
  {
    name: "Dr. Budi Santoso",
    role: "Dosen Teknik Elektro",
    university: "Institut Teknologi Bandung",
    avatar: "B",
    color: "from-purple-500 to-pink-500",
    quote:
      "Untuk saya yang juga ngajar, Teora menghemat waktu prepping soal dan rubrik sampai 60%. Fitur Assessment untuk pengajar sangat membantu.",
    rating: 5,
  },
  {
    name: "Siti Nurhaliza",
    role: "Mahasiswa S2 Linguistik",
    university: "Universitas Gadjah Mada",
    avatar: "S",
    color: "from-emerald-500 to-teal-500",
    quote:
      "Fitur Auto-Cite-nya akurat banget. Dulu saya spent 2 jam manually formatting sitasi. Sekarang tinggal click. Fitur Pustaka Saya sangat lengkap.",
    rating: 5,
  },
];

// ─── Sections ────────────────────────────────────────────────────────────────

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <nav
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          scrolled
            ? "bg-background/95 border-b border-border/50 backdrop-blur-md shadow-lg"
            : "bg-transparent"
        )}
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <TeoraLogo size="sm" />

          <div className="hidden md:flex items-center gap-8 text-sm text-white/70">
            <a href="#features" className="hover:text-white transition-colors">Fitur</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">Cara Kerja</a>
            <a href="#testimonials" className="hover:text-white transition-colors">Testimoni</a>
            <a href="#pricing" className="hover:text-white transition-colors">Harga</a>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="hidden md:inline-flex text-white/70 hover:text-white hover:bg-white/10">
                Masuk
              </Button>
            </Link>
            <Link href="/register">
              <Button
                size="sm"
                className="bg-gradient-to-r from-[#2D79FF] to-[#8E54E9] hover:opacity-90 text-white shadow-lg shadow-blue-500/25"
              >
                Mulai Gratis
              </Button>
            </Link>
            <button
              className="md:hidden p-2 text-white/70"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] bg-background/98 backdrop-blur-md flex flex-col p-6">
          <div className="flex items-center justify-between mb-8">
            <TeoraLogo size="sm" />
            <button onClick={() => setMobileOpen(false)} className="p-2 text-white/70">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex flex-col gap-4 text-lg">
            {["Fitur", "Cara Kerja", "Testimoni", "Harga"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(" ", "-")}`}
                onClick={() => setMobileOpen(false)}
                className="text-white/70 hover:text-white py-2"
              >
                {item}
              </a>
            ))}
          </div>
          <div className="mt-auto flex flex-col gap-3">
            <Link href="/login" onClick={() => setMobileOpen(false)}>
              <Button variant="outline" className="w-full">Masuk</Button>
            </Link>
            <Link href="/register" onClick={() => setMobileOpen(false)}>
              <Button className="w-full bg-gradient-to-r from-[#2D79FF] to-[#8E54E9] text-white">
                Mulai Gratis
              </Button>
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

function HeroSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section ref={ref} className="relative min-h-screen flex items-center pt-24 pb-16 overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-40">
        <img
          src="/landing-bg-pattern.svg"
          alt=""
          className="w-full h-full object-cover"
          aria-hidden="true"
        />
      </div>

      {/* Radial gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />

      {/* Glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#2D79FF]/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#8E54E9]/10 rounded-full blur-[120px]" />

      <motion.div
        style={{ y, opacity }}
        className="relative max-w-6xl mx-auto px-6 py-12 grid lg:grid-cols-2 gap-12 items-center"
      >
        {/* Text content */}
        <div className="space-y-6">
          <motion.div variants={fadeUp} custom={0} initial="hidden" animate="visible">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#2D79FF]/20 to-[#8E54E9]/20 border border-[#2D79FF]/30 text-xs text-[#2D79FF] font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              Asisten Akademik AI untuk Indonesia
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            custom={0.1}
            initial="hidden"
            animate="visible"
            className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold leading-tight tracking-tight"
          >
            Pahami tugas,
            <br />
            <span className="bg-gradient-to-r from-[#2D79FF] to-[#8E54E9] bg-clip-text text-transparent">
              selangkah demi selangkah
            </span>
            <br />
            sampai selesai.
          </motion.h1>

          <motion.p
            variants={fadeUp}
            custom={0.2}
            initial="hidden"
            animate="visible"
            className="text-lg text-white/60 max-w-lg leading-relaxed"
          >
            Teora membimbing Anda memahami dasar materi dan mengerjakan tugas akademik
            selangkah demi selangkah, membangun pemahaman yang tahan lama.
          </motion.p>

          <motion.div
            variants={fadeUp}
            custom={0.3}
            initial="hidden"
            animate="visible"
            className="flex flex-col sm:flex-row items-start sm:items-center gap-4"
          >
            <Link href="/register">
              <Button
                size="lg"
                className="bg-gradient-to-r from-[#2D79FF] to-[#8E54E9] hover:opacity-90 text-white shadow-xl shadow-blue-500/30 text-base px-8 h-12"
              >
                Mulai Gratis
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="text-base px-6 h-12 border-white/20 text-white/70 hover:text-white hover:bg-white/5">
                Lihat Demo
              </Button>
            </Link>
          </motion.div>

          <motion.div
            variants={fadeUp}
            custom={0.4}
            initial="hidden"
            animate="visible"
            className="flex items-center gap-6 text-sm text-white/40 pt-2"
          >
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Gratis untuk mahasiswa
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Tidak perlu kartu kredit
            </span>
          </motion.div>
        </div>

        {/* Hero illustration */}
        <motion.div
          variants={scaleIn}
          custom={0.2}
          initial="hidden"
          animate="visible"
          className="relative hidden lg:block"
        >
          <div className="relative">
            {/* Glow behind */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#2D79FF]/20 to-[#8E54E9]/20 rounded-3xl blur-2xl scale-95" />
            {/* Image */}
            <img
              src="/landing-hero.svg"
              alt="Teora AI membantu mahasiswa mengerjakan tugas akademik"
              className="relative w-full rounded-2xl"
            />
          </div>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/30"
      >
        <span className="text-xs">Scroll</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          className="w-5 h-8 rounded-full border border-white/20 flex items-start justify-center pt-1.5"
        >
          <div className="w-1 h-2 rounded-full bg-white/40" />
        </motion.div>
      </motion.div>
    </section>
  );
}

function StatsSection() {
  return (
    <section className="py-12 border-y border-white/5 bg-white/[0.02]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              variants={fadeUp}
              custom={i * 0.1}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="text-center"
            >
              <div className="text-2xl md:text-3xl font-bold text-white">
                {stat.value}
                {stat.suffix && <span className="text-lg text-white/40">{stat.suffix}</span>}
              </div>
              <div className="text-sm text-white/40 mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProblemSection() {
  return (
    <section className="py-20">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          variants={fadeUp}
          custom={0}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="text-sm text-[#2D79FF] font-medium tracking-wide uppercase">
            Pernah alami ini?
          </span>
          <h2 className="text-3xl md:text-4xl font-serif font-bold mt-3">
            Tantangan tugas akademik yang
            <br className="hidden md:block" />
            <span className="text-white/50"> menguras waktu dan energi</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {problems.map((problem, i) => {
            const Icon = problem.icon;
            return (
              <motion.div
                key={problem.title}
                variants={fadeUp}
                custom={i * 0.1}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                <Card className="h-full bg-white/[0.02] border-white/10 hover:border-white/20 transition-colors">
                  <CardContent className="p-6 space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                      <Icon className="w-6 h-6 text-red-400" />
                    </div>
                    <h3 className="font-semibold text-white">{problem.title}</h3>
                    <p className="text-sm text-white/50 leading-relaxed">{problem.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="py-20 bg-white/[0.01]">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          variants={fadeUp}
          custom={0}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="text-sm text-[#8E54E9] font-medium tracking-wide uppercase">
            Fitur Teora
          </span>
          <h2 className="text-3xl md:text-4xl font-serif font-bold mt-3">
            Semua yang Anda butuhkan,
            <br className="hidden md:block" />
            dalam satu platform akademik
          </h2>
          <p className="text-white/50 mt-4 max-w-2xl mx-auto">
            Dirancang untuk mahasiswa dan pengajar Indonesia. Dari memahami materi sampai menghasilkan dokumen siap submit.
          </p>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <motion.div key={feature.title} variants={fadeUp} custom={0}>
                <Card className="h-full bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04] transition-all duration-300 group">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br", feature.color)}>
                        <Icon className={cn("w-6 h-6", feature.accent)} />
                      </div>
                      {feature.badge && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/10 text-white/60 border border-white/10">
                          {feature.badge}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white group-hover:text-[#2D79FF] transition-colors">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-white/50 mt-2 leading-relaxed">{feature.description}</p>
                    </div>
                    <div className="pt-2">
                      <a href="#" className="inline-flex items-center gap-1 text-xs text-[#2D79FF] hover:gap-2 transition-all">
                        Pelajari lebih lanjut <ChevronRight className="w-3 h-3" />
                      </a>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          variants={fadeUp}
          custom={0}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="text-sm text-[#2D79FF] font-medium tracking-wide uppercase">
            Cara Kerja
          </span>
          <h2 className="text-3xl md:text-4xl font-serif font-bold mt-3">
            Mulai dari 3 langkah mudah
          </h2>
        </motion.div>

        <div className="space-y-16">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              variants={fadeUp}
              custom={i * 0.15}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className={cn(
                "grid lg:grid-cols-2 gap-12 items-center",
                i % 2 === 1 && "lg:flex-row-reverse"
              )}
            >
              <div className={cn(i % 2 === 1 ? "lg:order-2" : "")}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-5xl font-serif font-bold text-white/10">
                    {step.number}
                  </span>
                  <h3 className="text-2xl font-serif font-bold">{step.title}</h3>
                </div>
                <p className="text-white/50 leading-relaxed mb-6">{step.description}</p>
                <Link href="/register">
                  <Button variant="outline" className="border-white/20 text-white/70 hover:text-white hover:bg-white/5">
                    Coba Sekarang <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
              <div className={i % 2 === 1 ? "lg:order-1" : ""}>
                {step.visual}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-20 bg-white/[0.01]">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          variants={fadeUp}
          custom={0}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="text-sm text-[#8E54E9] font-medium tracking-wide uppercase">
            Testimoni
          </span>
          <h2 className="text-3xl md:text-4xl font-serif font-bold mt-3">
            Digunakan oleh mahasiswa dan pengajar
          </h2>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-3 gap-6"
        >
          {testimonials.map((t) => (
            <motion.div key={t.name} variants={fadeUp}>
              <Card className="h-full bg-white/[0.02] border-white/10 hover:border-white/20 transition-colors">
                <CardContent className="p-6 space-y-4">
                  {/* Stars */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>

                  {/* Quote */}
                  <div className="relative">
                    <Quote className="absolute -top-1 -left-1 w-4 h-4 text-[#2D79FF]/30" />
                    <p className="text-sm text-white/60 leading-relaxed pl-4 italic">
                      "{t.quote}"
                    </p>
                  </div>

                  {/* Author */}
                  <div className="flex items-center gap-3 pt-2 border-t border-white/5">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-semibold text-sm",
                        t.color
                      )}
                    >
                      {t.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{t.name}</p>
                      <p className="text-xs text-white/40">
                        {t.role}, {t.university}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function PricingSection() {
  const plans = [
    {
      name: "Gratis",
      price: "Rp 0",
      period: "selamanya",
      description: "Untuk mulai belajar dan mencoba fitur dasar.",
      features: [
        "50 AI requests per bulan",
        "3 proyek aktif",
        "Task Mentor (dasar)",
        "Practice (dasar)",
        "Export DOCX",
        "Pustaka Saya (50 referensi)",
      ],
      cta: "Mulai Gratis",
      highlight: false,
    },
    {
      name: "Premium",
      price: "Rp 29.000",
      period: "per bulan",
      description: "Untuk mahasiswa dan pengajar yang butuh lebih banyak.",
      features: [
        "Unlimited AI requests",
        "Unlimited proyek aktif",
        "Task Mentor (lengkap)",
        "Practice (lengkap + spaced repetition)",
        "Export DOCX, PDF, PPTX",
        "Pustaka Saya (unlimited)",
        "AI Assistant (unlimited)",
        "Auto-Cite semua format",
        "Assessment Tools (untuk pengajar)",
        "Priority support",
      ],
      cta: "Berlangganan Sekarang",
      highlight: true,
    },
  ];

  return (
    <section id="pricing" className="py-20">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          variants={fadeUp}
          custom={0}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="text-sm text-[#2D79FF] font-medium tracking-wide uppercase">
            Harga
          </span>
          <h2 className="text-3xl md:text-4xl font-serif font-bold mt-3">
            Investasi terjangkau untuk
            <br className="hidden md:block" />
            pemahaman akademik yang lebih baik
          </h2>
          <p className="text-white/50 mt-4">
            Mulai gratis. Upgrade kapan saja jika butuh lebih banyak.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              variants={scaleIn}
              custom={i * 0.1}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <Card
                className={cn(
                  "relative h-full overflow-hidden",
                  plan.highlight
                    ? "bg-gradient-to-b from-[#2D79FF]/10 to-[#8E54E9]/10 border-[#2D79FF]/30 shadow-xl shadow-blue-500/10"
                    : "bg-white/[0.02] border-white/10"
                )}
              >
                {plan.highlight && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2D79FF] to-[#8E54E9]" />
                )}
                <CardContent className="p-6 space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                    <div className="mt-2">
                      <span className="text-3xl font-bold text-white">{plan.price}</span>
                      <span className="text-white/40 text-sm ml-1">{plan.period}</span>
                    </div>
                    <p className="text-sm text-white/50 mt-2">{plan.description}</p>
                  </div>

                  <ul className="space-y-3">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-white/60">
                        <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Link href="/register">
                    <Button
                      className={cn(
                        "w-full",
                        plan.highlight
                          ? "bg-gradient-to-r from-[#2D79FF] to-[#8E54E9] hover:opacity-90 text-white shadow-lg shadow-blue-500/20"
                          : "bg-white/10 hover:bg-white/15 text-white border border-white/20"
                      )}
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.p
          variants={fadeUp}
          custom={0.3}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-center text-sm text-white/30 mt-6"
        >
          Cashback 30 hari jika tidak puas. Tidak ada kontrak mengikat.
        </motion.p>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-20">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          variants={scaleIn}
          custom={0}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#2D79FF]/20 to-[#8E54E9]/20 border border-[#2D79FF]/30 p-12 md:p-16 text-center"
        >
          {/* Glow */}
          <div className="absolute inset-0 bg-gradient-radial from-[#2D79FF]/10 to-transparent" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-[#2D79FF]/10 blur-[80px] rounded-full" />

          <div className="relative">
            <h2 className="text-3xl md:text-4xl font-serif font-bold">
              Siap menemani proses belajar Anda?
            </h2>
            <p className="text-white/50 mt-4 max-w-xl mx-auto">
              Bergabung dengan 12.000+ mahasiswa dan pengajar yang sudah menggunakan Teora untuk memahami tugas dan menyelesaikannya.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
              <Link href="/register">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-[#2D79FF] to-[#8E54E9] hover:opacity-90 text-white shadow-xl shadow-blue-500/30 text-base px-10 h-12"
                >
                  Mulai Gratis Sekarang
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <p className="text-xs text-white/30">
                Tidak perlu kartu kredit · Gratis selamanya untuk tier basic
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  const links = {
    Product: ["Fitur", "Harga", "Cara Kerja", "Testimoni"],
    Resources: ["Dokumentasi", "Tutorial", "Blog", "FAQ"],
    Company: ["Tentang", "Karir", "Kontak", "Press"],
    Legal: ["Syarat Layanan", "Kebijakan Privasi", "Cookie Policy"],
  };

  return (
    <footer className="border-t border-white/5 pt-16 pb-8">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2">
            <TeoraLogo size="sm" className="mb-4" />
            <p className="text-sm text-white/40 leading-relaxed max-w-xs">
              Asisten Akademik AI untuk mahasiswa dan pengajar Indonesia. Membantu memahami tugas dan menyelesaikannya.
            </p>
            <div className="flex items-center gap-3 mt-4">
              {[
                { label: "Twitter/X", href: "#" },
                { label: "Instagram", href: "#" },
                { label: "LinkedIn", href: "#" },
              ].map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  className="text-white/30 hover:text-white/60 transition-colors text-xs"
                >
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(links).map(([category, items]) => (
            <div key={category}>
              <h4 className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-3">
                {category}
              </h4>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-sm text-white/50 hover:text-white/80 transition-colors"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/30">
          <span>&copy; 2026 Teora. Hak cipta dilindungi.</span>
          <div className="flex items-center gap-4">
            <a href="/terms" className="hover:text-white/60 transition-colors">Syarat Layanan</a>
            <a href="/privacy" className="hover:text-white/60 transition-colors">Kebijakan Privasi</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Landing() {
  const { user } = useAuth();
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme("dark");
  }, [setTheme]);

  if (user) return <Redirect to="/dashboard" />;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <HeroSection />
      <StatsSection />
      <ProblemSection />
      <FeaturesSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <PricingSection />
      <CTASection />
      <Footer />
    </div>
  );
}
