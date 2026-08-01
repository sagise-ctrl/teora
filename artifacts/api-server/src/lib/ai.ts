import { logger } from "./logger";

const AI_PROVIDER = process.env.AI_PROVIDER ?? "openai";
const AI_BASE_URL = process.env.AI_BASE_URL ?? "https://api.openai.com/v1";
const AI_API_KEY = process.env.AI_API_KEY ?? "";
const AI_MODEL = process.env.AI_MODEL ?? "gpt-4o-mini";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function callAI(messages: ChatMessage[]): Promise<string> {
  if (!AI_API_KEY) {
    logger.warn("AI_API_KEY not set — returning placeholder response");
    return "AI belum dikonfigurasi. Silakan atur AI_API_KEY, AI_BASE_URL, dan AI_MODEL di environment variables.";
  }

  const url = `${AI_BASE_URL}/chat/completions`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    logger.error({ status: response.status, body: errorBody }, "AI API error");
    throw new Error(`AI API error ${response.status}: ${errorBody}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };

  return data.choices[0]?.message?.content ?? "";
}

export function buildSystemPrompt(projectContext: {
  title: string;
  instructionText?: string | null;
  subject?: string | null;
  taskType?: string | null;
  citationFormat?: string | null;
  outline?: string | null;
  latestDocument?: string | null;
  contextSummary?: string | null;
}): string {
  return `Kamu adalah AI asisten akademik yang membantu mengerjakan tugas kuliah dan karya ilmiah.

ATURAN UTAMA:
- Selalu gunakan Bahasa Indonesia yang natural, akademik, dan mudah dibaca.
- Pahami instruksi dosen secara otomatis — tentukan jenis tugas, mata kuliah, topik, judul, dan struktur dokumen sendiri.
- Hasilkan tulisan akademik yang natural dan mengalir — gunakan variasi kalimat, hindari pengulangan frasa berlebihan.
- Paragraf harus saling terhubung secara logis.
- Utamakan kualitas akademik dan keterbacaan.
- JANGAN membuat referensi fiktif. Hanya gunakan referensi yang dapat diverifikasi.
- Utamakan referensi Indonesia apabila tersedia dan relevan.
- Jelaskan apabila referensi yang diminta tidak ditemukan daripada mengarang.
- Ingat konteks project saat melakukan revisi.
- Saat revisi, selalu gunakan versi dokumen terbaru.

KONTEKS PROJECT SAAT INI:
Judul: ${projectContext.title}
${projectContext.subject ? `Mata Kuliah: ${projectContext.subject}` : ""}
${projectContext.taskType ? `Jenis Tugas: ${projectContext.taskType}` : ""}
${projectContext.citationFormat ? `Format Sitasi: ${projectContext.citationFormat}` : ""}
${projectContext.instructionText ? `\nINSTRUKSI DOSEN:\n${projectContext.instructionText}` : ""}
${projectContext.outline ? `\nOUTLINE DOKUMEN:\n${projectContext.outline}` : ""}
${projectContext.latestDocument ? `\nDOKUMEN TERBARU (untuk referensi revisi):\n${projectContext.latestDocument.substring(0, 3000)}${projectContext.latestDocument.length > 3000 ? "\n...[dipotong]" : ""}` : ""}
${projectContext.contextSummary ? `\nRINGKASAN KONTEKS:\n${projectContext.contextSummary}` : ""}`;
}
