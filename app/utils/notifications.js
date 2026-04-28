import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import Constants from "expo-constants";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    console.warn('[Push] Not a physical device — skipping push token');
    return null;
  }

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    console.log('[Push] existing permission status:', existing);
    let status = existing;

    if (existing !== "granted") {
      const { status: requested } =
        await Notifications.requestPermissionsAsync();
      status = requested;
    }

    console.log('[Push] final permission status:', status);
    if (status !== "granted") return null;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    console.log('[Push] projectId:', projectId);
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token.data;
  } catch (err) {
    console.warn('[Push] getExpoPushTokenAsync failed:', err?.message ?? err);
    return null;
  }
}
