import React, { FC } from 'react';
import rightImgPng from '@/images/our-features.png';
import Image, { StaticImageData } from 'next/image';
import Badge from '@/shared/Badge';
import type { Agent, AgentInfoFeature, TwMainColor } from '@/data/types';

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

export interface SectionOurFeaturesProps {
  className?: string;
  rightImg?: StaticImageData;
  type?: 'type1' | 'type2';
  agentName?: string;
  agent?: Agent | null;
}

const SectionOurFeatures: FC<SectionOurFeaturesProps> = ({
  className = 'lg:py-14',
  rightImg = rightImgPng,
  type = 'type1',
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

  const useCustomImage =
    agent && !agent.info_use_default_image && agent.info_image_url;
  const displayImage: StaticImageData | string = useCustomImage
    ? agent.info_image_url!
    : rightImg;

  return (
    <div
      className={`nc-SectionOurFeatures relative flex flex-col items-center ${
        type === 'type1' ? 'lg:flex-row' : 'lg:flex-row-reverse'
      } ${className}`}
      data-nc-id="SectionOurFeatures"
    >
      <div className="flex-grow">
        {typeof displayImage === 'string' ? (
          <Image
            src={displayImage}
            alt={heading}
            width={600}
            height={400}
            className="rounded-2xl object-cover"
          />
        ) : (
          <Image src={displayImage} alt={heading} />
        )}
      </div>
      <div
        className={`max-w-2xl flex-shrink-0 mt-10 lg:mt-0 lg:w-2/5 ${
          type === 'type1' ? 'lg:pl-16' : 'lg:pr-16'
        }`}
      >
        <span className="uppercase text-sm text-gray-400 tracking-widest">
          {heading}
        </span>
        <h2 className="font-semibold text-4xl mt-5">{agentName}</h2>

        <ul className="space-y-10 mt-16">
          {features.map((feature, index) => (
            <li key={index} className="space-y-4">
              <Badge
                name={feature.badge_name}
                color={feature.badge_color as TwMainColor}
              />
              <span className="block text-xl font-semibold">
                {feature.title}
              </span>
              <span className="block mt-5 text-neutral-500 dark:text-neutral-400">
                {feature.description}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default SectionOurFeatures;
