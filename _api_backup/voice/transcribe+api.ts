/**
 * Groq Whisper Speech-to-Text API Route
 *
 * Transcribes audio files to text using Groq's Whisper Large v3 Turbo model.
 * Supports English and Hindi languages.
 *
 * Endpoint: POST /api/voice/transcribe
 *
 * Request Body (FormData):
 * - file: Audio file (wav, m4a, mp3, webm, etc.)
 * - language: 'en' | 'hi' (optional, defaults to 'en')
 *
 * Response:
 * - Success: { text: string, language: string, duration: number }
 * - Error: { error: string, details?: string }
 */

import Groq from 'groq-sdk';
import { StatusError } from 'expo-server';

// Initialize Groq client with API key from environment
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Supported audio formats
const SUPPORTED_FORMATS = [
  'audio/wav',
  'audio/x-wav',
  'audio/m4a',
  'audio/mp4',
  'audio/mpeg',
  'audio/mp3',
  'audio/webm',
  'audio/ogg',
  'audio/flac',
];

// Max file size: 25MB (Groq limit)
const MAX_FILE_SIZE = 25 * 1024 * 1024;

/**
 * POST handler for audio transcription
 */
export async function POST(request: Request) {
  try {
    const startTime = Date.now();

    // Parse multipart form data
    const formData = await request.formData();
    const audioFile = formData.get('file') as File | null;
    const language = (formData.get('language') as string) || 'en';

    // Validate file presence
    if (!audioFile) {
      throw new StatusError(400, 'Audio file is required');
    }

    // Validate file size
    if (audioFile.size > MAX_FILE_SIZE) {
      throw new StatusError(
        400,
        `File size exceeds maximum limit of 25MB (received: ${(audioFile.size / 1024 / 1024).toFixed(2)}MB)`
      );
    }

    // Validate file type
    if (!SUPPORTED_FORMATS.includes(audioFile.type)) {
      throw new StatusError(
        400,
        `Unsupported audio format: ${audioFile.type}. Supported formats: ${SUPPORTED_FORMATS.join(', ')}`
      );
    }

    // Validate language
    if (!['en', 'hi'].includes(language)) {
      throw new StatusError(400, 'Language must be either "en" (English) or "hi" (Hindi)');
    }

    console.log(`[Transcribe] Processing audio: ${audioFile.name}, size: ${(audioFile.size / 1024).toFixed(2)}KB, language: ${language}`);

    // Call Groq Whisper API
    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3-turbo',
      language: language,
      response_format: 'json',
    });

    const duration = Date.now() - startTime;

    console.log(`[Transcribe] Success in ${duration}ms: "${transcription.text.substring(0, 100)}..."`);

    // Return transcription result
    return Response.json({
      text: transcription.text,
      language: language,
      duration: duration,
    });
  } catch (error: any) {
    console.error('[Transcribe] Error:', error);

    // Handle StatusError (validation errors)
    if (error instanceof StatusError) {
      return Response.json(
        { error: error.message },
        { status: error.status }
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
