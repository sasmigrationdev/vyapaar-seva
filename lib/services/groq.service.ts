/**
 * Groq API Service
 *
 * Direct client-side implementation for calling Groq API from mobile app.
 * This bypasses the need for API routes which don't work in standalone builds.
 */

const GROQ_API_BASE_URL = 'https://api.groq.com/openai/v1';

/**
 * Transcribe audio to text using Groq Whisper API directly
 */
export async function transcribeAudio(
  audioUri: string,
  language: 'en' | 'hi' = 'en'
): Promise<{ text: string; language: string; duration: number }> {
  try {
    const startTime = Date.now();
    const apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;

    if (!apiKey) {
      throw new Error('EXPO_PUBLIC_GROQ_API_KEY is not configured');
    }

    console.log('[Groq Service] Transcribing audio from:', audioUri);
    console.log('[Groq Service] Language:', language);

    // Create FormData with the audio file
    const formData = new FormData();

    // React Native FormData can handle file URIs directly
    formData.append('file', {
      uri: audioUri,
      type: 'audio/m4a',
      name: 'recording.m4a',
    } as any);

    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('language', language);
    formData.append('response_format', 'json');

    console.log('[Groq Service] Sending request to Groq API...');

    // Call Groq Whisper API directly
    const response = await fetch(`${GROQ_API_BASE_URL}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Groq Service] API error response:', errorText);
      throw new Error(`Groq API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const duration = Date.now() - startTime;

    console.log(`[Groq Service] Transcription success in ${duration}ms`);
    console.log('[Groq Service] Transcribed text:', result.text?.substring(0, 100));

    return {
      text: result.text,
      language: language,
      duration: duration,
    };
  } catch (error: any) {
    console.error('[Groq Service] Transcription error:', error);
    throw new Error(error.message || 'Transcription failed');
  }
}

/**
 * Extract transaction data from transcribed text using Groq LLM API directly
 */
export async function extractTransactionData(
  text: string,
  categories: string[],
  language: 'en' | 'hi' = 'en'
): Promise<any> {
  try {
    const startTime = Date.now();
    const apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;

    if (!apiKey) {
      throw new Error('EXPO_PUBLIC_GROQ_API_KEY is not configured');
    }

    console.log('[Groq Service] Extracting transaction data from:', text.substring(0, 100));
    console.log('[Groq Service] Available categories:', categories.length);

    // System prompts (same as API routes)
    const systemPromptEn = `You are a financial transaction data extraction expert specializing in Indian business transactions. Extract structured transaction data from natural language inputs.

IMPORTANT: You must respond with ONLY a valid JSON object matching this exact schema:
{
  "type": "income" | "expense",
  "amount": number,
  "category_name": string,
  "category_description": string (optional),
  "transaction_date": "YYYY-MM-DD",
  "description": string,
  "notes": string (optional),
  "payment_method": "cash" | "bank" | "upi" | "card" | "cheque",
  "reference_number": string (optional),
  "confidence": number (0-1)
}

Guidelines:
1. Type Detection (CRITICAL):
   - EXPENSE: "paid", "spent", "expense", "gave"
   - INCOME: "received", "earned", "income", "got"

2. Amount: Convert words to numbers: "five thousand" → 5000

3. Category: Match from available categories or suggest new English name

4. Date: "today" → current date, "yesterday" → previous day

5. Payment Method: Default to "cash" if not mentioned

6. Confidence: 0.95-1.0 (clear), 0.80-0.94 (moderate), <0.80 (uncertain)

Return ONLY valid JSON matching the schema.`;

    const systemPromptHi = `आप एक वित्तीय लेनदेन डेटा निष्कर्षण विशेषज्ञ हैं। केवल JSON ऑब्जेक्ट लौटाएं।

स्कीमा:
{
  "type": "income" | "expense",
  "amount": number,
  "category_name": string (अंग्रेजी में),
  "transaction_date": "YYYY-MM-DD",
  "description": string,
  "payment_method": "cash" | "bank" | "upi" | "card" | "cheque",
  "confidence": number (0-1)
}

निर्देश:
- EXPENSE: "दिया", "खर्च किया", "पेड"
- INCOME: "मिला", "प्राप्त किया"
- श्रेणी हमेशा अंग्रेजी में: "किराया" → "Office Rent"

केवल JSON लौटाएं।`;

    const systemPrompt = language === 'hi' ? systemPromptHi : systemPromptEn;

    const categoriesText = categories.length > 0
      ? categories.join(', ')
      : 'None';

    const userPrompt = `Extract transaction data from: "${text}"

Available categories: ${categoriesText}
Current date: ${new Date().toISOString().split('T')[0]}

Return valid JSON only.`;

    console.log('[Groq Service] Sending extraction request to Groq API...');

    // Call Groq Chat API directly
    const response = await fetch(`${GROQ_API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
        response_format: {
          type: 'json_object',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Groq Service] API error response:', errorText);
      throw new Error(`Groq API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const duration = Date.now() - startTime;

    const extractedData = JSON.parse(result.choices[0].message.content || '{}');

    console.log(`[Groq Service] Extraction success in ${duration}ms:`, extractedData);

    return {
      ...extractedData,
      extraction_duration: duration,
    };
  } catch (error: any) {
    console.error('[Groq Service] Extraction error:', error);
    throw new Error(error.message || 'Extraction failed');
  }
}
