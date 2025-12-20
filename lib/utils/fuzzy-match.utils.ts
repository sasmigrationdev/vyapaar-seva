/**
 * Fuzzy Matching Utilities for Category Name Matching
 *
 * Implements Levenshtein distance algorithm and fuzzy matching
 * to find the best match for extracted category names.
 */

import { CATEGORY_SYNONYMS } from '@/constants/VoiceConfig';

/**
 * Calculate Levenshtein distance between two strings
 * (minimum number of edits needed to transform one string into another)
 *
 * @param str1 - First string
 * @param str2 - Second string
 * @returns Distance score (0 = identical, higher = more different)
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;

  // Create 2D array for dynamic programming
  const matrix: number[][] = Array.from({ length: len1 + 1 }, () =>
    Array(len2 + 1).fill(0)
  );

  // Initialize first column and row
  for (let i = 0; i <= len1; i++) {
    matrix[i][0] = i;
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculate similarity score between two strings (0-1 scale)
 * 1 = identical, 0 = completely different
 *
 * @param str1 - First string
 * @param str2 - Second string
 * @returns Similarity score (0-1)
 */
export function calculateSimilarity(str1: string, str2: string): number {
  // Normalize strings (lowercase, trim)
  const normalized1 = str1.toLowerCase().trim();
  const normalized2 = str2.toLowerCase().trim();

  // Exact match
  if (normalized1 === normalized2) {
    return 1.0;
  }

  // Calculate Levenshtein distance
  const distance = levenshteinDistance(normalized1, normalized2);
  const maxLength = Math.max(normalized1.length, normalized2.length);

  // Convert distance to similarity score
  const similarity = 1 - distance / maxLength;

  return Math.max(0, similarity); // Ensure non-negative
}

/**
 * Match result interface
 */
export interface FuzzyMatchResult {
  match: string | null; // Matched category name
  similarity: number; // Similarity score (0-1)
  matchType: 'exact' | 'fuzzy' | 'synonym' | 'none';
  confidence: number; // Overall confidence (0-1)
}

/**
 * Find the best fuzzy match for a category name from a list of available categories
 *
 * @param searchTerm - Category name to search for
 * @param availableCategories - List of available category names
 * @param threshold - Minimum similarity threshold (default: 0.75)
 * @returns Match result with best match and confidence
 */
export function fuzzyMatchCategory(
  searchTerm: string,
  availableCategories: string[],
  threshold: number = 0.75
): FuzzyMatchResult {
  if (!searchTerm || !availableCategories || availableCategories.length === 0) {
    return {
      match: null,
      similarity: 0,
      matchType: 'none',
      confidence: 0,
    };
  }

  const normalizedSearch = searchTerm.toLowerCase().trim();
  let bestMatch: FuzzyMatchResult = {
    match: null,
    similarity: 0,
    matchType: 'none',
    confidence: 0,
  };

  // 1. Try exact match first
  for (const category of availableCategories) {
    if (category.toLowerCase().trim() === normalizedSearch) {
      return {
        match: category,
        similarity: 1.0,
        matchType: 'exact',
        confidence: 1.0,
      };
    }
  }

  // 2. Try synonym matching
  for (const [categoryName, synonyms] of Object.entries(CATEGORY_SYNONYMS)) {
    // Check if this category exists in available categories
    const availableCategory = availableCategories.find(
      (cat) => cat.toLowerCase().trim() === categoryName.toLowerCase().trim()
    );

    if (availableCategory) {
      // Check if search term matches any synonym
      for (const synonym of synonyms) {
        const synonymSimilarity = calculateSimilarity(normalizedSearch, synonym);
        if (synonymSimilarity > bestMatch.similarity && synonymSimilarity >= threshold) {
          bestMatch = {
            match: availableCategory,
            similarity: synonymSimilarity,
            matchType: 'synonym',
            confidence: synonymSimilarity * 0.95, // Slightly lower confidence for synonym matches
          };
        }
      }
    }
  }

  // Return if synonym match found
  if (bestMatch.match) {
    return bestMatch;
  }

  // 3. Try fuzzy matching
  for (const category of availableCategories) {
    const similarity = calculateSimilarity(normalizedSearch, category);

    if (similarity > bestMatch.similarity && similarity >= threshold) {
      bestMatch = {
        match: category,
        similarity,
        matchType: 'fuzzy',
        confidence: similarity * 0.9, // Slightly lower confidence for fuzzy matches
      };
    }
  }

  return bestMatch;
}

/**
 * Find multiple potential matches (for showing alternatives to the user)
 *
 * @param searchTerm - Category name to search for
 * @param availableCategories - List of available category names
 * @param topN - Number of top matches to return (default: 3)
 * @param threshold - Minimum similarity threshold (default: 0.6)
 * @returns Array of top match results, sorted by confidence
 */
export function findTopMatches(
  searchTerm: string,
  availableCategories: string[],
  topN: number = 3,
  threshold: number = 0.6
): FuzzyMatchResult[] {
  if (!searchTerm || !availableCategories || availableCategories.length === 0) {
    return [];
  }

  const normalizedSearch = searchTerm.toLowerCase().trim();
  const matches: FuzzyMatchResult[] = [];

  // Calculate similarity for all categories
  for (const category of availableCategories) {
    const similarity = calculateSimilarity(normalizedSearch, category);

    if (similarity >= threshold) {
      matches.push({
        match: category,
        similarity,
        matchType: similarity === 1.0 ? 'exact' : 'fuzzy',
        confidence: similarity,
      });
    }
  }

  // Sort by similarity (descending) and return top N
  return matches.sort((a, b) => b.similarity - a.similarity).slice(0, topN);
}

/**
 * Check if search term contains any synonym of a category
 *
 * @param searchTerm - Search term to check
 * @param categoryName - Category name to check synonyms for
 * @returns True if search term contains a synonym
 */
export function containsSynonym(searchTerm: string, categoryName: string): boolean {
  const normalizedSearch = searchTerm.toLowerCase().trim();
  const synonyms = CATEGORY_SYNONYMS[categoryName] || [];

  return synonyms.some((synonym) => {
    const normalizedSynonym = synonym.toLowerCase().trim();
    return (
      normalizedSearch.includes(normalizedSynonym) ||
      normalizedSynonym.includes(normalizedSearch)
    );
  });
}

/**
 * Normalize category name for comparison
 * (removes special characters, extra spaces, converts to lowercase)
 *
 * @param categoryName - Category name to normalize
 * @returns Normalized category name
 */
export function normalizeCategoryName(categoryName: string): string {
  return categoryName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' '); // Collapse multiple spaces
}
