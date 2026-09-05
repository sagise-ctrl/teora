import { Link, Redirect } from "wouter";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { Brain, BookOpen, Library, MessageSquare, FileDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Brain,
    title: "Task Mentor",
    description: "Kerjakan tugas akademik selangkah demi selangkah, dengan AI yang menjelaskan dasar materinya.",
  },
  {
    icon: BookOpen,
    title: "Practice",
    description: "Quiz berdasarkan topik tugas Anda, dengan sistem pengulangan yang membantu Anda mengingat.",
  },
  {
    icon: Library,
    title: "Pustaka Saya",
    description: "Kelola pustaka referensi dengan Auto-Cite dan format sitasi otomatis.",
  },
  {
    icon: MessageSquare,
    title: "AI Assistant",
    description: "Tanya tentang tugas — AI bantu Anda memahami, bukan sekadar menjawab.",
  },
  {
    icon: FileDown,
    title: "Export",
    description: "Hasilkan dokumen siap submit dalam format DOCX, PDF, atau PPTX.",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export default function Landing() {
  const { user, isLoading } = useAuth();

  if (user) return <Redirect to="/dashboard" />;
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-lg font-serif font-bold tracking-tight">Teora</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Masuk</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Daftar</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col">
        <section className="py-20 px-6">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight leading-tight">
                Asisten Akademik untuk<br />Belajar, Memahami, Menguasai
              </h1>
            </motion.div>
            <motion.p
              className="text-lg text-muted-foreground max-w-xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              Teora membantu Anda memahami tugas akademik dari awal sampai akhir —
              bukan hasil jadi, tapi pemahaman yang Anda kuasai sendiri.
            </motion.p>
            <motion.div
              className="flex items-center justify-center gap-3 pt-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Link href="/register">
                <Button size="lg">Mulai Gratis</Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg">Masuk</Button>
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Features */}
        <section className="py-12 px-6 bg-muted/30 border-y border-border">
          <div className="max-w-5xl mx-auto">
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
            >
              {features.map((f) => {
                const Icon = f.icon;
                return (
                  <motion.div key={f.title} variants={itemVariants}>
                    <Card className="h-full hover:shadow-md transition-shadow cursor-default">
                      <CardContent className="p-5 space-y-3">
                        <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-brand" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm">{f.title}</h3>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            {f.description}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 px-6">
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <h2 className="text-2xl font-serif font-bold tracking-tight">
              Siap memahami tugas akademik Anda?
            </h2>
            <p className="text-muted-foreground">
              Bergabung dengan Teora dan mulai belajar dengan cara yang lebih cerdas.
            </p>
            <Link href="/register">
              <Button size="lg">Daftar Sekarang</Button>
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border py-4 px-6">
          <div className="max-w-5xl mx-auto flex items-center justify-between text-xs text-muted-foreground">
            <span>&copy; 2026 Teora</span>
            <div className="flex items-center gap-3">
              <Link href="/terms" className="hover:text-foreground transition-colors">ToS</Link>
              <span>&middot;</span>
              <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
