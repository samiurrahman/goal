import { Route } from '@/routers/types';
import { StaticImageData } from 'next/image';
// Agent interface for agents table
export interface Agent {
  id: string; // UUID
  created_at: string;
  rating_avg?: number | null;
  rating_total?: number | null;
  name: string;
  city: string;
  address: string;
  is_gov_authorised: string;
  listing_id: string;
  is_agent_authorized: string;
  known_as: string;
  state: string;
  country: string;
  slug: string;
  contact_number: string;
  lat_lang: string | null;
  email_id: string;
  email_isVerified: string | null;
  alternate_number: string;
  whatsapp_url?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
  about_us: string;
  founders: People[];
  profile_image: string | null;
  banner_image?: string | null;
  info_heading?: string;
  info_features?: AgentInfoFeature[];
  info_image_url?: string | null;
  info_use_default_image?: boolean;
}
export interface People {
  id: string;
  name: string;
  job: string;
  avatar: string;
}
export interface Package {
  id: number;
  published?: boolean | null;
  default_pricing?:
    | {
        people?: number;
        value?: number;
        currency?: string;
      }
    | string
    | null;
  slug: string | null;
  type: string | null;
  title: string;
  short_description: string | null;
  total_duration_days: number | null;
  makkah_days: number | null;
  madinah_days: number | null;
  price_per_person: number | null;
  currency: string | null;
  departure_city: string | null;
  departure_date: Date;
  arrival_date: Date;
  includes_breakfast: boolean | null;
  includes_airport_transfer: boolean | null;
  includes_visa: boolean | null;
  includes_zamzam: boolean | null;
  zamzam_liters: number | null;
  total_seats: number | null;
  booked_seats: number | null;
  seats_left: number | null;
  thumbnail_url: string | null;
  makkah_hotel_name: string | null;
  makkah_hotel_distance_m: number | null;
  madinah_hotel_name: string | null;
  madinah_hotel_distance_m: number | null;
  agent_name: string | null;
  location: string | null;
  agent_id: string | null;
  arrival_city: string | null;
  sharing_rate: string | null;
  package_location: string | null;
}

// PackageDetails type for detailed package JSON structure
export interface PackageDetails {
  id: string;
  published?: boolean | null;
  default_pricing?:
    | {
        people?: number;
        value?: number;
        currency?: string;
      }
    | string
    | null;
  slug: string;
  type: 'UMRAH' | 'HAJJ';
  title: string;
  short_description: string;
  total_duration_days: number;
  makkah_days: number;
  madinah_days: number;
  price_per_person: number;
  currency: string;
  departure_city: string;
  departure_date: string;
  includes_breakfast: boolean;
  includes_airport_transfer: boolean;
  includes_visa: boolean;
  includes_zamzam: boolean;
  zamzam_liters: number;
  total_seats: number;
  booked_seats: number;
  seats_left: number;
  thumbnail_url: string;
  makkah_hotel_name: string;
  makkah_hotel_distance_m: number;
  madinah_hotel_name: string;
  madinah_hotel_distance_m: number;
  agent_name: string;
  agent_id: string;
  location: string;
  sharing_rate: string | null;
  arrival_city: string;
  arrival_date: string;
  package_location: string;
  details: {
    id: string;
    created_at: string;
    package_id: string;
    iternary: Array<{
      fromDate?: string;
      fromLocation?: string;
      toDate?: string;
      toLocation?: string;
      tripTime?: string;
      flightInfo?: string;
      nextLegLabel?: string;
    }>;
    stay_information: {
      title: string;
      details: string[];
      content_html?: string;
    };
    purchase_summary?: {
      rates: Array<{ value: string; people: number; default: boolean }>;
      currency?: string;
      min_guests?: number;
      max_guests?: number;
    };
    amenities: null | Record<string, unknown>;
    policies: null | Record<string, unknown>;
  };
}

// AgentReview interface for agent reviews
export interface AgentReview {
  id: number;
  agent_id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  user_profile_image?: string | null;
  rating: number;
  review_text: string;
  created_at: string;
  updated_at: string;
}

export interface AgentInfoFeature {
  badge_name: string;
  badge_color: TwMainColor;
  title: string;
  description: string;
}

//  ######  CustomLink  ######## //
export interface CustomLink {
  label: string;
  href: Route<string> | string;
  targetBlank?: boolean;
}

//  ##########  PostDataType ######## //
export interface TaxonomyType {
  id: string | number;
  name: string;
  href: Route<string>;
  count?: number;
  thumbnail?: string;
  desc?: string;
  color?: TwMainColor | string;
  taxonomy: 'category' | 'tag';
  listingType?: 'stay' | 'experiences' | 'car';
}

export interface AuthorType {
  id: string | number;
  firstName: string;
  lastName: string;
  displayName: string;
  avatar: string | StaticImageData;
  bgImage?: string | StaticImageData;
  email?: string;
  count: number;
  desc: string;
  jobName: string;
  href: Route<string>;
  starRating?: number;
}

export interface PostDataType {
  id: string | number;
  author: AuthorType;
  date: string;
  href: Route<string>;
  categories: TaxonomyType[];
  title: string;
  featuredImage: StaticImageData | string;
  desc?: string;
  commentCount: number;
  viewdCount: number;
  readingTime: number;
  postType?: 'standard' | 'video' | 'gallery' | 'audio';
}

export type TwMainColor =
  | 'pink'
  | 'green'
  | 'yellow'
  | 'red'
  | 'indigo'
  | 'blue'
  | 'purple'
  | 'gray';

//
export interface StayDataType {
  id: string | number;
  author: AuthorType;
  date: string;
  href: Route<string>;
  title: string;
  featuredImage: StaticImageData | string;
  commentCount: number;
  viewCount: number;
  address: string;
  reviewStart: number;
  reviewCount: number;
  like: boolean;
  galleryImgs: (StaticImageData | string)[];
  price: string;
  listingCategory: TaxonomyType;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  saleOff?: string | null;
  isAds: boolean | null;
  map: {
    lat: number;
    lng: number;
  };
}

//
export interface ExperiencesDataType {
  id: string | number;
  author: AuthorType;
  date: string;
  href: Route<string>;
  title: string;
  featuredImage: StaticImageData | string;
  commentCount: number;
  viewCount: number;
  address: string;
  reviewStart: number;
  reviewCount: number;
  like: boolean;
  galleryImgs: (StaticImageData | string)[];
  price: string;
  listingCategory: TaxonomyType;
  maxGuests: number;
  saleOff?: string | null;
  isAds: boolean | null;
  map: {
    lat: number;
    lng: number;
  };
}

// types/package.ts

export type PackageType = 'UMRAH' | 'HAJJ';

export interface PackageListing {
  id: number;
  slug: string;
  type: PackageType;

  title: string;
  short_description: string | null;

  total_duration_days: number;
  makkah_days: number;
  madinah_days: number;

  price_per_person: number;
  currency: string; // 'SAR' | 'USD' | 'INR' etc.

  departure_city: string | null;
  departure_date: string; // ISO date string: '2025-03-10'

  includes_breakfast: boolean;
  includes_airport_transfer: boolean;
  includes_visa: boolean;
  includes_zamzam: boolean;
  zamzam_liters: number;

  total_seats: number;
  booked_seats: number;
  seats_left: number;

  thumbnail_url: string | null;

  makkah_hotel_name: string | null;
  makkah_hotel_distance_m: number | null;

  madinah_hotel_name: string | null;
  madinah_hotel_distance_m: number | null;

  agent_name: string | null;
}

//
export interface CarDataType {
  id: string | number;
  author: AuthorType;
  date: string;
  href: Route<string>;
  title: string;
  featuredImage: StaticImageData | string;
  commentCount: number;
  viewCount: number;
  address: string;
  reviewStart: number;
  reviewCount: number;
  like: boolean;
  galleryImgs: (StaticImageData | string)[];
  price: string;
  listingCategory: TaxonomyType;
  seats: number;
  gearshift: string;
  saleOff?: string | null;
  isAds: boolean | null;
  map: {
    lat: number;
    lng: number;
  };
}
