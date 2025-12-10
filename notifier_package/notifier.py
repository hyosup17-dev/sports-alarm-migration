import firebase_admin
from firebase_admin import credentials, messaging
import boto3
import os
from datetime import datetime, timedelta
from boto3.dynamodb.conditions import Key

# 1. Firebase 초기화 (키 파일이 같은 폴더에 있어야 함)
if not firebase_admin._apps:
    try:
        # 람다 환경에서는 절대경로 문제로 에러가 날 수 있어 경로 보정
        cred = credentials.Certificate("./serviceAccountKey.json")
        firebase_admin.initialize_app(cred)
        print("✅ Firebase 초기화 성공")
    except Exception as e:
        print(f"❌ Firebase 초기화 실패: {e}")

# 2. AWS 연결
REGION = os.environ.get('DB_REGION', 'ap-northeast-2')
dynamodb = boto3.resource('dynamodb', region_name=REGION)
schedule_table = dynamodb.Table('SportsSchedules')
user_table = dynamodb.Table('SportsUsers')

def lambda_handler(event, context):
    print("⏰ 알람 발송 봇 실행!")
    
    # 1. 현재 시간(UTC) -> 한국 시간(KST) 변환 및 타겟 시간 계산
    # 람다는 기본적으로 UTC 시간이므로 9시간을 더해야 한국 시간
    utc_now = datetime.utcnow()
    kst_now = utc_now + timedelta(hours=9)
    
    # "10분 뒤" 시간 구하기 (이 시간에 시작하는 경기를 찾음)
    # 예: 지금이 18:20이면 -> 18:30 경기를 찾음
    target_time = (kst_now + timedelta(minutes=10)).strftime("%H:%M")
    today_str = kst_now.strftime("%Y-%m-%d") # 2025-04-01

    print(f"현재(KST): {kst_now.strftime('%H:%M')}, 타겟 시간: {target_time}")

    try:
        # 2. 오늘 경기 중 '타겟 시간'에 시작하는 경기 찾기
        # (DB 설계상 날짜로 쿼리하고 필터링하는 게 효율적)
        response = schedule_table.query(
            KeyConditionExpression=Key('date').eq(today_str)
        )
        matches = response.get('Items', [])
        
        target_matches = [m for m in matches if m['time'] == target_time]
        
        if not target_matches:
            print(f"📭 {target_time}에 시작하는 경기가 없습니다.")
            return

        # 3. 경기가 있다면, 구독자에게 알림 발송
        for match in target_matches:
            print(f"🔔 경기 임박! {match['home_team']} vs {match['away_team']}")
            send_notification(match)
            
    except Exception as e:
        print(f"❌ 에러 발생: {e}")
        raise e

def send_notification(match):
    match_id = match['match_id']
    title = "⚾ 경기 시작 10분 전!"
    body = f"{match['home_team']} vs {match['away_team']} 경기가 곧 시작됩니다!"

    # 4. 이 경기를 구독한 유저 찾기 (Scan)
    # (유저가 수만 명이 넘어가면 Scan 대신 Index를 써야 하지만, 지금은 Scan으로 충분)
    try:
        # 구독 정보가 있는 유저만 가져옴 (필터링)
        response = user_table.scan()
        users = response.get('Items', [])
        
        success_count = 0
        
        for user in users:
            # 1) 구독 목록 확인
            subscribed = user.get('subscribed_matches', set())
            if match_id in subscribed:
                # 2) 토큰 확인
                token = user.get('fcm_token')
                if token:
                    # 3) 발송
                    send_fcm(token, title, body)
                    success_count += 1
        
        print(f"   👉 총 {success_count}명에게 알림 발송 완료")

    except Exception as e:
        print(f"   ❌ 유저 조회 실패: {e}")

def send_fcm(token, title, body):
    try:
        message = messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            token=token,
            # 웹 아이콘 설정
            webpush=messaging.WebpushConfig(
                notification=messaging.WebpushNotification(
                    icon="/icon.png"
                )
            )
        )
        messaging.send(message)
    except Exception as e:
        print(f"      - 전송 실패 (토큰 만료 등): {e}")