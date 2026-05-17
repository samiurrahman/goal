import toast from 'react-hot-toast';

export const GENERIC_API_ERROR_MESSAGE = 'Something went wrong. Please try again.';

export interface ApiErrorOptions {
  // Friendly text shown to the user. Keep it generic — never pass raw
  // server messages here, they can leak internals like SQL constraints.
  message?: string;
  // Skip the toast (caller has their own UI for the error).
  silent?: boolean;
}

// Single chokepoint for surfacing API failures. Always logs the real
// error for debugging; toasts a friendly message unless silenced.
export const showApiError = (err: unknown, opts: ApiErrorOptions = {}) => {
  const friendly = opts.message ?? GENERIC_API_ERROR_MESSAGE;
  console.error('[api error]', friendly, err);
  if (!opts.silent) {
    toast.error(friendly);
  }
};

// Drop-in fetch wrapper. On HTTP failure or network error it toasts a
// friendly message and re-throws, so callers can still branch on the
// throw if needed but don't have to remember to surface anything.
export const apiFetch = async <T = unknown>(
  input: RequestInfo | URL,
  init?: RequestInit,
  opts: ApiErrorOptions = {}
): Promise<T> => {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch (networkErr) {
    showApiError(networkErr, opts);
    throw networkErr;
  }

  if (!response.ok) {
    let serverDetail: string | undefined;
    try {
      const body = await response.clone().json();
      serverDetail = body?.error || body?.message;
    } catch {
      // not JSON — fall through
    }
    const err = new Error(serverDetail || `${response.status} ${response.statusText}`);
    showApiError(err, opts);
    throw err;
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return (await response.json()) as T;
  }
  return undefined as T;
};
