import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | Searchumrah',
  description:
    'The rules for using Searchumrah — what we provide, what users and agents agree to, and how disputes are handled.',
};

const LAST_UPDATED = '15 May 2026';

export default function TermsPage() {
  return (
    <div className="container max-w-3xl py-16 lg:py-24 space-y-8 text-neutral-700 dark:text-neutral-300">
      <header className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-semibold text-neutral-900 dark:text-neutral-100">
          Terms of Service
        </h1>
        <p className="text-sm text-neutral-500">Last updated: {LAST_UPDATED}</p>
      </header>

      <p>
        These Terms govern your use of searchumrah.com and any related services (the "Platform")
        operated by Searchumrah ("we", "us"). By creating an account or using the Platform you
        agree to these Terms. If you do not agree, do not use the Platform.
      </p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          1. What Searchumrah is
        </h2>
        <p>
          Searchumrah is a discovery and matching platform that helps pilgrims find and contact
          travel agents offering Hajj and Umrah packages. We do not sell travel services
          ourselves, do not collect payments, and are not a party to any contract you enter into
          with an agent.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          2. Eligibility and accounts
        </h2>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>You must be at least 18 years old to create an account.</li>
          <li>You agree to provide accurate information and keep it current.</li>
          <li>You are responsible for activity under your account; do not share credentials.</li>
          <li>We may suspend or close accounts that violate these Terms or applicable law.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          3. Agent listings and verification
        </h2>
        <p>
          Agents are responsible for the accuracy of their listings, pricing, inclusions, and
          credentials. We perform reasonable KYC verification but we do not warrant the
          performance of any agent or the quality of any package. Decisions to engage an agent are
          yours.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          4. Reviews and user content
        </h2>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Reviews must reflect genuine first-hand experience.</li>
          <li>
            Do not post content that is false, defamatory, infringing, hateful, sexually explicit,
            or that includes another person&apos;s private information.
          </li>
          <li>
            By posting content you grant Searchumrah a worldwide, royalty-free license to host,
            display, and distribute it on the Platform.
          </li>
          <li>We may remove content that violates these rules without notice.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          5. Bookings, payments, and refunds
        </h2>
        <p>
          Searchumrah does not collect payments. All payment, refund, cancellation, and
          performance terms are agreed directly between you and the agent. See our{' '}
          <a className="text-primary-600 underline" href="/refund-policy">
            Refund &amp; Cancellation Policy
          </a>{' '}
          for how disputes are handled with respect to the Platform.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          6. Prohibited use
        </h2>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Scraping, automated access, or interfering with the Platform&apos;s operation.</li>
          <li>Reverse engineering or attempting to bypass security or rate limits.</li>
          <li>Impersonation, manipulation of reviews, or running fake agent profiles.</li>
          <li>Using the Platform for any unlawful purpose.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          7. Intellectual property
        </h2>
        <p>
          The Searchumrah name, logo, and Platform design are our property. The underlying
          software is provided to you on a limited, non-exclusive, revocable basis solely to use
          the Platform.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          8. Disclaimer
        </h2>
        <p>
          The Platform is provided "as is" without warranties of any kind, express or implied,
          including merchantability, fitness for a particular purpose, and non-infringement. We do
          not warrant that listings are error-free or that the Platform will be uninterrupted.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          9. Limitation of liability
        </h2>
        <p>
          To the maximum extent permitted by law, Searchumrah is not liable for indirect,
          incidental, special, or consequential damages, or for any loss arising out of agent
          performance, package delivery, travel disruption, or third-party conduct. Our total
          liability for any claim related to the Platform is limited to ₹10,000.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          10. Indemnity
        </h2>
        <p>
          You agree to indemnify Searchumrah against claims arising from your content, your use of
          the Platform, or your breach of these Terms.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          11. Termination
        </h2>
        <p>
          You may close your account at any time. We may suspend or terminate access for breach of
          these Terms or applicable law. Sections that by their nature should survive (IP,
          disclaimers, liability, indemnity, governing law) will survive termination.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          12. Governing law and disputes
        </h2>
        <p>
          These Terms are governed by the laws of India. Courts at Bangalore, Karnataka, India
          have exclusive jurisdiction over any dispute arising out of or related to these Terms,
          without prejudice to mandatory consumer-protection rights you may have where you live.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          13. Changes
        </h2>
        <p>
          We may update these Terms. Material changes will be announced on the Platform and the
          "Last updated" date above will change. Continued use after the change means you accept
          the updated Terms.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          14. Contact
        </h2>
        <p>
          Questions about these Terms? Email{' '}
          <a className="text-primary-600 underline" href="mailto:legal@searchumrah.com">
            legal@searchumrah.com
          </a>
          .
        </p>
      </section>
    </div>
  );
}
