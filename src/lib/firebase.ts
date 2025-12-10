// lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getMessaging, getToken, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyAgEqCpP_pRtyR9k0YMsF5tiJXwDm3YKjA",
  authDomain: "sports-alarm-81d3e.firebaseapp.com",
  projectId: "sports-alarm-81d3e",
  storageBucket: "sports-alarm-81d3e.firebasestorage.app",
  messagingSenderId: "250633541812",
  appId: "1:250633541812:web:f4c95408fa88ac6e9e1fe1"
};

// 앱 초기화
const app = initializeApp(firebaseConfig);

// 메시징 객체 가져오기 (브라우저 환경에서만 동작)
const getFCMToken = async (setTokenFound: (found: boolean) => void) => {
  try {
    const messaging = getMessaging(app);
    // ★ 여기에 아까 발급받은 "VAPID Key"를 넣으세요!
    const vapidKey = "BEl3MRKRzuFLKdNRV1dfmVWo5151iZYbD4FiAki-vQjsbtxvcnSWN0S_hb2ZU65wxbtcWXiw3pNpNp605_L8HPI";

    const currentToken = await getToken(messaging, { vapidKey });
    
    if (currentToken) {
      console.log("🔥 내 FCM 토큰:", currentToken);
      setTokenFound(true);
      return currentToken; // 이 토큰을 DB에 저장해야 알림을 보낼 수 있음
    } else {
      console.log("토큰 생성 실패: 권한이 없거나 브라우저 문제");
      setTokenFound(false);
    }
  } catch (error) {
    console.error("FCM 에러:", error);
  }
};

export { app, getFCMToken };