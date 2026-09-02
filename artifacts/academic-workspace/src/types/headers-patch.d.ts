/**
 * Type augmentation: add Headers.entries() to the DOM Headers type.
 * TypeScript 5.9 DOM lib dropped entries() from the Headers interface,
 * but it exists at runtime in all modern browsers. This fixes type errors
 * in Orval-generated API client code that calls h.entries().
 */
interface Headers {
  entries(): IterableIterator<[string, string]>;
}
