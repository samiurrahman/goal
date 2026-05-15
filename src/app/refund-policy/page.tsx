import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Refund & Cancellation Policy | Searchumrah',
  description:
    'How refunds and cancellations work on Searchumrah — what the agent is responsible for, and what we can help with.',
};

const LAST_UPDATED = '15 May 2026';

export default function RefundPolicyPage() {
  return (
    <div className="container max-w-3xl py-16 lg:py-24 space-y-8 text-neutral-700 dark:text-neutral-300">
      <header className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-semibold text-neutral-900 dark:text-neutral-100">
          Refund &amp; Cancellation Policy
        </h1>
        <p className="text-sm text-neutral-500">Last updated: {LAST_UPDATED}</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          Searchumrah does not handle payments
        </h2>
        <p>
          Searchumrah is a discovery and matching platform. We do not collect, hold, or process
          any payment for Hajj or Umrah packages. All payments — deposits, balances, and refunds —
          are made directly between you and the travel agent you choose. The agent&apos;s own refund
          and cancellation terms govern the transaction.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          Where to find the agent&apos;s terms
        </h2>
        <p>
          Each package page lists the agent&apos;s cancellation, refund, and change-of-date terms in
          the &quot;Cancellation policy&quot; or &quot;Purchase summary&quot; section. Read these before paying. If
          they are missing or unclear, ask the agent in writing (WhatsApp or email) and keep a
          copy of the response.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          If something goes wrong
        </h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li>
            <strong>Talk to your agent first.</strong> Most issues — itinerary changes, schedule
            slips, refund delays — are resolved fastest directly with the agent.
          </li>
          <li>
            <strong>Tell us.</strong> If you cannot reach a fair resolution, email{' '}
            <a className="text-primary-600 underline" href="mailto:support@searchumrah.com">
              support@searchumrah.com
            </a>{' '}
            within 30 days of the incident with: your booking details, the agent&apos;s name, what was
            promised, what happened, and any messages or receipts. Use the same email address as
            your Searchumrah account.
          </li>
          <li>
            <strong>What we will do.</strong> We will reach out to the agent on your behalf, ask
            for their account, and try to mediate a resolution. We can flag, restrict, or remove
            agents who repeatedly fail their obligations or commit fraud.
          </li>
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          What we can and cannot do
        </h2>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>
            <strong>We can</strong> mediate, escalate within the agent&apos;s organization, hold the
            agent accountable on the Platform (verification status, listing visibility), and
            preserve our records of your booking and conversations to support you.
          </li>
          <li>
            <strong>We cannot</strong> issue refunds for money paid to an agent, override the
            agent&apos;s contractual terms, or guarantee a specific outcome to a dispute.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          Reporting fraud
        </h2>
        <p>
          If you believe an agent has committed fraud, report it to{' '}
          <a className="text-primary-600 underline" href="mailto:support@searchumrah.com">
            support@searchumrah.com
          </a>{' '}
          immediately and to the appropriate consumer-protection or law-enforcement authority in
          your jurisdiction. We cooperate with lawful requests from authorities investigating
          fraud on the Platform.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          Searchumrah-billed services
        </h2>
        <p>
          If we ever charge agents (or anyone else) for Platform services such as listing
          promotion or premium features, the refund terms for those specific services will be
          stated at the point of purchase and override anything else on this page for that
          purchase only.
        </p>
      </section>
    </div>
  );
}
