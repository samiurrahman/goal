-- Idempotency key for booking inserts. The checkout page generates a UUID
-- on mount and includes it with the INSERT; a unique constraint on
-- (auth_user_id, client_request_id) means a replay (back button, double
-- click, network retry, React StrictMode re-fire) hits a duplicate-key
-- violation instead of writing a second row. The client treats the
-- violation as success and re-fetches the original booking by key.
--
-- Scoped per-user so two different users can't collide on a generated
-- UUID (vanishingly unlikely, but RLS-clean).

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS client_request_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_bookings_user_client_request
  ON public.bookings(auth_user_id, client_request_id)
  WHERE client_request_id IS NOT NULL;
