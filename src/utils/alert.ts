import { Alert, Platform } from 'react-native';

export interface AlertButton {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

/**
 * Cross-platform alert that works seamlessly on Web (using window.confirm/alert)
 * as well as iOS and Android (using native Alert.alert).
 */
export function safeAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[]
): void {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return;

    const fullText = [title, message].filter(Boolean).join('\n\n');

    if (!buttons || buttons.length === 0) {
      window.alert(fullText);
      return;
    }

    if (buttons.length === 1) {
      window.alert(fullText);
      buttons[0]?.onPress?.();
      return;
    }

    // Two or more buttons (e.g., Cancel & Confirm/Delete/Reset)
    const cancelBtn = buttons.find((b) => b.style === 'cancel');
    const confirmBtn = buttons.find((b) => b.style !== 'cancel') ?? buttons[buttons.length - 1];

    const confirmed = window.confirm(fullText);
    if (confirmed) {
      confirmBtn?.onPress?.();
    } else {
      cancelBtn?.onPress?.();
    }
    return;
  }

  // Native iOS / Android
  Alert.alert(title, message, buttons);
}
