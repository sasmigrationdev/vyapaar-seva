/**
 * Voice Input Feature Configuration
 *
 * Contains generic category lists, category synonyms for matching,
 * and voice input settings.
 */

/**
 * Generic Income Categories
 * These categories will be automatically created if extracted from voice input
 * and don't exist in the database.
 */
export const GENERIC_INCOME_CATEGORIES = [
  'Client Payments',
  'Consulting Revenue',
  'Product Sales',
  'Service Revenue',
  'Interest Income',
  'Other Income',
  'Commission Income',
  'Rental Income',
  'Investment Returns',
  'Refunds',
] as const;

/**
 * Generic Expense Categories
 * These categories will be automatically created if extracted from voice input
 * and don't exist in the database.
 */
export const GENERIC_EXPENSE_CATEGORIES = [
  'Office Rent',
  'Utilities',
  'Office Supplies',
  'Salary Payments',
  'Travel & Transportation',
  'Marketing & Advertising',
  'Insurance',
  'Maintenance & Repairs',
  'Professional Fees',
  'Bank Charges',
  'Miscellaneous Expenses',
  'Equipment Purchase',
  'Software Subscriptions',
  'Telephone & Internet',
  'Fuel Expenses',
  'Meal & Entertainment',
  'Training & Development',
  'Legal Fees',
  'Accounting Fees',
  'Taxes & Licenses',
] as const;

/**
 * All generic categories combined
 */
export const GENERIC_CATEGORIES = {
  income: GENERIC_INCOME_CATEGORIES,
  expense: GENERIC_EXPENSE_CATEGORIES,
} as const;

/**
 * Category Synonyms and Variations
 * Maps common variations to standard category names for fuzzy matching.
 */
export const CATEGORY_SYNONYMS: Record<string, string[]> = {
  // Income Synonyms
  'Client Payments': [
    'client payment',
    'payment from client',
    'customer payment',
    'client invoice',
    'project payment',
  ],
  'Consulting Revenue': [
    'consulting fee',
    'consultation',
    'advisory fee',
    'consulting income',
  ],
  'Product Sales': [
    'product sale',
    'sales revenue',
    'goods sold',
    'merchandise sale',
  ],
  'Service Revenue': [
    'service fee',
    'service income',
    'service charge',
  ],
  'Interest Income': [
    'interest earned',
    'bank interest',
    'interest payment',
  ],
  'Commission Income': [
    'commission',
    'broker commission',
    'sales commission',
  ],
  'Rental Income': [
    'rent received',
    'property rent',
    'rental payment',
  ],

  // Expense Synonyms
  'Office Rent': [
    'rent',
    'office space',
    'building rent',
    'workspace rent',
    'premises rent',
  ],
  'Utilities': [
    'electricity',
    'water',
    'internet',
    'phone bill',
    'electricity bill',
    'water bill',
    'utility bill',
    'power',
  ],
  'Office Supplies': [
    'stationery',
    'office items',
    'supplies',
    'office equipment',
    'stationary',
  ],
  'Salary Payments': [
    'salary',
    'wages',
    'employee salary',
    'staff salary',
    'payroll',
    'staff payment',
  ],
  'Travel & Transportation': [
    'travel',
    'transportation',
    'travel expense',
    'transport',
    'cab fare',
    'taxi',
    'uber',
    'ola',
    'flight',
    'train',
  ],
  'Marketing & Advertising': [
    'marketing',
    'advertising',
    'ads',
    'promotion',
    'advertisement',
    'social media ads',
  ],
  'Insurance': [
    'insurance premium',
    'insurance payment',
    'policy premium',
  ],
  'Maintenance & Repairs': [
    'maintenance',
    'repair',
    'fixing',
    'servicing',
  ],
  'Professional Fees': [
    'professional fee',
    'consultant fee',
    'expert fee',
  ],
  'Bank Charges': [
    'bank charge',
    'banking fee',
    'bank fees',
    'transaction charge',
  ],
  'Miscellaneous Expenses': [
    'miscellaneous',
    'misc',
    'other expense',
    'other',
  ],
  'Equipment Purchase': [
    'equipment',
    'machinery',
    'tools',
    'computer',
    'laptop',
    'printer',
  ],
  'Software Subscriptions': [
    'software',
    'subscription',
    'saas',
    'app subscription',
    'cloud service',
  ],
  'Telephone & Internet': [
    'phone bill',
    'internet bill',
    'mobile bill',
    'broadband',
  ],
  'Fuel Expenses': [
    'fuel',
    'petrol',
    'diesel',
    'gas',
  ],
  'Meal & Entertainment': [
    'meals',
    'food',
    'lunch',
    'dinner',
    'entertainment',
    'client dinner',
  ],
  'Training & Development': [
    'training',
    'course',
    'education',
    'workshop',
    'seminar',
  ],
  'Legal Fees': [
    'legal',
    'lawyer',
    'attorney',
    'legal consultation',
  ],
  'Accounting Fees': [
    'accounting',
    'accountant',
    'bookkeeping',
    'ca fees',
  ],
  'Taxes & Licenses': [
    'tax',
    'gst',
    'license',
    'permit',
    'registration',
  ],
};

/**
 * Voice Input Settings
 */
export const VOICE_CONFIG = {
  // Maximum recording duration in milliseconds (5 minutes)
  MAX_RECORDING_DURATION: 5 * 60 * 1000,

  // Minimum recording duration in milliseconds (1 second)
  MIN_RECORDING_DURATION: 1000,

  // Audio quality settings
  AUDIO_SETTINGS: {
    android: {
      extension: '.m4a',
      outputFormat: 'mpeg4',
      audioEncoder: 'aac',
      sampleRate: 16000,
      numberOfChannels: 1,
      bitRate: 64000,
    },
    ios: {
      extension: '.m4a',
      outputFormat: 'm4a',
      audioQuality: 'medium',
      sampleRate: 16000,
      numberOfChannels: 1,
      bitRate: 64000,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
    web: {
      extension: '.webm',
      mimeType: 'audio/webm',
    },
  },

  // Confidence thresholds
  CONFIDENCE_THRESHOLDS: {
    HIGH: 0.9, // Auto-submit eligible
    MEDIUM: 0.7, // Show with warning
    LOW: 0.5, // Reject with error
  },

  // Fuzzy matching threshold (0-1 scale, 1 = exact match)
  FUZZY_MATCH_THRESHOLD: 0.75,

  // Supported languages
  LANGUAGES: {
    en: {
      code: 'en',
      name: 'English',
      flag: '🇬🇧',
      label: 'English',
    },
    hi: {
      code: 'hi',
      name: 'Hindi',
      flag: '🇮🇳',
      label: 'हिंदी',
    },
  },

  // Default language
  DEFAULT_LANGUAGE: 'en' as const,
} as const;

/**
 * Check if a category name is a generic category
 */
export function isGenericCategory(categoryName: string, type: 'income' | 'expense'): boolean {
  const normalizedName = categoryName.toLowerCase().trim();
  const categories = GENERIC_CATEGORIES[type];

  return categories.some((cat) => cat.toLowerCase() === normalizedName);
}

/**
 * Get all generic category names for a type
 */
export function getGenericCategories(type: 'income' | 'expense'): readonly string[] {
  return GENERIC_CATEGORIES[type];
}

/**
 * Get synonyms for a category name
 */
export function getCategorySynonyms(categoryName: string): string[] {
  return CATEGORY_SYNONYMS[categoryName] || [];
}

/**
 * Type definitions for extracted transaction data
 */
export interface ExtractedTransactionData {
  type: 'income' | 'expense';
  amount: number;
  category_name: string;
  category_description?: string; // LLM-generated description for new categories
  transaction_date: string; // ISO date string
  description?: string;
  notes?: string;
  payment_method: 'cash' | 'bank' | 'upi' | 'card' | 'cheque';
  reference_number?: string;
  confidence: number; // 0-1 scale
}

/**
 * Voice recording state
 */
export interface VoiceRecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number; // milliseconds
  audioUri: string | null;
}

/**
 * Voice processing state
 */
export type VoiceProcessingStage =
  | 'idle'
  | 'transcribing'
  | 'extracting'
  | 'matching_category'
  | 'complete'
  | 'error';

export interface VoiceProcessingState {
  stage: VoiceProcessingStage;
  progress: number; // 0-100
  error: string | null;
}
