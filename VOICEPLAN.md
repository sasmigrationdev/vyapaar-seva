# Voice Input Feature Plan for Financial Transactions

## Overview
Add voice capture capability to financial transaction entry using Groq's latest AI models for speech-to-text transcription and intelligent data extraction.

**Related Documentation:** See [CASHPLAN.md](./CASHPLAN.md) for database schema and transaction structure.

---

## Technology Stack (2025 Latest)

### 1. **Groq Whisper Large v3 Turbo** (Speech-to-Text)
- **Model**: `whisper-large-v3-turbo`
- **Performance**: 216x real-time speed
- **Accuracy**: 10.3% Word Error Rate
- **Pricing**: $0.04 per hour transcribed
- **Max File Size**: 100MB (paid tier), 25MB (free tier)
- **API**: OpenAI-compatible endpoints

### 2. **DeepSeek R1 Distill Llama 70B** (Structured Extraction)
- **Model**: `deepseek-r1-distill-llama-70b`
- **Context**: 128k tokens
- **Features**: Structured Outputs with JSON Schema enforcement
- **Performance**: Top-tier reasoning (94.5% on MATH-500)
- **Alternative**: `llama-3.3-70b-versatile` (faster, good for simple extraction)

### 3. **React Native Audio**
- **Library**: `expo-av` (built-in with Expo)
- **Format**: WAV or M4A
- **Recording**: Real-time audio capture
- **Permissions**: Microphone access

---

## User Flow

```
1. User taps 🎤 mic button
   ↓
2. Recording starts (visual feedback: waveform animation)
   ↓
3. User speaks: "Paid 5000 rupees for office rent today via UPI"
   ↓
4. User taps stop button
   ↓
5. Audio sent to Groq Whisper API → Transcription
   ↓
6. Transcription sent to Groq LLM → Structured JSON extraction
   ↓
7. Form auto-filled with extracted data:
   - Type: expense
   - Amount: 5000
   - Category: Office Rent
   - Date: today's date
   - Payment Method: UPI
   - Description: "Paid for office rent"
   ↓
8. User reviews and confirms/edits
   ↓
9. Transaction saved to database using existing mutation
```

---

## Database Schema Mapping

**Reference**: See [CASHPLAN.md - Database Schema](./CASHPLAN.md#database-schema)

The voice extraction must match the `financial_transactions` table structure with these fields:

**Required fields:**
- `type`: 'income' or 'expense' (extracted from context)
- `amount`: Number (extracted from voice)
- `category_id`: String (matched from available categories)

**Optional fields:**
- `transaction_date`: ISO date string (default: today)
- `description`: Brief description
- `notes`: Additional details
- `payment_method`: 'cash', 'bank', 'upi', 'card', or 'cheque'
- `reference_number`: Transaction ID/reference

**Auto-filled by system:**
- `organization_id`: From user context
- `created_by`: Current HR user ID

---

## Implementation Architecture

### File Structure

```
/lib
  /api
    /groq
      /client.ts                    # Groq API client setup
      /stt.ts                       # Speech-to-text functions
      /extraction.ts                # Structured data extraction
      /schemas.ts                   # JSON schemas for extraction
  /utils
    /voice.utils.ts                 # Audio processing utilities

/hooks
  /voice
    /useVoiceCapture.ts             # Audio recording hook
    /useVoiceTranscription.ts       # STT hook
    /useVoiceExtraction.ts          # Data extraction hook

/components
  /financial
    /VoiceCaptureButton.tsx         # Main mic button component
    /VoiceRecordingModal.tsx        # Recording UI with animation
    /VoiceConfirmationModal.tsx     # Review extracted data
    /WaveformAnimation.tsx          # Visual feedback during recording

/constants
  /VoiceConfig.ts                   # Voice feature configuration
```

---

## Implementation Approach

### 1. Environment Variables

```env
# .env
EXPO_PUBLIC_GROQ_API_KEY=gsk_your_groq_api_key_here
```

### 2. Groq Client Setup (`lib/api/groq/client.ts`)

```typescript
/**
 * Groq API Client
 * Handles authentication and base configuration for Groq API calls
 */

const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

if (!GROQ_API_KEY) {
  console.warn('⚠️ GROQ_API_KEY not found in environment variables');
}

export const groqConfig = {
  apiKey: GROQ_API_KEY,
  baseUrl: GROQ_BASE_URL,
  headers: {
    'Authorization': `Bearer ${GROQ_API_KEY}`,
    'Content-Type': 'application/json',
  },
};

/**
 * Check if Groq API is configured
 */
export const isGroqConfigured = (): boolean => {
  return !!GROQ_API_KEY;
};
```

### 3. JSON Schema for Extraction (`lib/api/groq/schemas.ts`)

```typescript
/**
 * JSON Schema for financial transaction extraction
 * Ensures Groq LLM returns data matching our database schema
 */

export const transactionExtractionSchema = {
  name: "financial_transaction_extraction",
  strict: true,
  schema: {
    type: "object",
    properties: {
      type: {
        type: "string",
        enum: ["income", "expense"],
        description: "Whether this is income (money received) or expense (money spent)"
      },
      amount: {
        type: "number",
        description: "The monetary amount (positive number only)"
      },
      category_name: {
        type: "string",
        description: "The category name (e.g., 'Office Rent', 'Salary Payments', 'Client Payments', etc.)"
      },
      transaction_date: {
        type: "string",
        description: "ISO date string (YYYY-MM-DD). Use today's date if not specified."
      },
      description: {
        type: "string",
        description: "Brief description of the transaction"
      },
      notes: {
        type: "string",
        description: "Additional notes or details about the transaction"
      },
      payment_method: {
        type: "string",
        enum: ["cash", "bank", "upi", "card", "cheque"],
        description: "Payment method used for this transaction"
      },
      reference_number: {
        type: "string",
        description: "Transaction reference number or ID if mentioned"
      },
      confidence: {
        type: "number",
        description: "Confidence score (0-1) for the extraction accuracy"
      }
    },
    required: ["type", "amount", "category_name", "transaction_date"],
    additionalProperties: false
  }
};

/**
 * Default categories for matching
 * These should be fetched from the database in real implementation
 */
export const defaultCategories = {
  income: [
    "Client Payments",
    "Consulting Revenue",
    "Other Income"
  ],
  expense: [
    "Salary Payments",
    "Office Rent",
    "Utilities",
    "Office Supplies",
    "Travel",
    "Other Expenses"
  ]
};
```

### 4. Speech-to-Text Function (`lib/api/groq/stt.ts`)

```typescript
import { groqConfig } from './client';

/**
 * Transcribe audio using Groq Whisper API
 */
export const transcribeAudio = async (
  audioUri: string,
  language: string = 'en'
): Promise<string> => {
  try {
    // Read audio file
    const audioBlob = await fetch(audioUri).then(res => res.blob());

    // Create form data
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.m4a');
    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('language', language);
    formData.append('response_format', 'json');

    // Call Groq Whisper API
    const response = await fetch(`${groqConfig.baseUrl}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqConfig.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Groq STT Error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw error;
  }
};

/**
 * Transcribe with timestamp segments (for advanced use cases)
 */
export const transcribeWithTimestamps = async (
  audioUri: string,
  language: string = 'en'
): Promise<{
  text: string;
  segments: Array<{
    id: number;
    start: number;
    end: number;
    text: string;
  }>;
}> => {
  try {
    const audioBlob = await fetch(audioUri).then(res => res.blob());

    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.m4a');
    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('language', language);
    formData.append('response_format', 'verbose_json');
    formData.append('timestamp_granularities[]', 'segment');

    const response = await fetch(`${groqConfig.baseUrl}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqConfig.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Groq STT Error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return {
      text: data.text,
      segments: data.segments || [],
    };
  } catch (error) {
    console.error('Error transcribing audio with timestamps:', error);
    throw error;
  }
};
```

### 5. Structured Extraction Function (`lib/api/groq/extraction.ts`)

```typescript
import { groqConfig } from './client';
import { transactionExtractionSchema, defaultCategories } from './schemas';

export interface ExtractedTransaction {
  type: 'income' | 'expense';
  amount: number;
  category_name: string;
  transaction_date: string;
  description?: string;
  notes?: string;
  payment_method?: 'cash' | 'bank' | 'upi' | 'card' | 'cheque';
  reference_number?: string;
  confidence: number;
}

/**
 * Extract structured transaction data from transcribed text using Groq LLM
 */
export const extractTransactionData = async (
  transcription: string,
  availableCategories?: { income: string[]; expense: string[] }
): Promise<ExtractedTransaction> => {
  try {
    const categories = availableCategories || defaultCategories;
    const todayISO = new Date().toISOString().split('T')[0];

    // Build system prompt
    const systemPrompt = `You are a financial transaction data extraction assistant. Extract structured transaction information from user speech.

Available Income Categories: ${categories.income.join(', ')}
Available Expense Categories: ${categories.expense.join(', ')}

Rules:
1. Determine if it's income or expense based on context (words like "paid", "spent" = expense; "received", "earned" = income)
2. Extract the amount (remove currency symbols, convert words to numbers)
3. Match to the closest available category from the lists above
4. Use today's date (${todayISO}) if no specific date is mentioned
5. Identify payment method if mentioned (cash, bank, upi, card, cheque)
6. Extract reference numbers if mentioned
7. Provide a confidence score (0-1) based on how clear the input was
8. Be lenient with Indian English variations and currency mentions (rupees, rs, ₹)

Examples:
- "Paid 5000 rupees for office rent today" → expense, 5000, Office Rent, ${todayISO}, cash
- "Received 50000 from client via UPI reference 12345" → income, 50000, Client Payments, ${todayISO}, upi, ref: 12345
- "Spent two thousand on office supplies yesterday" → expense, 2000, Office Supplies, yesterday's date, cash`;

    // Call Groq LLM with structured output
    const response = await fetch(`${groqConfig.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: groqConfig.headers,
      body: JSON.stringify({
        model: 'deepseek-r1-distill-llama-70b',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: `Extract transaction data from: "${transcription}"`,
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: transactionExtractionSchema,
        },
        temperature: 0.1, // Low temperature for consistent extraction
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Groq Extraction Error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const extractedData = JSON.parse(data.choices[0].message.content);

    return extractedData as ExtractedTransaction;
  } catch (error) {
    console.error('Error extracting transaction data:', error);
    throw error;
  }
};

/**
 * Extract transaction with fallback to simpler model if needed
 */
export const extractTransactionWithFallback = async (
  transcription: string,
  availableCategories?: { income: string[]; expense: string[] }
): Promise<ExtractedTransaction> => {
  try {
    // Try with DeepSeek first (best reasoning)
    return await extractTransactionData(transcription, availableCategories);
  } catch (error) {
    console.warn('DeepSeek extraction failed, falling back to Llama 3.3:', error);

    // Fallback to Llama 3.3 70B (faster, still good)
    try {
      const categories = availableCategories || defaultCategories;
      const todayISO = new Date().toISOString().split('T')[0];

      const response = await fetch(`${groqConfig.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: groqConfig.headers,
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: `Extract financial transaction data. Available categories - Income: ${categories.income.join(', ')}; Expense: ${categories.expense.join(', ')}. Today's date: ${todayISO}`,
            },
            {
              role: 'user',
              content: `Extract: "${transcription}"`,
            },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: transactionExtractionSchema,
          },
          temperature: 0.1,
        }),
      });

      const data = await response.json();
      return JSON.parse(data.choices[0].message.content) as ExtractedTransaction;
    } catch (fallbackError) {
      console.error('Fallback extraction also failed:', fallbackError);
      throw fallbackError;
    }
  }
};
```

### 6. Voice Capture Hook (`hooks/voice/useVoiceCapture.ts`)

```typescript
import { useState, useRef } from 'react';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';

export interface VoiceCaptureState {
  isRecording: boolean;
  isPaused: boolean;
  recordingDuration: number;
  audioUri: string | null;
}

/**
 * Hook for capturing voice audio using Expo AV
 */
export const useVoiceCapture = () => {
  const [state, setState] = useState<VoiceCaptureState>({
    isRecording: false,
    isPaused: false,
    recordingDuration: 0,
    audioUri: null,
  });

  const recordingRef = useRef<Audio.Recording | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Request microphone permissions
   */
  const requestPermissions = async (): Promise<boolean> => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      return granted;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  };

  /**
   * Start recording
   */
  const startRecording = async (): Promise<boolean> => {
    try {
      // Request permissions
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        throw new Error('Microphone permission not granted');
      }

      // Set audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Create recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;

      // Update state
      setState(prev => ({
        ...prev,
        isRecording: true,
        recordingDuration: 0,
      }));

      // Start duration timer
      intervalRef.current = setInterval(() => {
        setState(prev => ({
          ...prev,
          recordingDuration: prev.recordingDuration + 1,
        }));
      }, 1000);

      return true;
    } catch (error) {
      console.error('Error starting recording:', error);
      return false;
    }
  };

  /**
   * Stop recording and get audio URI
   */
  const stopRecording = async (): Promise<string | null> => {
    try {
      if (!recordingRef.current) {
        throw new Error('No active recording');
      }

      // Clear interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // Stop recording
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      // Update state
      setState(prev => ({
        ...prev,
        isRecording: false,
        audioUri: uri,
      }));

      recordingRef.current = null;

      return uri;
    } catch (error) {
      console.error('Error stopping recording:', error);
      return null;
    }
  };

  /**
   * Pause recording
   */
  const pauseRecording = async (): Promise<void> => {
    try {
      if (!recordingRef.current) return;

      await recordingRef.current.pauseAsync();
      setState(prev => ({ ...prev, isPaused: true }));

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    } catch (error) {
      console.error('Error pausing recording:', error);
    }
  };

  /**
   * Resume recording
   */
  const resumeRecording = async (): Promise<void> => {
    try {
      if (!recordingRef.current) return;

      await recordingRef.current.startAsync();
      setState(prev => ({ ...prev, isPaused: false }));

      intervalRef.current = setInterval(() => {
        setState(prev => ({
          ...prev,
          recordingDuration: prev.recordingDuration + 1,
        }));
      }, 1000);
    } catch (error) {
      console.error('Error resuming recording:', error);
    }
  };

  /**
   * Cancel recording
   */
  const cancelRecording = async (): Promise<void> => {
    try {
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
      }

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      setState({
        isRecording: false,
        isPaused: false,
        recordingDuration: 0,
        audioUri: null,
      });
    } catch (error) {
      console.error('Error canceling recording:', error);
    }
  };

  /**
   * Reset state
   */
  const reset = (): void => {
    setState({
      isRecording: false,
      isPaused: false,
      recordingDuration: 0,
      audioUri: null,
    });
  };

  return {
    ...state,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
    reset,
  };
};
```

### 7. Voice Transaction Hook (`hooks/voice/useVoiceTransaction.ts`)

```typescript
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { transcribeAudio } from '@/lib/api/groq/stt';
import { extractTransactionWithFallback, ExtractedTransaction } from '@/lib/api/groq/extraction';
import { useCategories } from '@/hooks/queries/useFinancial';

export interface VoiceTransactionState {
  isProcessing: boolean;
  stage: 'idle' | 'transcribing' | 'extracting' | 'complete' | 'error';
  transcription: string | null;
  extractedData: ExtractedTransaction | null;
  error: string | null;
}

/**
 * Hook to process voice input and extract transaction data
 */
export const useVoiceTransaction = (organizationId: string) => {
  const [state, setState] = useState<VoiceTransactionState>({
    isProcessing: false,
    stage: 'idle',
    transcription: null,
    extractedData: null,
    error: null,
  });

  // Fetch available categories
  const { data: categories } = useCategories(organizationId);

  /**
   * Process audio file
   */
  const processAudio = useMutation({
    mutationFn: async (audioUri: string) => {
      setState(prev => ({
        ...prev,
        isProcessing: true,
        stage: 'transcribing',
        error: null,
      }));

      // Step 1: Transcribe audio
      const transcription = await transcribeAudio(audioUri);

      setState(prev => ({
        ...prev,
        stage: 'extracting',
        transcription,
      }));

      // Step 2: Extract structured data
      const availableCategories = {
        income: categories?.filter(c => c.type === 'income').map(c => c.name) || [],
        expense: categories?.filter(c => c.type === 'expense').map(c => c.name) || [],
      };

      const extractedData = await extractTransactionWithFallback(
        transcription,
        availableCategories
      );

      setState(prev => ({
        ...prev,
        isProcessing: false,
        stage: 'complete',
        extractedData,
      }));

      return { transcription, extractedData };
    },
    onError: (error: Error) => {
      setState(prev => ({
        ...prev,
        isProcessing: false,
        stage: 'error',
        error: error.message,
      }));
    },
  });

  /**
   * Reset state
   */
  const reset = () => {
    setState({
      isProcessing: false,
      stage: 'idle',
      transcription: null,
      extractedData: null,
      error: null,
    });
  };

  return {
    ...state,
    processAudio: processAudio.mutate,
    reset,
  };
};
```

### 8. Voice Capture Button Component (`components/financial/VoiceCaptureButton.tsx`)

```typescript
import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVoiceCapture } from '@/hooks/voice/useVoiceCapture';
import { useVoiceTransaction } from '@/hooks/voice/useVoiceTransaction';
import { VoiceRecordingModal } from './VoiceRecordingModal';
import { VoiceConfirmationModal } from './VoiceConfirmationModal';

interface VoiceCaptureButtonProps {
  organizationId: string;
  onTransactionExtracted: (data: any) => void;
  disabled?: boolean;
}

export const VoiceCaptureButton: React.FC<VoiceCaptureButtonProps> = ({
  organizationId,
  onTransactionExtracted,
  disabled = false,
}) => {
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);

  const voiceCapture = useVoiceCapture();
  const voiceTransaction = useVoiceTransaction(organizationId);

  const handlePress = async () => {
    setShowRecordingModal(true);
    const started = await voiceCapture.startRecording();
    if (!started) {
      setShowRecordingModal(false);
      alert('Failed to start recording. Please check microphone permissions.');
    }
  };

  const handleStopRecording = async () => {
    const audioUri = await voiceCapture.stopRecording();
    setShowRecordingModal(false);

    if (audioUri) {
      // Process the audio
      voiceTransaction.processAudio(audioUri);
    }
  };

  const handleCancelRecording = async () => {
    await voiceCapture.cancelRecording();
    setShowRecordingModal(false);
  };

  // When extraction is complete, show confirmation modal
  React.useEffect(() => {
    if (voiceTransaction.stage === 'complete' && voiceTransaction.extractedData) {
      setShowConfirmationModal(true);
    }
  }, [voiceTransaction.stage]);

  const handleConfirm = (data: any) => {
    setShowConfirmationModal(false);
    onTransactionExtracted(data);
    voiceTransaction.reset();
    voiceCapture.reset();
  };

  const handleCancel = () => {
    setShowConfirmationModal(false);
    voiceTransaction.reset();
    voiceCapture.reset();
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.button, disabled && styles.disabled]}
        onPress={handlePress}
        disabled={disabled}
      >
        <Ionicons name="mic" size={24} color="#fff" />
      </TouchableOpacity>

      <VoiceRecordingModal
        visible={showRecordingModal}
        duration={voiceCapture.recordingDuration}
        onStop={handleStopRecording}
        onCancel={handleCancelRecording}
      />

      <VoiceConfirmationModal
        visible={showConfirmationModal}
        transcription={voiceTransaction.transcription}
        extractedData={voiceTransaction.extractedData}
        isProcessing={voiceTransaction.isProcessing}
        stage={voiceTransaction.stage}
        error={voiceTransaction.error}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  disabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.5,
  },
});
```

---

## Integration with Existing Financial System

### Connecting to CASHPLAN.md Implementation

The voice feature integrates seamlessly with the existing financial transaction system:

```typescript
// In your AddTransactionModal or Transaction Screen
import { VoiceCaptureButton } from '@/components/financial/VoiceCaptureButton';
import { useAddTransaction } from '@/hooks/mutations/useFinancialMutations';
import { useCategories } from '@/hooks/queries/useFinancial';

export default function AddTransactionScreen() {
  const { user } = useAuth();
  const { data: categories } = useCategories(user.organization_id);
  const addTransaction = useAddTransaction(user.organization_id);

  const [formData, setFormData] = useState({
    type: 'expense',
    amount: '',
    categoryId: '',
    transactionDate: new Date().toISOString().split('T')[0],
    description: '',
    notes: '',
    paymentMethod: 'cash',
    referenceNumber: '',
  });

  // Handle voice-extracted data
  const handleVoiceExtraction = (extractedData: ExtractedTransaction) => {
    // Find matching category ID
    const matchedCategory = categories?.find(
      c => c.name === extractedData.category_name && c.type === extractedData.type
    );

    // Auto-fill form with extracted data
    setFormData({
      type: extractedData.type,
      amount: extractedData.amount.toString(),
      categoryId: matchedCategory?.id || '',
      transactionDate: extractedData.transaction_date,
      description: extractedData.description || '',
      notes: extractedData.notes || '',
      paymentMethod: extractedData.payment_method || 'cash',
      referenceNumber: extractedData.reference_number || '',
    });

    // Optional: Auto-save if confidence is high
    if (extractedData.confidence >= 0.9) {
      handleSaveTransaction();
    }
  };

  const handleSaveTransaction = () => {
    addTransaction.mutate({
      type: formData.type as 'income' | 'expense',
      amount: parseFloat(formData.amount),
      categoryId: formData.categoryId,
      transactionDate: formData.transactionDate,
      description: formData.description,
      notes: formData.notes,
      paymentMethod: formData.paymentMethod as any,
      referenceNumber: formData.referenceNumber,
      createdBy: user.id,
    });
  };

  return (
    <View>
      {/* Manual form fields */}

      {/* Voice capture button */}
      <VoiceCaptureButton
        organizationId={user.organization_id}
        onTransactionExtracted={handleVoiceExtraction}
      />

      {/* Save button */}
    </View>
  );
}
```

---

## Voice Input Examples

### Example 1: Simple Expense
**User says:** "Paid 5000 rupees for office rent today"

**Extracted JSON:**
```json
{
  "type": "expense",
  "amount": 5000,
  "category_name": "Office Rent",
  "transaction_date": "2025-01-18",
  "description": "Paid for office rent",
  "payment_method": "cash",
  "confidence": 0.95
}
```

### Example 2: Income with UPI
**User says:** "Received 50000 from client via UPI reference number 123456789"

**Extracted JSON:**
```json
{
  "type": "income",
  "amount": 50000,
  "category_name": "Client Payments",
  "transaction_date": "2025-01-18",
  "description": "Received from client",
  "payment_method": "upi",
  "reference_number": "123456789",
  "confidence": 0.98
}
```

### Example 3: Complex Expense
**User says:** "Yesterday spent two thousand five hundred rupees on office supplies via company credit card"

**Extracted JSON:**
```json
{
  "type": "expense",
  "amount": 2500,
  "category_name": "Office Supplies",
  "transaction_date": "2025-01-17",
  "description": "Spent on office supplies",
  "payment_method": "card",
  "confidence": 0.92
}
```

### Example 4: Salary Payment
**User says:** "Paid salary to employees 150000 via bank transfer on 1st January"

**Extracted JSON:**
```json
{
  "type": "expense",
  "amount": 150000,
  "category_name": "Salary Payments",
  "transaction_date": "2025-01-01",
  "description": "Paid salary to employees",
  "payment_method": "bank",
  "confidence": 0.96
}
```

---

## Error Handling

### 1. Microphone Permission Denied
```typescript
if (!hasPermission) {
  Alert.alert(
    'Microphone Permission Required',
    'Please enable microphone access in your device settings to use voice input.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
    ]
  );
}
```

### 2. Transcription Failed
```typescript
if (transcriptionError) {
  Alert.alert(
    'Transcription Failed',
    'Could not transcribe your voice. Please try speaking more clearly or use manual entry.',
    [{ text: 'Try Again' }, { text: 'Manual Entry' }]
  );
}
```

### 3. Extraction Failed or Low Confidence
```typescript
if (extractedData.confidence < 0.7) {
  Alert.alert(
    'Low Confidence',
    'We extracted the data but are not very confident. Please review carefully before saving.',
    [{ text: 'OK' }]
  );
}
```

### 4. Category Not Found
```typescript
if (!matchedCategory) {
  // Suggest closest match or create new category
  Alert.alert(
    'Category Not Found',
    `We couldn't find a category matching "${extractedData.category_name}". Would you like to create it or choose from existing categories?`,
    [
      { text: 'Create New' },
      { text: 'Choose Existing' },
      { text: 'Cancel' }
    ]
  );
}
```

---

## Performance Optimization

### 1. Audio Compression
```typescript
// Compress audio before sending to reduce API costs
import { manipulateAsync } from 'expo-image-manipulator';

const compressAudio = async (audioUri: string): Promise<string> => {
  // Convert to lower bitrate if needed
  // Implementation depends on platform
  return audioUri;
};
```

### 2. Caching Categories
```typescript
// Cache categories in memory to avoid fetching for every extraction
const categoriesCache = new Map<string, { income: string[]; expense: string[] }>();

export const getCachedCategories = async (orgId: string) => {
  if (categoriesCache.has(orgId)) {
    return categoriesCache.get(orgId);
  }

  const categories = await fetchCategories(orgId);
  categoriesCache.set(orgId, categories);
  return categories;
};
```

### 3. Debounced Processing
```typescript
// Prevent multiple rapid voice inputs
import { debounce } from 'lodash';

const debouncedProcessAudio = debounce(
  (audioUri: string) => processAudio(audioUri),
  1000,
  { leading: true, trailing: false }
);
```

---

## Cost Estimation

### Groq API Pricing (as of 2025)

**Speech-to-Text (Whisper Large v3 Turbo):**
- $0.04 per hour of audio
- Average voice input: 10-30 seconds
- Cost per transaction: ~$0.0001 - $0.0003

**LLM Extraction (DeepSeek R1 Distill Llama 70B):**
- Pricing varies (check Groq pricing page)
- Average tokens per extraction: ~500 tokens
- Estimated cost per transaction: ~$0.001 - $0.003

**Total Cost per Voice Transaction:** ~$0.001 - $0.004 (very affordable!)

---

## Security Considerations

1. **API Key Protection**
   - Store Groq API key in environment variables
   - Never expose in client-side code
   - Consider using a backend proxy for API calls

2. **Audio Data Privacy**
   - Audio files are processed and discarded
   - No audio storage on Groq servers (check their policy)
   - Clear local audio files after processing

3. **Data Validation**
   - Always validate extracted data before saving
   - Show confirmation screen for user review
   - Implement min/max limits for amounts

4. **Rate Limiting**
   - Implement rate limiting to prevent abuse
   - Track API usage per user/organization

---

## Testing Strategy

### 1. Unit Tests
```typescript
describe('Voice Extraction', () => {
  it('should extract expense correctly', async () => {
    const result = await extractTransactionData(
      'Paid 5000 for office rent'
    );
    expect(result.type).toBe('expense');
    expect(result.amount).toBe(5000);
    expect(result.category_name).toBe('Office Rent');
  });
});
```

### 2. Integration Tests
- Test full flow: record → transcribe → extract → save
- Test with different accents and languages
- Test error scenarios

### 3. Manual Testing Scenarios
- Various amounts (small, large, decimals, words)
- Different categories
- Various date formats (today, yesterday, specific dates)
- Different payment methods
- Complex sentences with multiple details
- Background noise handling

---

## Future Enhancements

### Phase 2 Features
- [ ] Multi-language support (Hindi, regional languages)
- [ ] Voice commands ("Show last month's expenses", "What's my balance?")
- [ ] Continuous listening mode (hands-free)
- [ ] Bulk voice entry (multiple transactions in one recording)
- [ ] Voice-based search and filtering

### Phase 3 Features
- [ ] Receipt OCR + Voice combination
- [ ] Smart category suggestions based on history
- [ ] Voice-based reports ("Tell me this month's summary")
- [ ] Integration with phone call recordings for business calls

---

## Dependencies

### NPM Packages to Install
```bash
# Audio recording
npx expo install expo-av

# Permissions
npx expo install expo-permissions

# File system (if needed for audio management)
npx expo install expo-file-system

# Optional: Audio visualization
npm install react-native-audio-waveform
```

### Environment Setup
```env
# .env
EXPO_PUBLIC_GROQ_API_KEY=gsk_your_key_here
```

---

## Implementation Checklist

### Phase 1: Setup (Day 1)
- [ ] Install dependencies (expo-av, expo-permissions)
- [ ] Set up Groq API account and get API key
- [ ] Create Groq client configuration
- [ ] Add environment variables

### Phase 2: Core Functionality (Day 2-3)
- [ ] Implement audio recording hook (`useVoiceCapture`)
- [ ] Implement STT function (`transcribeAudio`)
- [ ] Implement extraction function (`extractTransactionData`)
- [ ] Create JSON schema for structured output

### Phase 3: UI Components (Day 4-5)
- [ ] Build VoiceCaptureButton component
- [ ] Build VoiceRecordingModal with animation
- [ ] Build VoiceConfirmationModal for review
- [ ] Add waveform animation component

### Phase 4: Integration (Day 6)
- [ ] Integrate with AddTransactionModal
- [ ] Connect to existing mutation hooks
- [ ] Implement category matching logic
- [ ] Add auto-save functionality

### Phase 5: Testing & Polish (Day 7-8)
- [ ] Test with various voice inputs
- [ ] Test error scenarios
- [ ] Add loading states and error messages
- [ ] Optimize performance
- [ ] Add analytics tracking

---

## Related Documentation

- **Database Schema**: [CASHPLAN.md - Database Schema](./CASHPLAN.md#database-schema)
- **Transaction Mutations**: [CASHPLAN.md - Mutation Functions](./CASHPLAN.md#2-mutation-functions-libapimutationsfinancialmutationsts)
- **Transaction Hooks**: [CASHPLAN.md - Mutation Hooks](./CASHPLAN.md#5-mutation-hooks-hooksmutationsusefinancialmutationsts)

---

## Support & Resources

- [Groq API Documentation](https://console.groq.com/docs)
- [Expo AV Documentation](https://docs.expo.dev/versions/latest/sdk/av/)
- [DeepSeek Model Documentation](https://console.groq.com/docs/model/deepseek-r1-distill-llama-70b)
- [Structured Outputs Guide](https://console.groq.com/docs/structured-outputs)
