/**
 * Validation schemas for Meta Ads - v24.0
 * Using Zod for runtime validation
 * 
 * @see https://developers.facebook.com/docs/marketing-api/reference/v24.0
 */

import { z } from 'zod';

// Call to Action types supported by Meta Marketing API v24.0
export const CallToActionTypeSchema = z.enum([
  'LEARN_MORE',
  'SHOP_NOW',
  'SIGN_UP',
  'SUBSCRIBE',
  'CONTACT_US',
  'DOWNLOAD',
  'GET_QUOTE',
  'BOOK_TRAVEL', // API uses BOOK_TRAVEL for booking actions
  'SEND_MESSAGE',
  'CALL_NOW',
  'APPLY_NOW',
  'BUY_NOW',
  'ORDER_NOW',
  'GET_OFFER',
  'GET_DIRECTIONS',
  'WHATSAPP_MESSAGE',
  'WATCH_MORE',
  'DONATE_NOW',
  'INSTALL_APP',
  'USE_APP',
  'PLAY_GAME',
  'REQUEST_TIME',
  'SEE_MENU',
  'GET_SHOWTIMES',
]);

// Ad status types
export const AdStatusSchema = z.enum([
  'ACTIVE',
  'PAUSED',
  'ARCHIVED',
  'DELETED',
  'PENDING_REVIEW',
  'DISAPPROVED',
  'PREAPPROVED',
]);

// Campaign objective types (OUTCOME-based for v24.0)
export const CampaignObjectiveSchema = z.enum([
  'OUTCOME_AWARENESS',
  'OUTCOME_ENGAGEMENT',
  'OUTCOME_LEADS',
  'OUTCOME_SALES',
  'OUTCOME_TRAFFIC',
  'OUTCOME_APP_PROMOTION',
]);

// Optimization goal types (v24.0)
export const OptimizationGoalSchema = z.enum([
  'REACH',
  'IMPRESSIONS',
  'LINK_CLICKS',
  'LANDING_PAGE_VIEWS',
  'POST_ENGAGEMENT',
  'PAGE_LIKES',
  'THRUPLAY',
  'VIDEO_VIEWS',
  'LEAD_GENERATION',
  'OFFSITE_CONVERSIONS',
  'VALUE',
  'APP_INSTALLS',
  'CONVERSATIONS',
  // New v24.0 optimization goals
  'QUALITY_CALL',
  'QUALITY_LEAD',
  'TWO_SECOND_CONTINUOUS_VIDEO_VIEWS',
  'VISIT_INSTAGRAM_PROFILE',
  'AD_RECALL_LIFT',
  'ENGAGED_USERS',
  'EVENT_RESPONSES',
  'REMINDERS_SET',
]);

// Billing event types (v24.0)
export const BillingEventSchema = z.enum([
  'IMPRESSIONS',
  'LINK_CLICKS',
  'THRUPLAY',
  'PAGE_LIKES',
  'POST_ENGAGEMENT',
  'VIDEO_VIEWS',
  'APP_INSTALLS',
  'LEAD_GENERATION',
  'MESSAGING_CONVERSATIONS',
  'QUALIFIED_LEAD',
  'NONE',
]);

// Destination types for ad sets (v24.0)
export const DestinationTypeSchema = z.enum([
  'WEBSITE',
  'APP',
  'MESSENGER',
  'WHATSAPP',
  'INSTAGRAM_DIRECT',
  'PHONE_CALL',
  'SHOP',
  'ON_AD',
  'ON_POST',
  'ON_EVENT',
  'ON_VIDEO',
  'ON_PAGE',
]);

// Bid strategy types
export const BidStrategySchema = z.enum([
  'LOWEST_COST_WITHOUT_CAP',
  'LOWEST_COST_WITH_BID_CAP',
  'COST_CAP',
  'LOWEST_COST_WITH_MIN_ROAS',
]);

// Carousel item schema
export const CarouselItemSchema = z.object({
  image_url: z.string().url('Invalid image URL'),
  title: z.string().max(40, 'Title must be 40 characters or less').optional(),
  description: z.string().max(125, 'Description must be 125 characters or less').optional(),
  link: z.string().url('Invalid link URL').optional(),
});

// Creative schema
export const AdCreativeSchema = z.object({
  title: z.string().max(40, 'Title must be 40 characters or less').optional(),
  body: z.string().max(125, 'Body text must be 125 characters or less').optional(),
  call_to_action_type: CallToActionTypeSchema.optional(),
  link_url: z.string().url('Invalid link URL').optional(),
  image_url: z.string().url('Invalid image URL').optional(),
  video_id: z.string().optional(),
  image_hash: z.string().optional(),
  carousel_items: z.array(CarouselItemSchema).min(2, 'Carousel must have at least 2 items').max(10, 'Carousel can have at most 10 items').optional(),
}).refine(
  (data) => {
    // Must have either image_url, video_id, image_hash, or carousel_items
    return !!(data.image_url || data.video_id || data.image_hash || (data.carousel_items && data.carousel_items.length > 0));
  },
  {
    message: 'Creative must have at least one media item (image, video, or carousel)',
  }
);

// Targeting schema (v24.0)
export const TargetingSchema = z.object({
  geo_locations: z.object({
    countries: z.array(z.string()).optional(),
    regions: z.array(z.object({ key: z.string() })).optional(),
    cities: z.array(z.object({ 
      key: z.union([z.string(), z.number()]),
      radius: z.number().optional(),
      distance_unit: z.enum(['mile', 'kilometer']).optional(),
    })).optional(),
  }).optional(),
  age_min: z.number().min(13).max(65).optional(),
  age_max: z.number().min(13).max(65).optional(),
  genders: z.array(z.union([z.literal(1), z.literal(2)])).optional(), // 1=male, 2=female
  interests: z.array(z.object({
    id: z.union([z.string(), z.number()]),
    name: z.string().optional(),
  })).optional(),
  behaviors: z.array(z.object({
    id: z.union([z.string(), z.number()]),
    name: z.string().optional(),
  })).optional(),
  custom_audiences: z.array(z.object({ id: z.string() })).optional(),
  excluded_custom_audiences: z.array(z.object({ id: z.string() })).optional(),
  device_platforms: z.array(z.enum(['mobile', 'desktop'])).optional(),
  publisher_platforms: z.array(z.enum(['facebook', 'instagram', 'audience_network', 'messenger'])).optional(),
  facebook_positions: z.array(z.string()).optional(),
  instagram_positions: z.array(z.string()).optional(),
  threads_positions: z.array(z.string()).optional(), // v24.0 - Threads
});

// Create Ad request schema
export const CreateAdSchema = z.object({
  name: z.string().min(1, 'Ad name is required').max(255, 'Ad name must be 255 characters or less'),
  adset_id: z.string().min(1, 'Ad set ID is required'),
  status: AdStatusSchema.optional().default('PAUSED'),
  creative: AdCreativeSchema,
  page_id: z.string().optional(),
});

// Create Ad Set request schema (v24.0)
export const CreateAdSetSchema = z.object({
  name: z.string().min(1, 'Ad set name is required').max(255, 'Ad set name must be 255 characters or less'),
  campaign_id: z.string().min(1, 'Campaign ID is required'),
  status: z.enum(['ACTIVE', 'PAUSED']).optional().default('PAUSED'),
  optimization_goal: OptimizationGoalSchema,
  billing_event: BillingEventSchema.optional().default('IMPRESSIONS'),
  bid_strategy: BidStrategySchema.optional(),
  bid_amount: z.number().positive().optional(),
  daily_budget: z.number().positive().optional(),
  lifetime_budget: z.number().positive().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  targeting: TargetingSchema,
  destination_type: DestinationTypeSchema.optional(),
  promoted_object: z.object({
    page_id: z.string().optional(),
    pixel_id: z.string().optional(),
    application_id: z.string().optional(),
  }).optional(),
}).refine(
  (data) => data.daily_budget || data.lifetime_budget,
  { message: 'Either daily_budget or lifetime_budget is required' }
);

// Create Campaign request schema (v24.0)
export const CreateCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').max(255, 'Campaign name must be 255 characters or less'),
  objective: CampaignObjectiveSchema,
  status: z.enum(['ACTIVE', 'PAUSED']).optional().default('PAUSED'),
  special_ad_categories: z.array(z.enum(['NONE', 'EMPLOYMENT', 'HOUSING', 'CREDIT', 'ISSUES_ELECTIONS_POLITICS'])).optional(),
  is_campaign_budget_optimization: z.boolean().optional(),
  daily_budget: z.number().positive().optional(),
  lifetime_budget: z.number().positive().optional(),
  bid_strategy: BidStrategySchema.optional(),
});

export type CreateAdInput = z.infer<typeof CreateAdSchema>;
export type CreateAdSetInput = z.infer<typeof CreateAdSetSchema>;
export type CreateCampaignInput = z.infer<typeof CreateCampaignSchema>;
export type AdCreativeInput = z.infer<typeof AdCreativeSchema>;
export type CarouselItemInput = z.infer<typeof CarouselItemSchema>;
export type TargetingInput = z.infer<typeof TargetingSchema>;

