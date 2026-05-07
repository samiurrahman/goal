import React, { FC, ReactNode } from 'react';
import type { Package, Agent } from '@/data/types';
import HeaderFilter from './HeaderFilter';
import Packages from '@/app/packages/components/packages';

export interface SectionGridFeaturePlacesProps {
  packages?: Package[];
  gridClass?: string;
  heading?: ReactNode;
  subHeading?: ReactNode;
  tabs?: string[];
  agent?: Agent | null;
}

const SectionGridFeaturePlaces: FC<SectionGridFeaturePlacesProps> = ({
  packages = [],
  heading = 'Our Packages',
  subHeading = '',
  tabs = ['Umrah', 'Hajj'],
  agent = null,
}) => {
  return (
    <div className="nc-SectionGridFeaturePlaces relative">
      <HeaderFilter tabActive={tabs[0]} tabs={tabs} heading={heading} subHeading={subHeading} />
      <div className="grid grid-cols-1 gap-6">
        {packages.map((pkg, index) => (
          <Packages
            key={pkg.id || index}
            data={pkg}
            priority={index < 2}
            agentProfileImage={agent?.profile_image ?? pkg.agent_profile_image ?? undefined}
            agentDisplayName={agent?.known_as ?? pkg.agent_known_as ?? undefined}
            agentSlug={agent?.slug ?? pkg.agent_name ?? undefined}
            agentRatingPoint={Number(agent?.rating_avg ?? pkg.agent_rating_avg ?? 0)}
            agentReviewCount={Number(agent?.rating_total ?? pkg.agent_rating_total ?? 0)}
          />
        ))}
      </div>
      {packages.length === 0 && (
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">No packages found.</p>
      )}
    </div>
  );
};

export default SectionGridFeaturePlaces;
