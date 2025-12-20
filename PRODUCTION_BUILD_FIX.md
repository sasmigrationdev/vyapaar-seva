# Production APK Crash Analysis & Solutions

## Root Causes Identified

### 1. **Missing GROQ API Key in Production Build** (CRITICAL ❌)

**Issue**: The app uses `EXPO_PUBLIC_GROQ_API_KEY` for voice transcription features, but this environment variable is NOT configured in EAS build secrets. When the app tries to use voice features in production, it throws an error:

```typescript
// lib/services/groq.service.ts:22
if (!apiKey) {
  throw new Error('EXPO_PUBLIC_GROQ_API_KEY is not configured');
}
```

**Files affected**:
- `lib/services/groq.service.ts` - Throws error if API key missing
- `hooks/voice/useVoiceTransactionExtraction.ts` - Uses groq service
- `components/financial/VoiceRecordingModal.tsx` - Triggers voice features

**Impact**: App crashes when:
- User tries to use voice input for transactions
- Voice recording modal is opened
- Any component that imports/uses groq service is rendered

---

### 2. **Environment Variables Not Set in EAS Build** (CRITICAL ❌)

**Issue**: `.env` file is NOT included in production builds. Environment variables must be configured in EAS Secrets or `eas.json`.

**Current `.env` contains**:
```env
EXPO_PUBLIC_SUPABASE_URL=https://yardyctualuppxckvobx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
EXPO_PUBLIC_GROQ_API_KEY=your_groq_api_key_here
```

**What happens in production**:
- ❌ `process.env.EXPO_PUBLIC_GROQ_API_KEY` = `undefined`
- ❌ App crashes when accessing voice features
- ✅ Supabase vars might work if set via `app.json` or EAS secrets

---

### 3. **No Graceful Fallback for Missing Features** (HIGH ⚠️)

**Issue**: Voice feature is not optional - if GROQ key is missing, the app crashes instead of disabling the feature gracefully.

**Better approach**:
```typescript
// Check if voice is available before allowing access
const isVoiceAvailable = !!process.env.EXPO_PUBLIC_GROQ_API_KEY;

// In UI, conditionally show voice button
{isVoiceAvailable && (
  <TouchableOpacity onPress={openVoiceModal}>
    <Icon name="microphone" />
  </TouchableOpacity>
)}
```

---

### 4. **Excessive Console.log Statements** (MEDIUM ⚠️)

**Issue**: Production builds contain many `console.log` statements that can impact performance and expose sensitive data.

**Files with excessive logging**:
- `lib/services/groq.service.ts` - 10+ console logs
- `hooks/voice/useVoiceTransactionExtraction.ts` - Multiple logs
- `components/financial/VoiceRecordingModal.tsx` - Debug logs
- `lib/supabase/client.ts` - Error logs

**Best practice**: Remove or conditionally disable logs in production:
```typescript
const isDev = __DEV__;
if (isDev) {
  console.log('[Debug]', data);
}
```

---

## Solutions

### ✅ Solution 1: Configure EAS Secrets (REQUIRED)

**Step 1**: Set environment variables in EAS CLI:

```bash
# Set GROQ API key
eas secret:create --scope project --name EXPO_PUBLIC_GROQ_API_KEY --value YOUR_GROQ_API_KEY_HERE --type string

# Set Supabase URL
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value https://yardyctualuppxckvobx.supabase.co --type string

# Set Supabase Anon Key
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhcmR5Y3R1YWx1cHB4Y2t2b2J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1Nzg4NDQsImV4cCI6MjA3NTE1NDg0NH0.y8u2TsebEVbu0UCNkXuw4b-1j8zGhEqtjDV8OeIcfEk --type string
```

**Step 2**: Alternatively, add to `eas.json`:

```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "apk"
      },
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "https://yardyctualuppxckvobx.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "eyJhbGci...",
        "EXPO_PUBLIC_GROQ_API_KEY": "gsk_k3gWD8K8..."
      }
    }
  }
}
```

**⚠️ WARNING**: Using `eas.json` for secrets exposes them in git. Use EAS CLI secrets instead!

---

### ✅ Solution 2: Add Graceful Fallback for Voice Features

**File**: `lib/services/groq.service.ts`

```typescript
// At the top of the file
const apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;

// Export availability checker
export const isVoiceFeatureAvailable = (): boolean => {
  return !!apiKey;
};

// In transcribeAudio function
export async function transcribeAudio(...) {
  if (!apiKey) {
    throw new Error('Voice feature is not available. Please contact support.');
  }
  // ... rest of code
}
```

**File**: `components/financial/VoiceRecordingModal.tsx` or wherever voice button is

```typescript
import { isVoiceFeatureAvailable } from '@/lib/services/groq.service';

// In component
const voiceAvailable = isVoiceFeatureAvailable();

// Conditionally render voice button
{voiceAvailable && (
  <TouchableOpacity onPress={handleVoiceInput}>
    <MaterialCommunityIcons name="microphone" size={24} />
  </TouchableOpacity>
)}
```

---

### ✅ Solution 3: Remove Production Console Logs

**Create a utility** (`lib/utils/logger.ts`):

```typescript
const isDev = __DEV__;

export const logger = {
  log: (...args: any[]) => {
    if (isDev) console.log(...args);
  },
  error: (...args: any[]) => {
    if (isDev) console.error(...args);
  },
  warn: (...args: any[]) => {
    if (isDev) console.warn(...args);
  },
};
```

**Replace all console.log**:

```typescript
// Before
console.log('[Groq Service] Transcribing audio from:', audioUri);

// After
import { logger } from '@/lib/utils/logger';
logger.log('[Groq Service] Transcribing audio from:', audioUri);
```

---

### ✅ Solution 4: Test Production Build Locally

**Before submitting to EAS**:

```bash
# Build production APK locally
eas build --platform android --profile production --local

# Or build preview first
eas build --platform android --profile preview --local

# Install and test on device
adb install build-xxxxx.apk
```

---

## Quick Fix Checklist

- [ ] 1. Set EAS secrets for all `EXPO_PUBLIC_*` environment variables
- [ ] 2. Add graceful fallback for voice features when GROQ key is missing
- [ ] 3. Add `isVoiceFeatureAvailable()` utility function
- [ ] 4. Conditionally show/hide voice buttons based on availability
- [ ] 5. Remove or wrap console.log statements with `__DEV__` checks
- [ ] 6. Test production build locally before deploying
- [ ] 7. Add error boundary to catch unexpected crashes
- [ ] 8. Add Sentry or error tracking for production crash reports

---

## Immediate Actions Required

### 1. **Configure EAS Secrets (5 minutes)**

```bash
# Login to EAS
eas login

# Set secrets
eas secret:create --scope project --name EXPO_PUBLIC_GROQ_API_KEY --value YOUR_KEY_HERE --type string
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value YOUR_URL_HERE --type string
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value YOUR_KEY_HERE --type string

# Verify secrets are set
eas secret:list
```

### 2. **Add Voice Feature Flag (10 minutes)**

Create `constants/FeatureFlags.ts`:

```typescript
export const FEATURE_FLAGS = {
  VOICE_INPUT: !!process.env.EXPO_PUBLIC_GROQ_API_KEY,
  MULTI_DEVICE_TRACKING: true,
  PAYROLL_SYSTEM: true,
} as const;
```

### 3. **Rebuild and Test (20 minutes)**

```bash
# Clear cache
expo start -c

# Build production locally
eas build --platform android --profile production --local

# Install and test
adb install build-*.apk
```

---

## Long-term Recommendations

1. **Add Error Boundaries**:
   - Wrap app in error boundary component
   - Show user-friendly error messages instead of white screens

2. **Add Feature Flags System**:
   - Centralized feature flag management
   - Remote config for enabling/disabling features

3. **Add Sentry/Crashlytics**:
   - Track production crashes
   - Get detailed error reports

4. **Automated Testing**:
   - Add E2E tests for critical flows
   - Test production builds in CI/CD

5. **Environment-based Builds**:
   - Separate dev/staging/prod configurations
   - Different API keys per environment

---

## Verification Steps

After applying fixes:

1. ✅ Build production APK with EAS secrets configured
2. ✅ Install APK on physical device
3. ✅ Test app launch - should NOT crash
4. ✅ Test voice input - should work if key is set, or button should be hidden
5. ✅ Test all critical flows (login, attendance, transactions, payroll)
6. ✅ Check for any crash logs or errors
7. ✅ Verify no sensitive data in logs

---

## Related Files

- `lib/services/groq.service.ts` - Voice API service
- `hooks/voice/useVoiceTransactionExtraction.ts` - Voice extraction hook
- `components/financial/VoiceRecordingModal.tsx` - Voice UI
- `lib/supabase/client.ts` - Supabase client with env vars
- `eas.json` - Build configuration
- `.env` - Local environment variables (NOT used in production)

---

## Need Help?

**Common error messages**:

1. **"EXPO_PUBLIC_GROQ_API_KEY is not configured"**
   → Run EAS secrets commands above

2. **"Network request failed"**
   → Check Supabase URL/key are set correctly

3. **White screen on launch**
   → Check all EXPO_PUBLIC_ variables are set in EAS

4. **App crashes on voice button press**
   → Implement graceful fallback for missing GROQ key

---

## Summary

**Root cause**: Missing `EXPO_PUBLIC_GROQ_API_KEY` in production build environment.

**Quick fix**: 
```bash
eas secret:create --scope project --name EXPO_PUBLIC_GROQ_API_KEY --value YOUR_GROQ_API_KEY_HERE --type string
```

**Better fix**: Add feature flag + graceful fallback + proper error handling.

**Best fix**: All of the above + error boundaries + crash reporting + automated testing.
