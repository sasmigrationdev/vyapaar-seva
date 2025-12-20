/**
 * Groq DeepSeek R1 Transaction Extraction API Route
 *
 * Extracts structured financial transaction data from transcribed text using
 * DeepSeek R1 Distill Llama 70B with JSON Schema enforcement.
 *
 * Endpoint: POST /api/voice/extract
 *
 * Request Body (JSON):
 * - text: string (transcribed audio text)
 * - categories: string[] (available category names)
 * - language: 'en' | 'hi' (language of transcription)
 *
 * Response:
 * - Success: ExtractedTransactionData (with confidence score)
 * - Error: { error: string, details?: string }
 */

import Groq from 'groq-sdk';
import { StatusError } from 'expo-server';

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// JSON Schema for structured extraction
const TRANSACTION_SCHEMA = {
  type: 'object',
  properties: {
    type: {
      type: 'string',
      enum: ['income', 'expense'],
      description: 'Type of transaction: income (money received) or expense (money paid)',
    },
    amount: {
      type: 'number',
      description: 'Transaction amount in rupees (numeric value only, e.g., 5000)',
    },
    category_name: {
      type: 'string',
      description: 'Category name in English (e.g., "Office Rent", "Client Payments"). ALWAYS use English, even if input was in Hindi.',
    },
    category_description: {
      type: 'string',
      description: 'Brief description of what this category is for (e.g., "Monthly office rent payment", "Payment received from clients"). Only needed for new categories not in available list.',
    },
    transaction_date: {
      type: 'string',
      format: 'date',
      description: 'Transaction date in ISO format YYYY-MM-DD. Use today if "today", yesterday if "yesterday", or parse specific date.',
    },
    description: {
      type: 'string',
      description: 'Brief description of the transaction',
    },
    notes: {
      type: 'string',
      description: 'Additional notes or details (optional)',
    },
    payment_method: {
      type: 'string',
      enum: ['cash', 'bank', 'upi', 'card', 'cheque'],
      description: 'Payment method: cash (default if not mentioned), bank (bank transfer), upi, card (credit/debit card), cheque',
    },
    reference_number: {
      type: 'string',
      description: 'Transaction reference number or ID (optional)',
    },
    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
      description: 'Confidence score of extraction (0-1). Use 0.9+ for clear extractions, 0.7-0.9 for moderate, <0.7 for uncertain.',
    },
  },
  required: ['type', 'amount', 'category_name', 'transaction_date', 'payment_method', 'confidence'],
  additionalProperties: false,
};

// System prompt for English
const SYSTEM_PROMPT_EN = `You are a financial transaction data extraction expert specializing in Indian business transactions. Extract structured transaction data from natural language inputs.

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
1. Type Detection (CRITICAL - Understand Business Perspective):
   - ALWAYS consider WHO is speaking and the direction of money flow
   - Business/Company perspective (default):
     * "paid salary", "salary paid", "gave salary" → EXPENSE (money OUT to employees)
     * "paid rent", "office rent paid" → EXPENSE (money OUT)
     * "received payment", "client paid", "got money" → INCOME (money IN from clients)
     * "received salary", "salary received" → INCOME (money IN to employee)
   - Keywords for EXPENSE: "paid", "spent", "expense", "gave", "disbursed", "transferred out"
   - Keywords for INCOME: "received", "earned", "income", "got", "collected", "transferred in"
   - If ambiguous, use context: payments TO others = expense, payments FROM others = income

2. Amount Extraction:
   - Convert words to numbers: "five thousand" → 5000
   - Handle Indian number formats: "5k" → 5000, "1 lakh" → 100000
   - Extract only numeric value (no currency symbols)

3. Category Detection (CRITICAL):
   - First, check if the category matches any from the "Available categories in database" list
   - If exact match found → use that category name exactly
   - If close match (80%+ similar) → use the existing category name
   - If no match → suggest a NEW generic English category name
   - ALWAYS use English names even if input is in Hindi (e.g., "किराया" → "Office Rent")
   - Be specific but generic (e.g., "Office Rent" not "Rent to landlord")

4. Category Description (for NEW categories only):
   - If suggesting a NEW category (not in available list), provide "category_description"
   - Description should be brief and clear (e.g., "Monthly office rent payment", "Utility bills for electricity and water")
   - If category exists in available list, omit "category_description"

5. Hindi Input Handling:
   - Always translate Hindi categories to proper English equivalents
   - Examples: "किराया" → "Office Rent", "बिजली बिल" → "Utilities", "वेतन" → "Salary Payments"
   - Use standard business category names in English

6. Date Parsing:
   - "today" → current date
   - "yesterday" → previous day
   - "1st January" → parse to YYYY-MM-DD
   - Default to today if not mentioned

7. Payment Method:
   - "UPI" → upi
   - "bank transfer", "NEFT", "RTGS" → bank
   - "cash" → cash (default)
   - "credit card", "debit card" → card
   - "cheque" → cheque

8. Confidence Scoring:
   - 0.95-1.0: All key fields clearly stated
   - 0.80-0.94: Most fields clear, minor assumptions
   - 0.70-0.79: Some ambiguity in category or date
   - <0.70: Significant uncertainty

Examples:
- "Paid 5000 rupees for office rent today via UPI" (available: ["Office Rent", "Utilities"]) → {type: "expense", amount: 5000, category_name: "Office Rent", payment_method: "upi", confidence: 0.95}
- "Received 50000 from client bank transfer" (available: ["Client Payments"]) → {type: "income", amount: 50000, category_name: "Client Payments", payment_method: "bank", confidence: 0.92}
- "Spent 2000 on coffee machine" (available: ["Office Rent"]) → {type: "expense", amount: 2000, category_name: "Office Supplies", category_description: "Office equipment and supplies", payment_method: "cash", confidence: 0.88}
- "Salary paid 20000 today" (available: ["Salary Payments"]) → {type: "expense", amount: 20000, category_name: "Salary Payments", payment_method: "bank", confidence: 0.95} // Company paid TO employees
- "Got my salary 20000" (available: ["Salary Payments"]) → {type: "income", amount: 20000, category_name: "Salary Payments", payment_method: "bank", confidence: 0.95} // Employee received FROM company

Return ONLY valid JSON matching the schema. No explanations.`;

// System prompt for Hindi
const SYSTEM_PROMPT_HI = `आप एक वित्तीय लेनदेन डेटा निष्कर्षण विशेषज्ञ हैं जो भारतीय व्यापार लेनदेन में विशेषज्ञता रखते हैं। प्राकृतिक भाषा इनपुट से संरचित लेनदेन डेटा निकालें।

महत्वपूर्ण: आपको केवल इस स्कीमा से मेल खाने वाला एक मान्य JSON ऑब्जेक्ट लौटाना होगा:
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

दिशानिर्देश:
1. प्रकार पहचान (महत्वपूर्ण - व्यवसाय परिप्रेक्ष्य समझें):
   - हमेशा विचार करें कि कौन बोल रहा है और पैसे की दिशा क्या है
   - व्यवसाय/कंपनी परिप्रेक्ष्य (डिफ़ॉल्ट):
     * "वेतन दिया", "सैलरी पेड", "कर्मचारी को वेतन" → EXPENSE (पैसे बाहर)
     * "किराया दिया", "ऑफिस का किराया" → EXPENSE (पैसे बाहर)
     * "पेमेंट मिला", "ग्राहक से पैसे", "भुगतान प्राप्त" → INCOME (पैसे अंदर)
     * "वेतन मिला", "सैलरी मिली" → INCOME (कर्मचारी को पैसे अंदर)
   - EXPENSE के लिए शब्द: "दिया", "खर्च किया", "भुगतान किया", "पेड"
   - INCOME के लिए शब्द: "मिला", "प्राप्त किया", "आय", "earned"
   - अगर अस्पष्ट हो: दूसरों को भुगतान = expense, दूसरों से भुगतान = income

2. राशि निष्कर्षण:
   - शब्दों को संख्या में बदलें: "पांच हज़ार" → 5000
   - भारतीय संख्या प्रारूप: "5 हज़ार" → 5000, "1 लाख" → 100000

3. श्रेणी पहचान (महत्वपूर्ण):
   - पहले "Available categories in database" सूची में मेल देखें
   - यदि सटीक मेल मिले → उसी category name का उपयोग करें
   - यदि करीबी मेल (80%+) → मौजूदा category name का उपयोग करें
   - यदि कोई मेल नहीं → नई अंग्रेजी श्रेणी का सुझाव दें
   - हमेशा अंग्रेजी नाम उपयोग करें भले ही इनपुट हिंदी में हो
   - उदाहरण: "किराया" → "Office Rent", "बिजली बिल" → "Utilities", "वेतन" → "Salary Payments"

4. श्रेणी विवरण (केवल नई श्रेणियों के लिए):
   - यदि नई श्रेणी सुझा रहे हैं (उपलब्ध सूची में नहीं), तो "category_description" दें
   - विवरण संक्षिप्त और स्पष्ट होना चाहिए (उदाहरण: "Monthly office rent payment", "Utility bills for electricity")
   - यदि श्रेणी उपलब्ध सूची में है, तो "category_description" न दें

5. हिंदी इनपुट का अनुवाद:
   - हमेशा हिंदी श्रेणियों को उचित अंग्रेजी में बदलें
   - "किराया" → "Office Rent"
   - "बिजली का बिल" → "Utilities"
   - "कर्मचारी वेतन" → "Salary Payments"
   - "यात्रा खर्च" → "Travel & Transportation"

6. तारीख पार्सिंग:
   - "आज" → आज की तारीख
   - "कल" / "yesterday" → कल की तारीख
   - अन्यथा आज की तारीख

7. भुगतान विधि:
   - "UPI" → upi
   - "बैंक ट्रांसफर", "NEFT", "RTGS" → bank
   - "नकद", "cash" → cash
   - "कार्ड", "credit card" → card

उदाहरण:
- "आज ऑफिस किराया 5000 रुपये UPI से दिया" (available: ["Office Rent"]) → {type: "expense", amount: 5000, category_name: "Office Rent", payment_method: "upi", confidence: 0.95}
- "ग्राहक से 50000 बैंक transfer मिला" (available: ["Client Payments"]) → {type: "income", amount: 50000, category_name: "Client Payments", payment_method: "bank", confidence: 0.92}
- "पानी का बिल 800 रुपये दिया" (available: ["Office Rent"]) → {type: "expense", amount: 800, category_name: "Utilities", category_description: "Utility bills for water, electricity, and internet", payment_method: "cash", confidence: 0.88}
- "आज 20000 का वेतन दिया" (available: ["Salary Payments"]) → {type: "expense", amount: 20000, category_name: "Salary Payments", payment_method: "bank", confidence: 0.95} // कंपनी ने कर्मचारियों को दिया
- "मेरी सैलरी 20000 मिली" (available: ["Salary Payments"]) → {type: "income", amount: 20000, category_name: "Salary Payments", payment_method: "bank", confidence: 0.95} // कर्मचारी को कंपनी से मिला

केवल मान्य JSON स्कीमा लौटाएं। कोई स्पष्टीकरण नहीं।`;

/**
 * POST handler for transaction extraction
 */
export async function POST(request: Request) {
  try {
    const startTime = Date.now();

    // Parse JSON body
    const body = await request.json();
    const { text, categories, language = 'en' } = body;

    // Validate input
    if (!text || typeof text !== 'string') {
      throw new StatusError(400, 'Text is required and must be a string');
    }

    if (!categories || !Array.isArray(categories)) {
      throw new StatusError(400, 'Categories array is required');
    }

    if (!['en', 'hi'].includes(language)) {
      throw new StatusError(400, 'Language must be either "en" or "hi"');
    }

    console.log(`[Extract] Processing text (${language}): "${text.substring(0, 100)}..."`);
    console.log(`[Extract] Available categories: ${categories.join(', ')}`);

    // Select system prompt based on language
    const systemPrompt = language === 'hi' ? SYSTEM_PROMPT_HI : SYSTEM_PROMPT_EN;

    // Prepare user prompt with available categories
    const categoriesText = categories.length > 0
      ? categories.join(', ')
      : 'None (suggest appropriate category)';

    const userPrompt = `Extract transaction data from: "${text}"

Available categories in database: ${categoriesText}

IMPORTANT Category Matching Instructions:
- If the extracted category closely matches (80%+ similar) an available category, use that exact name
- If input is in Hindi, translate to proper English category name (e.g., "किराया" → "Office Rent")
- If NO match found, suggest a new generic English category name AND provide "category_description"
- Category names should ALWAYS be in English, regardless of input language

Current date for reference: ${new Date().toISOString().split('T')[0]}

Return valid JSON only.`;

    // Call Groq with JSON response format
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1, // Low temperature for consistent extraction
      response_format: {
        type: 'json_object',
      },
    });

    const duration = Date.now() - startTime;

    // Parse the extracted JSON
    const extractedData = JSON.parse(completion.choices[0].message.content || '{}');

    console.log(`[Extract] Success in ${duration}ms:`, extractedData);

    // Return extracted data
    return Response.json({
      ...extractedData,
      extraction_duration: duration,
    });
  } catch (error: any) {
    console.error('[Extract] Error:', error);

    // Handle StatusError (validation errors)
    if (error instanceof StatusError) {
      return Response.json(
        { error: error.message },
        { status: error.status }
      );
    }

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return Response.json(
        {
          error: 'Failed to parse extracted JSON',
          details: error.message,
        },
        { status: 500 }
      );
    }

    // Handle Groq API errors
    if (error.response) {
      return Response.json(
        {
          error: 'Groq API error',
          details: error.response.data?.error?.message || error.message,
        },
        { status: error.response.status || 500 }
      );
    }

    // Handle other errors
    return Response.json(
      {
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
