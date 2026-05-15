import React from 'react';
import { supabase } from '@/utils/supabaseClient';
import type { Agent, Package, AgentReview } from '@/data/types';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getOptimizedImageUrl } from '@/lib/imageUrl';

const FALLBACK_BLUR_DATA_URL =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAACAAIDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAr/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AKpgD//Z';
import ShareButton from '@/shared/ShareButton';
import GovtVerifiedBadge from '@/components/GovtVerifiedBadge';
import SectionOurFeatures from './(components)/SectionOurFeatures';
import SectionGridFeaturePlaces from './(components)/SectionGridFeaturePlaces';
import ReviewsSection from './(components)/ReviewsSection';
import {
  AgentContactProvider,
  DesktopContactCard,
  MobileQuickActions,
  MobileStickyContact,
} from './(components)/AgentContactReveal';

export interface AgentDetailsProps {
  params: { agentName: string };
}

// Re-render at most once per minute. Agent profile data changes rarely;
// this is a huge perf win over `force-dynamic` for repeat visits.
export const revalidate = 60;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://searchumrah.com';

const stripHtml = (html: string) =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const clampText = (text: string, max = 160) => {
  const clean = stripHtml(text);
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
};

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
  const anonymous = !!row.is_anonymous;
  const email = anonymous ? '' : (row.user_email as string | undefined) || '';
  const emailName = email.includes('@') ? email.split('@')[0] : '';
  return {
    id: row.id,
    agent_id: row.agent_id,
    user_id: row.user_id,
    user_email: email,
    user_name: anonymous ? 'Anonymous' : row.user_name || emailName || 'User',
    user_profile_image: anonymous ? null : row.user_profile_image || null,
    is_anonymous: anonymous,
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
  is_anonymous: boolean | null;
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
  let reviewsQuery: any = await supabase
    .from('agent_reviews')
    .select(
      'id, agent_id, user_id, user_email, user_name, user_profile_image, is_anonymous, rating, review_text, created_at, updated_at'
    )
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false });

  // Older installs may not have the is_anonymous column yet — retry without it.
  const missingColumn =
    !!reviewsQuery.error &&
    (reviewsQuery.error.code === '42703' ||
      String(reviewsQuery.error.message || '')
        .toLowerCase()
        .includes('column'));

  if (missingColumn) {
    reviewsQuery = await supabase
      .from('agent_reviews')
      .select(
        'id, agent_id, user_id, user_email, user_name, user_profile_image, rating, review_text, created_at, updated_at'
      )
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });
  }

  const { data: reviewsData, error: reviewsError } = reviewsQuery;

  if (reviewsError) {
    console.error('Error fetching reviews:', reviewsError);
    return [];
  }

  const reviewRows = (reviewsData ?? []) as ReviewRow[];
  if (reviewRows.length === 0) return [];

  // Enrich any rows missing user_name / user_profile_image with a single
  // user_details lookup. (Newer rows have these denormalized already.)
  // Anonymous reviews are skipped — their identity must stay masked.
  const needsEnrichment = reviewRows.filter(
    (r) => r.user_id && !r.is_anonymous && (!r.user_name || !r.user_profile_image)
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
    if (normalized.is_anonymous) return normalized;
    const profile = review.user_id ? profileByUserId.get(review.user_id) : undefined;
    if (!profile) return normalized;
    return {
      ...normalized,
      user_name:
        normalized.user_name === 'User' ? buildReviewerName(profile) : normalized.user_name,
      user_profile_image: normalized.user_profile_image || profile.profile_image || null,
    };
  }) as AgentReview[];
};

export const generateMetadata = async ({ params }: AgentDetailsProps): Promise<Metadata> => {
  const agentDetails = await getAgentBySlug(params.agentName);
  // The root layout's `title.template` already appends "| Searchumrah", so
  // return just the agent name here to avoid duplication.
  const title = agentDetails?.known_as || 'Agent Profile';
  const description = clampText(
    agentDetails?.about_us || 'Explore trusted Umrah packages from verified agents.'
  );
  const url = `${SITE_URL}/${params.agentName}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: 'profile',
      url,
      images: agentDetails?.profile_image ? [{ url: agentDetails.profile_image }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: agentDetails?.profile_image ? [agentDetails.profile_image] : undefined,
    },
  };
};

const AgentDetails = async ({ params }: AgentDetailsProps) => {
  const { agentName } = params;
  const agentDetails = await getAgentBySlug(agentName);

  if (!agentDetails) {
    notFound();
  }

  const agentUrl = `${SITE_URL}/${agentDetails?.slug || agentName}`;
  const agentRatingPointEarly = Number(agentDetails?.rating_avg ?? 0);
  const agentReviewCountEarly = Number(agentDetails?.rating_total ?? 0);
  const agentAddressParts = [agentDetails?.city, agentDetails?.state, agentDetails?.country].filter(
    Boolean
  );

  const agentSchema = {
    '@context': 'https://schema.org',
    '@type': 'TravelAgency',
    name: agentDetails?.known_as,
    url: agentUrl,
    description: clampText(agentDetails?.about_us || ''),
    image: agentDetails?.profile_image,
    ...(agentDetails?.email_id ? { email: agentDetails.email_id } : {}),
    ...(agentDetails?.contact_number ? { telephone: agentDetails.contact_number } : {}),
    ...(agentAddressParts.length > 0
      ? {
          address: {
            '@type': 'PostalAddress',
            addressLocality: agentDetails?.city || undefined,
            addressRegion: agentDetails?.state || undefined,
            addressCountry: agentDetails?.country || undefined,
          },
        }
      : {}),
    ...(agentReviewCountEarly > 0 && agentRatingPointEarly > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: agentRatingPointEarly,
            reviewCount: agentReviewCountEarly,
          },
        }
      : {}),
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      {
        '@type': 'ListItem',
        position: 2,
        name: agentDetails?.known_as || agentName,
        item: agentUrl,
      },
    ],
  };

  // Fetch packages + reviews in parallel once we know the agent id
  let agentPackages: Package[] = [];
  let agentReviews: AgentReview[] = [];
  if (agentDetails?.id) {
    // packages.agent_id stores the auth user UUID, not the agents row id
    const packageAgentId = agentDetails.auth_user_id ?? agentDetails.id;
    const [packagesResult, reviews] = await Promise.all([
      // Read via the joining view so agent_* fields (used by the package cards
      // rendered below) reflect the live `agents` row.
      supabase
        .from('packages_with_agent')
        .select('*')
        .eq('agent_id', packageAgentId)
        .eq('published', true),
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
  const listingCount = Array.isArray(agentPackages) ? agentPackages.length : 0;
  const agentRatingPoint = Number(agentDetails?.rating_avg ?? 0);
  const agentReviewCount = Number(agentDetails?.rating_total ?? 0);
  const agentRecord = (agentDetails || {}) as unknown as Record<string, unknown>;
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
  const bannerImageUrl = agentDetails?.banner_image || '';

  // Derived display values for the redesigned profile header
  const displayName = agentDetails?.known_as || 'Agent';
  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() || '')
      .join('') || '?';
  const legalName =
    agentDetails?.name &&
    agentDetails.name.trim() &&
    agentDetails.name.trim() !== displayName.trim()
      ? agentDetails.name.trim()
      : '';
  const experienceYears = experienceValue == null ? NaN : Number(String(experienceValue).trim());
  const hasExperience = Number.isFinite(experienceYears) && experienceYears > 0;
  const sinceYear = hasExperience ? new Date().getFullYear() - experienceYears : null;
  const telHref = agentDetails?.contact_number ? `tel:${agentDetails.contact_number}` : '';
  const mailHref = agentDetails?.email_id ? `mailto:${agentDetails.email_id}` : '';
  const ratingDisplay = agentRatingPoint > 0 ? agentRatingPoint.toFixed(1) : 'New';

  // Props for the reveal gate — every contact surface (sidebar, mobile tiles,
  // mobile sticky) reads from the same provider so a single click flips them
  // all at once.
  const contactData = {
    agentId: agentDetails?.id ? String(agentDetails.id) : '',
    agentSlug: agentDetails?.slug || agentName,
    contactNumber: agentDetails?.contact_number || '',
    whatsappHref,
    telHref,
    mailHref,
    emailId: agentDetails?.email_id || '',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(agentSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <AgentContactProvider data={contactData}>
      <div className="nc-AgentProfilePage w-full pb-28 lg:pb-0">
        {/* ── BREADCRUMB ── */}
        <nav
          className="flex min-w-0 items-center gap-2 py-4 text-[13px] text-neutral-500"
          aria-label="Breadcrumb"
        >
          <Link href="/" className="shrink-0 font-medium text-primary-700 hover:underline">
            Home
          </Link>
          <svg
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5 shrink-0 text-neutral-400"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span className="min-w-0 flex-1 truncate font-medium text-neutral-800">
            {displayName}
          </span>
        </nav>

        {/* ── PROFILE HEADER CARD ── */}
        <section className="min-w-0 overflow-hidden rounded-[28px] border border-neutral-200 bg-white shadow-sm">
          {/* Banner */}
          <div
            className="relative aspect-[4/1] min-h-[180px]"
            style={{
              background:
                'radial-gradient(120% 100% at 20% 0%, rgba(99,102,241,0.20) 0%, transparent 60%), radial-gradient(100% 100% at 90% 100%, rgba(20,184,166,0.18) 0%, transparent 55%), linear-gradient(135deg, rgb(var(--c-primary-800)) 0%, rgb(var(--c-primary-900)) 100%)',
            }}
          >
            {/* dotted geometric overlay */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.18]"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.5) 1px, transparent 0)',
                backgroundSize: '28px 28px',
                maskImage: 'linear-gradient(180deg, black 0%, transparent 90%)',
                WebkitMaskImage: 'linear-gradient(180deg, black 0%, transparent 90%)',
              }}
            />
            {/* Makkah + Madinah skyline sketch */}
            <div
              className="absolute inset-x-0 -bottom-px leading-[0] text-black/60 opacity-[0.22]"
              aria-hidden="true"
            >
              <svg
                viewBox="0 0 1440 120"
                preserveAspectRatio="xMidYMax slice"
                className="block h-auto w-full"
              >
                <g fill="currentColor">
                  <rect x="100" y="40" width="5" height="80" />
                  <ellipse cx="102.5" cy="38" rx="7" ry="6" />
                  <rect x="101" y="22" width="3" height="16" />
                  <path d="M99 22 L102.5 14 L106 22 Z" />
                  <rect x="158" y="34" width="5" height="86" />
                  <ellipse cx="160.5" cy="32" rx="7" ry="6" />
                  <rect x="159" y="14" width="3" height="18" />
                  <rect x="240" y="36" width="5" height="84" />
                  <ellipse cx="242.5" cy="34" rx="7" ry="6" />
                  <rect x="241" y="18" width="3" height="16" />
                  <rect x="296" y="42" width="5" height="78" />
                  <ellipse cx="298.5" cy="40" rx="7" ry="6" />
                  <rect x="297" y="24" width="3" height="16" />
                  <rect x="115" y="76" width="170" height="44" />
                  <rect x="160" y="60" width="80" height="22" />
                  <path d="M156 64 Q200 26 244 64 Z" />
                  <rect x="197" y="38" width="6" height="22" />
                  <ellipse cx="200" cy="36" rx="4" ry="3" />
                  <rect x="350" y="92" width="36" height="28" />
                  <rect x="390" y="84" width="28" height="36" />
                  <rect x="422" y="96" width="50" height="24" />
                  <rect x="478" y="86" width="30" height="34" />
                  <rect x="900" y="50" width="5" height="70" />
                  <ellipse cx="902.5" cy="48" rx="6" ry="5" />
                  <rect x="901" y="34" width="3" height="14" />
                  <rect x="958" y="42" width="5" height="78" />
                  <ellipse cx="960.5" cy="40" rx="6" ry="5" />
                  <rect x="959" y="26" width="3" height="14" />
                  <rect x="1030" y="46" width="5" height="74" />
                  <ellipse cx="1032.5" cy="44" rx="6" ry="5" />
                  <rect x="1031" y="30" width="3" height="14" />
                  <rect x="1140" y="52" width="5" height="68" />
                  <ellipse cx="1142.5" cy="50" rx="6" ry="5" />
                  <rect x="1141" y="36" width="3" height="14" />
                  <rect x="908" y="86" width="240" height="34" />
                  <rect x="976" y="72" width="100" height="20" />
                  <rect x="1018" y="96" width="22" height="24" />
                  <rect x="1240" y="14" width="80" height="106" />
                  <rect x="1232" y="24" width="96" height="8" />
                  <rect x="1252" y="32" width="56" height="38" />
                  <circle
                    cx="1280"
                    cy="51"
                    r="13"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  />
                  <rect x="1273" y="6" width="14" height="10" />
                  <rect x="1277" y="0" width="6" height="8" />
                  <rect x="1156" y="56" width="28" height="64" />
                  <rect x="1192" y="42" width="22" height="78" />
                  <rect x="1342" y="42" width="22" height="78" />
                  <rect x="1372" y="56" width="28" height="64" />
                </g>
              </svg>
            </div>
            {/* Custom uploaded banner image (kept on top when present) */}
            {bannerImageUrl ? (
              <>
                <Image
                  src={
                    getOptimizedImageUrl(bannerImageUrl, {
                      width: 1600,
                      height: 400,
                      resize: 'cover',
                      quality: 78,
                    }) || bannerImageUrl
                  }
                  alt={agentDetails?.known_as || 'Agent cover'}
                  fill
                  className="object-cover"
                  sizes="100vw"
                  quality={78}
                  priority
                  placeholder="blur"
                  blurDataURL={FALLBACK_BLUR_DATA_URL}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              </>
            ) : null}
            {/* Share action */}
            <div className="absolute right-4 top-4 z-10">
              <ShareButton
                url={`/${agentName}`}
                title={agentDetails?.known_as || 'Agent profile'}
                iconOnly
                className="!h-[38px] !w-[38px] !rounded-full !bg-white/95 !p-0 !text-primary-700 shadow-sm hover:!bg-white"
                ariaLabel="Share agent profile"
              />
            </div>
          </div>

          {/* Profile body */}
          <div className="px-5 pb-7 pt-6 md:px-8 md:pb-8">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[auto_1fr] lg:items-center lg:gap-7">
              {/* Avatar — overlaps the banner on mobile/tablet; vertically centered beside the identity column on desktop */}
              <div className="relative -mt-[72px] h-[104px] w-[104px] shrink-0 overflow-hidden rounded-[24px] border-[5px] border-white bg-white shadow-md md:-mt-[88px] md:h-[124px] md:w-[124px] md:rounded-[28px] lg:mt-0">
                {agentDetails?.profile_image ? (
                  <Image
                    src={
                      getOptimizedImageUrl(agentDetails.profile_image, {
                        width: 248,
                        height: 248,
                        resize: 'cover',
                        quality: 75,
                      }) || agentDetails.profile_image
                    }
                    alt={agentDetails.known_as || 'Agent'}
                    fill
                    className="object-cover"
                    sizes="124px"
                    quality={75}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-700 to-primary-900 text-[34px] font-semibold tracking-tight text-white md:text-[38px]">
                    {initials}
                  </div>
                )}
              </div>

              {/* Identity */}
              <div className="flex min-w-0 flex-col gap-[18px] pt-1">
                <div className="flex flex-col gap-2.5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5">
                    <h1 className="m-0 break-words text-[28px] font-semibold leading-[1.15] tracking-[-0.02em] text-neutral-900 md:text-[34px]">
                      {displayName}
                    </h1>
                    {isGovVerified ? <GovtVerifiedBadge className="shrink-0" /> : null}
                  </div>
                  {agentLocation || legalName || sinceYear ? (
                    <div className="flex flex-col gap-1 text-[14.5px] leading-[1.5] text-neutral-600">
                      {agentLocation || legalName ? (
                        <p className="m-0">
                          {agentLocation ? (
                            <span className="inline-flex items-center gap-1.5 font-medium text-neutral-700">
                              <svg
                                viewBox="0 0 24 24"
                                className="h-3.5 w-3.5 text-primary-700"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={1.8}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M21 10c0 6-9 12-9 12S3 16 3 10a9 9 0 1 1 18 0z" />
                                <circle cx="12" cy="10" r="3" />
                              </svg>
                              {agentLocation}
                            </span>
                          ) : null}
                          {agentLocation && legalName ? (
                            <span className="mx-2 inline-block h-[3px] w-[3px] rounded-full bg-neutral-400 align-middle" />
                          ) : null}
                          {legalName ? (
                            <strong className="font-semibold text-neutral-900">{legalName}</strong>
                          ) : null}
                        </p>
                      ) : null}
                      {sinceYear ? (
                        <p className="m-0">
                          Hajj &amp; Umrah specialist since{' '}
                          <strong className="font-semibold text-neutral-900">{sinceYear}</strong>
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {/* Trust strip */}
                <dl
                  className="m-0 grid grid-cols-2 gap-px overflow-hidden rounded-[14px] border border-neutral-200 bg-neutral-200 sm:grid-cols-4"
                  aria-label="Agent credentials"
                >
                  <div className="min-w-0 bg-neutral-50 p-3.5">
                    <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-500">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-3 w-3 shrink-0 text-neutral-400"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 2 4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4z" />
                      </svg>
                      Rating
                    </dt>
                    <dd className="m-0 mt-1.5 flex flex-wrap items-baseline gap-x-1 gap-y-0.5 text-base font-semibold leading-tight text-neutral-900">
                      <span className="text-sm text-[#FACC15]">★</span>
                      {ratingDisplay}
                      <small className="break-words text-xs font-medium text-neutral-500">
                        {agentReviewCount > 0
                          ? `· ${agentReviewCount.toLocaleString('en-IN')} review${
                              agentReviewCount === 1 ? '' : 's'
                            }`
                          : 'No reviews yet'}
                      </small>
                    </dd>
                  </div>
                  <div className="bg-neutral-50 p-3.5">
                    <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-500">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-3 w-3 text-neutral-400"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 7v5l3 2" />
                      </svg>
                      Experience
                    </dt>
                    <dd className="m-0 mt-1.5 flex items-baseline gap-1 text-base font-semibold leading-tight text-neutral-900">
                      {hasExperience ? (
                        <>
                          {experienceYears}
                          <small className="text-xs font-medium text-neutral-500">
                            &nbsp;years
                          </small>
                        </>
                      ) : (
                        <small className="text-xs font-medium text-neutral-500">
                          Not available
                        </small>
                      )}
                    </dd>
                  </div>
                  <div className="bg-neutral-50 p-3.5">
                    <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-500">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-3 w-3 text-neutral-400"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="3" y="7" width="18" height="13" rx="2" />
                        <path d="M8 7V4h8v3M3 13h18" />
                      </svg>
                      Packages
                    </dt>
                    <dd className="m-0 mt-1.5 flex items-baseline gap-1 text-base font-semibold leading-tight text-neutral-900">
                      {listingCount}
                      <small className="text-xs font-medium text-neutral-500">&nbsp;active</small>
                    </dd>
                  </div>
                  <div className="bg-neutral-50 p-3.5">
                    <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-500">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-3 w-3 text-neutral-400"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                      Reply time
                    </dt>
                    <dd className="m-0 mt-1.5 flex items-baseline gap-1 text-base font-semibold leading-tight text-neutral-900">
                      Quick
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Mobile-only quick actions */}
            <MobileQuickActions />
          </div>
        </section>

        {/* ── MAIN GRID ── */}
        <div className="grid min-w-0 grid-cols-1 gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10 lg:py-10">
          {/* CONTENT */}
          <div className="grid min-w-0 grid-cols-1 gap-7">
            {/* About this agent */}
            <section className="min-w-0 overflow-hidden rounded-3xl border border-neutral-200 bg-white p-5 sm:p-7 md:p-8">
              <h2 className="m-0 break-words text-[22px] font-semibold leading-tight tracking-[-0.01em] text-neutral-900">
                About {displayName}
              </h2>

              <div className="mt-6 grid grid-cols-1 gap-3.5 border-b border-neutral-200 pb-6 sm:grid-cols-2 lg:grid-cols-2">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-700">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-medium uppercase tracking-[0.04em] text-neutral-500">
                      Email
                    </div>
                    <div className="mt-0.5 break-words text-sm font-medium text-neutral-900">
                      {agentDetails?.email_id || 'Not available'}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-700">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 10c0 6-9 12-9 12S3 16 3 10a9 9 0 1 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-medium uppercase tracking-[0.04em] text-neutral-500">
                      Address
                    </div>
                    <div className="mt-0.5 break-words text-sm font-medium text-neutral-900">
                      {agentDetails?.address || 'Not available'}
                    </div>
                  </div>
                </div>
              </div>

              {sanitizedAboutMarkup ? (
                <div
                  className="prose prose-sm mt-6 max-w-none overflow-x-auto break-words text-neutral-700 prose-headings:mb-2 prose-headings:mt-3 prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-1"
                  dangerouslySetInnerHTML={{ __html: sanitizedAboutMarkup }}
                />
              ) : (
                <p className="mt-6 text-[15px] leading-[1.6] text-neutral-700">
                  Profile details pending.
                </p>
              )}
            </section>

            <SectionOurFeatures agentName={displayName} agent={agentDetails} />
            <SectionGridFeaturePlaces packages={agentPackages ?? []} agent={agentDetails} />
            <ReviewsSection
              agentId={agentDetails?.id ? String(agentDetails.id) : ''}
              agentName={displayName}
              initialReviews={agentReviews}
            />
          </div>

          {/* SIDEBAR */}
          <aside className="hidden lg:block">
            <div className="sticky top-[88px] grid gap-5">
              <div className="rounded-[20px] border border-neutral-200 bg-white p-[22px]">
                <h3 className="m-0 mb-4 text-[13px] font-semibold uppercase tracking-[0.1em] text-neutral-500">
                  Contact this agent
                </h3>

                <DesktopContactCard />
              </div>

              <div className="rounded-[20px] border border-primary-100 bg-primary-50 p-[22px]">
                <h3 className="m-0 mb-4 text-[13px] font-semibold uppercase tracking-[0.1em] text-primary-700">
                  No payment on Searchumrah
                </h3>
                <p className="m-0 text-sm leading-[1.55] text-neutral-700">
                  All bookings are made directly with the agent. We never resell your contact
                  details or charge you a service fee.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <MobileStickyContact />
      </AgentContactProvider>
    </>
  );
};

export default AgentDetails;
