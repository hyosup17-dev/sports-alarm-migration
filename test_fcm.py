import firebase_admin
from firebase_admin import credentials, messaging

# 1. 아까 다운받은 키 파일 경로
cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)

# 2. 알림을 받을 기기의 토큰 (웹사이트 화면에 있는 거 복사해서 넣으세요!)
# 예: "cM8q..." 처럼 엄청 긴 문자열
TARGET_TOKEN = "eByxxXZBhRouLe8f_pB87v:APA91bFG8kUdftY4rehFdveE8vs2b20INu9LiHYRQpDngI88Ysy8nj3N8i19GhAnRY54Vq41DdpO-gl9gtjcSMyXbCuZRajoG125hMPNzkcsjANAjh7CA6k"

def send_test_notification():
    # 보낼 메시지 내용
    message = messaging.Message(
        notification=messaging.Notification(
            title="⚾ 경기 시작 알림!",
            body="잠시 후 18:30 LG vs KIA 경기가 시작됩니다.",
        ),
        token=TARGET_TOKEN,
        # 웹용 아이콘 설정 (선택사항)
        webpush=messaging.WebpushConfig(
            notification=messaging.WebpushNotification(
                icon="/icon.png" 
            )
        )
    )

    try:
        response = messaging.send(message)
        print(f"🎉 성공! 메시지 ID: {response}")
        print("핸드폰이나 브라우저를 확인해 보세요!")
    except Exception as e:
        print(f"❌ 실패: {e}")

if __name__ == "__main__":
    send_test_notification()