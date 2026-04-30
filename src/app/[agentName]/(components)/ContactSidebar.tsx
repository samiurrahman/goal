import React from 'react';
import Image from 'next/image';
import type { Agent } from '@/data/types';
import SocialsList from '@/shared/SocialsList';
import Badge from '@/shared/Badge';

interface ContactSidebarProps {
  agent: Agent | null | undefined;
  listingCount?: number;
}

const ContactSidebar: React.FC<ContactSidebarProps> = ({ agent, listingCount = 0 }) => {
  if (!agent) {
    return null;
  }

  const agentLocation = [agent.city, agent.state, agent.country].filter(Boolean).join(', ');

  return (
    <div className="bg-white listingSectionSidebar__wrap shadow-sm !space-y-4">
      <div className="flex items-center gap-4">
        {agent.profile_image ? (
          <div className="relative h-16 w-16 overflow-hidden rounded-full border border-neutral-200 dark:border-neutral-700">
            <Image
              src={agent.profile_image}
              alt={agent.known_as || 'Agent'}
              fill
              className="object-cover"
              sizes="64px"
            />
          </div>
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-200 text-xl font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
            {agent.known_as?.[0] || '?'}
          </div>
        )}
        <div className="space-y-1">
          <h3 className="text-xl font-semibold">{agent.known_as}</h3>
          <div className="flex flex-wrap items-center gap-2">
            {agent.is_gov_authorised === 'true' && (
              <Badge name="Government Verified" color="green" />
            )}
            <span className="text-sm text-neutral-500 dark:text-neutral-400">
              {listingCount} Listings
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col border border-neutral-200 dark:border-neutral-700 rounded-3xl overflow-hidden">
        <div className="p-4 space-y-4">
          <div className="flex items-start gap-3">
            <i className="las la-map-marker-alt text-xl text-neutral-500"></i>
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Office Address</p>
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {agent.address || agentLocation || 'Not available'}
              </p>
            </div>
          </div>

          <div className="w-full border-b border-neutral-200 dark:border-neutral-700" />

          <div className="flex items-start gap-3">
            <i className="las la-phone text-xl text-neutral-500"></i>
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Primary Phone</p>
              <a
                href={`tel:${agent.contact_number || ''}`}
                className="text-sm font-medium text-neutral-900 dark:text-neutral-100 hover:underline"
              >
                {agent.contact_number || 'Not available'}
              </a>
            </div>
          </div>

          <div className="w-full border-b border-neutral-200 dark:border-neutral-700" />

          <div className="flex items-start gap-3">
            <i className="las la-phone-volume text-xl text-neutral-500"></i>
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Alternate Phone</p>
              <a
                href={`tel:${agent.alternate_number || ''}`}
                className="text-sm font-medium text-neutral-900 dark:text-neutral-100 hover:underline"
              >
                {agent.alternate_number || 'Not available'}
              </a>
            </div>
          </div>

          <div className="w-full border-b border-neutral-200 dark:border-neutral-700" />

          <div className="flex items-start gap-3">
            <i className="las la-envelope text-xl text-neutral-500"></i>
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Email Address</p>
              <a
                href={`mailto:${agent.email_id || ''}`}
                className="break-all text-sm font-medium text-neutral-900 dark:text-neutral-100 hover:underline"
              >
                {agent.email_id || 'Not available'}
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Connect with this agent directly.
        </p>
        <SocialsList
          className="!space-x-3"
          itemClass="flex items-center justify-center w-9 h-9 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xl"
        />
      </div>
    </div>
  );
};

export default ContactSidebar;
