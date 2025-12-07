"use client";

import { useEffect } from 'react';
import { getMessaging, getToken } from 'firebase/messaging';
import { app } from '@/firebase/config'; // Assuming you export initialized app from config

const FirebaseMessaging = () => {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const messaging = getMessaging(app);
      
      // Example of how to get the token.
      // In a real app, you would request permission and then get the token.
      const requestPermissionAndGetToken = async () => {
        try {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            console.log('Notification permission granted.');
            // TODO: Get the token here and send it to your server.
            const currentToken = await getToken(messaging, { vapidKey: 'YOUR_VAPID_KEY_HERE' });
            if (currentToken) {
              console.log('FCM Token:', currentToken);
              // Send the token to your server and save it
            } else {
              console.log('No registration token available. Request permission to generate one.');
            }
          } else {
            console.log('Unable to get permission to notify.');
          }
        } catch (error) {
          console.error('An error occurred while retrieving token. ', error);
        }
      };

      // You might call this function based on a user action, e.g., a button click
      // requestPermissionAndGetToken();
    }
  }, []);

  return null; // This component does not render anything
};

export default FirebaseMessaging;
