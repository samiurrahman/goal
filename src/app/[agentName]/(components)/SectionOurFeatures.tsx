import React, { FC } from 'react';
import type { Agent, AgentInfoFeature } from '@/data/types';
import Badge from '@/shared/Badge';
import { FeatureIcon } from '@/components/icons/featureIcons';

// Fallback icon cycle for features saved before agents could pick an icon —
// keeps legacy "what we provide" cards visually varied instead of identical.
const LEGACY_ICON_CYCLE = ['shield-check', 'price-tag', 'lock'];

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
    .map((entry): AgentInfoFeature | null => {
      const row = (entry || {}) as Partial<AgentInfoFeature>;
      const title = String(row.title || '').trim();
      const description = String(row.description || '').trim();
      if (!title && !description) return null;
      return {
        badge_name: String(row.badge_name || '').trim(),
        badge_color: (row.badge_color || 'blue') as AgentInfoFeature['badge_color'],
        title,
        description,
        ...(typeof row.icon === 'string' && row.icon ? { icon: row.icon } : {}),
      };
    })
    .filter((item): item is AgentInfoFeature => item !== null);
};

const SectionOurFeatures: FC<SectionOurFeaturesProps> = ({ className = '', agentName, agent }) => {
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
              <FeatureIcon
                iconKey={feature.icon || LEGACY_ICON_CYCLE[index % LEGACY_ICON_CYCLE.length]}
                className="h-[22px] w-[22px]"
              />
            </span>
            {feature.badge_name ? (
              <Badge className="mb-2" name={feature.badge_name} color={feature.badge_color} />
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
