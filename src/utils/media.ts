import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export interface CompressedImageResult {
  uri: string;
  width: number;
  height: number;
  base64?: string;
}

/**
 * Compresses and scales down an image using expo-image-manipulator
 */
export async function compressImage(
  uri: string,
  maxWidth: number = 1200,
  quality: number = 0.75
): Promise<CompressedImageResult> {
  try {
    const manipResult = await manipulateAsync(
      uri,
      [{ resize: { width: maxWidth } }],
      {
        compress: quality,
        format: SaveFormat.JPEG,
        base64: true,
      }
    );

    return {
      uri: manipResult.uri,
      width: manipResult.width,
      height: manipResult.height,
      base64: manipResult.base64,
    };
  } catch (err) {
    // Fallback to original URI if manipulation fails on web/unsupported environments
    console.warn('Image manipulation skipped or failed, using original uri:', err);
    return {
      uri,
      width: 800,
      height: 600,
    };
  }
}

/**
 * Formats byte size into human readable string
 */
export function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Safe haptic trigger across iOS/Android/Web
 */
export async function safeHaptics(
  type: 'light' | 'medium' | 'success' | 'warning' | 'error' = 'light'
): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    switch (type) {
      case 'light':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'success':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'warning':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'error':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
    }
  } catch {
    // Ignore unsupported device haptic calls
  }
}
