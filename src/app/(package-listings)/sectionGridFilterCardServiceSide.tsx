import React from 'react';
import Breadcrumb from '@/components/Breadcrumb';
import TabFilters from './TabFilters';
import ButtonPrimary from '@/shared/ButtonPrimary';
import { supabase } from '@/utils/supabaseClient';
import { Package } from '@/data/types';
import PackageCard from '@/components/package';

export default async function SectionGridFilterCard({ className = '' }: { className?: string }) {
  // Fetch all packages server-side (no infinite scroll)
  const { data: packages, error } = await supabase.from('packages').select('*').limit(10);

  return (
    <div className={`nc-SectionGridFilterCard ${className}`} data-nc-id="SectionGridFilterCard">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Packages' }]} className="mt-6" />
      <div className="mb-4 lg:mb-6 mt-6">
        <TabFilters />
      </div>
      <div className="lg:p-10 lg:bg-neutral-50 lg:dark:bg-black/20 grid grid-cols-1 gap-6 rounded-3xl">
        {!packages ? (
          <div className="flex justify-center items-center py-12">
            <ButtonPrimary loading>Loading Packages</ButtonPrimary>
          </div>
        ) : (
          <>
            {packages.map((item: Package, index: number) => (
              <PackageCard key={item.id || index} data={item} />
            ))}
            {packages.length === 0 && (
              <div className="flex justify-center items-center py-12">
                <span>No Packages found.</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
