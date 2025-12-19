'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Target, 
  Palette, 
  MessageSquare, 
  Plus, 
  X, 
  Save, 
  CheckCircle,
  Globe,
  Package,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBusinessInfo } from '@/hooks/useBusinessInfo';
import { 
  INDUSTRIES, 
  TONES, 
  CONTENT_GOALS, 
  BRAND_VALUES,
  BusinessInfo 
} from '@/types/businessInfo.types';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

export default function BusinessInfoPage() {
  const { 
    businessInfo, 
    isLoaded, 
    isSaving,
    error: apiError,
    saveBusinessInfo, 
    updateField,
    addToArray,
    removeFromArray,
    isComplete 
  } = useBusinessInfo();
  
  const [newUSP, setNewUSP] = useState('');
  const [newProduct, setNewProduct] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    const success = await saveBusinessInfo(businessInfo);
    if (success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const handleAddUSP = () => {
    if (newUSP.trim()) {
      addToArray('uniqueSellingPoints', newUSP.trim());
      setNewUSP('');
    }
  };

  const handleAddProduct = () => {
    if (newProduct.trim()) {
      addToArray('mainProducts', newProduct.trim());
      setNewProduct('');
    }
  };

  const handleAddLocation = () => {
    if (newLocation.trim()) {
      addToArray('geographicFocus', newLocation.trim());
      setNewLocation('');
    }
  };

  const toggleArrayItem = (field: keyof BusinessInfo, value: string) => {
    const current = businessInfo[field];
    if (Array.isArray(current)) {
      if (current.includes(value)) {
        removeFromArray(field, value);
      } else {
        addToArray(field, value);
      }
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" />
            Business Information
          </h1>
          <p className="text-muted-foreground mt-1">
            This information helps AI generate personalized content for your brand
          </p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className={cn("gap-2", saved && "bg-green-600 hover:bg-green-700")}
        >
          {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Saved!' : isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* API Error */}
      {apiError && (
        <Card className="bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800">
          <CardContent className="py-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-sm text-red-800 dark:text-red-200">
              {apiError}
            </span>
          </CardContent>
        </Card>
      )}

      {/* Completion Status */}
      {!isComplete() && !apiError && (
        <Card className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
          <CardContent className="py-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span className="text-sm text-amber-800 dark:text-amber-200">
              Complete your business info to get better AI-generated content
            </span>
          </CardContent>
        </Card>
      )}

      {/* Basic Business Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Basic Information
          </CardTitle>
          <CardDescription>Tell us about your business</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Business Name *</label>
              <Input
                value={businessInfo.businessName}
                onChange={(e) => updateField('businessName', e.target.value)}
                placeholder="e.g., Acme Corp"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Industry *</label>
              <select
                value={businessInfo.industry}
                onChange={(e) => updateField('industry', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background"
              >
                <option value="">Select industry...</option>
                {INDUSTRIES.map(ind => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Business Type</label>
              <div className="flex gap-2">
                {(['b2b', 'b2c', 'both'] as const).map(type => (
                  <Button
                    key={type}
                    variant={businessInfo.businessType === type ? 'default' : 'outline'}
                    onClick={() => updateField('businessType', type)}
                    className="flex-1"
                  >
                    {type.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Company Size</label>
              <select
                value={businessInfo.companySize}
                onChange={(e) => updateField('companySize', e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background"
              >
                <option value="solo">Solo / Freelancer</option>
                <option value="small">Small (2-10)</option>
                <option value="medium">Medium (11-50)</option>
                <option value="large">Large (51-200)</option>
                <option value="enterprise">Enterprise (200+)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Website</label>
            <Input
              value={businessInfo.website || ''}
              onChange={(e) => updateField('website', e.target.value)}
              placeholder="https://www.example.com"
              type="url"
            />
          </div>
        </CardContent>
      </Card>

      {/* Brand Identity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            Brand Identity
          </CardTitle>
          <CardDescription>Define your brand personality</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Brand Description *</label>
            <textarea
              value={businessInfo.brandDescription}
              onChange={(e) => updateField('brandDescription', e.target.value)}
              placeholder="Describe your brand in 2-3 sentences. What makes you unique? What's your mission?"
              className="w-full px-4 py-3 rounded-lg border border-input bg-background min-h-[100px]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Unique Selling Points</label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newUSP}
                onChange={(e) => setNewUSP(e.target.value)}
                placeholder="e.g., 24/7 Customer Support"
                onKeyDown={(e) => e.key === 'Enter' && handleAddUSP()}
              />
              <Button onClick={handleAddUSP}><Plus className="w-4 h-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {businessInfo.uniqueSellingPoints.map((usp, i) => (
                <Badge key={i} variant="secondary" className="gap-1">
                  {usp}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => removeFromArray('uniqueSellingPoints', usp)} />
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Brand Values</label>
            <div className="flex flex-wrap gap-2">
              {BRAND_VALUES.map(value => (
                <Button
                  key={value}
                  size="sm"
                  variant={businessInfo.brandValues.includes(value) ? 'default' : 'outline'}
                  onClick={() => toggleArrayItem('brandValues', value)}
                >
                  {value}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Visual Style</label>
            <div className="flex gap-2 flex-wrap">
              {(['minimalist', 'bold', 'professional', 'playful', 'luxury', 'modern'] as const).map(style => (
                <Button
                  key={style}
                  variant={businessInfo.visualStyle === style ? 'default' : 'outline'}
                  onClick={() => updateField('visualStyle', style)}
                >
                  {style.charAt(0).toUpperCase() + style.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Brand Colors</label>
            <div className="flex gap-3">
              {COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => {
                    const colors = businessInfo.brandColors || [];
                    if (colors.includes(color)) {
                      updateField('brandColors', colors.filter(c => c !== color));
                    } else if (colors.length < 3) {
                      updateField('brandColors', [...colors, color]);
                    }
                  }}
                  className={cn(
                    "w-10 h-10 rounded-lg transition-all",
                    businessInfo.brandColors?.includes(color) ? "ring-2 ring-offset-2 ring-primary scale-110" : ""
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Select up to 3 brand colors</p>
          </div>
        </CardContent>
      </Card>

      {/* Products & Services */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Products & Services
          </CardTitle>
          <CardDescription>What do you offer?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Main Products/Services</label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newProduct}
                onChange={(e) => setNewProduct(e.target.value)}
                placeholder="e.g., Social Media Management"
                onKeyDown={(e) => e.key === 'Enter' && handleAddProduct()}
              />
              <Button onClick={handleAddProduct}><Plus className="w-4 h-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {businessInfo.mainProducts.map((product, i) => (
                <Badge key={i} variant="secondary" className="gap-1">
                  {product}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => removeFromArray('mainProducts', product)} />
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Price Range</label>
            <div className="flex gap-2">
              {(['budget', 'mid-range', 'premium', 'luxury'] as const).map(range => (
                <Button
                  key={range}
                  variant={businessInfo.priceRange === range ? 'default' : 'outline'}
                  onClick={() => updateField('priceRange', range)}
                  className="flex-1"
                >
                  {range.charAt(0).toUpperCase() + range.slice(1).replace('-', ' ')}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Target Market */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Target Market
          </CardTitle>
          <CardDescription>Who are your customers?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Target Market Description *</label>
            <textarea
              value={businessInfo.targetMarket}
              onChange={(e) => updateField('targetMarket', e.target.value)}
              placeholder="e.g., Small business owners aged 25-45 who want to grow their social media presence"
              className="w-full px-4 py-3 rounded-lg border border-input bg-background min-h-[80px]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Geographic Focus</label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="e.g., United States, Europe"
                onKeyDown={(e) => e.key === 'Enter' && handleAddLocation()}
              />
              <Button onClick={handleAddLocation}><Plus className="w-4 h-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {businessInfo.geographicFocus.map((loc, i) => (
                <Badge key={i} variant="secondary" className="gap-1">
                  {loc}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => removeFromArray('geographicFocus', loc)} />
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Content Preferences
          </CardTitle>
          <CardDescription>How should your content sound?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Preferred Tone</label>
            <div className="flex flex-wrap gap-2">
              {TONES.map(tone => (
                <Button
                  key={tone}
                  size="sm"
                  variant={businessInfo.preferredTone.includes(tone) ? 'default' : 'outline'}
                  onClick={() => toggleArrayItem('preferredTone', tone)}
                >
                  {tone}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Content Goals</label>
            <div className="flex flex-wrap gap-2">
              {CONTENT_GOALS.map(goal => (
                <Button
                  key={goal}
                  size="sm"
                  variant={businessInfo.contentGoals.includes(goal) ? 'default' : 'outline'}
                  onClick={() => toggleArrayItem('contentGoals', goal)}
                >
                  {goal}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end pt-4">
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          size="lg"
          className={cn("gap-2", saved && "bg-green-600 hover:bg-green-700")}
        >
          {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Saved Successfully!' : isSaving ? 'Saving...' : 'Save Business Info'}
        </Button>
      </div>
    </div>
  );
}
