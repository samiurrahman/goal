-- Cancellation metadata
alter table public.bookings
  add column if not exists cancellation_reason text,
  add column if not exists cancelled_by text check (cancelled_by in ('agent', 'user'));

-- Allow the booking owner (user) to update their own row.
-- Field-level restriction (only status / cancellation_reason / cancelled_by)
-- is enforced inside the API route at src/app/api/bookings/cancel/route.ts.
drop policy if exists "Owners can cancel own bookings" on public.bookings;
create policy "Owners can cancel own bookings"
on public.bookings
for update
using (auth.uid() = auth_user_id)
with check (auth.uid() = auth_user_id);
