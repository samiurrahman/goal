import React from 'react';
import Breadcrumb from '@/components/Breadcrumb';
import { supabase } from '@/utils/supabaseClient';
import type { Agent, Package, AgentReview } from '@/data/types';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import bannerImage from '@/images/hero-right1.png';
import Badge from '@/shared/Badge';
import { getOptimizedImageUrl } from '@/lib/imageUrl';

const FALLBACK_BLUR_DATA_URL =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAACAAIDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAr/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AKpgD//Z';
import SocialsList from '@/shared/SocialsList';
import ShareButton from '@/shared/ShareButton';
import StartRating from '@/components/StartRating';
import GovtVerifiedBadge from '@/components/GovtVerifiedBadge';
import SectionOurFeatures from './(components)/SectionOurFeatures';
import SectionGridFeaturePlaces from './(components)/SectionGridFeaturePlaces';
import ReviewsSection from './(components)/ReviewsSection';

export interface AgentDetailsProps {
  params: { agentName: string };
}

// Re-render at most once per minute. Agent profile data changes rarely;
// this is a huge perf win over `force-dynamic` for repeat visits.
export const revalidate = 60;

const sanitizeProfileMarkup = (markup: string) => {
  if (!markup) return '';

  return markup
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+=("[^"]*"|'[^']*')/gi, '')
    .replace(/javascript:/gi, '');
};

const getAgentBySlug = async (agentName: string): Promise<Agent | null> => {
  // Keep `*` here: the schema has variable optional columns
  // (experience_years vs years_of_experience etc.) — listing them risks errors
  // on installations that haven't migrated. The agent row is small (~1KB).
  const { data: agentData } = await supabase
    .from('agents')
    .select('*')
    .eq('slug', agentName)
    .maybeSingle();

  const agentDetails = (agentData as Agent | null) ?? null;
  if (!agentDetails) return null;

  if (typeof agentDetails.founders === 'string') {
    try {
      agentDetails.founders = JSON.parse(agentDetails.founders);
    } catch {
      agentDetails.founders = [];
    }
  }

  return agentDetails;
};

const buildReviewerName = (profile?: { first_name?: string | null; last_name?: string | null }) => {
  const fullName = [profile?.first_name || '', profile?.last_name || ''].join(' ').trim();
  return fullName || 'User';
};

const normalizeReview = (row: Record<string, any>) => {
  const email = (row.user_email as string | undefined) || '';
  const emailName = email.includes('@') ? email.split('@')[0] : '';
  return {
    id: row.id,
    agent_id: row.agent_id,
    user_id: row.user_id,
    user_email: email,
    user_name: row.user_name || emailName || 'User',
    user_profile_image: row.user_profile_image || null,
    rating: row.rating,
    review_text: row.review_text,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
};

const normalizeExternalLink = (value?: string | null) => {
  const trimmed = (value || '').trim();
  if (!trimmed) return '';
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

type ReviewRow = {
  id: number | string;
  agent_id: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  user_profile_image: string | null;
  rating: number;
  review_text: string;
  created_at: string;
  updated_at: string | null;
};

type UserDetailsLite = {
  auth_user_id: string;
  first_name: string | null;
  last_name: string | null;
  profile_image: string | null;
};

const getReviewsForAgent = async (agentId: string): Promise<AgentReview[]> => {
  const { data: reviewsData, error: reviewsError } = await supabase
    .from('agent_reviews')
    .select(
      'id, agent_id, user_id, user_email, user_name, user_profile_image, rating, review_text, created_at, updated_at'
    )
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false });

  if (reviewsError) {
    console.error('Error fetching reviews:', reviewsError);
    return [];
  }

  const reviewRows = (reviewsData ?? []) as ReviewRow[];
  if (reviewRows.length === 0) return [];

  // Enrich any rows missing user_name / user_profile_image with a single
  // user_details lookup. (Newer rows have these denormalized already.)
  const needsEnrichment = reviewRows.filter(
    (r) => r.user_id && (!r.user_name || !r.user_profile_image)
  );
  const userIds = Array.from(new Set(needsEnrichment.map((r) => r.user_id as string)));

  let profileByUserId = new Map<string, UserDetailsLite>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('user_details')
      .select('auth_user_id, first_name, last_name, profile_image')
      .in('auth_user_id', userIds);

    profileByUserId = new Map(
      ((profiles ?? []) as UserDetailsLite[]).map((p) => [p.auth_user_id, p])
    );
  }

  return reviewRows.map((review) => {
    const normalized = normalizeReview(review);
    const profile = review.user_id ? profileByUserId.get(review.user_id) : undefined;
    if (!profile) return normalized;
    return {
      ...normalized,
      user_name: normalized.user_name === 'User' ? buildReviewerName(profile) : normalized.user_name,
      user_profile_image: normalized.user_profile_image || profile.profile_image || null,
    };
  }) as AgentReview[];
};

export const generateMetadata = async ({ params }: AgentDetailsProps): Promise<Metadata> => {
  const agentDetails = await getAgentBySlug(params.agentName);
  const title = agentDetails?.known_as
    ? `${agentDetails.known_as} | Searchumrah`
    : 'Agent Profile | Searchumrah';
  const description =
    agentDetails?.about_us || 'Explore trusted Umrah packages from verified agents.';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
      url: `https://www.searchumrah.com/${params.agentName}`,
      images: agentDetails?.profile_image ? [{ url: agentDetails.profile_image }] : undefined,
    },
  };
};

const AgentDetails = async ({ params }: AgentDetailsProps) => {
  const { agentName } = params;
  const agentDetails = await getAgentBySlug(agentName);

  const agentSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person', // or "Organization" if more appropriate
    name: agentDetails?.known_as,
    url: `https://www.searchumrah.com/${agentDetails?.slug}`,
    description: agentDetails?.about_us,
    image: agentDetails?.profile_image, // URL to agent's image
    // Add more fields as needed
  };

  // Fetch packages + reviews in parallel once we know the agent id
  let agentPackages: Package[] = [];
  let agentReviews: AgentReview[] = [];
  if (agentDetails?.id) {
    const [packagesResult, reviews] = await Promise.all([
      supabase.from('packages').select('*').eq('agent_id', agentDetails.id),
      getReviewsForAgent(String(agentDetails.id)),
    ]);
    agentPackages = (packagesResult.data as Package[] | null) ?? [];
    agentReviews = reviews;
  }

  const agentLocation = [agentDetails?.city, agentDetails?.state, agentDetails?.country]
    .filter(Boolean)
    .join(', ');

  const phoneDigits = (agentDetails?.contact_number || '').replace(/\D/g, '');
  const whatsappHref =
    normalizeExternalLink(agentDetails?.whatsapp_url) ||
    (phoneDigits ? `https://wa.me/${phoneDigits}` : '');
  const socialLinks = [
    {
      href: whatsappHref,
      icon: 'lab la-whatsapp',
      name: 'WhatsApp',
    },
    {
      href: normalizeExternalLink(agentDetails?.instagram_url),
      icon: 'lab la-instagram',
      name: 'Instagram',
    },
    {
      href: normalizeExternalLink(agentDetails?.facebook_url),
      icon: 'lab la-facebook-square',
      name: 'Facebook',
    },
    {
      href: agentDetails?.contact_number ? `tel:${agentDetails.contact_number}` : '',
      icon: 'las la-phone',
      name: 'Call',
    },
    {
      href: agentDetails?.email_id ? `mailto:${agentDetails.email_id}` : '',
      icon: 'las la-envelope',
      name: 'Email',
    },
  ].filter((item) => item.href);

  const listingCount = Array.isArray(agentPackages) ? agentPackages.length : 0;
  const agentRatingPoint = Number(agentDetails?.rating_avg ?? 0);
  const agentReviewCount = Number(agentDetails?.rating_total ?? 0);
  const agentRecord = (agentDetails || {}) as Record<string, unknown>;
  const experienceFieldCandidates = ['experience_years', 'years_of_experience', 'experience'];
  const experienceField =
    experienceFieldCandidates.find((field) => field in agentRecord) || undefined;
  const experienceValue = experienceField ? agentRecord[experienceField] : undefined;
  const experienceLabel =
    experienceValue === null ||
    experienceValue === undefined ||
    String(experienceValue).trim() === ''
      ? 'Not available'
      : `${String(experienceValue).trim()} years`;
  const isGovVerified = ['true', '1', 'yes', 'y'].includes(
    String(agentDetails?.is_gov_authorised ?? '')
      .toLowerCase()
      .trim()
  );
  const sanitizedAboutMarkup = sanitizeProfileMarkup(agentDetails?.about_us || '');
  const bannerSrc = agentDetails?.banner_image || bannerImage;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(agentSchema) }}
      />
      <div className="relative z-20 my-4">
        <Breadcrumb
          items={[{ label: 'Home', href: '/' }, { label: agentDetails?.known_as ?? '' }]}
        />
      </div>
      <div className="nc-ListingStayDetailPage w-full min-h-screen">
        <main className="relative z-10 grid grid-cols-1 lg:grid-cols-5 gap-6 w-full mb-24 lg:mb-32 lg:items-stretch">
          <div className="lg:col-span-5">
            <section className="overflow-hidden rounded-3xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg">
              <div className="relative h-60 md:h-60 w-full">
                <Image
                  src={
                    typeof bannerSrc === 'string'
                      ? getOptimizedImageUrl(bannerSrc, {
                          width: 1600,
                          height: 480,
                          resize: 'cover',
                          quality: 78,
                        }) || bannerSrc
                      : bannerSrc
                  }
                  alt={agentDetails?.known_as || 'Agent cover'}
                  fill
                  className="object-cover"
                  sizes="100vw"
                  quality={78}
                  priority
                  placeholder="blur"
                  blurDataURL={
                    typeof bannerSrc === 'string' ? FALLBACK_BLUR_DATA_URL : undefined
                  }
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
                <div className="absolute top-3 right-3 md:top-4 md:right-4 z-20">
                  <ShareButton
                    url={`/${agentName}`}
                    title={agentDetails?.known_as || 'Agent profile'}
                    iconOnly
                    className="bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm shadow-md"
                    ariaLabel="Share agent profile"
                  />
                </div>
                {socialLinks.length > 0 && (
                  <div className="absolute top-3 left-3 md:top-4 md:left-4 z-20">
                    <div className="flex items-center rounded-2xl bg-white/95 px-2.5 py-2 shadow-md backdrop-blur-sm">
                      <SocialsList
                        socials={socialLinks}
                        className="gap-2"
                        itemClass="h-8 w-8 rounded-full border border-neutral-200 bg-white hover:bg-neutral-50 shadow-sm flex items-center justify-center text-neutral-700"
                      />
                    </div>
                  </div>
                )}
                <div className="hidden lg:block absolute right-3 lg:right-4 bottom-0 translate-y-1/2 z-20 max-w-[62vw]">
                  <div className="flex flex-wrap items-center justify-end gap-2 rounded-2xl bg-white/95 dark:bg-neutral-900/95 px-2.5 py-2 shadow-md border border-neutral-200 dark:border-neutral-700 backdrop-blur-sm">
                    <Badge
                      name={
                        <StartRating
                          className="text-yellow-900"
                          point={agentRatingPoint}
                          reviewCount={agentReviewCount}
                        />
                      }
                      color="yellow"
                    />
                    <Badge
                      name={
                        <span className="inline-flex items-center gap-1.5">
                          <i className="las la-briefcase text-sm" />
                          {listingCount} Packages
                        </span>
                      }
                      color="blue"
                    />
                    {isGovVerified && <GovtVerifiedBadge />}
                  </div>
                </div>
                <div className="absolute left-4 right-4 md:right-auto md:left-8 bottom-0 translate-y-1/2 z-20 flex items-center gap-3 md:gap-5 rounded-2xl bg-white/95 dark:bg-neutral-900/95 px-3 py-2 shadow-md border border-neutral-200 dark:border-neutral-700 backdrop-blur-sm lg:max-w-[58vw]">
                  {agentDetails?.profile_image ? (
                    <div className="relative h-20 w-20 md:h-24 md:w-24 overflow-hidden rounded-full border-[4px] border-white dark:border-neutral-900 shadow-lg shrink-0">
                      <Image
                        src={
                          getOptimizedImageUrl(agentDetails.profile_image, {
                            width: 192,
                            height: 192,
                            resize: 'cover',
                            quality: 75,
                          }) || agentDetails.profile_image
                        }
                        alt={agentDetails.known_as || 'Agent'}
                        fill
                        className="object-cover"
                        sizes="96px"
                        quality={75}
                      />
                    </div>
                  ) : (
                    <div className="h-20 w-20 md:h-24 md:w-24 rounded-full border-[4px] border-white dark:border-neutral-900 shadow-lg bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 flex items-center justify-center text-2xl font-semibold shrink-0">
                      {agentDetails?.known_as?.[0] || '?'}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h1 className="text-xl md:text-3xl font-semibold text-neutral-900 dark:text-white leading-tight truncate">
                      {agentDetails?.known_as}
                    </h1>
                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300 truncate">
                      <span className="inline-flex items-center gap-1.5 max-w-full">
                        <i className="las la-map-marker-alt text-base" />
                        <span className="truncate">{agentLocation || 'Location pending'}</span>
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300 truncate">
                      <span className="inline-flex items-center gap-1.5 max-w-full">
                        <i className="las la-phone text-base" />
                        <span className="truncate">
                          {agentDetails?.contact_number || 'Not available'}
                        </span>
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-5 md:px-8 pb-7">
                <div className="pt-16 lg:pt-20" />

                <div className="lg:hidden mt-3">
                  <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white dark:bg-neutral-900 px-2.5 py-2 shadow-sm border border-neutral-200 dark:border-neutral-700">
                    <Badge
                      name={
                        <StartRating
                          className="text-yellow-900"
                          point={agentRatingPoint}
                          reviewCount={agentReviewCount}
                        />
                      }
                      color="yellow"
                    />
                    <Badge
                      name={
                        <span className="inline-flex items-center gap-1.5">
                          <i className="las la-briefcase text-sm" />
                          {listingCount} Packages
                        </span>
                      }
                      color="blue"
                    />
                    {isGovVerified && <GovtVerifiedBadge />}
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-1 md:grid-cols-[0.6fr_0.95fr_1.55fr] gap-4 md:gap-5">
                  <div className="flex items-start gap-3 p-1">
                    <i className="las la-user-clock text-[26px] flex-shrink-0 mt-0.5"></i>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-600">Experience</p>
                      <p className="text-sm text-gray-900 font-medium">{experienceLabel}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-1">
                    <i className="las la-envelope text-[30px] flex-shrink-0 mt-0.5"></i>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-600">Email</p>
                      <p className="text-sm text-gray-900 font-medium truncate">
                        {agentDetails?.email_id || 'Not available'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-1">
                    <i className="las la-map-marker-alt text-[30px] flex-shrink-0 mt-0.5"></i>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-600">Address</p>
                      <p className="text-sm text-gray-900 font-medium line-clamp-1">
                        {agentDetails?.address || 'Not available'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 p-5">
                    <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                      About
                    </h3>
                    {sanitizedAboutMarkup ? (
                      <div
                        className="prose prose-sm max-w-none mt-2 text-neutral-700 dark:prose-invert dark:text-neutral-300 prose-headings:mb-2 prose-headings:mt-3 prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-1"
                        dangerouslySetInnerHTML={{ __html: sanitizedAboutMarkup }}
                      />
                    ) : (
                      <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300 leading-6">
                        Profile details pending.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* BOTTOM SECTION: LISTINGS FULL-WIDTH */}
          <div className="lg:col-span-5 gap-12 flex flex-col">
            <SectionOurFeatures agentName={agentDetails?.known_as} agent={agentDetails} />
            <SectionGridFeaturePlaces
              packages={agentPackages ?? []}
              agent={agentDetails}
              heading="Our Packages"
              tabs={['Umrah']}
            />
          </div>

          {/* REVIEWS FULL-WIDTH */}
          <div className="lg:col-span-5 mt-6">
            <ReviewsSection
              agentId={agentDetails?.id ? String(agentDetails.id) : ''}
              agentName={agentDetails?.known_as || ''}
              initialReviews={agentReviews}
            />
          </div>
        </main>
      </div>
    </>
  );
};

export default AgentDetails;
