/**
 * Token estimation utilities — heuristic approach.
 *
 * Using tiktoken (BPE-based tokenizer) in Vercel Functions is unreliable because
 * tiktoken loads a .wasm file at runtime, and Vercel's build system (esbuild)
 * does not bundle .wasm files into the deployed bundle. Attempting to use tiktoken
 * in production results in:
 *   "Error: Missing tiktoken_bg.wasm at tiktoken/tiktoken.cjs"
 *
 * The heuristic approach uses character count divided by average chars-per-token.
 * This is less accurate than real BPE tokenization (~90% accuracy) but is
 * deterministic and works everywhere without external assets.
 *
 * Ratio chosen: 3.5 chars/token — empirically appropriate for Indonesian and
 * English mixed academic text (Indonesian text tends to have shorter words on
 * average, which increases tokens-per-character relative to English).
 *
 * References:
 * - tiktoken WASM issue: https://github.com/transitive-bullshit/tiktoken-node/issues/45
 * - ERR-017 root cause: Vercel deploy `dpl_EwGjBFKydaTcDqz55Mde1vn6hfFv` (2026-09-10)
 */

const CHARS_PER_TOKEN = 3.5;

export function countTokens(text: string): number {
  if (!text || typeof text !== "string") return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export function estimateTokensFromChars(charCount: number): number {
  return Math.ceil(charCount / CHARS_PER_TOKEN);
}

export function truncateToTokenLimit(text: string, maxTokens: number): string {
  if (!text || typeof text !== "string") return text;

  const maxChars = Math.floor(maxTokens * CHARS_PER_TOKEN);
  if (text.length <= maxChars) return text;

  // Truncate to maxChars, then backtrack to the last space to avoid mid-word cuts
  let truncated = text.substring(0, maxChars);
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace > maxChars * 0.8) {
    // Only backtrack if we won't lose more than 20% of the truncated portion
    truncated = truncated.substring(0, lastSpace);
  }
  return truncated;
}

/**
 * Estimate the total input tokens for an Anthropic /messages API call.
 * Returns both the estimate and a safe max_tokens value for the model.
 *
 * @param systemPrompt  - The system prompt (subtracted from context window)
 * @param messages      - All user/assistant messages
 * @param model         - Model name (e.g. "claude-sonnet-4-5-20250514")
 * @param reserveTokens - How many tokens to reserve for the output (default 4096)
 */
export function estimateAnthropicInputTokens(
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  model: string,
  reserveTokens = 4096
): { inputTokens: number; safeMaxOutputTokens: number } {
  const systemTokens = countTokens(systemPrompt);

  const messageTokens = messages.reduce((sum, m) => {
    // Anthropic counts role keywords as separate tokens
    return sum + countTokens(m.content) + 5; // ~5 tokens for role + formatting
  }, 0);

  const inputTokens = systemTokens + messageTokens;

  // Context windows per model family (approximate, conservative)
  // Anthropic models support up to 200K tokens for Haiku/Sonnet/Opus 4
  const CONTEXT_WINDOWS: Record<string, number> = {
    "claude-sonnet-4-5-20250514": 200_000,
    "claude-sonnet-4-20250514": 200_000,
    "claude-3-5-sonnet": 200_000,
    "claude-3-5-haiku": 200_000,
    "claude-3-5-sonnet-20240620": 200_000,
    "claude-3-5-haiku-20240307": 200_000,
    "claude-3-opus": 200_000,
    "claude-3-sonnet": 200_000,
    "claude-3-haiku": 200_000,
  };

  // Default: assume 200K context window for unknown models
  const contextWindow = CONTEXT_WINDOWS[model] ?? 200_000;

  // Reserve 20% of context window as overhead for Anthropic's internal processing
  const effectiveWindow = Math.floor(contextWindow * 0.8);

  const safeMaxOutputTokens = Math.min(reserveTokens, Math.max(512, effectiveWindow - inputTokens - 100));

  return { inputTokens, safeMaxOutputTokens: Math.max(512, safeMaxOutputTokens) };
}
