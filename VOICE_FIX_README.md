# Voice Transcription Fix for Production Builds

## Problem
Voice transcription worked in Expo Go (development) but failed in production APK builds with error: "Failed to extract transaction from voice input. Please try again."

## Root Cause
Expo API routes (`/app/api/voice/transcribe+api.ts` and `/app/api/voice/extract+api.ts`) **only work in**:
- Expo Go (development mode)
- Web deployments (server-side rendering)

They **do NOT work** in standalone mobile builds (APK/IPA) because there's no server running in the app.

## Solution
Changed from server-side API routes to **direct client-side Groq API calls**:

### Changes Made:

1. **Created new service** (`/lib/services/groq.service.ts`):
   - Direct Groq REST API client for React Native
   - `transcribeAudio()` - Calls Groq Whisper API via fetch with FormData
   - `extractTransactionData()` - Calls Groq Chat Completions API via fetch
   - Uses React Native's FormData which can handle file URIs directly
   - No Groq SDK dependency needed (uses direct REST API calls)

2. **Updated hook** (`/hooks/voice/useVoiceTransactionExtraction.ts`):
   - Removed `fetch()` calls to API routes
   - Passes audio file URI directly to service
   - Calls Groq service functions directly
   - Simplified implementation (no base64 conversion needed)

3. **Key Technical Details**:
   - React Native's FormData can append files using URI directly: `{ uri, type, name }`
   - Direct REST API calls to `https://api.groq.com/openai/v1`
   - No Blob/File polyfills needed
   - Works natively in React Native environment

## Files Modified
- ✅ `/lib/services/groq.service.ts` (new)
- ✅ `/hooks/voice/useVoiceTransactionExtraction.ts`
- ✅ `.env` (no changes needed)

## Files Unchanged (Keep for Web Deployment)
- `/app/api/voice/transcribe+api.ts` (still works for web)
- `/app/api/voice/extract+api.ts` (still works for web)

## Testing Checklist
- [ ] Test voice recording in development (Expo Go)
- [ ] Build new APK: `eas build --platform android --profile preview`
- [ ] Install APK on device
- [ ] Test voice transcription in production APK
- [ ] Verify transcription works for both English and Hindi
- [ ] Check transaction extraction accuracy

## Notes
- **API Key Security**: The Groq API key is exposed in the client (EXPO_PUBLIC_GROQ_API_KEY). For production apps:
  - Use Groq API key rotation
  - Monitor usage in Groq dashboard
  - Consider adding server-side proxy if needed

- **Why this works**:
  - Groq SDK supports browser/React Native environments
  - Direct API calls bypass the need for API routes
  - Same functionality as before, just different execution path

## Build Commands
```bash
# Development
npm start

# Build APK (preview)
eas build --platform android --profile preview

# Build APK (production)
eas build --platform android --profile production
```

## Rollback
If issues occur, the old API route files are still present and can be used for web deployments.
