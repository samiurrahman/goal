import React from 'react';
import SectionHero from '@/app/(server-components)/SectionHero';
import BgGlassmorphism from '@/components/BgGlassmorphism';
import { TaxonomyType } from '@/data/types';
import SectionSliderNewCategories from '@/components/SectionSliderNewCategories';
import SectionOurFeatures from '@/components/SectionOurFeatures';
import BackgroundSection from '@/components/BackgroundSection';
import SectionGridFeaturePlaces from '@/components/SectionGridFeaturePlaces';
import SectionHowItWork from '@/components/SectionHowItWork';
import SectionSubscribe2 from '@/components/SectionSubscribe2';
import SectionGridAuthorBox from '@/components/SectionGridAuthorBox';
import SectionGridCategoryBox from '@/components/SectionGridCategoryBox';
import SectionBecomeAnAuthor from '@/components/SectionBecomeAnAuthor';
import SectionVideos from '@/components/SectionVideos';
import SectionClientSay from '@/components/SectionClientSay';

function PageHome() {
  return (
    <main className="nc-PageHome relative overflow-hidden">
      <BgGlassmorphism />
      <div className="container relative">
        <SectionHero className="lg:pb-16" />
      </div>
    </main>
  );
}

export default PageHome;
