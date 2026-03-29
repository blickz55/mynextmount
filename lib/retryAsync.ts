/**
 * Run an async function with a small delay between attempts (e.g. transient DB blips).
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  opts: { retries: number; delayMs: number },
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= opts.retries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (attempt === opts.retries) {
        break;
      }
      await new Promise((r) => setTimeout(r, opts.delayMs));
    }
  }
  throw lastErr;
}
