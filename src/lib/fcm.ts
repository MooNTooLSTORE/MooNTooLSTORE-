import { getMessaging, getToken } from "firebase/messaging";
import { app } from "@/firebase/config";

export const getFCMToken = async (): Promise<string | null> => {
  try {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const messaging = getMessaging(app);
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        // You need to replace this with your actual VAPID key from Firebase console
        const vapidKey = "YOUR_VAPID_KEY_FROM_FIREBASE_CONSOLE";
        const fcmToken = await getToken(messaging, { vapidKey: vapidKey });
        
        if (fcmToken) {
          console.log("FCM Token:", fcmToken);
          return fcmToken;
        } else {
          console.log("Can't get FCM token.");
          return null;
        }
      } else {
        console.log("Notification permission not granted.");
        return null;
      }
    }
    return null;
  } catch (error) {
    console.error("Error getting FCM token:", error);
    return null;
  }
};
