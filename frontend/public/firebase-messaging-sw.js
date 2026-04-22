importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCzmFNG8upz-EvupOWFQw6e-Qay-gixRWE",
  authDomain: "smart-ration-system-876c6.firebaseapp.com",
  projectId: "smart-ration-system-876c6",
  storageBucket: "smart-ration-system-876c6.firebasestorage.app",
  messagingSenderId: "325058285104",
  appId: "1:325058285104:web:ff8774f262a18c467367f5"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
