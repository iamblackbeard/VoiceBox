/**
 * Probes the browser environment for WebGPU support.
 * Returns true if an adapter can be requested safely within a timeout.
 * Returns false if WebGPU is not supported, requests fail, or times out.
 */
export async function checkWebGpu(timeoutMs: number = 2000): Promise<boolean> {
  const nav =
    typeof navigator !== 'undefined'
      ? (navigator as unknown as {
          gpu?: {
            requestAdapter: () => Promise<unknown>;
          };
        })
      : null;

  if (!nav?.gpu || typeof nav.gpu.requestAdapter !== 'function') {
    return false;
  }

  try {
    const adapterPromise = nav.gpu.requestAdapter();
    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), timeoutMs),
    );

    const adapter = await Promise.race([adapterPromise, timeoutPromise]);
    return adapter != null;
  } catch (err) {
    console.warn('[hardware] WebGPU requestAdapter failed:', err);
    return false;
  }
}
