/**
 * Web-specific notification helpers.
 * Avoids loading native expo-notifications on web.
 */

export async function requestNotificationPermissions(): Promise<boolean> {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      const perm = await Notification.requestPermission();
      return perm === 'granted';
    } catch {
      return false;
    }
  }
  return false;
}

export async function scheduleDailyStudyReminder(
  _hour: number,
  _minute: number
): Promise<{ success: boolean; notificationId?: string; error?: string }> {
  return {
    success: false,
    error: 'Scheduled background push reminders require the iOS or Android mobile app.',
  };
}

export async function cancelDailyStudyReminder(): Promise<void> {
  // No-op on web
}

export async function sendInstantTestNotification(): Promise<{ success: boolean; error?: string }> {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      let perm = Notification.permission;
      if (perm !== 'granted') {
        perm = await Notification.requestPermission();
      }
      if (perm === 'granted') {
        new Notification('🔥 StudyAI Reminder Active!', {
          body: 'Your daily study reminders are set up and working! Keep that streak burning.',
        });
        return { success: true };
      }
      return { success: false, error: 'Web browser notification permission was not granted.' };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Web notification error' };
    }
  }
  return { success: false, error: 'Notifications are not supported in this browser environment.' };
}
