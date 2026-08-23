import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";

export default function PrivacyPolicy() {
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
          <h1 className="text-lg font-semibold">Kebijakan Privasi — Teora</h1>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card className="bg-card border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Kebijakan Privasi</CardTitle>
            <p className="text-sm text-muted-foreground">Berlaku sejak {effectiveDate}</p>
          </CardHeader>
          <CardContent className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-sm">
            <p>
              <strong>PT Teora Teknologi Indonesia</strong> ("Kami", "Teora") berkomitmen untuk melindungi privasi Anda. Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, mengungkapkan, dan melindungi informasi pribadi Anda ketika Anda menggunakan layanan kami.
            </p>

            <h2 className="text-lg font-semibold mt-8">1. Informasi yang Kami Kumpulkan</h2>
            <h3 className="font-medium mt-4">1.1 Informasi Akun</h3>
            <p>Ketika Anda mendaftar, kami mengumpulkan: nama, alamat email, dan informasi otentikasi yang diberikan melalui Supabase (platform autentikasi yang kami gunakan).</p>

            <h3 className="font-medium mt-4">1.2 Konten Workspace</h3>
            <p>Ketika Anda menggunakan Teora, kami menyimpan: dokumen yang Anda buat, pesan chat, referensi, lampiran, hasil kuis, dan aktivitas proyek. Konten ini dienkripsi saat transit dan saat disimpan.</p>

            <h3 className="font-medium mt-4">1.3 Data Penggunaan AI</h3>
            <p>Kami mencatat penggunaan token AI untuk keperluan penagihan dan peningkatan layanan. Interaksi dengan model AI mungkin disimpan secara anonim untuk tujuan peningkatan kualitas layanan sesuai dengan kebijakan provider AI kami.</p>

            <h3 className="font-medium mt-4">1.4 Data Teknis</h3>
            <p>Kami mengumpulkan: alamat IP, jenis browser, sistem operasi, timestamp akses, dan metrik penggunaan agregat untuk keperluan analitik dan keamanan.</p>

            <h2 className="text-lg font-semibold mt-8">2. Penggunaan Informasi</h2>
            <p>Kami menggunakan informasi yang dikumpulkan untuk:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Menyediakan dan mengelola layanan Teora</li>
              <li>Memproses pembayaran langganan</li>
              <li>Mengirim notifikasi terkait akun dan layanan</li>
              <li>Meningkatkan kualitas dan keamanan layanan</li>
              <li>Mematuhi kewajiban hukum yang berlaku</li>
              <li>Mencegah penyalahgunaan dan aktivitas ilegal</li>
            </ul>

            <h2 className="text-lg font-semibold mt-8">3. Dasar Hukum Pemrosesan (UU PDP 2022)</h2>
            <p>
              Sesuai dengan Undang-Undang Perlindungan Data Pribadi (UU PDP) No. 27 Tahun 2022 Indonesia, dasar hukum pemrosesan data pribadi kami meliputi:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Persetujuan</strong> — Anda memberikan persetujuan saat mendaftar dan menggunakan layanan</li>
              <li><strong>Pelaksanaan kontrak</strong> — Pemrosesan diperlukan untuk menyediakan layanan kepada Anda</li>
              <li><strong>Keperluan hukum</strong> — Pemrosesan diperlukan untuk mematuhi kewajiban regulasi</li>
            </ul>

            <h2 className="text-lg font-semibold mt-8">4. Pembagian Informasi dengan Pihak Ketiga</h2>
            <h3 className="font-medium mt-4">4.1 Penyedia Layanan</h3>
            <p>Kami membagikan data dengan penyedia layanan pihak ketiga untuk mengoperasikan Teora:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Supabase</strong> — Database dan autentikasi (data disimpan di infrastruktur Supabase)</li>
              <li><strong>Provider AI</strong> (OpenAI/anthropic) — Interaksi AI diproses oleh provider ini</li>
              <li><strong>Vercel</strong> — Hosting infrastruktur aplikasi</li>
              <li><strong>Penyedia pembayaran</strong> — Untuk pemrosesan pembayaran langganan</li>
            </ul>

            <h3 className="font-medium mt-4">4.2 Persyaratan Hukum</h3>
            <p>Kami dapat mengungkapkan informasi jika diperlukan untuk mematuhi perintah pengadilan, regulasi, atau proses hukum lainnya.</p>

            <h3 className="font-medium mt-4">4.3 Tidak Ada Penjualan Data</h3>
            <p>Kami tidak menjual, menyewakan, atau memperdagangkan data pribadi Anda kepada pihak ketiga untuk tujuan pemasaran.</p>

            <h2 className="text-lg font-semibold mt-8">5. Retensi Data</h2>
            <p>
              Kami menyimpan data pribadi Anda selama akun Anda aktif. Setelah penghapusan akun, data akan dihapus dalam waktu 30 hari, kecuali diperlukan untuk keperluan hukum atau penagihan. Dokumen yang di-export sebelum penghapusan akun tidak ikut terhapus.
            </p>

            <h2 className="text-lg font-semibold mt-8">6. Hak Anda (UU PDP 2022)</h2>
            <p>Sesuai UU PDP 2022, Anda memiliki hak untuk:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Akses</strong> — Meminta salinan data pribadi Anda</li>
              <li><strong>Koreksi</strong> — Meminta perbaikan data yang tidak akurat</li>
              <li><strong>Hapus</strong> — Meminta penghapusan data pribadi Anda</li>
              <li><strong>Portabilitas</strong> — Menerima data Anda dalam format terstruktur</li>
              <li><strong>Menarik persetujuan</strong> — Menarik persetujuan pemrosesan data</li>
              <li><strong>Keberatan</strong> — Menolak pemrosesan tertentu</li>
            </ul>
            <p>Untuk行使 hak ini, silakan hubungi kami di <strong>privacy@teora.id</strong>.</p>

            <h2 className="text-lg font-semibold mt-8">7. Keamanan Data</h2>
            <p>
              Kami menerapkan langkah-langkah keamanan yang sesuai termasuk: enkripsi data saat transit (TLS) dan saat diam (AES-256), kontrol akses berbasis peran, monitoring keamanan berkelanjutan, dan tinjauan keamanan berkala.
            </p>

            <h2 className="text-lg font-semibold mt-8">8. Cookies</h2>
            <p>
              Teora menggunakan cookie untuk: autentikasi sesi, mengingat preferensi Anda, dan analitik dasar. Cookie pihak ketiga mungkin digunakan oleh Supabase dan Vercel sesuai kebijakan masing-masing.
            </p>

            <h2 className="text-lg font-semibold mt-8">9. Data Anak-Anak</h2>
            <p>
              Layanan kami tidak ditujukan untuk anak-anak di bawah 13 tahun. Kami tidak secara sengaja mengumpulkan data pribadi dari anak-anak di bawah 13 tahun. Jika kami mengetahui bahwa kami telah mengumpulkan data dari anak di bawah 13 tahun, kami akan mengambil langkah untuk menghapus informasi tersebut.
            </p>

            <h2 className="text-lg font-semibold mt-8">10. Perubahan Kebijakan</h2>
            <p>
             Kami dapat memperbarui Kebijakan Privasi ini sewaktu-waktu. Perubahan akan diumumkan melalui email atau pemberitahuan di dalam aplikasi. Penggunaan berkelanjutan setelah perubahan merupakan persetujuan atas kebijakan yang telah diperbarui.
            </p>

            <h2 className="text-lg font-semibold mt-8">11. Informasi Kontak</h2>
            <p>
              <strong>Penanggung Jawab Data (DPO):</strong><br />
              PT Teora Teknologi Indonesia<br />
              <strong>Email:</strong> privacy@teora.id<br />
              <strong>Alamat:</strong> Jakarta, Indonesia<br />
              <strong>Telepon:</strong> [nomor telepon]
            </p>

            <h2 className="text-lg font-semibold mt-8">12. Versi Bahasa</h2>
            <p>
              Versi bahasa Indonesia dari Kebijakan Privasi ini adalah versi resmi. Terjemahan dalam bahasa lain disediakan untuk kemudahan saja dan tidak memiliki kekuatan hukum.
            </p>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="flex items-center justify-center gap-6 mt-8 text-xs text-muted-foreground">
          <Link href="/terms" className="hover:text-foreground transition-colors">Ketentuan Layanan</Link>
          <Link href="/login" className="hover:text-foreground transition-colors">Login</Link>
          <span>© 2025 PT Teora Teknologi Indonesia</span>
        </div>
      </div>
    </div>
  );
}
