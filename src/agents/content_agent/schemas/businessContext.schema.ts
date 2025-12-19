/**
 * Business Context Schema for LangChain Runtime
 * 
 * Defines the Zod schema for business information passed to the content agent.
 * Uses LangChain's runtime context pattern for static information.
 * 
 * @see https://docs.langchain.com/oss/javascript/langchain/runtime
 */

import * as z from 'zod';

/**
 * Business Context Schema
 * Used with LangChain's contextSchema for runtime context injection
 */
export const BusinessContextSchema = z.object({
  // Basic Business Info
  businessName: z.string().optional().describe('Name of the business or brand'),
  industry: z.string().optional().describe('Business industry (e.g., Technology, E-commerce)'),
  businessType: z.enum(['b2b', 'b2c', 'both']).optional().describe('Business model type'),
  companySize: z.enum(['solo', 'small', 'medium', 'large', 'enterprise']).optional(),
  
  // Brand Identity
  brandDescription: z.string().optional().describe('2-3 sentence brand description'),
  uniqueSellingPoints: z.array(z.string()).optional().describe('Key USPs of the business'),
  brandValues: z.array(z.string()).optional().describe('Core brand values'),
  
  // Products/Services
  mainProducts: z.array(z.string()).optional().describe('Main products or services offered'),
  priceRange: z.enum(['budget', 'mid-range', 'premium', 'luxury']).optional(),
  
  // Target Market
  targetMarket: z.string().optional().describe('Target market description'),
  geographicFocus: z.array(z.string()).optional().describe('Geographic focus areas'),
  
  // Content Preferences
  preferredTone: z.array(z.string()).optional().describe('Preferred content tones'),
  contentGoals: z.array(z.string()).optional().describe('Content marketing goals'),
  
  // Visual Style
  visualStyle: z.enum(['minimalist', 'bold', 'professional', 'playful', 'luxury', 'modern']).optional(),
  brandColors: z.array(z.string()).optional().describe('Brand color hex codes'),
});

export type BusinessContext = z.infer<typeof BusinessContextSchema>;

/**
 * Format business context for inclusion in system prompt
 */
export function formatBusinessContextForPrompt(context?: BusinessContext): string {
  if (!context || !context.businessName) {
    return '';
  }

  const sections: string[] = [];
  
  // Business Identity
  sections.push(`## Business Context`);
  sections.push(`**Business:** ${context.businessName}`);
  
  if (context.industry) {
    sections.push(`**Industry:** ${context.industry}`);
  }
  
  if (context.businessType) {
    sections.push(`**Type:** ${context.businessType.toUpperCase()}`);
  }
  
  if (context.brandDescription) {
    sections.push(`**About:** ${context.brandDescription}`);
  }
  
  // USPs & Values
  if (context.uniqueSellingPoints?.length) {
    sections.push(`**USPs:** ${context.uniqueSellingPoints.join(', ')}`);
  }
  
  if (context.brandValues?.length) {
    sections.push(`**Values:** ${context.brandValues.join(', ')}`);
  }
  
  // Products
  if (context.mainProducts?.length) {
    sections.push(`**Products/Services:** ${context.mainProducts.join(', ')}`);
  }
  
  if (context.priceRange) {
    sections.push(`**Price Positioning:** ${context.priceRange}`);
  }
  
  // Target Market
  if (context.targetMarket) {
    sections.push(`**Target Market:** ${context.targetMarket}`);
  }
  
  if (context.geographicFocus?.length) {
    sections.push(`**Geographic Focus:** ${context.geographicFocus.join(', ')}`);
  }
  
  // Content Style
  if (context.preferredTone?.length) {
    sections.push(`**Preferred Tone:** ${context.preferredTone.join(', ')}`);
  }
  
  if (context.contentGoals?.length) {
    sections.push(`**Content Goals:** ${context.contentGoals.join(', ')}`);
  }
  
  // Visual
  if (context.visualStyle) {
    sections.push(`**Visual Style:** ${context.visualStyle}`);
  }
  
  if (context.brandColors?.length) {
    sections.push(`**Brand Colors:** ${context.brandColors.join(', ')}`);
  }

  return sections.length > 1 ? '\n\n' + sections.join('\n') : '';
}
