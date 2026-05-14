'use client';
import React, { createContext, useCallback, useContext, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabaseClient';
import toast, { Toaster } from 'react-hot-toast';

/**
 * Gating for the phone + WhatsApp surfaces on an agent profile.
 *
 * The page renders three places that show the agent's phone number:
 *  - desktop sidebar contact card
 *  - mobile quick-action tiles
 *  - mobile sticky CTA at the bottom of the viewport
 *
 * All three need to flip in lock-step the moment the visitor clicks "Show",
 * so a single React context owns the `revealed` state. On reveal we POST to
 * /api/agents/interest, which upserts an `agent_interests` row — that's what
 * the agent later sees on /interested-users.
 */

export interface AgentContactData {
  /** agents.id (UUID) — used to record the interest. */
  agentId: string;
  /** Slug for building the post-login return URL. */
  agentSlug: string;
  /** Raw display number, shown after reveal. */
  contactNumber: string;
  /** Already-normalized https://wa.me/... URL, or '' if unavailable. */
  whatsappHref: string;
  /** tel: URL, or '' if unavailable. */
  telHref: string;
  /** mailto: URL — email is NOT gated, but kept here for layout parity. */
  mailHref: string;
  /** Display email. */
  emailId: string;
}

interface RevealContextValue {
  revealed: boolean;
  pending: boolean;
  data: AgentContactData;
  reveal: () => void;
}

const RevealContext = createContext<RevealContextValue | null>(null);

const useReveal = (): RevealContextValue => {
  const ctx = useContext(RevealContext);
  if (!ctx) {
    throw new Error('useReveal must be used inside <AgentContactProvider>');
  }
  return ctx;
};

const PHONE_MASK = '••••••••••';
const SHORT_MASK = '••••';

// ── Inline SVG icons (mirrored exactly from the original page.tsx markup) ──
const WhatsAppIcon = ({ size = 18 }: { size?: number }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    style={{ width: size, height: size }}
    aria-hidden="true"
  >
    <path d="M17.5 14.4c-.3-.1-1.7-.8-1.9-.9s-.4-.1-.6.2-.7.9-.8 1.1-.3.2-.6.1c-1.8-.9-3-1.6-4.1-3.6-.3-.5.3-.5.8-1.5.1-.2 0-.4 0-.5s-.6-1.4-.8-2c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-1.6 1.6-1 4 .9 6.4 1.7 2.2 3.5 3.4 5.4 3.9 1.7.4 2.5.2 3.4-.4.5-.4 1.1-1.1 1.2-1.7.1-.6 0-1-.1-1zM12 2A10 10 0 0 0 3.5 17l-1.4 5.2 5.3-1.4A10 10 0 1 0 12 2z" />
  </svg>
);

const PhoneIcon = ({ size = 18 }: { size?: number }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ width: size, height: size }}
    aria-hidden="true"
  >
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.8a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.35 1.84.59 2.8.72A2 2 0 0 1 22 16.92z" />
  </svg>
);

const MailIcon = ({ size = 18 }: { size?: number }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ width: size, height: size }}
    aria-hidden="true"
  >
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

// ── Provider ────────────────────────────────────────────────────────────────

export function AgentContactProvider({
  data,
  children,
}: {
  data: AgentContactData;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [revealed, setRevealed] = useState(false);
  const [pending, setPending] = useState(false);

  const reveal = useCallback(async () => {
    if (revealed || pending) return;
    setPending(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session;

    if (!session?.access_token) {
      // Logged-out visitors are bounced to login. After signing in they land
      // back on this agent page and click Show again — the second click then
      // upserts the interest row.
      const redirect = encodeURIComponent(`/${data.agentSlug}`);
      router.push(`/login?redirect=${redirect}`);
      // Don't flip `pending` back — navigation is in flight.
      return;
    }

    if (!data.agentId) {
      // Defensive: caller didn't pass an agent id (page rendered without an
      // agent row). Reveal anyway so the UI isn't stuck.
      setRevealed(true);
      setPending(false);
      return;
    }

    try {
      const res = await fetch('/api/agents/interest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ agentId: data.agentId }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body?.error || 'Something went wrong. Please try again.');
        setPending(false);
        return;
      }

      const body = (await res.json().catch(() => ({}))) as {
        recorded?: boolean;
        reason?: string;
      };
      setRevealed(true);
      if (body?.recorded) {
        toast.success('Details revealed. The agent will see your interest.');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setPending(false);
    }
  }, [revealed, pending, data, router]);

  return (
    <RevealContext.Provider value={{ revealed, pending, data, reveal }}>
      {children}
      <Toaster position="top-center" />
    </RevealContext.Provider>
  );
}

// ── Desktop sidebar contact card ────────────────────────────────────────────

export function DesktopContactCard() {
  const { revealed, pending, data, reveal } = useReveal();
  const { whatsappHref, telHref, mailHref, emailId, contactNumber } = data;

  if (!whatsappHref && !telHref && !mailHref) {
    return <p className="m-0 text-sm text-neutral-500">Contact details coming soon.</p>;
  }

  return (
    <>
      {whatsappHref ? (
        revealed ? (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-2 flex items-center gap-3 rounded-xl border border-neutral-200 p-3 transition-colors hover:border-primary-300 hover:bg-primary-50"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#25D366] text-white">
              <WhatsAppIcon />
            </span>
            <div className="min-w-0">
              <div className="text-[13px] font-medium text-neutral-500">
                WhatsApp · replies quickly
              </div>
              <div className="mt-px truncate text-sm font-semibold text-neutral-900">
                {contactNumber || 'Send a message'}
              </div>
            </div>
          </a>
        ) : (
          <button
            type="button"
            onClick={reveal}
            disabled={pending}
            className="mb-2 flex w-full items-center gap-3 rounded-xl border border-neutral-200 p-3 text-left transition-colors hover:border-primary-300 hover:bg-primary-50 disabled:opacity-60"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#25D366] text-white">
              <WhatsAppIcon />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium text-neutral-500">WhatsApp</div>
              <div className="mt-px flex items-center gap-2 text-sm font-semibold text-neutral-900">
                <span className="tracking-widest">{PHONE_MASK}</span>
                <span className="text-primary-700 underline">
                  {pending ? 'Showing…' : 'Show'}
                </span>
              </div>
            </div>
          </button>
        )
      ) : null}

      {telHref ? (
        revealed ? (
          <a
            href={telHref}
            className="mb-2 flex items-center gap-3 rounded-xl border border-neutral-200 p-3 transition-colors hover:border-primary-300 hover:bg-primary-50"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-primary-700 text-white">
              <PhoneIcon />
            </span>
            <div className="min-w-0">
              <div className="text-[13px] font-medium text-neutral-500">Call directly</div>
              <div className="mt-px truncate text-sm font-semibold text-neutral-900">
                {contactNumber}
              </div>
            </div>
          </a>
        ) : (
          <button
            type="button"
            onClick={reveal}
            disabled={pending}
            className="mb-2 flex w-full items-center gap-3 rounded-xl border border-neutral-200 p-3 text-left transition-colors hover:border-primary-300 hover:bg-primary-50 disabled:opacity-60"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-primary-700 text-white">
              <PhoneIcon />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium text-neutral-500">Call directly</div>
              <div className="mt-px flex items-center gap-2 text-sm font-semibold text-neutral-900">
                <span className="tracking-widest">{PHONE_MASK}</span>
                <span className="text-primary-700 underline">
                  {pending ? 'Showing…' : 'Show'}
                </span>
              </div>
            </div>
          </button>
        )
      ) : null}

      {mailHref ? (
        <a
          href={mailHref}
          className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3 transition-colors hover:border-primary-300 hover:bg-primary-50"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-neutral-100 text-neutral-700">
            <MailIcon />
          </span>
          <div className="min-w-0">
            <div className="text-[13px] font-medium text-neutral-500">Email</div>
            <div className="mt-px truncate text-[13px] font-semibold text-neutral-900">
              {emailId}
            </div>
          </div>
        </a>
      ) : null}

      {!revealed && (whatsappHref || telHref) ? (
        <p className="mt-3 text-[11px] leading-[1.4] text-neutral-500">
          Click <span className="font-medium">Show</span> to reveal the number. Your name and
          mobile will be shared with this agent.
        </p>
      ) : null}
    </>
  );
}

// ── Mobile quick actions (inside the profile header section) ───────────────

export function MobileQuickActions() {
  const { revealed, pending, data, reveal } = useReveal();
  const { whatsappHref, telHref, mailHref } = data;

  if (!whatsappHref && !telHref && !mailHref) return null;

  const MaskedTile = ({
    icon,
    label,
  }: {
    icon: React.ReactNode;
    label: string;
  }) => (
    <button
      type="button"
      onClick={reveal}
      disabled={pending}
      className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-primary-50 py-4 text-xs font-medium text-primary-700 transition-colors hover:bg-primary-100 disabled:opacity-60"
      aria-label={label}
    >
      {icon}
      <span className="flex items-center gap-1">
        <span className="tracking-widest">{SHORT_MASK}</span>
        <span className="underline">{pending ? 'Showing…' : 'Show'}</span>
      </span>
    </button>
  );

  return (
    <div className="mt-5 grid grid-cols-3 gap-2 lg:hidden">
      {whatsappHref ? (
        revealed ? (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-primary-50 py-4 text-xs font-medium text-primary-700 transition-colors hover:bg-primary-100"
            aria-label="WhatsApp"
          >
            <WhatsAppIcon size={22} />
            WhatsApp
          </a>
        ) : (
          <MaskedTile icon={<WhatsAppIcon size={22} />} label="Reveal WhatsApp" />
        )
      ) : null}
      {telHref ? (
        revealed ? (
          <a
            href={telHref}
            className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-primary-50 py-4 text-xs font-medium text-primary-700 transition-colors hover:bg-primary-100"
            aria-label="Call"
          >
            <PhoneIcon size={22} />
            Call
          </a>
        ) : (
          <MaskedTile icon={<PhoneIcon size={22} />} label="Reveal phone" />
        )
      ) : null}
      {mailHref ? (
        <a
          href={mailHref}
          className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-primary-50 py-4 text-xs font-medium text-primary-700 transition-colors hover:bg-primary-100"
          aria-label="Email"
        >
          <MailIcon size={22} />
          Email
        </a>
      ) : null}
    </div>
  );
}

// ── Mobile sticky CTA (fixed to the viewport bottom) ───────────────────────

export function MobileStickyContact() {
  const { revealed, pending, data, reveal } = useReveal();
  const { whatsappHref, telHref } = data;

  if (!whatsappHref && !telHref) return null;

  if (!revealed) {
    return (
      <div
        className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      >
        <button
          type="button"
          onClick={reveal}
          disabled={pending}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary-700 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-800 disabled:opacity-60"
        >
          <PhoneIcon />
          {pending ? 'Showing…' : 'Show contact details'}
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden"
      style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
    >
      {whatsappHref ? (
        <>
          {telHref ? (
            <a
              href={telHref}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-neutral-300 bg-white px-4 py-3 text-sm font-medium text-neutral-900 transition-colors hover:border-neutral-500"
              aria-label="Call agent"
            >
              <PhoneIcon />
            </a>
          ) : null}
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary-700 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-800"
          >
            <WhatsAppIcon />
            Message agent
          </a>
        </>
      ) : telHref ? (
        <a
          href={telHref}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary-700 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-800"
        >
          <PhoneIcon />
          Call agent
        </a>
      ) : null}
    </div>
  );
}
