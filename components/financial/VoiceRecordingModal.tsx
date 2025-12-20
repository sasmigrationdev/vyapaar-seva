import { useEffect } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useAlert } from '@/hooks/useAlert';
import { Text } from '@/components/ui/Text';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useVoiceCapture } from '@/hooks/voice/useVoiceCapture';
import { WaveformAnimation } from '@/components/ui/WaveformAnimation';
import { VOICE_CONFIG } from '@/constants/VoiceConfig';
import { formatDuration } from '@/lib/utils/voice.utils';

/**
 * Props for VoiceRecordingModal
 */
interface VoiceRecordingModalProps {
  /**
   * Whether the modal is visible
   */
  visible: boolean;

  /**
   * Callback when modal is closed
   */
  onClose: () => void;

  /**
   * Callback when recording is completed successfully
   * @param audioUri - URI of the recorded audio file
   * @param duration - Duration of the recording in milliseconds
   */
  onRecordingComplete: (audioUri: string, duration: number) => void;

  /**
   * Selected language for recording
   * @default 'en'
   */
  language?: 'en' | 'hi';

  /**
   * Callback when language is changed
   */
  onLanguageChange?: (language: 'en' | 'hi') => void;
}

/**
 * Modal for voice recording with language selection
 *
 * Features:
 * - Real-time waveform animation during recording
 * - Language toggle between English and Hindi
 * - Duration tracking with auto-stop at max duration
 * - Visual feedback for recording states
 * - Permission handling
 *
 * @example
 * ```tsx
 * <VoiceRecordingModal
 *   visible={showRecording}
 *   onClose={() => setShowRecording(false)}
 *   onRecordingComplete={(uri, duration) => {
 *     console.log('Recorded:', uri, duration);
 *   }}
 *   language={language}
 *   onLanguageChange={setLanguage}
 * />
 * ```
 */
export default function VoiceRecordingModal({
  visible,
  onClose,
  onRecordingComplete,
  language = 'en',
  onLanguageChange,
}: VoiceRecordingModalProps) {
  const { error: showError, warning } = useAlert();
  const {
    isRecording,
    isLoading,
    duration,
    hasPermission,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
    requestPermission,
    cleanup,
  } = useVoiceCapture();

  // Request permission when modal opens
  useEffect(() => {
    if (visible && hasPermission === null) {
      requestPermission();
    }
  }, [visible, hasPermission, requestPermission]);

  // Don't auto-start recording - let user choose language first
  // useEffect(() => {
  //   if (visible && hasPermission === true && !isRecording && !audioUri && !isLoading) {
  //     handleStartRecording();
  //   }
  // }, [visible, hasPermission, isRecording, audioUri, isLoading]);

  // Cleanup on unmount only (not on cleanup function change)
  useEffect(() => {
    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStartRecording = async () => {
    try {
      await startRecording();
    } catch (err) {
      showError('Error', 'Failed to start recording. Please try again.');
      console.error('[VoiceRecordingModal] Start recording error:', err);
    }
  };

  const handleStopRecording = async () => {
    try {
      const uri = await stopRecording();
      if (uri) {
        onRecordingComplete(uri, duration);
        onClose();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';

      if (errorMessage.includes('too short')) {
        warning('Recording Too Short', 'Please record for at least 1 second.');
      } else {
        showError('Error', 'Failed to save recording. Please try again.');
      }

      console.error('[VoiceRecordingModal] Stop recording error:', err);
    }
  };

  const handleCancel = () => {
    cancelRecording();
    onClose();
  };

  const handleToggleLanguage = () => {
    if (onLanguageChange) {
      const newLanguage = language === 'en' ? 'hi' : 'en';
      onLanguageChange(newLanguage);
    }
  };

  // Calculate progress percentage for max duration
  const maxDuration = VOICE_CONFIG.MAX_RECORDING_DURATION;
  const progressPercentage = (duration / maxDuration) * 100;

  // Get language label
  const languageConfig = VOICE_CONFIG.LANGUAGES[language];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header with Language Toggle */}
          <View style={styles.header}>
            <Text style={styles.title}>Voice Input</Text>

            {onLanguageChange && (
              <TouchableOpacity
                style={[
                  styles.languageToggle,
                  isRecording && styles.languageToggleDisabled,
                ]}
                onPress={handleToggleLanguage}
                disabled={isRecording}
              >
                <Text style={styles.languageFlag}>{languageConfig.flag}</Text>
                <Text style={styles.languageLabel}>{languageConfig.label}</Text>
                <MaterialCommunityIcons
                  name="chevron-down"
                  size={16}
                  color={isRecording ? '#9CA3AF' : '#666'}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Permission Required State */}
          {hasPermission === false && (
            <View style={styles.permissionContainer}>
              <MaterialCommunityIcons name="microphone-off" size={64} color="#EF4444" />
              <Text style={styles.permissionText}>Microphone Permission Required</Text>
              <Text style={styles.permissionSubtext}>
                Please grant microphone access to use voice input
              </Text>
              <TouchableOpacity
                style={styles.permissionButton}
                onPress={requestPermission}
              >
                <Text style={styles.permissionButtonText}>Grant Permission</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Recording UI */}
          {hasPermission === true && (
            <>
              {/* Waveform Animation */}
              <View style={styles.waveformContainer}>
                <WaveformAnimation
                  isActive={isRecording}
                  barCount={7}
                  color="#0891B2"
                  barWidth={4}
                  barGap={6}
                  minHeight={10}
                  maxHeight={60}
                />
              </View>

              {/* Status Text */}
              <View style={styles.statusContainer}>
                {isLoading && <ActivityIndicator size="small" color="#0891B2" />}

                <Text style={styles.statusText}>
                  {isRecording ? 'Recording...' : 'Ready'}
                </Text>

                <Text style={styles.durationText}>{formatDuration(duration)}</Text>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${Math.min(progressPercentage, 100)}%`,
                      backgroundColor: progressPercentage > 90 ? '#EF4444' : '#0891B2',
                    },
                  ]}
                />
              </View>

              {/* Control Buttons */}
              <View style={styles.controls}>
                {/* Cancel Button */}
                <TouchableOpacity
                  style={[styles.controlButton, styles.cancelButton]}
                  onPress={handleCancel}
                  disabled={isLoading}
                >
                  <MaterialCommunityIcons name="close" size={28} color="#EF4444" />
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                {/* Start Button - only shown when not recording */}
                {!isRecording && (
                  <TouchableOpacity
                    style={[styles.controlButton, styles.startButton]}
                    onPress={handleStartRecording}
                    disabled={isLoading}
                  >
                    <MaterialCommunityIcons name="microphone" size={28} color="#0891B2" />
                    <Text style={styles.startButtonText}>Start</Text>
                  </TouchableOpacity>
                )}

                {/* Stop/Done Button */}
                <TouchableOpacity
                  style={[
                    styles.controlButton,
                    styles.doneButton,
                    !isRecording && styles.disabledButton,
                  ]}
                  onPress={handleStopRecording}
                  disabled={!isRecording || isLoading}
                >
                  <MaterialCommunityIcons
                    name="check"
                    size={28}
                    color={isRecording ? '#10B981' : '#9CA3AF'}
                  />
                  <Text
                    style={[
                      styles.doneButtonText,
                      !isRecording && styles.disabledButtonText,
                    ]}
                  >
                    Done
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Helper Text */}
              <Text style={styles.helperText}>
                {progressPercentage > 90
                  ? 'Recording will stop automatically at 5 minutes'
                  : 'Speak clearly for best results'}
              </Text>
            </>
          )}

          {/* Error Display */}
          {error && (
            <View style={styles.errorContainer}>
              <MaterialCommunityIcons name="alert-circle" size={20} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  languageToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  languageFlag: {
    fontSize: 16,
  },
  languageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  languageToggleDisabled: {
    opacity: 0.5,
  },
  permissionContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  permissionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },
  permissionSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  permissionButton: {
    marginTop: 16,
    backgroundColor: '#0891B2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  waveformContainer: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  durationText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0891B2',
    fontVariant: ['tabular-nums'],
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 24,
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  controlButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 4,
  },
  cancelButton: {
    backgroundColor: '#FEF2F2',
  },
  cancelButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
  startButton: {
    backgroundColor: '#ECFEFF',
  },
  startButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0891B2',
  },
  doneButton: {
    backgroundColor: '#ECFDF5',
  },
  doneButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  disabledButton: {
    backgroundColor: '#F3F4F6',
  },
  disabledButtonText: {
    color: '#9CA3AF',
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#EF4444',
  },
});
