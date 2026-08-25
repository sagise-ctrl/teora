import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";

export default function TermsOfService() {
  const { user } = useAuth();
  const effectiveDate = "1 September 2025";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-sidebar">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href={user ? "/" : "/login"}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {user ? "Kembali" : "Login"}
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">Ketentuan Layanan — Teora</h1>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card className="bg-card border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Ketentuan Layanan</CardTitle>
            <p className="text-sm text-muted-foreground">Berlaku sejak {effectiveDate}</p>
          </CardHeader>
          <CardContent className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-sm">
            <p>
              Dengan mengakses dan menggunakan layanan <strong>Teora</strong> ("Layanan"), Anda Agree untuk terikat oleh Ketentuan Layanan ini. Jika Anda tidak setuju dengan bagian mana pun, Anda tidak diperkenankan menggunakan Layanan.
            </p>

            <h2 className="text-lg font-semibold mt-8">1. Layanan</h2>
            <p>
              Teora adalah platform workspace akademik berbasis AI yang menyediakan alat untuk membantu pengguna dalam mengerjakan tugas akademik, termasuk namun tidak terbatas pada: generasi dokumen, manajemen referensi, kuis interaktif, dan analisis gaya penulisan. Layanan ini disediakan oleh <strong>PT Teora Teknologi Indonesia</strong>.
            </p>

            <h2 className="text-lg font-semibold mt-8">2. Eligibility</h2>
            <p>
              Layanan ini ditujukan untuk pengguna berusia 13 tahun ke atas. Dengan menggunakan Layanan, Anda menyatakan dan menjamin bahwa Anda memenuhi persyaratan usia ini.
            </p>

            <h2 className="text-lg font-semibold mt-8">3. Akun Pengguna</h2>
            <p>
              Untuk mengakses fitur tertentu, Anda harus membuat akun. Anda bertanggung jawab untuk menjaga kerahasiaan informasi login Anda. Anda setuju untuk tidak membagikan akun Anda kepada pihak lain. Segala aktivitas yang terjadi di bawah akun Anda adalah tanggung jawab Anda.
            </p>

            <h2 className="text-lg font-semibold mt-8">4. Penggunaan AI</h2>
            <p>
              Teora menggunakan model bahasa besar (LLM) untuk menghasilkan konten. Perlu diketahui bahwa:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Konten yang dihasilkan oleh AI mungkin tidak selalu akurat, lengkap, atau sesuai konteks.</li>
              <li>AI tidak dapat menggantikan penilaian profesional manusia dalam bidang akademik, medis, hukum, atau lainnya.</li>
              <li>Pengguna bertanggung jawab untuk memverifikasi dan mengedit konten yang dihasilkan AI sebelum digunakan.</li>
              <li>Pengguna tidak boleh menggunakan Teora untuk membuat konten yang bertujuan menyesatkan, menipu, atau melanggar hukum.</li>
            </ul>

            <h2 className="text-lg font-semibold mt-8">5. Label AI-Assisted</h2>
            <p>
              Teora secara default menampilkan label "AI-assisted" pada konten yang dihasilkan oleh AI. Pengguna dilarang menghapus atau menyembunyikan label ini pada dokumen yang didistribusikan kepada pihak lain tanpa persetujuan tertulis dari Teora.
            </p>

            <h2 className="text-lg font-semibold mt-8">6. Batas Penggunaan</h2>
            <p>
              Penggunaan Token AI tunduk pada batas bulanan sesuai paket langganan Anda. Token yang tidak digunakan dalam periode tertentu tidak dapat dipindahkan ke periode berikutnya. Penyalahgunaan layanan (misalnya: pembuatan massal konten spam, penggunaan untuk tujuan ilegal) dapat mengakibatkan penghentian akun.
            </p>

            <h2 className="text-lg font-semibold mt-8">7. Konten Pengguna</h2>
            <p>
              Anda menyimpan kepemilikan atas konten yang Anda buat menggunakan Layanan. Dengan menggunakan Teora, Anda memberikan lisensi terbatas untuk menggunakan konten Anda guna menyediakan Layanan kepada Anda. Anda bertanggung jawab penuh atas konten yang Anda buat dan menjamin bahwa konten tersebut tidak melanggar hak pihak ketiga.
            </p>

            <h2 className="text-lg font-semibold mt-8">8. Kebijakan Pembayaran</h2>
            <p>
              Biaya langganan akan dikenakan secara berkala sesuai paket yang dipilih. Pembatalan dapat dilakukan kapan saja; langganan akan tetap aktif hingga akhir periode yang sudah dibayar. Tidak ada pengembalian dana untuk periode yang sudah berjalan.
            </p>

            <h2 className="text-lg font-semibold mt-8">9. Privasi</h2>
            <p>
              Pengumpulan dan penggunaan data pribadi dijelaskan dalam <Link href="/privacy" className="text-primary underline">Kebijakan Privasi</Link> kami. Dengan menggunakan Layanan, Anda menyetujui praktik privasi yang dijelaskan di dalamnya.
            </p>

            <h2 className="text-lg font-semibold mt-8">10. Kepatuhan Regulasi AI</h2>
            <p>
              Teora berkomitmen untuk mematuhi regulasi yang berlaku di Indonesia terkait penggunaan Kecerdasan Buatan, termasuk namun tidak terbatas pada Surat Keputusan Bersama (SKB) tentang Pemanfaatan AI di Satuan Pendidikan. Pengguna sepakat untuk menggunakan Layanan sesuai dengan ketentuan regulasi yang berlaku.
            </p>

            <h2 className="text-lg font-semibold mt-8">11. Penyelesaian Sengketa</h2>
            <p>
              Segala sengketa yang timbul dari penggunaan Layanan ini akan diselesaikan secara musyawarah untuk mufakat. Jika musyawarah tidak mencapai kesepakatan dalam 30 hari, sengketa akan diselesaikan melalui Badan Arbitrase Nasional Indonesia (BANI) sesuai prosedur yang berlaku.
            </p>

            <h2 className="text-lg font-semibold mt-8">12. Perubahan Ketentuan</h2>
            <p>
              Kami dapat mengubah Ketentuan Layanan ini sewaktu-waktu. Perubahan akan diumumkan melalui email atau pemberitahuan di dalam aplikasi. Penggunaan berkelanjutan setelah perubahan merupakan persetujuan atas ketentuan yang telah diubah.
            </p>

            <h2 className="text-lg font-semibold mt-8">13. Hukum yang Berlaku</h2>
            <p>
              Ketentuan ini diatur oleh dan ditafsirkan sesuai dengan hukum Republik Indonesia.
            </p>

            <h2 className="text-lg font-semibold mt-8">14. Informasi Kontak</h2>
            <p>
              Untuk pertanyaan terkait Ketentuan Layanan ini, silakan hubungi:<br />
              <strong>Email:</strong> legal@teora.id<br />
              <strong>Alamat:</strong> PT Teora Teknologi Indonesia, Jakarta, Indonesia
            </p>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="flex items-center justify-center gap-6 mt-8 text-xs text-muted-foreground">
          <Link href="/privacy" className="hover:text-foreground transition-colors">Kebijakan Privasi</Link>
          <Link href="/login" className="hover:text-foreground transition-colors">Login</Link>
          <span>© 2025 PT Teora Teknologi Indonesia</span>
        </div>
      </div>
    </div>
  );
}
