import React, { FC } from 'react';
import type { Agent, AgentInfoFeature } from '@/data/types';

const DEFAULT_FEATURES: AgentInfoFeature[] = [
  {
    badge_name: 'Best Service',
    badge_color: 'blue',
    title: 'Best in class Service',
    description:
      'With a free listing, you can advertise your rental with no upfront costs',
  },
  {
    badge_name: 'Low Cost',
    badge_color: 'green',
    title: 'Reach millions with Chisfis',
    description:
      'Millions of people are searching for unique places to stay around the world',
  },
  {
    badge_name: 'Secure',
    badge_color: 'red',
    title: 'Secure and simple',
    description:
      'A Holiday Lettings listing gives you a secure and easy way to take bookings and payments online',
  },
];

// Three commitment icons, cycled by feature index — matches the design system's
// "what we provide" card (shield-check, transparent pricing, secure lock).
const FEATURE_ICONS = [
  // Best-in-class service
  <>
    <path d="M12 2 4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4z" />
    <path d="m9 12 2 2 4-4" />
  </>,
  // Transparent pricing
  <>
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </>,
  // Secure & simple
  <>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </>,
];

export interface SectionOurFeaturesProps {
  className?: string;
  agentName?: string;
  agent?: Agent | null;
}

const SectionOurFeatures: FC<SectionOurFeaturesProps> = ({
  className = '',
  agentName = 'Sarkar Travels',
  agent,
}) => {
  const heading = agent?.info_heading || 'What We Provide';

  let parsedFeatures = agent?.info_features;
  if (typeof parsedFeatures === 'string') {
    try {
      parsedFeatures = JSON.parse(parsedFeatures);
    } catch {
      parsedFeatures = [];
    }
  }

  const features =
    Array.isArray(parsedFeatures) && parsedFeatures.length > 0
      ? parsedFeatures
      : DEFAULT_FEATURES;

  return (
    <section
      className={`nc-SectionOurFeatures overflow-hidden rounded-3xl border border-neutral-200 bg-white p-5 sm:p-7 md:p-8 ${className}`}
      data-nc-id="SectionOurFeatures"
    >
      <p className="m-0 mb-[18px] break-words text-[13px] font-semibold uppercase tracking-[0.1em] text-neutral-500">
        {heading}
      </p>
      <h2 className="m-0 mb-1.5 break-words text-[22px] font-semibold leading-[1.25] tracking-[-0.01em] text-neutral-900">
        {agentName}
      </h2>
      <p className="m-0 mb-6 break-words text-sm leading-[1.55] text-neutral-600">
        The commitments behind every package we publish on HajjScanner.
      </p>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {features.map((feature, index) => (
          <div
            key={index}
            className="min-w-0 overflow-hidden rounded-[18px] border border-neutral-200 bg-neutral-50 p-[22px]"
          >
            <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-200 bg-white text-primary-700">
              <svg
                viewBox="0 0 24 24"
                className="h-[22px] w-[22px]"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {FEATURE_ICONS[index % FEATURE_ICONS.length]}
              </svg>
            </span>
            <h3 className="m-0 mb-1.5 break-words text-base font-semibold tracking-[-0.01em] text-neutral-900">
              {feature.title}
            </h3>
            <p className="m-0 break-words text-[13px] leading-[1.55] text-neutral-600">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default SectionOurFeatures;
