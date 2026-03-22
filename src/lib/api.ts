const BASE_URL = 'https://mesejours.com/wp-json/wp/v2';

export interface WPListing {
  id: number;
  date: string;
  slug: string;
  link: string;
  title: { rendered: string };
  content: { rendered: string };
  featured_media: number;
  listing_category: number[];
  service_category: number[];
  rental_category: number[];
  listing_feature: number[];
  region: number[];
  featuredImageUrl?: string;
  // ACF/Meta fields
  acf?: {
    phone?: string;
    whatsapp?: string;
    email?: string;
    website?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
    address?: string;
    latitude?: string;
    longitude?: string;
    price?: string;
    gallery?: { url: string; alt: string }[];
    features?: string[];
    opening_hours?: string;
    check_in?: string;
    check_out?: string;
  };
  meta?: {
    _phone?: string;
    _whatsapp?: string;
    _email?: string;
    _website?: string;
    _facebook?: string;
    _instagram?: string;
    _twitter?: string;
    _address?: string;
    _geolocation_lat?: string;
    _geolocation_long?: string;
    _price?: string;
    _gallery?: number[];
    _listing_gallery?: number[];
  };
}

export interface WPPost {
  id: number;
  date: string;
  slug: string;
  link: string;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
  featured_media: number;
  categories: number[];
  featuredImageUrl?: string;
}

export interface WPMedia {
  id: number;
  source_url: string;
  alt_text: string;
}

export interface WPCategory {
  id: number;
  name: string;
  slug: string;
  count: number;
  description: string;
}

// Category IDs from WordPress
export const LISTING_CATEGORIES = {
  RESTAURANTS: 123,
  SEJOURS: 102,
  ATTRACTIONS: 234,
};

export const POST_CATEGORIES = {
  CONSEILS: 230,
};

// Fetch media by ID
export async function fetchMedia(mediaId: number): Promise<WPMedia | null> {
  if (!mediaId) return null;
  try {
    const response = await fetch(`${BASE_URL}/media/${mediaId}`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

// Fetch multiple media by IDs
export async function fetchMultipleMedia(mediaIds: number[]): Promise<WPMedia[]> {
  if (!mediaIds || mediaIds.length === 0) return [];
  try {
    const promises = mediaIds.map(id => fetchMedia(id));
    const results = await Promise.all(promises);
    return results.filter((m): m is WPMedia => m !== null);
  } catch {
    return [];
  }
}

// Fetch listings with embedded media
export async function fetchListings(
  categoryId: number,
  perPage: number = 12,
  page: number = 1
): Promise<{ listings: WPListing[]; total: number; totalPages: number }> {
  const response = await fetch(
    `${BASE_URL}/listing?listing_category=${categoryId}&per_page=${perPage}&page=${page}&_embed`
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch listings');
  }
  
  const total = parseInt(response.headers.get('X-WP-Total') || '0');
  const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1');
  const listings: WPListing[] = await response.json();
  
  // Fetch featured images
  const listingsWithImages = await Promise.all(
    listings.map(async (listing) => {
      if (listing.featured_media) {
        const media = await fetchMedia(listing.featured_media);
        return { ...listing, featuredImageUrl: media?.source_url };
      }
      return listing;
    })
  );
  
  return { listings: listingsWithImages, total, totalPages };
}

// Search listings
export async function searchListings(
  query: string,
  categoryId?: number,
  perPage: number = 20
): Promise<WPListing[]> {
  let url = `${BASE_URL}/listing?search=${encodeURIComponent(query)}&per_page=${perPage}&_embed`;
  if (categoryId) {
    url += `&listing_category=${categoryId}`;
  }
  
  const response = await fetch(url);
  if (!response.ok) return [];
  
  const listings: WPListing[] = await response.json();
  
  const listingsWithImages = await Promise.all(
    listings.map(async (listing) => {
      if (listing.featured_media) {
        const media = await fetchMedia(listing.featured_media);
        return { ...listing, featuredImageUrl: media?.source_url };
      }
      return listing;
    })
  );
  
  return listingsWithImages;
}

// Fetch posts (for Conseils)
export async function fetchPosts(
  categoryId: number,
  perPage: number = 12,
  page: number = 1
): Promise<{ posts: WPPost[]; total: number; totalPages: number }> {
  const response = await fetch(
    `${BASE_URL}/posts?categories=${categoryId}&per_page=${perPage}&page=${page}&_embed`
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch posts');
  }
  
  const total = parseInt(response.headers.get('X-WP-Total') || '0');
  const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1');
  const posts: WPPost[] = await response.json();
  
  // Fetch featured images
  const postsWithImages = await Promise.all(
    posts.map(async (post) => {
      if (post.featured_media) {
        const media = await fetchMedia(post.featured_media);
        return { ...post, featuredImageUrl: media?.source_url };
      }
      return post;
    })
  );
  
  return { posts: postsWithImages, total, totalPages };
}

// Fetch service categories (for restaurant sub-types)
export async function fetchServiceCategories(): Promise<WPCategory[]> {
  const response = await fetch(`${BASE_URL}/service_category?per_page=100`);
  if (!response.ok) return [];
  return response.json();
}

// Fetch rental categories (for accommodation types)
export async function fetchRentalCategories(): Promise<WPCategory[]> {
  const response = await fetch(`${BASE_URL}/rental_category?per_page=100`);
  if (!response.ok) return [];
  return response.json();
}

// Fetch listing features
export async function fetchListingFeatures(): Promise<WPCategory[]> {
  const response = await fetch(`${BASE_URL}/listing_feature?per_page=100`);
  if (!response.ok) return [];
  return response.json();
}

// Fetch regions
export async function fetchRegions(): Promise<WPCategory[]> {
  const response = await fetch(`${BASE_URL}/region?per_page=100`);
  if (!response.ok) return [];
  return response.json();
}

// Fetch single listing by ID with all metadata
export async function fetchListingById(id: number): Promise<WPListing | null> {
  try {
    const response = await fetch(`${BASE_URL}/listing/${id}?_embed`);
    if (!response.ok) return null;
    const listing: WPListing = await response.json();
    
    if (listing.featured_media) {
      const media = await fetchMedia(listing.featured_media);
      listing.featuredImageUrl = media?.source_url;
    }
    
    // Fetch gallery images if available
    const galleryIds = listing.meta?._gallery || listing.meta?._listing_gallery || [];
    if (galleryIds.length > 0) {
      const galleryMedia = await fetchMultipleMedia(galleryIds);
      if (!listing.acf) listing.acf = {};
      listing.acf.gallery = galleryMedia.map(m => ({ url: m.source_url, alt: m.alt_text }));
    }
    
    return listing;
  } catch {
    return null;
  }
}

// Fetch single post by ID
export async function fetchPostById(id: number): Promise<WPPost | null> {
  try {
    const response = await fetch(`${BASE_URL}/posts/${id}`);
    if (!response.ok) return null;
    const post: WPPost = await response.json();
    
    if (post.featured_media) {
      const media = await fetchMedia(post.featured_media);
      post.featuredImageUrl = media?.source_url;
    }
    
    return post;
  } catch {
    return null;
  }
}

// Fetch listings by service category (for restaurant filtering)
export async function fetchListingsByServiceCategory(
  listingCategoryId: number,
  serviceCategoryId: number,
  perPage: number = 12
): Promise<WPListing[]> {
  const response = await fetch(
    `${BASE_URL}/listing?listing_category=${listingCategoryId}&service_category=${serviceCategoryId}&per_page=${perPage}&_embed`
  );
  
  if (!response.ok) return [];
  const listings: WPListing[] = await response.json();
  
  const listingsWithImages = await Promise.all(
    listings.map(async (listing) => {
      if (listing.featured_media) {
        const media = await fetchMedia(listing.featured_media);
        return { ...listing, featuredImageUrl: media?.source_url };
      }
      return listing;
    })
  );
  
  return listingsWithImages;
}

// Fetch listings by rental category (for accommodation filtering)
export async function fetchListingsByRentalCategory(
  listingCategoryId: number,
  rentalCategoryId: number,
  perPage: number = 12
): Promise<WPListing[]> {
  const response = await fetch(
    `${BASE_URL}/listing?listing_category=${listingCategoryId}&rental_category=${rentalCategoryId}&per_page=${perPage}&_embed`
  );
  
  if (!response.ok) return [];
  const listings: WPListing[] = await response.json();
  
  const listingsWithImages = await Promise.all(
    listings.map(async (listing) => {
      if (listing.featured_media) {
        const media = await fetchMedia(listing.featured_media);
        return { ...listing, featuredImageUrl: media?.source_url };
      }
      return listing;
    })
  );
  
  return listingsWithImages;
}

// Calculate distance between two coordinates (Haversine formula)
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Get contact info from listing (checks both ACF and meta)
export function getListingContact(listing: WPListing) {
  return {
    phone: listing.acf?.phone || listing.meta?._phone || '',
    whatsapp: listing.acf?.whatsapp || listing.meta?._whatsapp || listing.acf?.phone || listing.meta?._phone || '',
    email: listing.acf?.email || listing.meta?._email || '',
    website: listing.acf?.website || listing.meta?._website || '',
    facebook: listing.acf?.facebook || listing.meta?._facebook || '',
    instagram: listing.acf?.instagram || listing.meta?._instagram || '',
    twitter: listing.acf?.twitter || listing.meta?._twitter || '',
    address: listing.acf?.address || listing.meta?._address || '',
    latitude: listing.acf?.latitude || listing.meta?._geolocation_lat || '',
    longitude: listing.acf?.longitude || listing.meta?._geolocation_long || '',
    price: listing.acf?.price || listing.meta?._price || '',
  };
}
