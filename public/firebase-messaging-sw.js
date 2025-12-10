importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// 3단계의 firebaseConfig 내용을 여기에도 똑같이 한 번 더 적어줘야 합니다.
// (서비스 워커는 독립된 공간이라 위쪽 파일을 못 불러옵니다)
const firebaseConfig = {
  apiKey: "AIzaSyAgEqCpP_pRtyR9k0YMsF5tiJXwDm3YKjA",
  authDomain: "sports-alarm-81d3e.firebaseapp.com",
  projectId: "sports-alarm-81d3e",
  storageBucket: "sports-alarm-81d3e.firebasestorage.app",
  messagingSenderId: "250633541812",
  appId: "1:250633541812:web:f4c95408fa88ac6e9e1fe1"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// 백그라운드에서 알림 받았을 때 처리
messaging.onBackgroundMessage(function(payload) {
  console.log('백그라운드 메시지 수신:', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon.png' // public 폴더에 아이콘이 있다면
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});