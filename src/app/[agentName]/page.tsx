import React from 'react';
import { safeJsonLd } from '@/lib/safeJsonLd';
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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.searchumrah.com';

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

// about_us is authored in an internal editor but rendered with
// dangerouslySetInnerHTML on a public, unauthenticated page — so this regex
// pass is the final line of defense against XSS. If we ever need richer
// HTML (custom video embeds etc.), swap this for sanitize-html / DOMPurify
// rather than extending the list below.
const DANGEROUS_TAGS = [
  'script',
  'iframe',
  'object',
  'embed',
  'applet',
  'frame',
  'frameset',
  'style',
  'link',
  'meta',
  'base',
  'form',
  'input',
  'button',
  'textarea',
  'select',
  'svg',
  'math',
];

const sanitizeProfileMarkup = (markup: string) => {
  if (!markup) return '';

  let out = markup;

  for (const tag of DANGEROUS_TAGS) {
    // Paired form: <tag ...>...</tag>, including malformed/nested content.
    out = out.replace(new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}\\s*>`, 'gi'), '');
    // Orphan / self-closing form: <tag ...> with no matching close.
    out = out.replace(new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi'), '');
  }

  // Inline event handlers (onclick, onerror, onload, etc.) on any element.
  out = out.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  // Script-running URI schemes. data: is allowed broadly (inline images use
  // data:image/...), but data:text/html and data:*/javascript can execute.
  out = out.replace(/\b(?:javascript|vbscript|livescript|mocha)\s*:/gi, '');
  out = out.replace(
    /\bdata\s*:\s*(?:text\/html|text\/javascript|application\/javascript|application\/x-javascript)/gi,
    ''
  );

  // srcdoc renders arbitrary HTML in iframes — kill it even if the iframe
  // tag itself was stripped above, in case it appears on another element.
  out = out.replace(/\ssrcdoc\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  return out;
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

// Reviews are readable without auth, so user_email — even though it's
// in the agent_reviews table — must NEVER appear in the normalized object
// we ship to the client. We still read it from the row to derive a fallback
// display name when user_name is missing.
const normalizeReview = (row: Record<string, any>) => {
  const anonymous = !!row.is_anonymous;
  const email = anonymous ? '' : (row.user_email as string | undefined) || '';
  const emailName = email.includes('@') ? email.split('@')[0] : '';
  return {
    id: row.id,
    agent_id: row.agent_id,
    user_id: row.user_id,
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
  const url = `${SITE_URL}/${params.agentName}`;

  if (!agentDetails) {
    return {
      title: 'Agent Profile',
      description: 'Explore trusted Umrah packages from verified agents.',
      alternates: { canonical: url },
    };
  }

  const displayName = agentDetails.known_as || 'Agent';
  const cityLabel = [agentDetails.city, agentDetails.state].filter(Boolean).join(', ');
  const ratingTotal = Number(agentDetails.rating_total ?? 0);
  const ratingAvg = Number(agentDetails.rating_avg ?? 0);

  // Title kept under ~46 chars so the full string — including the
  // " | Searchumrah" suffix appended by the root layout's title.template —
  // fits Google's mobile SERP cutoff (~60 chars). City alone (not state)
  // because state push the line past truncation for most Indian agents.
  // "Reviews" moves to the description; the city + "Umrah Packages" is the
  // stronger non-branded keyword combination.
  const title = agentDetails.city
    ? `${displayName} — Umrah Packages in ${agentDetails.city}`
    : `${displayName} — Umrah Travel Agent`;

  // Description prioritises the concrete trust signals (rating count,
  // verification) that drive click-through, then drops into the agent's
  // own bio if we have one. Bias toward 150–160 chars (Google's mobile
  // SERP cutoff) — the about_us copy varies wildly in length.
  const trustSentence = (() => {
    if (ratingTotal > 0 && ratingAvg > 0) {
      return `${ratingAvg.toFixed(1)}★ from ${ratingTotal} verified pilgrim${
        ratingTotal === 1 ? '' : 's'
      }.`;
    }
    return 'KYC-verified travel agent on Searchumrah.';
  })();
  const aboutSentence = clampText(agentDetails.about_us || '', 100);
  const description = clampText(
    [
      `${displayName}${cityLabel ? `, ${cityLabel}` : ''} — Umrah packages, hotels, flights.`,
      trustSentence,
      aboutSentence,
    ]
      .filter(Boolean)
      .join(' '),
    220
  );

  // Keyword set — branded + non-branded + location combinations. Deduped
  // to avoid the meta-tag-spam look that some CMS-generated pages have.
  const keywordSet = new Set<string>();
  const pushKw = (k: string | null | undefined) => {
    const v = (k || '').trim();
    if (v) keywordSet.add(v);
  };
  pushKw(displayName);
  pushKw(`${displayName} reviews`);
  pushKw(`${displayName} Umrah packages`);
  pushKw('Umrah travel agent');
  pushKw('verified Umrah agent');
  if (agentDetails.city) {
    pushKw(`Umrah travel agent in ${agentDetails.city}`);
    pushKw(`Umrah packages ${agentDetails.city}`);
    pushKw(`Umrah agency ${agentDetails.city}`);
  }
  if (agentDetails.state) {
    pushKw(`Umrah travel agent in ${agentDetails.state}`);
  }

  return {
    title,
    description,
    keywords: Array.from(keywordSet),
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: 'profile',
      url,
      siteName: 'Searchumrah',
      locale: 'en_IN',
      images: agentDetails.profile_image
        ? [{ url: agentDetails.profile_image, width: 800, height: 800, alt: displayName }]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: agentDetails.profile_image ? [agentDetails.profile_image] : undefined,
    },
    other: {
      'article:section': 'Umrah Travel Agents',
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

  // Fetch packages + reviews in parallel once we know the agent id. Moved
  // up so the JSON-LD blocks below can use the package list (for ItemList
  // and priceRange) and the review list (for individual Review nodes).
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

  // Price band for TravelAgency.priceRange — Google uses this to set the
  // "₹₹" / "₹₹₹" indicator in Maps and Local Pack. Compute from this agent's
  // actual packages so it stays honest instead of hardcoded.
  const priceRangeLabel = (() => {
    const prices = agentPackages
      .map((p) => Number(p.price_per_person ?? 0))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (prices.length === 0) return undefined;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max
      ? `₹${min.toLocaleString('en-IN')}`
      : `₹${min.toLocaleString('en-IN')} - ₹${max.toLocaleString('en-IN')}`;
  })();

  // sameAs collects the agent's social profiles. Google uses sameAs to
  // disambiguate the entity across the web — so even a single Instagram
  // link helps Google merge mentions of the same business.
  const sameAs = [
    normalizeExternalLink(agentDetails?.whatsapp_url),
    normalizeExternalLink(agentDetails?.instagram_url),
    normalizeExternalLink(agentDetails?.facebook_url),
  ].filter(Boolean);

  // Founders — schema.org TravelAgency supports `founder` as a Person.
  // Improves entity richness for the knowledge-panel pipeline.
  const founderLd = Array.isArray(agentDetails?.founders)
    ? agentDetails.founders
        .filter((f) => f && f.name && f.name.trim().length > 0)
        .slice(0, 5)
        .map((f) => ({
          '@type': 'Person',
          name: f.name,
          ...(f.job ? { jobTitle: f.job } : {}),
          ...(f.avatar ? { image: f.avatar } : {}),
        }))
    : [];

  const agentSchema = {
    '@context': 'https://schema.org',
    '@type': 'TravelAgency',
    name: agentDetails?.known_as,
    ...(agentDetails?.name && agentDetails.name !== agentDetails.known_as
      ? { legalName: agentDetails.name }
      : {}),
    url: agentUrl,
    description: clampText(agentDetails?.about_us || ''),
    image: agentDetails?.profile_image,
    ...(agentDetails?.email_id ? { email: agentDetails.email_id } : {}),
    ...(agentDetails?.contact_number ? { telephone: agentDetails.contact_number } : {}),
    ...(priceRangeLabel ? { priceRange: priceRangeLabel } : {}),
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
    // areaServed is a strong signal for local SEO — tells Google the agent
    // serves pilgrims FROM this city (departure-side), distinct from the
    // travel destinations (which are always Makkah + Madinah).
    ...(agentDetails?.city
      ? {
          areaServed: {
            '@type': 'City',
            name: agentDetails.city,
            ...(agentDetails.state
              ? { containedInPlace: { '@type': 'State', name: agentDetails.state } }
              : {}),
          },
        }
      : {}),
    // Always-true facts about every Searchumrah agent — gives Google
    // structured trust signals beyond the free-text description.
    knowsAbout: ['Umrah', 'Hajj', 'Saudi Arabia Pilgrimage', 'Makkah Hotels', 'Madinah Hotels'],
    serviceType: 'Umrah Package',
    ...(sameAs.length > 0 ? { sameAs } : {}),
    ...(founderLd.length > 0 ? { founder: founderLd } : {}),
    ...(agentReviewCountEarly > 0 && agentRatingPointEarly > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: agentRatingPointEarly,
            reviewCount: agentReviewCountEarly,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };

  // Individual Review JSON-LD — top 3 reviews with non-empty body. Google
  // can surface star snippets in SERP for these. Each Review.itemReviewed
  // points back at the same TravelAgency entity for consistency.
  const reviewLdItems = agentReviews
    .filter(
      (r) => r.rating && Number(r.rating) > 0 && (r.review_text || '').trim().length > 0
    )
    .slice(0, 3)
    .map((r) => ({
      '@context': 'https://schema.org',
      '@type': 'Review',
      itemReviewed: {
        '@type': 'TravelAgency',
        name: agentDetails?.known_as,
        url: agentUrl,
      },
      author: { '@type': 'Person', name: r.is_anonymous ? 'Anonymous' : r.user_name || 'Pilgrim' },
      datePublished: r.created_at
        ? new Date(r.created_at).toISOString().slice(0, 10)
        : undefined,
      reviewBody: (r.review_text || '').trim(),
      reviewRating: {
        '@type': 'Rating',
        ratingValue: Number(r.rating),
        bestRating: 5,
        worstRating: 1,
      },
    }));

  // ItemList for the agent's published packages. Tells Google this page is
  // a catalog of distinct offerings, not just a single profile — boosts
  // sitelink eligibility and helps the package detail pages get crawled
  // off this hub.
  const packagesItemListLd =
    agentPackages.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          numberOfItems: agentPackages.length,
          itemListOrder: 'https://schema.org/ItemListOrderDescending',
          itemListElement: agentPackages.slice(0, 10).map((p, i) => {
            const pkgUrl =
              p.slug && p.agent_name
                ? `${SITE_URL}/${encodeURIComponent(p.agent_name)}/${encodeURIComponent(p.slug)}`
                : agentUrl;
            return {
              '@type': 'ListItem',
              position: i + 1,
              url: pkgUrl,
              name: p.title,
            };
          }),
        }
      : null;

  // Agent-aware FAQPage. Each question uses concrete values from the agent
  // row (city, package count, rating count) so Google flags it as
  // substantive vs. boilerplate. Eligible for FAQ rich results in SERP.
  const faqEntries: { question: string; answer: string }[] = [
    {
      question: `Is ${agentDetails?.known_as} a verified Umrah travel agent?`,
      answer:
        agentReviewCountEarly > 0 && agentRatingPointEarly > 0
          ? `Yes. ${agentDetails?.known_as} is KYC-verified on Searchumrah and has ${agentReviewCountEarly} verified review${
              agentReviewCountEarly === 1 ? '' : 's'
            } from past pilgrims, averaging ${agentRatingPointEarly.toFixed(1)} out of 5.`
          : `Yes. ${agentDetails?.known_as} is KYC-verified on Searchumrah. Reviews from past pilgrims appear on this profile page as bookings complete.`,
    },
    ...(agentDetails?.city
      ? [
          {
            question: `Where is ${agentDetails?.known_as} located?`,
            answer: `${agentDetails?.known_as} is based in ${[
              agentDetails.city,
              agentDetails.state,
              agentDetails.country,
            ]
              .filter(Boolean)
              .join(', ')}${agentDetails.address ? `. Office address: ${agentDetails.address}.` : '.'}`,
          },
        ]
      : []),
    {
      question: `How many Umrah packages does ${agentDetails?.known_as} offer?`,
      answer:
        agentPackages.length > 0
          ? `${agentDetails?.known_as} currently has ${agentPackages.length} active Umrah package${
              agentPackages.length === 1 ? '' : 's'
            } listed on Searchumrah${priceRangeLabel ? ` priced from ${priceRangeLabel} per person` : ''}. Browse them above to compare hotels, durations, and inclusions.`
          : `${agentDetails?.known_as} doesn't have active packages listed at the moment. Contact them directly to ask about upcoming departures and custom itineraries.`,
    },
    {
      question: `How do I contact ${agentDetails?.known_as}?`,
      answer: `Use the "Contact this agent" panel on this page to reveal ${agentDetails?.known_as}'s phone, WhatsApp, and email. Searchumrah does not collect payment — you communicate and book directly with the agent.`,
    },
    {
      question: `Do I pay Searchumrah or pay ${agentDetails?.known_as} directly?`,
      answer: `You pay ${agentDetails?.known_as} directly. Searchumrah does not take any payment, commission, or service fee from pilgrims. Our role is verification, comparison, and a public reputation layer — we don't sit in the middle of your booking.`,
    },
  ];

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqEntries.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
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
        dangerouslySetInnerHTML={{ __html: safeJsonLd(agentSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(faqSchema) }}
      />
      {packagesItemListLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(packagesItemListLd) }}
        />
      ) : null}
      {reviewLdItems.map((review) => (
        <script
          key={`agent-review-ld-${(review.author as { name: string }).name}-${review.datePublished ?? ''}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(review) }}
        />
      ))}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbSchema) }}
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
            {/* Makkah + Madinah skyline sketch. Served from /public as an <img>
              rather than inlined so it qualifies as an LCP candidate — without
              this, agents with no custom banner_image have no image element
              above the fold and Lighthouse reports NO_LCP. fetchPriority="high"
              promotes it past the default low priority for in-viewport images.
              Plain <img> is intentional: it's a tiny static SVG served from
              /public, and next/image would refuse it without dangerouslyAllowSVG. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/agent-banner-skyline.svg"
              alt=""
              aria-hidden="true"
              fetchPriority="high"
              decoding="async"
              className="pointer-events-none absolute inset-x-0 -bottom-px block h-auto w-full opacity-[0.13]"
            />
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
                  className="m-0 grid grid-cols-3 gap-px overflow-hidden rounded-[14px] border border-neutral-200 bg-neutral-200"
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

              {agentDetails?.address ? (
                <div className="mt-6 flex items-start gap-3 border-b border-neutral-200 pb-6">
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
                      {agentDetails.address}
                    </div>
                  </div>
                </div>
              ) : null}

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
