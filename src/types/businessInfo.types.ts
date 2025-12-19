/**
 * Business Information Types
 * General business context sent to LLM for content personalization
 */

export interface BusinessInfo {
  // Basic Business Info
  businessName: string;
  industry: string;
  businessType: 'b2b' | 'b2c' | 'both';
  companySize: 'solo' | 'small' | 'medium' | 'large' | 'enterprise';
  
  // Brand Identity
  brandDescription: string;
  uniqueSellingPoints: string[];
  brandValues: string[];
  
  // Products/Services
  mainProducts: string[];
  priceRange?: 'budget' | 'mid-range' | 'premium' | 'luxury';
  
  // Target Market
  targetMarket: string;
  geographicFocus: string[];
  
  // Online Presence
  website?: string;
  primarySocialPlatform?: string;
  
  // Content Preferences
  preferredTone: string[];
  contentGoals: string[];
  
  // Visual Style
  visualStyle?: 'minimalist' | 'bold' | 'professional' | 'playful' | 'luxury' | 'modern';
  brandColors?: string[];
  
  // Metadata
  createdAt: string;
  updatedAt?: string;
}

export const DEFAULT_BUSINESS_INFO: BusinessInfo = {
  businessName: '',
  industry: '',
  businessType: 'b2c',
  companySize: 'small',
  brandDescription: '',
  uniqueSellingPoints: [],
  brandValues: [],
  mainProducts: [],
  targetMarket: '',
  geographicFocus: [],
  preferredTone: [],
  contentGoals: [],
  createdAt: new Date().toISOString(),
};

export const INDUSTRIES = [
  'Technology',
  'E-commerce',
  'Healthcare',
  'Finance',
  'Education',
  'Food & Beverage',
  'Fashion',
  'Real Estate',
  'Travel',
  'Fitness',
  'Beauty',
  'Entertainment',
  'Marketing',
  'Consulting',
  'Manufacturing',
  'Other',
];

export const TONES = [
  'Professional',
  'Friendly',
  'Casual',
  'Witty',
  'Inspirational',
  'Bold',
  'Authoritative',
  'Playful',
  'Empathetic',
  'Educational',
];

export const CONTENT_GOALS = [
  'Brand Awareness',
  'Lead Generation',
  'Sales',
  'Community Building',
  'Thought Leadership',
  'Customer Education',
  'Entertainment',
  'Customer Support',
];

export const BRAND_VALUES = [
  'Innovation',
  'Quality',
  'Sustainability',
  'Transparency',
  'Customer-First',
  'Creativity',
  'Reliability',
  'Affordability',
  'Excellence',
  'Integrity',
];
