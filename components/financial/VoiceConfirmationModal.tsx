import { useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Text } from '@/components/ui/Text';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ExtractedTransactionData, VOICE_CONFIG } from '@/constants/VoiceConfig';
import { getConfidenceLevel } from '@/lib/utils/voice.utils';

/**
 * Category match result from useCategoryMatcher
 */
interface CategoryMatchResult {
  categoryId: string | null;
  categoryName: string;
  categoryDescription?: string;
  matchType: 'exact' | 'fuzzy' | 'moderate' | 'synonym' | 'created' | 'none';
  confidence: number;
  wasCreated: boolean;
  suggestions?: Array<{ name: string; confidence: number }>;
  needsUserChoice?: boolean;
}

/**
 * Props for VoiceConfirmationModal
 */
interface VoiceConfirmationModalProps {
  /**
   * Whether the modal is visible
   */
  visible: boolean;

  /**
   * Callback when modal is closed
   */
  onClose: () => void;

  /**
   * Extracted transaction data
   */
  extractedData: ExtractedTransactionData | null;

  /**
   * Category match result
   */
  categoryMatch: CategoryMatchResult | null;

  /**
   * Transcribed text from voice input
   */
  transcribedText: string | null;

  /**
   * Callback when user confirms the extracted data
   */
  onConfirm: () => void;

  /**
   * Callback when user wants to edit the data
   */
  onEdit: () => void;

  /**
   * Whether the submission is in progress
   */
  isSubmitting?: boolean;

  /**
   * Language used for transcription
   */
  language?: 'en' | 'hi';
}

/**
 * Modal for confirming voice-extracted transaction data
 *
 * Features:
 * - Displays extracted transaction details
 * - Shows confidence levels with color-coded badges
 * - Warns about low-confidence fields
 * - Shows category suggestions if no match found
 * - Displays transcribed text for verification
 * - Allows editing or direct submission
 *
 * @example
 * ```tsx
 * <VoiceConfirmationModal
 *   visible={showConfirmation}
 *   onClose={() => setShowConfirmation(false)}
 *   extractedData={result.extractedData}
 *   categoryMatch={result.categoryMatch}
 *   transcribedText={result.transcribedText}
 *   onConfirm={handleDirectSubmit}
 *   onEdit={handleEdit}
 *   language="en"
 * />
 * ```
 */
export default function VoiceConfirmationModal({
  visible,
  onClose,
  extractedData,
  categoryMatch,
  transcribedText,
  onConfirm,
  onEdit,
  isSubmitting = false,
  language = 'en',
}: VoiceConfirmationModalProps) {
  const [showTranscript, setShowTranscript] = useState(false);
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(0); // For alternative selection

  if (!extractedData || !categoryMatch) {
    return null;
  }

  // Calculate overall confidence
  const dataConfidence = extractedData.confidence;
  const categoryConfidence = categoryMatch.confidence;
  const overallConfidence = Math.min(dataConfidence, categoryConfidence);

  const confidenceInfo = getConfidenceLevel(overallConfidence);

  // Check if there are warnings
  const hasLowConfidence =
    overallConfidence < VOICE_CONFIG.CONFIDENCE_THRESHOLDS.MEDIUM;

  const hasNoCategory = !categoryMatch.categoryId;

  const warnings: string[] = [];

  if (dataConfidence < VOICE_CONFIG.CONFIDENCE_THRESHOLDS.HIGH) {
    warnings.push(
      `Transaction details extracted with ${Math.round(dataConfidence * 100)}% confidence`
    );
  }

  if (categoryConfidence < VOICE_CONFIG.CONFIDENCE_THRESHOLDS.HIGH) {
    if (categoryMatch.matchType === 'none') {
      warnings.push(`No matching category found for "${categoryMatch.categoryName}"`);
    } else if (categoryMatch.matchType === 'fuzzy') {
      warnings.push(
        `Category matched with ${Math.round(categoryConfidence * 100)}% confidence`
      );
    }
  }

  if (categoryMatch.wasCreated) {
    warnings.push(`New category "${categoryMatch.categoryName}" will be created`);
  }

  // Get match type display info
  const getMatchTypeInfo = () => {
    switch (categoryMatch.matchType) {
      case 'exact':
        return { label: 'Exact Match', color: '#10B981', icon: 'check-circle' };
      case 'fuzzy':
        return { label: 'Similar Match', color: '#F59E0B', icon: 'approximately-equal' };
      case 'moderate':
        return { label: 'Moderate Match', color: '#F97316', icon: 'help-circle' };
      case 'synonym':
        return { label: 'Synonym Match', color: '#10B981', icon: 'swap-horizontal' };
      case 'created':
        return { label: 'New Category', color: '#3B82F6', icon: 'plus-circle' };
      case 'none':
        return { label: 'No Match', color: '#EF4444', icon: 'alert-circle' };
      default:
        return { label: 'Unknown', color: '#6B7280', icon: 'help-circle' };
    }
  };

  const matchInfo = getMatchTypeInfo();

  // Get all category options (current + suggestions)
  const categoryOptions = categoryMatch.suggestions && categoryMatch.suggestions.length > 0
    ? [
        { name: categoryMatch.categoryName, confidence: categoryMatch.confidence },
        ...categoryMatch.suggestions,
      ]
    : [{ name: categoryMatch.categoryName, confidence: categoryMatch.confidence }];

  // Format display values
  const formatPaymentMethod = (method: string) => {
    const methods: Record<string, string> = {
      cash: 'Cash',
      bank: 'Bank Transfer',
      upi: 'UPI',
      card: 'Card',
      cheque: 'Cheque',
    };
    return methods[method] || method;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <MaterialCommunityIcons name="microphone-variant" size={24} color="#0891B2" />
              <Text style={styles.title}>Confirm Transaction</Text>
            </View>

            <TouchableOpacity onPress={onClose} disabled={isSubmitting}>
              <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Confidence Badge */}
          <View
            style={[
              styles.confidenceBadge,
              { backgroundColor: `${confidenceInfo.color}20` },
            ]}
          >
            <MaterialCommunityIcons
              name={
                confidenceInfo.level === 'high'
                  ? 'check-circle'
                  : confidenceInfo.level === 'medium'
                  ? 'alert-circle'
                  : 'alert-octagon'
              }
              size={20}
              color={confidenceInfo.color}
            />
            <Text style={[styles.confidenceText, { color: confidenceInfo.color }]}>
              {confidenceInfo.label}
            </Text>
            <Text style={styles.confidencePercentage}>
              {Math.round(overallConfidence * 100)}%
            </Text>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Warnings */}
            {warnings.length > 0 && (
              <View style={styles.warningsContainer}>
                {warnings.map((warning, index) => (
                  <View key={index} style={styles.warningItem}>
                    <MaterialCommunityIcons
                      name="information"
                      size={16}
                      color="#F59E0B"
                    />
                    <Text style={styles.warningText}>{warning}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Category Match Quality Display */}
            {categoryMatch.categoryId && (
              <View style={styles.categoryMatchContainer}>
                <View style={styles.categoryMatchHeader}>
                  <MaterialCommunityIcons
                    name={matchInfo.icon as any}
                    size={18}
                    color={matchInfo.color}
                  />
                  <Text style={[styles.categoryMatchLabel, { color: matchInfo.color }]}>
                    {matchInfo.label}
                  </Text>
                  <Text style={styles.categoryMatchConfidence}>
                    {Math.round(categoryMatch.confidence * 100)}%
                  </Text>
                </View>
              </View>
            )}

            {/* Category Description (for new categories) */}
            {categoryMatch.categoryDescription && categoryMatch.wasCreated && (
              <View style={styles.categoryDescriptionContainer}>
                <View style={styles.categoryDescriptionHeader}>
                  <MaterialCommunityIcons name="information" size={16} color="#3B82F6" />
                  <Text style={styles.categoryDescriptionLabel}>About this category</Text>
                </View>
                <Text style={styles.categoryDescriptionText}>
                  {categoryMatch.categoryDescription}
                </Text>
              </View>
            )}

            {/* Alternative Categories (for moderate matches) */}
            {categoryMatch.needsUserChoice && categoryOptions.length > 1 && (
              <View style={styles.alternativesContainer}>
                <Text style={styles.alternativesTitle}>
                  Similar categories found. Choose the best match:
                </Text>
                <View style={styles.alternativesList}>
                  {categoryOptions.map((option, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.alternativeItem,
                        selectedCategoryIndex === index && styles.alternativeItemSelected,
                      ]}
                      onPress={() => setSelectedCategoryIndex(index)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.alternativeContent}>
                        <View style={styles.alternativeLeft}>
                          {selectedCategoryIndex === index ? (
                            <MaterialCommunityIcons
                              name="check-circle"
                              size={20}
                              color="#0891B2"
                            />
                          ) : (
                            <View style={styles.radioUnchecked} />
                          )}
                          <Text
                            style={[
                              styles.alternativeText,
                              selectedCategoryIndex === index && styles.alternativeTextSelected,
                            ]}
                          >
                            {option.name}
                          </Text>
                        </View>
                        <View style={styles.alternativeConfidenceBadge}>
                          <Text style={styles.alternativeConfidenceText}>
                            {Math.round(option.confidence * 100)}%
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.alternativesHint}>
                  Or tap "Edit Details" to create a new category
                </Text>
              </View>
            )}

            {/* Category Suggestions (for non-moderate cases) */}
            {!categoryMatch.needsUserChoice && categoryMatch.suggestions && categoryMatch.suggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                <Text style={styles.suggestionsTitle}>Did you mean?</Text>
                <View style={styles.suggestionsList}>
                  {categoryMatch.suggestions.map((suggestion, index) => (
                    <View key={index} style={styles.suggestionChip}>
                      <Text style={styles.suggestionText}>{suggestion.name}</Text>
                      <Text style={styles.suggestionConfidence}>
                        {Math.round(suggestion.confidence * 100)}%
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Transaction Details */}
            <View style={styles.detailsContainer}>
              {/* Type and Amount */}
              <View style={styles.detailRow}>
                <View style={styles.detailLabel}>
                  <MaterialCommunityIcons
                    name={extractedData.type === 'income' ? 'arrow-down' : 'arrow-up'}
                    size={20}
                    color={extractedData.type === 'income' ? '#10B981' : '#EF4444'}
                  />
                  <Text style={styles.detailLabelText}>Type</Text>
                </View>
                <Text
                  style={[
                    styles.detailValue,
                    {
                      color: extractedData.type === 'income' ? '#10B981' : '#EF4444',
                    },
                  ]}
                >
                  {extractedData.type === 'income' ? 'Income' : 'Expense'}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailLabel}>
                  <MaterialCommunityIcons
                    name="currency-inr"
                    size={20}
                    color="#6B7280"
                  />
                  <Text style={styles.detailLabelText}>Amount</Text>
                </View>
                <Text style={styles.detailValueLarge}>₹{extractedData.amount}</Text>
              </View>

              {/* Category */}
              <View style={styles.detailRow}>
                <View style={styles.detailLabel}>
                  <MaterialCommunityIcons name="tag" size={20} color="#6B7280" />
                  <Text style={styles.detailLabelText}>Category</Text>
                </View>
                <View style={styles.categoryValue}>
                  <Text style={styles.detailValue}>{categoryMatch.categoryName}</Text>
                  {categoryMatch.wasCreated && (
                    <View style={styles.newBadge}>
                      <Text style={styles.newBadgeText}>NEW</Text>
                    </View>
                  )}
                  {categoryMatch.matchType === 'fuzzy' && (
                    <View style={styles.fuzzyBadge}>
                      <Text style={styles.fuzzyBadgeText}>~</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Date */}
              <View style={styles.detailRow}>
                <View style={styles.detailLabel}>
                  <MaterialCommunityIcons name="calendar" size={20} color="#6B7280" />
                  <Text style={styles.detailLabelText}>Date</Text>
                </View>
                <Text style={styles.detailValue}>
                  {formatDate(extractedData.transaction_date)}
                </Text>
              </View>

              {/* Payment Method */}
              <View style={styles.detailRow}>
                <View style={styles.detailLabel}>
                  <MaterialCommunityIcons name="wallet" size={20} color="#6B7280" />
                  <Text style={styles.detailLabelText}>Payment</Text>
                </View>
                <Text style={styles.detailValue}>
                  {formatPaymentMethod(extractedData.payment_method)}
                </Text>
              </View>

              {/* Description */}
              {extractedData.description && (
                <View style={styles.detailRow}>
                  <View style={styles.detailLabel}>
                    <MaterialCommunityIcons name="text" size={20} color="#6B7280" />
                    <Text style={styles.detailLabelText}>Description</Text>
                  </View>
                  <Text style={styles.detailValue}>{extractedData.description}</Text>
                </View>
              )}

              {/* Reference Number */}
              {extractedData.reference_number && (
                <View style={styles.detailRow}>
                  <View style={styles.detailLabel}>
                    <MaterialCommunityIcons name="pound" size={20} color="#6B7280" />
                    <Text style={styles.detailLabelText}>Reference</Text>
                  </View>
                  <Text style={styles.detailValue}>{extractedData.reference_number}</Text>
                </View>
              )}

              {/* Notes */}
              {extractedData.notes && (
                <View style={styles.detailRow}>
                  <View style={styles.detailLabel}>
                    <MaterialCommunityIcons name="note-text" size={20} color="#6B7280" />
                    <Text style={styles.detailLabelText}>Notes</Text>
                  </View>
                  <Text style={styles.detailValue}>{extractedData.notes}</Text>
                </View>
              )}
            </View>

            {/* Transcribed Text */}
            {transcribedText && (
              <View style={styles.transcriptContainer}>
                <TouchableOpacity
                  style={styles.transcriptHeader}
                  onPress={() => setShowTranscript(!showTranscript)}
                >
                  <MaterialCommunityIcons
                    name={showTranscript ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#6B7280"
                  />
                  <Text style={styles.transcriptTitle}>Transcribed Text</Text>
                </TouchableOpacity>

                {showTranscript && (
                  <View style={styles.transcriptContent}>
                    <Text style={styles.transcriptText}>{transcribedText}</Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={onEdit}
              disabled={isSubmitting}
            >
              <MaterialCommunityIcons name="pencil" size={20} color="#0891B2" />
              <Text style={styles.editButtonText}>Edit Details</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.confirmButton]}
              onPress={onConfirm}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MaterialCommunityIcons name="check" size={20} color="#FFFFFF" />
                  <Text style={styles.confirmButtonText}>Confirm</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 32,
    paddingHorizontal: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  confidenceText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  confidencePercentage: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },
  scrollView: {
    maxHeight: 400,
  },
  warningsContainer: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  suggestionsContainer: {
    marginBottom: 16,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  suggestionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#0891B2',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  suggestionText: {
    fontSize: 13,
    color: '#0891B2',
    fontWeight: '500',
  },
  suggestionConfidence: {
    fontSize: 11,
    color: '#0891B2',
    fontWeight: '600',
    opacity: 0.7,
  },
  categoryMatchContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryMatchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryMatchLabel: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  categoryMatchConfidence: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },
  categoryDescriptionContainer: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  categoryDescriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  categoryDescriptionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E40AF',
  },
  categoryDescriptionText: {
    fontSize: 13,
    color: '#1E3A8A',
    lineHeight: 18,
  },
  alternativesContainer: {
    backgroundColor: '#FFF7ED',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  alternativesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9A3412',
    marginBottom: 12,
  },
  alternativesList: {
    gap: 8,
    marginBottom: 8,
  },
  alternativeItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 2,
    borderColor: '#FED7AA',
  },
  alternativeItemSelected: {
    borderColor: '#0891B2',
    backgroundColor: '#F0F9FF',
  },
  alternativeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  alternativeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  radioUnchecked: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
  },
  alternativeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
  },
  alternativeTextSelected: {
    color: '#0891B2',
    fontWeight: '600',
  },
  alternativeConfidenceBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  alternativeConfidenceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  alternativesHint: {
    fontSize: 12,
    color: '#92400E',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  detailsContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  detailLabelText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
  },
  detailValueLarge: {
    fontSize: 20,
    color: '#1F2937',
    fontWeight: '700',
  },
  categoryValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    justifyContent: 'flex-end',
  },
  newBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  fuzzyBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  fuzzyBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  transcriptContainer: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 16,
  },
  transcriptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  transcriptTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  transcriptContent: {
    marginTop: 12,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
  },
  transcriptText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 6,
  },
  editButton: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#0891B2',
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0891B2',
  },
  confirmButton: {
    backgroundColor: '#0891B2',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
