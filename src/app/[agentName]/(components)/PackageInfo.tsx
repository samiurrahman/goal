import React from 'react';

interface PackageInfoProps {
  data: { title: string; details: string[]; contentHtml?: string };
}

const sanitizeMarkup = (markup: string) => {
  if (!markup) return '';
  return markup
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+=("[^"]*"|'[^']*')/gi, '')
    .replace(/javascript:/gi, '');
};

const PackageInfo: React.FC<PackageInfoProps> = ({ data }) => (
  <div className="listingSection__wrap !space-y-4">
    <h2 className="text-xl font-normal text-gray-900">{data.title}</h2>
    <div className="w-14 border-b border-neutral-200 dark:border-neutral-700"></div>
    <div className="text-neutral-600 dark:text-neutral-300 text-sm gap-3 grid">
      {data.contentHtml ? (
        <div
          className="prose prose-sm max-w-none text-neutral-700 dark:prose-invert dark:text-neutral-300 prose-headings:mb-2 prose-headings:mt-3 prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-1"
          dangerouslySetInnerHTML={{ __html: sanitizeMarkup(data.contentHtml) }}
        />
      ) : data.details?.length === 0 ? (
        <span>No stay information available.</span>
      ) : (
        data.details?.map((text, idx) => (
          <div key={idx} className="flex items-start gap-2.5">
            <i className="las la-check-circle text-base text-neutral-900 dark:text-neutral-100 mt-[1px]"></i>
            <span>{text}</span>
          </div>
        ))
      )}
    </div>
  </div>
);
export default PackageInfo;
