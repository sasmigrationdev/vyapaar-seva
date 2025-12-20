import { useState, useCallback } from 'react';
import { useCategoryMatcher } from './useCategoryMatcher';
import { useCategories } from '@/hooks/queries/useFinancial';
import { validateAudioFile } from '@/lib/utils/voice.utils';
import { ExtractedTransactionData, VOICE_CONFIG } from '@/constants/VoiceConfig';
import { transcribeAudio, extractTransactionData } from '@/lib/services/groq.service';

/**
 * State for voice transaction extraction
 */
interface VoiceTransactionExtractionState {
  isTranscribing: boolean;
  isExtracting: boolean;
  isLoading: boolean;
  transcribedText: string | null;
  extractedData: ExtractedTransactionData | null;
  error: string | null;
}

/**
 * Parameters for extraction
 */
interface ExtractTransactionParams {
  audioUri: string;
  language: 'en' | 'hi';
  organizationId: string;
  createdBy: string;
  autoCreateCategory?: boolean;
}

/**
 * Result of extraction with category matching
 */
interface ExtractionResult {
  extractedData: ExtractedTransactionData;
  categoryMatch: {
    categoryId: string | null;
    categoryName: string;
    categoryDescription?: string;
    matchType: 'exact' | 'fuzzy' | 'moderate' | 'synonym' | 'created' | 'none';
    confidence: number;
    wasCreated: boolean;
    suggestions?: Array<{ name: string; confidence: number }>;
    needsUserChoice?: boolean;
  };
  transcribedText: string;
}

/**
 * Return type for the hook
 */
interface UseVoiceTransactionExtractionReturn {
  state: VoiceTransactionExtractionState;
  extractTransaction: (params: ExtractTransactionParams) => Promise<ExtractionResult | null>;
  reset: () => void;
}

/**
 * Hook to extract transaction data from voice input
 *
 * This hook orchestrates the complete voice-to-transaction pipeline:
 * 1. Validates audio file
 * 2. Transcribes audio using Groq Whisper (via /api/voice/transcribe)
 * 3. Extracts structured transaction data using DeepSeek R1 (via /api/voice/extract)
 * 4. Matches/creates categories using fuzzy matching
 * 5. Returns complete extraction result ready for form population
 *
 * @param organizationId - Organization ID for category matching
 *
 * @example
 * ```typescript
 * const { state, extractTransaction, reset } = useVoiceTransactionExtraction(orgId);
 *
 * const result = await extractTransaction({
 *   audioUri: 'file:///path/to/recording.m4a',
 *   language: 'en',
 *   organizationId: 'org-123',
 *   createdBy: 'user-456',
 *   autoCreateCategory: true,
 * });
 *
 * if (result) {
 *   console.log('Transcribed:', result.transcribedText);
 *   console.log('Amount:', result.extractedData.amount);
 *   console.log('Category:', result.categoryMatch.categoryName);
 *   console.log('Confidence:', result.extractedData.confidence);
 * }
 * ```
 */
export function useVoiceTransactionExtraction(
  organizationId: string
): UseVoiceTransactionExtractionReturn {
  const [state, setState] = useState<VoiceTransactionExtractionState>({
    isTranscribing: false,
    isExtracting: false,
    isLoading: false,
    transcribedText: null,
    extractedData: null,
    error: null,
  });

  const { matchCategory } = useCategoryMatcher(organizationId);
  const { data: allCategories } = useCategories(organizationId);

  /**
   * Reset state to initial values
   */
  const reset = useCallback(() => {
    setState({
      isTranscribing: false,
      isExtracting: false,
      isLoading: false,
      transcribedText: null,
      extractedData: null,
      error: null,
    });
  }, []);

  /**
   * Extract transaction from audio file
   */
  const extractTransaction = useCallback(
    async ({
      audioUri,
      language,
      organizationId,
      createdBy,
      autoCreateCategory = true,
    }: ExtractTransactionParams): Promise<ExtractionResult | null> => {
      try {
        // Reset previous state
        setState(prev => ({
          ...prev,
          isLoading: true,
          isTranscribing: true,
          error: null,
          transcribedText: null,
          extractedData: null,
        }));

        // Step 1: Validate audio file
        const validation = await validateAudioFile(audioUri, 25);
        if (!validation.valid) {
          throw new Error(validation.error || 'Invalid audio file');
        }

        // Step 2: Transcribe audio using Groq Whisper (direct API call)
        console.log('[Voice Extraction] Transcribing audio file:', audioUri);

        const transcriptionResult = await transcribeAudio(audioUri, language);
        const transcribedText = transcriptionResult.text;

        console.log('[Voice Extraction] Transcription complete:', transcribedText.substring(0, 100));

        setState(prev => ({
          ...prev,
          isTranscribing: false,
          isExtracting: true,
          transcribedText,
        }));

        // Step 3: Extract structured data using Groq (direct API call)
        // Pass existing categories for better extraction and matching
        const categoryNames = (allCategories || []).map((cat) => cat.name);

        console.log('[Voice Extraction] Calling Groq extraction API with', categoryNames.length, 'categories');

        const extractedData = (await extractTransactionData(
          transcribedText,
          categoryNames,
          language
        )) as ExtractedTransactionData;

        setState(prev => ({
          ...prev,
          isExtracting: false,
          extractedData,
        }));

        // Step 4: Match or create category
        const categoryMatch = await matchCategory({
          categoryName: extractedData.category_name,
          categoryDescription: extractedData.category_description,
          type: extractedData.type,
          organizationId,
          createdBy,
          autoCreate: autoCreateCategory,
        });

        // Step 5: Return complete result
        setState(prev => ({
          ...prev,
          isLoading: false,
        }));

        return {
          extractedData,
          categoryMatch,
          transcribedText,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

        setState(prev => ({
          ...prev,
          isTranscribing: false,
          isExtracting: false,
          isLoading: false,
          error: errorMessage,
        }));

        console.error('[useVoiceTransactionExtraction] Error:', error);
        return null;
      }
    },
    [matchCategory]
  );

  return {
    state,
    extractTransaction,
    reset,
  };
}

/**
 * Helper to check if extraction result has low confidence
 */
export function hasLowConfidence(result: ExtractionResult): boolean {
  return (
    result.extractedData.confidence < VOICE_CONFIG.CONFIDENCE_THRESHOLDS.MEDIUM ||
    result.categoryMatch.confidence < VOICE_CONFIG.CONFIDENCE_THRESHOLDS.MEDIUM
  );
}

/**
 * Helper to get warnings for low confidence fields
 */
export function getConfidenceWarnings(result: ExtractionResult): string[] {
  const warnings: string[] = [];

  if (result.extractedData.confidence < VOICE_CONFIG.CONFIDENCE_THRESHOLDS.HIGH) {
    warnings.push(
      `Transaction details have ${Math.round(result.extractedData.confidence * 100)}% confidence`
    );
  }

  if (result.categoryMatch.confidence < VOICE_CONFIG.CONFIDENCE_THRESHOLDS.HIGH) {
    if (result.categoryMatch.matchType === 'none') {
      warnings.push(`No matching category found for "${result.categoryMatch.categoryName}"`);
    } else if (result.categoryMatch.matchType === 'fuzzy') {
      warnings.push(
        `Category matched with ${Math.round(result.categoryMatch.confidence * 100)}% confidence`
      );
    }
  }

  if (result.categoryMatch.suggestions && result.categoryMatch.suggestions.length > 0) {
    warnings.push(
      `Did you mean: ${result.categoryMatch.suggestions.join(', ')}?`
    );
  }

  return warnings;
}

/**
 * Helper to format extraction result for form population
 */
export function formatForTransactionForm(result: ExtractionResult) {
  return {
    type: result.extractedData.type,
    amount: result.extractedData.amount.toString(),
    categoryId: result.categoryMatch.categoryId || undefined,
    categoryName: result.categoryMatch.categoryName,
    transactionDate: result.extractedData.transaction_date,
    description: result.extractedData.description || '',
    notes: result.extractedData.notes || '',
    paymentMethod: result.extractedData.payment_method,
    referenceNumber: result.extractedData.reference_number || '',
    // Metadata for debugging/tracking
    _voiceInput: {
      transcribedText: result.transcribedText,
      confidence: result.extractedData.confidence,
      categoryMatchType: result.categoryMatch.matchType,
      categoryWasCreated: result.categoryMatch.wasCreated,
    },
  };
}
