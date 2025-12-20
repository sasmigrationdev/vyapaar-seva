/**
 * useCategoryMatcher Hook
 *
 * Handles category matching with fuzzy search and auto-creation of generic categories.
 * Integrates with existing useCategories and useCreateCategory hooks.
 */

import { useCallback } from 'react';
import { useCategories } from '@/hooks/queries/useFinancial';
import { useCreateCategory } from '@/hooks/mutations/useFinancialMutations';
import {
  fuzzyMatchCategory,
  findTopMatches,
  FuzzyMatchResult,
} from '@/lib/utils/fuzzy-match.utils';
import {
  isGenericCategory,
  VOICE_CONFIG,
  GENERIC_CATEGORIES,
} from '@/constants/VoiceConfig';

export interface CategoryMatchResult {
  categoryId: string | null;
  categoryName: string;
  categoryDescription?: string; // LLM-generated description for new categories
  matchType: 'exact' | 'fuzzy' | 'moderate' | 'synonym' | 'created' | 'none';
  confidence: number;
  suggestions?: Array<{ name: string; confidence: number }>; // Top alternatives with confidence
  wasCreated: boolean;
  needsUserChoice?: boolean; // true for moderate matches (70-75%)
}

export interface UseCategoryMatcherReturn {
  matchCategory: (params: {
    categoryName: string;
    categoryDescription?: string;
    type: 'income' | 'expense';
    organizationId: string;
    createdBy: string;
    autoCreate?: boolean;
  }) => Promise<CategoryMatchResult>;
  isMatching: boolean;
  error: Error | null;
}

/**
 * Hook for category matching and auto-creation
 */
export function useCategoryMatcher(organizationId: string): UseCategoryMatcherReturn {
  // Query existing categories
  const { data: allCategories, refetch: refetchCategories } = useCategories(organizationId);

  // Mutation for creating new categories
  const createCategoryMutation = useCreateCategory(organizationId, {
    onSuccess: () => {
      // Refetch categories after creation
      refetchCategories();
    },
  });

  /**
   * Match category name to existing categories or create new one
   */
  const matchCategory = useCallback(
    async ({
      categoryName,
      categoryDescription,
      type,
      organizationId,
      createdBy,
      autoCreate = true,
    }: {
      categoryName: string;
      categoryDescription?: string;
      type: 'income' | 'expense';
      organizationId: string;
      createdBy: string;
      autoCreate?: boolean;
    }): Promise<CategoryMatchResult> => {
      try {
        console.log('[Category Matcher] Matching:', { categoryName, type, categoryDescription });

        // Filter categories by type
        const categoriesOfType = (allCategories || []).filter((cat) => cat.type === type);
        const categoryNames = categoriesOfType.map((cat) => cat.name);

        // 1. Try fuzzy matching first
        const matchResult = fuzzyMatchCategory(
          categoryName,
          categoryNames,
          VOICE_CONFIG.FUZZY_MATCH_THRESHOLD
        );

        console.log('[Category Matcher] Fuzzy match result:', matchResult);

        // Define moderate match threshold (70-75%)
        const MODERATE_THRESHOLD = 0.70;

        // If exact match found, return it immediately
        if (matchResult.matchType === 'exact' && matchResult.match) {
          const matchedCategory = categoriesOfType.find(
            (cat) => cat.name === matchResult.match
          );

          if (matchedCategory) {
            return {
              categoryId: matchedCategory.id,
              categoryName: matchedCategory.name,
              matchType: 'exact',
              confidence: matchResult.confidence,
              wasCreated: false,
            };
          }
        }

        // If fuzzy match found with high confidence (>75%), return it
        if (matchResult.match && matchResult.confidence >= VOICE_CONFIG.FUZZY_MATCH_THRESHOLD) {
          const matchedCategory = categoriesOfType.find(
            (cat) => cat.name === matchResult.match
          );

          if (matchedCategory) {
            return {
              categoryId: matchedCategory.id,
              categoryName: matchedCategory.name,
              matchType: matchResult.matchType === 'synonym' ? 'synonym' : 'fuzzy',
              confidence: matchResult.confidence,
              wasCreated: false,
            };
          }
        }

        // If moderate match found (70-75%), ask user to choose
        if (matchResult.match && matchResult.confidence >= MODERATE_THRESHOLD) {
          const matchedCategory = categoriesOfType.find(
            (cat) => cat.name === matchResult.match
          );

          if (matchedCategory) {
            // Get top 3 alternatives
            const topMatches = findTopMatches(categoryName, categoryNames, 3, 0.6);
            const suggestions = topMatches.map((m) => ({
              name: m.match!,
              confidence: m.confidence,
            })).filter((s) => s.name);

            return {
              categoryId: matchedCategory.id,
              categoryName: matchedCategory.name,
              categoryDescription,
              matchType: 'moderate',
              confidence: matchResult.confidence,
              suggestions,
              wasCreated: false,
              needsUserChoice: true,
            };
          }
        }

        // 2. Auto-create category if enabled (generic or non-generic)
        if (autoCreate) {
          // Check if it's a generic category
          const isGeneric = isGenericCategory(categoryName, type);

          console.log('[Category Matcher] Is generic:', isGeneric, '- Auto-creating category:', categoryName);

          // Auto-create the category (both generic and LLM-suggested categories)
          const newCategory = await createCategoryMutation.mutateAsync({
            name: categoryName,
            type,
            organizationId,
            createdBy,
            description: categoryDescription, // Use LLM-provided description
            color: type === 'income' ? '#10B981' : '#EF4444', // Green for income, Red for expense
            icon: type === 'income' ? 'trending-up' : 'trending-down',
          });

          return {
            categoryId: newCategory.id,
            categoryName: newCategory.name,
            categoryDescription,
            matchType: 'created',
            confidence: isGeneric ? 0.95 : 0.85, // Higher confidence for generic categories
            wasCreated: true,
          };
        }

        // 3. Find top suggestions for manual selection (when autoCreate is disabled)
        const topMatches = findTopMatches(categoryName, categoryNames, 3, 0.6);
        const suggestions = topMatches.map((m) => ({
          name: m.match!,
          confidence: m.confidence,
        })).filter((s) => s.name);

        console.log('[Category Matcher] Suggestions:', suggestions);

        // If no match and autoCreate disabled, return suggestions for user confirmation
        return {
          categoryId: null,
          categoryName,
          categoryDescription,
          matchType: 'none',
          confidence: 0,
          suggestions,
          wasCreated: false,
        };
      } catch (error: any) {
        console.error('[Category Matcher] Error:', error);
        throw error;
      }
    },
    [allCategories, createCategoryMutation, organizationId]
  );

  return {
    matchCategory,
    isMatching: createCategoryMutation.isPending,
    error: createCategoryMutation.error,
  };
}

/**
 * Get default color for category type
 */
export function getDefaultCategoryColor(type: 'income' | 'expense'): string {
  return type === 'income' ? '#10B981' : '#EF4444';
}

/**
 * Get default icon for category type
 */
export function getDefaultCategoryIcon(type: 'income' | 'expense'): string {
  return type === 'income' ? 'trending-up' : 'trending-down';
}

/**
 * Get all generic categories for a type
 */
export function getGenericCategoryNames(type: 'income' | 'expense'): readonly string[] {
  return GENERIC_CATEGORIES[type];
}
