'use client';

import { useState, useEffect, useCallback } from 'react';
import { BusinessInfo, DEFAULT_BUSINESS_INFO } from '@/types/businessInfo.types';

export function useBusinessInfo() {
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>(DEFAULT_BUSINESS_INFO);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load from Supabase on mount
  useEffect(() => {
    const loadBusinessInfo = async () => {
      try {
        const response = await fetch('/api/workspace/business-settings');
        const result = await response.json();
        
        if (result.success && result.data) {
          // Merge with defaults to ensure arrays are never null
          const data = result.data;
          setBusinessInfo({
            ...DEFAULT_BUSINESS_INFO,
            ...data,
            // Ensure arrays are never null
            uniqueSellingPoints: data.uniqueSellingPoints || [],
            brandValues: data.brandValues || [],
            mainProducts: data.mainProducts || [],
            geographicFocus: data.geographicFocus || [],
            preferredTone: data.preferredTone || [],
            contentGoals: data.contentGoals || [],
            brandColors: data.brandColors || [],
          });
        } else {
          // No settings yet, use defaults
          setBusinessInfo(DEFAULT_BUSINESS_INFO);
        }
      } catch (e) {
        setError('Failed to load business settings');
        // Fall back to defaults on error
        setBusinessInfo(DEFAULT_BUSINESS_INFO);
      } finally {
        setIsLoaded(true);
      }
    };

    loadBusinessInfo();
  }, []);

  // Save to Supabase
  const saveBusinessInfo = useCallback(async (data: BusinessInfo) => {
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/workspace/business-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to save');
      }
      
      // Ensure arrays are never null after saving
      const savedData = result.data;
      setBusinessInfo({
        ...DEFAULT_BUSINESS_INFO,
        ...savedData,
        uniqueSellingPoints: savedData.uniqueSellingPoints || [],
        brandValues: savedData.brandValues || [],
        mainProducts: savedData.mainProducts || [],
        geographicFocus: savedData.geographicFocus || [],
        preferredTone: savedData.preferredTone || [],
        contentGoals: savedData.contentGoals || [],
        brandColors: savedData.brandColors || [],
      });
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save business settings');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Update specific fields
  const updateField = useCallback(<K extends keyof BusinessInfo>(
    field: K,
    value: BusinessInfo[K]
  ) => {
    setBusinessInfo(prev => ({ ...prev, [field]: value }));
  }, []);

  // Add item to array field
  const addToArray = useCallback((field: keyof BusinessInfo, value: string) => {
    setBusinessInfo(prev => {
      const current = prev[field];
      if (Array.isArray(current) && !current.includes(value)) {
        return { ...prev, [field]: [...current, value] };
      }
      return prev;
    });
  }, []);

  // Remove item from array field
  const removeFromArray = useCallback((field: keyof BusinessInfo, value: string) => {
    setBusinessInfo(prev => {
      const current = prev[field];
      if (Array.isArray(current)) {
        return { ...prev, [field]: current.filter(v => v !== value) };
      }
      return prev;
    });
  }, []);

  // Check if business info is complete
  const isComplete = useCallback(() => {
    return !!(
      businessInfo.businessName &&
      businessInfo.industry &&
      businessInfo.brandDescription &&
      businessInfo.targetMarket
    );
  }, [businessInfo]);

  return {
    businessInfo,
    isLoaded,
    isSaving,
    error,
    saveBusinessInfo,
    updateField,
    addToArray,
    removeFromArray,
    isComplete,
  };
}
