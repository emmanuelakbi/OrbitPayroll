"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { config } from "@/lib/wagmi";
import { useAuthStore } from "@/lib/auth";
import { ToastProvider } from "@/components/ui/toast";
import { OfflineIndicator } from "@/components/ui/offline-indicator";

import "@rainbow-me/rainbowkit/styles.css";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000, // 30 seconds - data is considered fresh for 30s
        gcTime: 5 * 60 * 1000, // 5 minutes - cache garbage collection time
        retry: 2, // Retry failed requests twice
        refetchOnWindowFocus: false, // Don't refetch on window focus
        refetchOnReconnect: true, // Refetch when reconnecting
      },
      mutations: {
        retry: 1, // Retry failed mutations once
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === "undefined") {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    // Hydrate auth store on client
    useAuthStore.persist.rehydrate();
  }, []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#7c3aed",
            accentColorForeground: "white",
            borderRadius: "medium",
          })}
        >
          <ToastProvider>
            <OfflineIndicator />
            {mounted && children}
          </ToastProvider>
        </RainbowKitProvider>
        {process.env.NODE_ENV === "development" && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
