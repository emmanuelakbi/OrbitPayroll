/**
 * Polyfills for server-side rendering
 * Fixes "indexedDB is not defined" errors during SSR
 */

if (typeof window === "undefined") {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  (global as any).indexedDB = {
    open: () => ({
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  };
  /* eslint-enable @typescript-eslint/no-explicit-any */
}
