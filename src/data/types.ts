export interface Package {
  id: number;
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
  departure_date: string | null;
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
  agent_id: number | null;
}
import { Route } from '@/routers/types';
import { StaticImageData } from 'next/image';

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
