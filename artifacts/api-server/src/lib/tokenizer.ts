import { get_encoding, type Tiktoken } from "tiktoken";

const MODEL_CONTEXT_WINDOWS: Record<string, number> = {
  // Anthropic Claude 3.5
  "claude-3-5-sonnet-20241022": 200_000,
  "claude-3-5-haiku-20241022": 200_000,
  // Anthropic Claude 3
  "claude-3-opus-20240229": 200_000,
  "claude-3-sonnet-20240229": 200_000,
  "claude-3-haiku-20240307": 200_000,
  // Groq
  "llama-3.1-8b-instant": 128_000,
  "llama-3.3-70b-versatile": 128_000,
  // OpenAI
  "gpt-4o": 128_000,
  "gpt-4o-mini": 128_000,
  // Default
  default: 100_000,
};

// Cached encoder — cl100k_base works for all models in our stack
let _encoder: Tiktoken | null = null;

function getEncoder(): Tiktoken {
  if (!_encoder) {
    _encoder = get_encoding("cl100k_base");
  }
  return _encoder;
}

/**
 * Count tokens in text using cl100k_base encoding.
 * Accurate for Anthropic, OpenAI, Groq models.
 */
export function countTokens(text: string): number {
  if (!text) return 0;
  const enc = getEncoder();
  return enc.encode(text).length;
}

/**
 * Get context window size for a model.
 */
export function getContextWindow(model: string): number {
  return MODEL_CONTEXT_WINDOWS[model] ?? MODEL_CONTEXT_WINDOWS.default;
}

/**
 * Estimate tokens from character count (rough, no encoding needed).
 * Average: 1 token ≈ 4 characters in English, ~2.5 in Indonesian (more accented chars).
 * We use 4 as conservative estimate.
 */
export function estimateTokensFromChars(charCount: number): number {
  return Math.ceil(charCount / 4);
}

/**
 * Truncate text to fit within a token budget for a given model.
 * Reserves tokens for output buffer.
 */
export function truncateToTokenLimit(
  text: string,
  model: string,
  maxInputTokens?: number,
): string {
  if (!text) return text;

  const contextWindow = getContextWindow(model);
  const reserved = maxInputTokens ?? Math.floor(contextWindow * 0.75);
  const maxTokens = Math.min(reserved, contextWindow - 4096); // Leave room for output

  const tokens = countTokens(text);
  if (tokens <= maxTokens) return text;

  // Binary search for the right character boundary
  let low = 0;
  let high = text.length;

  while (low < high) {
    const mid = Math.floor((low + high + 1) / 2);
    const slice = text.substring(0, mid);
    if (countTokens(slice) <= maxTokens) {
      low = mid;
    } else {
      high = mid - 1;
    }
    // Safety: prevent infinite loop
    if (low === high) break;
  }

  return text.substring(0, low);
}
