import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About Searchumrah',
  description:
    'Searchumrah connects pilgrims with verified travel agents for honest, transparent Hajj and Umrah bookings.',
};

export default function AboutPage() {
  return (
    <div className="container max-w-4xl py-16 lg:py-24 space-y-12 text-neutral-700 dark:text-neutral-300">
      <header className="space-y-3">
        <h1 className="text-3xl md:text-5xl font-semibold text-neutral-900 dark:text-neutral-100">
          A more honest way to book Hajj and Umrah
        </h1>
        <p className="text-lg text-neutral-600 dark:text-neutral-400">
          Searchumrah helps pilgrims find verified travel agents, compare packages openly, and
          contact agents directly — with no middlemen and no commissions added on top.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
          Why we exist
        </h2>
        <p>
          Booking a sacred journey shouldn't feel like a gamble. Pilgrims juggle WhatsApp
          forwards, vague price lists, and word-of-mouth references. Agents struggle to be found
          by the right travelers. Searchumrah brings both sides into one place, with structured
          listings, verified profiles, and reviews from real pilgrims.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
          How it works
        </h2>
        <ol className="list-decimal pl-6 space-y-3">
          <li>
            <strong>Search.</strong> Filter packages by city of departure, month, hotel distance
            from Haram, duration, and price.
          </li>
          <li>
            <strong>Compare.</strong> Each listing shows the full itinerary, what's included,
            cancellation terms, and the agent's rating from past pilgrims.
          </li>
          <li>
            <strong>Contact the agent directly.</strong> Reveal the agent's number, ask
            questions, and book on terms agreed between you. Searchumrah does not handle payment.
          </li>
        </ol>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
          Verification
        </h2>
        <p>
          Every agent on Searchumrah is KYC-verified before their packages go live. We collect
          business credentials and identity documents and review them before approving the
          profile. Verification reduces risk; it does not replace your own due diligence — read
          the package terms, ask questions, and check reviews before paying.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
          What we don't do
        </h2>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>We don't take payments — you pay the agent directly.</li>
          <li>We don't add commission to package prices.</li>
          <li>We don't accept paid placements that hide from regular search results.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
          Get in touch
        </h2>
        <p>
          Pilgrim or agent — we'd love to hear from you.{' '}
          <Link className="text-primary-600 underline" href="/contact">
            Contact us
          </Link>{' '}
          or email{' '}
          <a className="text-primary-600 underline" href="mailto:hello@searchumrah.com">
            hello@searchumrah.com
          </a>
          .
        </p>
        <p className="text-sm text-neutral-500">
          Searchumrah is operated from Bangalore, India.
        </p>
      </section>
    </div>
  );
}
