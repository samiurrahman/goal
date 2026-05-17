'use client';

import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { showApiError } from '@/lib/apiErrors';

// Devtools are ~40KB and add no value in production. Dynamic-import + dev-only
// render keeps them out of the client bundle for prod builds (Next tree-shakes
// the import call entirely when the condition is statically false).
const ReactQueryDevtools =
  process.env.NODE_ENV === 'development'
    ? dynamic(
        () => import('@tanstack/react-query-devtools').then((m) => m.ReactQueryDevtools),
        { ssr: false }
      )
    : () => null;

// Per-query/mutation opt-out: pass `meta: { silent: true }` and the
// global error toast is skipped. Use it when the caller renders its
// own error UI (inline form errors, retry-able placeholders, etc.).
type QueryMeta = { silent?: boolean; errorMessage?: string };

const readMeta = (meta: unknown): QueryMeta => (meta && typeof meta === 'object' ? (meta as QueryMeta) : {});

export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5,
            refetchOnWindowFocus: false,
          },
        },
        queryCache: new QueryCache({
          onError: (err, query) => {
            const meta = readMeta(query.meta);
            if (meta.silent) return;
            showApiError(err, { message: meta.errorMessage });
          },
        }),
        mutationCache: new MutationCache({
          onError: (err, _vars, _ctx, mutation) => {
            const meta = readMeta(mutation.meta);
            if (meta.silent) return;
            showApiError(err, { message: meta.errorMessage });
          },
        }),
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
