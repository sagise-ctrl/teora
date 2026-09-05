import { Link } from "wouter";
import { LayoutDashboard, BookOpen, Brain, MessageSquare, FileDown, CreditCard, Mail, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const faqs = [
  {
    q: "Apa itu Teora?",
    a: "Teora adalah asisten akademik berbasis AI yang membantu mahasiswa dan peneliti mengelola project akademik — dari outline, penulisan, referensi, sampai sitasi.",
  },
  {
    q: "Bagaimana cara memulai?",
    a: "Daftar di Teora, lalu buat project baru. Pilih jenis project (General atau Academic), isi detail, dan mulai mengerjakan dengan bantuan AI.",
  },
  {
    q: "Apakah gratis?",
    a: "Teora menyediakan saldo awal untuk mencoba. Untuk penggunaan lebih lanjut, Anda bisa melakukan topup saldo di halaman Akun.",
  },
  {
    q: "Bagaimana AI menggunakan data saya?",
    a: "AI membantu Anda memahami materi dan menghasilkan konten. Dokumen dan data Anda hanya bisa diakses oleh Anda. Baca Kebijakan Privasi kami untuk detail.",
  },
  {
    q: "Bagaimana cara mengekspor dokumen?",
    a: "Di halaman project, klik menu Export. Anda bisa export ke format DOCX, PDF, atau Slide PPTX.",
  },
  {
    q: "Apa itu Auto-Cite?",
    a: "Auto-Cite adalah fitur AI yang secara otomatis menemukan posisi dalam dokumen Anda di mana referensi tertentu relevan untuk disitasi, berdasarkan isi dokumen dan daftar pustaka Anda.",
  },
  {
    q: "Bagaimana cara menghubungi support?",
    a: "Kirim email ke halo@teora.id atau gunakan form di bawah. Kami akan merespons dalam 1-2 hari kerja.",
  },
];

export default function Help() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-serif font-bold tracking-tight">Pusat Bantuan</h1>
        <p className="text-muted-foreground mt-1">
          Jawaban untuk pertanyaan yang sering diajukan dan panduan penggunaan Teora.
        </p>
      </div>

      {/* Feature Overview */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Fitur Utama</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { icon: BookOpen, label: "Task Mentor", desc: "Kelola tugas akademik step-by-step" },
            { icon: Brain, label: "Practice", desc: "Quiz dan pengulangan untuk mengingat" },
            { icon: MessageSquare, label: "AI Assistant", desc: "Tanya apa saja tentang tugas" },
            { icon: FileDown, label: "Export", desc: "Download DOCX, PDF, PPTX" },
          ].map((f) => (
            <div key={f.label} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card">
              <f.icon className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">{f.label}</p>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Pertanyaan Umum</h2>
        <div className="space-y-3">
          {faqs.map((faq) => (
            <details key={faq.q} className="group rounded-lg border border-border p-4 bg-card">
              <summary className="text-sm font-medium cursor-pointer list-none flex items-center justify-between">
                {faq.q}
                <span className="text-muted-foreground group-open:rotate-180 transition-transform">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </summary>
              <p className="text-sm text-muted-foreground mt-2">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Hubungi Kami</h2>
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Tidak menemukan jawaban yang Anda cari? Kirimkan pertanyaan Anda dan kami akan merespons secepat mungkin.
          </p>
          <div className="flex items-center gap-2 text-sm">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <a href="mailto:halo@teora.id" className="text-primary hover:underline">
              halo@teora.id
            </a>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/dashboard" className="text-sm text-primary hover:underline">
              Kembali ke Dashboard
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
