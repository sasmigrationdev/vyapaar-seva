/**
 * Voice Input Utilities
 *
 * Helper functions for audio file processing, formatting, and validation.
 */

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Format duration from milliseconds to MM:SS format
 *
 * @param milliseconds - Duration in milliseconds
 * @returns Formatted duration string (e.g., "02:35")
 */
export function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Format file size from bytes to human-readable format
 *
 * @param bytes - File size in bytes
 * @returns Formatted file size (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Get audio file extension based on platform
 *
 * @returns Audio file extension
 */
export function getAudioExtension(): string {
  if (Platform.OS === 'ios') {
    return '.m4a';
  } else if (Platform.OS === 'android') {
    return '.m4a';
  } else {
    return '.webm'; // Web
  }
}

/**
 * Get audio MIME type based on platform
 *
 * @returns Audio MIME type
 */
export function getAudioMimeType(): string {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    return 'audio/m4a';
  } else {
    return 'audio/webm'; // Web
  }
}

/**
 * Get audio file info
 *
 * @param uri - Audio file URI
 * @returns File info (size, exists)
 */
export async function getAudioFileInfo(uri: string): Promise<{
  size: number;
  exists: boolean;
}> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    return {
      size: fileInfo.exists ? (fileInfo.size || 0) : 0,
      exists: fileInfo.exists,
    };
  } catch (error) {
    console.error('[Voice Utils] Error getting file info:', error);
    return { size: 0, exists: false };
  }
}

/**
 * Delete audio file
 *
 * @param uri - Audio file URI
 */
export async function deleteAudioFile(uri: string): Promise<void> {
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
    console.log('[Voice Utils] Deleted audio file:', uri);
  } catch (error) {
    console.error('[Voice Utils] Error deleting file:', error);
  }
}

/**
 * Create FormData for audio upload
 * Handles platform-specific file upload requirements
 *
 * @param audioUri - Local audio file URI
 * @param language - Language code ('en' or 'hi')
 * @returns FormData object
 */
export async function createAudioFormData(
  audioUri: string,
  language: 'en' | 'hi' = 'en'
): Promise<FormData> {
  const formData = new FormData();

  // Get file info
  const fileInfo = await getAudioFileInfo(audioUri);

  if (!fileInfo.exists) {
    throw new Error('Audio file does not exist');
  }

  // Create file object
  const fileObject: any = {
    uri: audioUri,
    type: getAudioMimeType(),
    name: `recording${getAudioExtension()}`,
  };

  // Append file and language
  formData.append('file', fileObject);
  formData.append('language', language);

  return formData;
}

/**
 * Validate audio file
 *
 * @param uri - Audio file URI
 * @param maxSizeMB - Maximum file size in MB (default: 25)
 * @returns Validation result
 */
export async function validateAudioFile(
  uri: string,
  maxSizeMB: number = 25
): Promise<{
  valid: boolean;
  error?: string;
}> {
  try {
    const fileInfo = await getAudioFileInfo(uri);

    if (!fileInfo.exists) {
      return { valid: false, error: 'Audio file does not exist' };
    }

    const maxBytes = maxSizeMB * 1024 * 1024;
    if (fileInfo.size > maxBytes) {
      return {
        valid: false,
        error: `File size (${formatFileSize(fileInfo.size)}) exceeds maximum limit of ${maxSizeMB}MB`,
      };
    }

    return { valid: true };
  } catch (error: any) {
    return { valid: false, error: error.message || 'Failed to validate audio file' };
  }
}

/**
 * Generate unique recording filename
 *
 * @returns Filename with timestamp
 */
export function generateRecordingFilename(): string {
  const timestamp = Date.now();
  return `voice_recording_${timestamp}${getAudioExtension()}`;
}

/**
 * Get recording file path
 *
 * @returns Full file path for new recording
 */
export function getRecordingFilePath(): string {
  return `${FileSystem.cacheDirectory}${generateRecordingFilename()}`;
}

/**
 * Cleanup old recording files
 * Removes recordings older than specified hours
 *
 * @param olderThanHours - Delete files older than this (default: 24)
 */
export async function cleanupOldRecordings(olderThanHours: number = 24): Promise<void> {
  try {
    const cacheDir = FileSystem.cacheDirectory;
    if (!cacheDir) return;

    const files = await FileSystem.readDirectoryAsync(cacheDir);
    const cutoffTime = Date.now() - olderThanHours * 60 * 60 * 1000;

    for (const file of files) {
      if (file.startsWith('voice_recording_')) {
        const filePath = `${cacheDir}${file}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);

        if (fileInfo.exists && fileInfo.modificationTime) {
          if (fileInfo.modificationTime * 1000 < cutoffTime) {
            await deleteAudioFile(filePath);
          }
        }
      }
    }

    console.log('[Voice Utils] Cleanup completed');
  } catch (error) {
    console.error('[Voice Utils] Error cleaning up recordings:', error);
  }
}

/**
 * Format date for voice input
 * Handles relative dates like "today", "yesterday"
 *
 * @param dateString - Date string (ISO or relative)
 * @returns ISO date string (YYYY-MM-DD)
 */
export function formatVoiceDate(dateString: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lowerDate = dateString.toLowerCase().trim();

  if (lowerDate === 'today' || lowerDate === 'आज') {
    return today.toISOString().split('T')[0];
  }

  if (lowerDate === 'yesterday' || lowerDate === 'कल') {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  }

  // Try parsing as ISO date
  try {
    const parsed = new Date(dateString);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
  } catch {
    // Fall back to today if parsing fails
  }

  return today.toISOString().split('T')[0];
}

/**
 * Get confidence level description
 *
 * @param confidence - Confidence score (0-1)
 * @returns Confidence level description
 */
export function getConfidenceLevel(confidence: number): {
  level: 'high' | 'medium' | 'low';
  label: string;
  color: string;
} {
  if (confidence >= 0.9) {
    return { level: 'high', label: 'High Confidence', color: '#10B981' }; // Green
  } else if (confidence >= 0.7) {
    return { level: 'medium', label: 'Medium Confidence', color: '#F59E0B' }; // Orange
  } else {
    return { level: 'low', label: 'Low Confidence', color: '#EF4444' }; // Red
  }
}

/**
 * Check if device supports audio recording
 *
 * @returns True if audio recording is supported
 */
export function isAudioRecordingSupported(): boolean {
  // Audio recording is supported on all major platforms
  return Platform.OS === 'ios' || Platform.OS === 'android' || Platform.OS === 'web';
}
