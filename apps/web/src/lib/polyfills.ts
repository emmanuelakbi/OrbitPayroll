/**
 * Polyfills for server-side rendering
 * Fixes "indexedDB is not defined" and "localStorage is not defined" errors during SSR/static generation
 */

if (typeof window === "undefined") {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  (global as any).indexedDB = {
    open: () => ({
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  };

  // localStorage stub for SSR — wagmi/RainbowKit may access it at module level
  const noopStorage = {
    getItem: (_key: string) => null,
    setItem: (_key: string, _value: string) => {},
    removeItem: (_key: string) => {},
    clear: () => {},
    key: (_index: number) => null,
    length: 0,
  };
  (global as any).localStorage = noopStorage;
  (global as any).sessionStorage = noopStorage;
  /* eslint-enable @typescript-eslint/no-explicit-any */
}
