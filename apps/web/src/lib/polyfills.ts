/**
 * Polyfills for server-side rendering
 * Fixes "indexedDB is not defined" errors during SSR
 */

if (typeof window === "undefined") {
  // @ts-ignore - Polyfill for SSR
  global.indexedDB = {
    open: () => ({
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  };
}
