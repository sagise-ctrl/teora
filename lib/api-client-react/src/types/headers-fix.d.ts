// Fix: TypeScript DOM lib is missing Headers.entries()
interface Headers {
  entries(): IterableIterator<[string, string]>;
}
