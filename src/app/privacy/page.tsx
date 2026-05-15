import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Searchumrah',
  description:
    'How Searchumrah collects, uses, and protects information when you browse, book, or list Hajj and Umrah packages.',
};

const LAST_UPDATED = '15 May 2026';

const PageContact = () => (
  <p className="text-neutral-600 dark:text-neutral-300">
    Questions about this policy? Email{' '}
    <a className="text-primary-600 underline" href="mailto:privacy@searchumrah.com">
      privacy@searchumrah.com
    </a>
    .
  </p>
);

export default function PrivacyPage() {
  return (
    <div className="container max-w-3xl py-16 lg:py-24 space-y-8 text-neutral-700 dark:text-neutral-300">
      <header className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-semibold text-neutral-900 dark:text-neutral-100">
          Privacy Policy
        </h1>
        <p className="text-sm text-neutral-500">Last updated: {LAST_UPDATED}</p>
      </header>

      <p>
        Searchumrah (&quot;we&quot;, &quot;us&quot;, &quot;Searchumrah&quot;) connects pilgrims with verified travel agents
        offering Hajj and Umrah packages. This policy explains what personal data we collect, why
        we collect it, who we share it with, and the choices you have. It applies to
        searchumrah.com and any subdomain we operate.
      </p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          1. Information we collect
        </h2>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>
            <strong>Account information</strong> — name, email, phone number, profile photo, and
            (for agents) business details, KYC documents, and city.
          </li>
          <li>
            <strong>Reviews and content</strong> — ratings, written reviews, and any media you
            upload. Reviews can be marked anonymous; in that case identity is hidden in public
            views but retained server-side so the preference is reversible.
          </li>
          <li>
            <strong>Lead information</strong> — when you "show interest" in or contact an agent,
            we record your name, email, and phone so the agent can reach you.
          </li>
          <li>
            <strong>Usage data</strong> — pages viewed, search filters, device and browser type,
            approximate location derived from IP, and timestamps.
          </li>
          <li>
            <strong>Cookies</strong> — for sign-in sessions, theme preferences, and basic
            analytics.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          2. How we use it
        </h2>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Operate the platform: profiles, listings, search, reviews, bookings.</li>
          <li>Pass leads to the specific agent you contact or book.</li>
          <li>Verify agents (KYC) and prevent fraud or abuse.</li>
          <li>Send transactional notifications (booking status, password resets, WhatsApp updates you opt into).</li>
          <li>Improve the product, fix bugs, and analyze usage trends in aggregate.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          3. Who we share it with
        </h2>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>
            <strong>The agent you contact or book.</strong> Searchumrah does not process payments;
            booking and payment happen directly between you and the agent. Your contact details
            are visible to that agent once you reveal interest or submit a booking.
          </li>
          <li>
            <strong>Service providers</strong> we rely on to run the platform: Supabase
            (database, auth, storage), Vercel (hosting), and Meta WhatsApp Business (notifications
            you opt in to). Each acts as a processor under contract.
          </li>
          <li>
            <strong>Authorities</strong> when required by law, court order, or to protect rights,
            property, or safety.
          </li>
        </ul>
        <p>We do not sell personal data.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          4. Data retention
        </h2>
        <p>
          Account data is retained while your account is active and for a reasonable period after
          deletion to satisfy legal, tax, and dispute-resolution obligations. Booking and lead
          records are retained for at least 3 years from creation. You may request deletion of
          your account at any time (see section 6).
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          5. Security
        </h2>
        <p>
          We use TLS in transit, encrypted storage at rest via our cloud providers,
          row-level-security on all user-scoped tables, and least-privilege access for staff. No
          system is perfectly secure; if you suspect a vulnerability, please email{' '}
          <a className="text-primary-600 underline" href="mailto:security@searchumrah.com">
            security@searchumrah.com
          </a>
          .
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          6. Your rights
        </h2>
        <p>
          Subject to applicable law (including the Indian Digital Personal Data Protection Act,
          2023), you may request access to, correction of, or deletion of your personal data, and
          withdraw consent for processing where consent is the legal basis. To exercise any right,
          email{' '}
          <a className="text-primary-600 underline" href="mailto:privacy@searchumrah.com">
            privacy@searchumrah.com
          </a>{' '}
          from the address on your account. We will respond within 30 days.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          7. International transfers
        </h2>
        <p>
          Our infrastructure providers may store data in countries outside India. Where this
          happens, we rely on the providers' standard contractual safeguards.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          8. Children
        </h2>
        <p>
          Searchumrah is not directed at children under 16. If you believe a child has provided us
          personal data, contact us and we will delete it.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          9. Changes
        </h2>
        <p>
          We may update this policy. Material changes will be announced on the site and the "Last
          updated" date above will change.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          10. Contact
        </h2>
        <PageContact />
      </section>
    </div>
  );
}
