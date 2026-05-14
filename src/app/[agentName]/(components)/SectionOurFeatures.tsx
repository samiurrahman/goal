import React, { FC } from 'react';
import type { Agent, AgentInfoFeature } from '@/data/types';
import Badge from '@/shared/Badge';

// Three commitment icons, cycled by feature index — matches the design system's
// "what we provide" card (shield-check, transparent pricing, secure lock).
const FEATURE_ICONS = [
  <>
    <path d="M12 2 4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4z" />
    <path d="m9 12 2 2 4-4" />
  </>,
  <>
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </>,
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

const parseFeatures = (raw: Agent['info_features']): AgentInfoFeature[] => {
  let value: unknown = raw;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      const row = (entry || {}) as Partial<AgentInfoFeature>;
      const title = String(row.title || '').trim();
      const description = String(row.description || '').trim();
      if (!title && !description) return null;
      return {
        badge_name: String(row.badge_name || '').trim(),
        badge_color: (row.badge_color || 'blue') as AgentInfoFeature['badge_color'],
        title,
        description,
      };
    })
    .filter((item): item is AgentInfoFeature => item !== null);
};

const SectionOurFeatures: FC<SectionOurFeaturesProps> = ({
  className = '',
  agentName,
  agent,
}) => {
  const features = parseFeatures(agent?.info_features);

  if (features.length === 0) return null;

  const heading = agent?.info_heading || 'What We Provide';
  const displayName = agentName || agent?.known_as || '';

  return (
    <section
      className={`nc-SectionOurFeatures overflow-hidden rounded-3xl border border-neutral-200 bg-white p-5 sm:p-7 md:p-8 ${className}`}
      data-nc-id="SectionOurFeatures"
    >
      <p className="m-0 mb-[18px] break-words text-[13px] font-semibold uppercase tracking-[0.1em] text-neutral-500">
        {heading}
      </p>
      {displayName ? (
        <h2 className="m-0 mb-1.5 break-words text-[22px] font-semibold leading-[1.25] tracking-[-0.01em] text-neutral-900">
          {displayName}
        </h2>
      ) : null}
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
            {feature.badge_name ? (
              <Badge
                className="mb-2"
                name={feature.badge_name}
                color={feature.badge_color}
              />
            ) : null}
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
