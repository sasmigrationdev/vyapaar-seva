/**
 * useVoiceCapture Hook
 *
 * Handles audio recording with expo-audio, including:
 * - Microphone permission handling
 * - Start/stop/pause/resume recording
 * - Duration tracking
 * - Audio file management
 * - Cleanup on cancel
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform, Alert, Linking } from 'react-native';
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  AudioModule,
  setAudioModeAsync,
} from 'expo-audio';
import { VOICE_CONFIG } from '@/constants/VoiceConfig';
import {
  getRecordingFilePath,
  deleteAudioFile,
  getAudioFileInfo,
} from '@/lib/utils/voice.utils';

export interface VoiceCaptureState {
  isRecording: boolean;
  isPaused: boolean;
  isLoading: boolean;
  duration: number; // milliseconds
  audioUri: string | null;
  hasPermission: boolean | null;
  error: string | null;
}

export interface UseVoiceCaptureReturn extends VoiceCaptureState {
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  pauseRecording: () => Promise<void>;
  resumeRecording: () => Promise<void>;
  cancelRecording: () => Promise<void>;
  requestPermission: () => Promise<boolean>;
  cleanup: () => Promise<void>;
}

/**
 * Hook for voice capture functionality
 */
export function useVoiceCapture(): UseVoiceCaptureReturn {
  const [state, setState] = useState<VoiceCaptureState>({
    isRecording: false,
    isPaused: false,
    isLoading: false,
    duration: 0,
    audioUri: null,
    hasPermission: null,
    error: null,
  });

  // Create audio recorder with high quality preset
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 100);

  // Track the URI separately to avoid accessing released recorder
  const currentUriRef = useRef<string | null>(null);

  // Check initial permission status
  useEffect(() => {
    checkPermission();

    return () => {
      // Cleanup on unmount
      cleanup();
    };
  }, []);

  // Sync recorder state with component state
  useEffect(() => {
    if (recorderState) {
      setState((prev) => ({
        ...prev,
        isRecording: recorderState.isRecording,
        duration: recorderState.durationMillis,
      }));

      // Auto-stop if max duration reached
      if (
        recorderState.isRecording &&
        recorderState.durationMillis >= VOICE_CONFIG.MAX_RECORDING_DURATION
      ) {
        stopRecording();
      }
    }
  }, [recorderState]);

  /**
   * Check microphone permission status
   */
  const checkPermission = async () => {
    try {
      const { status } = await AudioModule.getRecordingPermissionsAsync();
      setState((prev) => ({ ...prev, hasPermission: status === 'granted' }));
    } catch (error) {
      console.error('[Voice Capture] Error checking permission:', error);
    }
  };

  /**
   * Request microphone permission
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const { status } = await AudioModule.requestRecordingPermissionsAsync();
      const granted = status === 'granted';

      setState((prev) => ({
        ...prev,
        hasPermission: granted,
        isLoading: false,
        error: granted ? null : 'Microphone permission denied',
      }));

      if (!granted) {
        Alert.alert(
          'Microphone Permission Required',
          'Voice input requires microphone access. Please enable it in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openSettings();
                }
              },
            },
          ]
        );
      }

      return granted;
    } catch (error: any) {
      console.error('[Voice Capture] Error requesting permission:', error);
      setState((prev) => ({
        ...prev,
        hasPermission: false,
        isLoading: false,
        error: error.message || 'Failed to request permission',
      }));
      return false;
    }
  }, []);



  /**
   * Start recording
   */
  const startRecording = useCallback(async () => {
    try {
      console.log('[Voice Capture] Start recording called');
      console.log('[Voice Capture] Current recorder state:', recorderState);
      
      // Check permission
      if (state.hasPermission === false) {
        console.log('[Voice Capture] Requesting permission...');
        const granted = await requestPermission();
        if (!granted) {
          console.log('[Voice Capture] Permission denied');
          return;
        }
      } else if (state.hasPermission === null) {
        console.log('[Voice Capture] Requesting permission (null state)...');
        const granted = await requestPermission();
        if (!granted) {
          console.log('[Voice Capture] Permission denied');
          return;
        }
      }

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      // Configure audio mode for recording
      console.log('[Voice Capture] Setting audio mode...');
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      // Prepare and start recording
      console.log('[Voice Capture] Preparing to record...');
      
      // First prepare the recorder
      await recorder.prepareToRecordAsync();
      
      console.log('[Voice Capture] Recorder prepared, starting record...');
      // Start recording (synchronous call)
      recorder.record();
      
      console.log('[Voice Capture] Record() called, waiting for state update...');
      // Wait for state to update
      await new Promise(resolve => setTimeout(resolve, 200));

      setState((prev) => ({
        ...prev,
        isRecording: true,
        isPaused: false,
        isLoading: false,
        duration: 0,
        audioUri: null,
        error: null,
      }));

      console.log('[Voice Capture] Recording started successfully');
    } catch (error: any) {
      console.error('[Voice Capture] Error starting recording:', error);
      console.error('[Voice Capture] Error details:', error.message, error.stack);
      setState((prev) => ({
        ...prev,
        isRecording: false,
        isLoading: false,
        error: error.message || 'Failed to start recording',
      }));
    }
  }, [state.hasPermission, requestPermission, recorder, recorderState]);

  /**
   * Stop recording and return audio URI
   */
  const stopRecording = useCallback(async (): Promise<string | null> => {
    try {
      console.log('[Voice Capture] Stop recording called');
      console.log('[Voice Capture] Recorder state:', recorderState);
      
      if (!recorderState?.isRecording) {
        console.log('[Voice Capture] No active recording to stop');
        throw new Error('No active recording');
      }

      setState((prev) => ({ ...prev, isLoading: true }));

      console.log('[Voice Capture] Stopping recorder...');
      // Stop recording
      await recorder.stop();

      // Reset audio mode
      await setAudioModeAsync({
        allowsRecording: false,
      });

      // Get audio URI
      const uri = recorder.uri;

      if (!uri) {
        throw new Error('Failed to get recording URI');
      }

      // Store URI in ref for cleanup
      currentUriRef.current = uri;

      // Validate recording duration
      if (state.duration < VOICE_CONFIG.MIN_RECORDING_DURATION) {
        await deleteAudioFile(uri);
        currentUriRef.current = null;
        throw new Error(
          `Recording too short (minimum ${VOICE_CONFIG.MIN_RECORDING_DURATION / 1000}s)`
        );
      }

      // Get file info for validation
      const fileInfo = await getAudioFileInfo(uri);
      console.log('[Voice Capture] Recording stopped:', {
        uri,
        duration: state.duration,
        size: fileInfo.size,
      });

      setState((prev) => ({
        ...prev,
        isRecording: false,
        isPaused: false,
        isLoading: false,
        audioUri: uri,
        error: null,
      }));

      return uri;
    } catch (error: any) {
      console.error('[Voice Capture] Error stopping recording:', error);
      setState((prev) => ({
        ...prev,
        isRecording: false,
        isPaused: false,
        isLoading: false,
        error: error.message || 'Failed to stop recording',
      }));
      return null;
    }
  }, [state.duration, recorder, recorderState]);

  /**
   * Pause recording
   */
  const pauseRecording = useCallback(async () => {
    try {
      if (!recorderState.isRecording || state.isPaused) return;

      recorder.pause();

      setState((prev) => ({ ...prev, isPaused: true }));
      console.log('[Voice Capture] Recording paused');
    } catch (error: any) {
      console.error('[Voice Capture] Error pausing recording:', error);
      setState((prev) => ({
        ...prev,
        error: error.message || 'Failed to pause recording',
      }));
    }
  }, [state.isPaused, recorder, recorderState]);

  /**
   * Resume recording
   */
  const resumeRecording = useCallback(async () => {
    try {
      if (!state.isPaused) return;

      recorder.record();

      setState((prev) => ({ ...prev, isPaused: false }));
      console.log('[Voice Capture] Recording resumed');
    } catch (error: any) {
      console.error('[Voice Capture] Error resuming recording:', error);
      setState((prev) => ({
        ...prev,
        error: error.message || 'Failed to resume recording',
      }));
    }
  }, [state.isPaused, recorder]);

  /**
   * Cancel recording and cleanup
   */
  const cancelRecording = useCallback(async () => {
    try {
      // Store URI before stopping (if available)
      let uriToDelete: string | null = null;

      if (recorderState?.isRecording) {
        try {
          // Try to get URI before stopping
          uriToDelete = recorder.uri || currentUriRef.current;
          await recorder.stop();
        } catch (stopError) {
          console.log('[Voice Capture] Error stopping during cancel:', stopError);
          // Try to use the stored URI even if stop fails
          uriToDelete = currentUriRef.current;
        }
      } else {
        // Not recording, but might have a URI from previous recording
        uriToDelete = currentUriRef.current;
      }

      // Reset audio mode
      await setAudioModeAsync({
        allowsRecording: false,
      });

      // Delete audio file if exists
      if (uriToDelete) {
        await deleteAudioFile(uriToDelete);
        currentUriRef.current = null;
      }

      setState({
        isRecording: false,
        isPaused: false,
        isLoading: false,
        duration: 0,
        audioUri: null,
        hasPermission: state.hasPermission,
        error: null,
      });

      console.log('[Voice Capture] Recording cancelled');
    } catch (error: any) {
      console.error('[Voice Capture] Error cancelling recording:', error);
      setState((prev) => ({
        ...prev,
        isRecording: false,
        isPaused: false,
        error: error.message || 'Failed to cancel recording',
      }));
    }
  }, [recorder, recorderState, state.hasPermission]);

  /**
   * Cleanup resources
   */
  const cleanup = useCallback(async () => {
    try {
      // Store URI before cleanup
      let uriToDelete: string | null = currentUriRef.current;

      // Only stop if there's an active recording
      if (recorderState?.isRecording) {
        try {
          // Try to get URI before stopping (might fail if already released)
          try {
            uriToDelete = recorder.uri || uriToDelete;
          } catch (uriError) {
            // Recorder might be released, use stored URI
            console.log('[Voice Capture] Could not access recorder.uri during cleanup, using stored URI');
          }

          await recorder.stop();
        } catch (stopError) {
          // Ignore stop errors during cleanup
          console.log('[Voice Capture] Already stopped or invalid state during cleanup');
        }
      }

      // Reset audio mode
      try {
        await setAudioModeAsync({
          allowsRecording: false,
        });
      } catch (audioModeError) {
        // Ignore audio mode errors during cleanup
        console.log('[Voice Capture] Could not reset audio mode during cleanup');
      }

      // Delete audio file if it exists
      if (uriToDelete) {
        try {
          await deleteAudioFile(uriToDelete);
          currentUriRef.current = null;
        } catch (deleteError) {
          console.log('[Voice Capture] Could not delete audio file during cleanup:', deleteError);
        }
      }
    } catch (error) {
      console.error('[Voice Capture] Error during cleanup:', error);
    }
  }, [recorder, recorderState]);

  return {
    ...state,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
    requestPermission,
    cleanup,
  };
}
