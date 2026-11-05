import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';

// Configure default notification handler for foreground notifications on native platforms
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Requests notification permissions from the user.
 * Returns true if granted.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') {
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

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch (error) {
    console.warn('Error requesting notification permissions:', error);
    return false;
  }
}

/**
 * Ensures Android notification channel is registered.
 */
async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('study-reminders', {
      name: 'Daily Study Reminders',
      description: 'Daily streak reminders to review flashcards and quizzes',
      importance: AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2563EB',
      sound: 'default',
    });
  }
}

/**
 * Schedules a daily recurring study reminder at the specified hour and minute.
 * Cancels any existing reminders before setting a new one.
 */
export async function scheduleDailyStudyReminder(
  hour: number,
  minute: number
): Promise<{ success: boolean; notificationId?: string; error?: string }> {
  if (Platform.OS === 'web') {
    return { success: false, error: 'Notifications are not supported in web preview' };
  }

  try {
    const granted = await requestNotificationPermissions();
    if (!granted) {
      return {
        success: false,
        error: 'Notification permissions were not granted. Please enable notifications in device settings.',
      };
    }

    await ensureAndroidChannel();

    // Clear previously scheduled notifications to avoid duplicates
    await Notifications.cancelAllScheduledNotificationsAsync();

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🔥 Time for StudyAI!',
        body: 'Keep your streak alive! A quick 5-minute flashcard session will lock in your memory.',
        data: { screen: 'home' },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: Platform.OS === 'android' ? 'study-reminders' : undefined,
      },
    });

    return { success: true, notificationId };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown notification error';
    console.warn('Failed to schedule daily study reminder:', error);
    return { success: false, error: message };
  }
}

/**
 * Cancels all scheduled study reminders.
 */
export async function cancelDailyStudyReminder(): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.warn('Failed to cancel notifications:', error);
  }
}

/**
 * Immediately triggers a test notification so the user can verify notifications work.
 */
export async function sendInstantTestNotification(): Promise<{ success: boolean; error?: string }> {
  if (Platform.OS === 'web') {
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

  try {
    const granted = await requestNotificationPermissions();
    if (!granted) {
      return {
        success: false,
        error: 'Notification permissions are required. Please enable them in device settings.',
      };
    }

    await ensureAndroidChannel();

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🔥 StudyAI Reminder Active!',
        body: 'Your daily study reminders are set up and working! Keep that streak burning.',
        data: { test: true },
        sound: true,
      },
      trigger: null, // Triggers immediately
    });

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}
