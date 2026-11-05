import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

/**
 * Reads aloud text using native text-to-speech engine.
 * Stops any current speech before starting new utterance.
 */
export async function speakText(
  text: string,
  onDone?: () => void
): Promise<void> {
  if (!text || text.trim().length === 0) return;

  try {
    // If currently speaking, stop first
    const isSpeaking = await Speech.isSpeakingAsync();
    if (isSpeaking) {
      await Speech.stop();
    }

    Speech.speak(text.trim(), {
      rate: Platform.OS === 'ios' ? 0.95 : 0.9,
      pitch: 1.0,
      language: 'en-US',
      onDone,
      onStopped: onDone,
      onError: () => onDone?.(),
    });
  } catch (error) {
    console.warn('Text-to-speech error:', error);
    onDone?.();
  }
}

/**
 * Stops any active speech synthesis.
 */
export async function stopSpeech(): Promise<void> {
  try {
    await Speech.stop();
  } catch {
    // Ignore stop errors
  }
}

/**
 * Checks whether speech is currently in progress.
 */
export async function isSpeaking(): Promise<boolean> {
  try {
    return await Speech.isSpeakingAsync();
  } catch {
    return false;
  }
}
