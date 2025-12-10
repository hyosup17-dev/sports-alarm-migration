import firebase_admin
from firebase_admin import credentials, messaging
import boto3
from datetime import datetime, timedelta
import os
import json

# 1. Firebase 초기화 (한 번만 실행)
# 람다에 같이 올릴 키 파일 이름
if not firebase_admin._apps:
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred)

# 2. AWS 연결
REGION = os.environ.get('DB_REGION', 'ap-northeast-2')
dynamodb = boto3.resource('dynamodb', region_name=REGION)
schedule_table = dynamodb.Table('SportsSchedules')
user_table = dynamodb.Table('SportsUsers')

def lambda_handler(event, context):
    print("⏰ 알람 발송 봇 실행!")
    
    # 1. 현재 시간 + 10분 구하기 (한국 시간 기준 보정 필요할 수 있음)
    # 람다(UTC) -> 한국 시간(KST) 변환 로직은 복잡하니, 
    # 일단은 "오늘 날짜"의 모든 경기를 가져와서 체크하는 단순한 방식으로 갑니다.
    
    now = datetime.now() # UTC 기준일 수 있음 (설정에 따라 다름)
    # 한국 시간 보정 (UTC+9)
    kst_now = now + timedelta(hours=9)
    today_str = kst_now.strftime("%Y-%m-%d")
    current_time_str = kst_now.strftime("%H:%M") # 예: 18:20
    
    # "10분 뒤 경기 시작"을 찾고 싶다면?
    target_time = (kst_now + timedelta(minutes=10)).strftime("%H:%M")
    
    print(f"현재 시간(KST): {current_time_str}, 알람 타겟 시간: {target_time}")

    try:
        # 2. 오늘 경기 가져오기
        response = schedule_table.query(
            KeyConditionExpression="#date = :today",
            ExpressionAttributeNames={"#date": "date"},
            ExpressionAttributeValues={":today": today_str}
        )
        matches = response.get('Items', [])
        
        if not matches:
            print("오늘 예정된 경기가 없습니다.")
            return

        # 3. 경기 시간 비교
        for match in matches:
            # 경기 시간이 타겟 시간과 같은지 확인 (예: 18:30 경기라면 18:20에 알람)
            if match['time'] == target_time:
                print(f"🔔 경기 임박 발견! {match['home_team']} vs {match['away_team']}")
                send_alarm_for_match(match)
                
    except Exception as e:
        print(f"에러 발생: {e}")

def send_alarm_for_match(match):
    match_id = match['match_id']
    title = f"⚾ 경기 시작 10분 전!"
    body = f"{match['home_team']} vs {match['away_team']} ({match['time']})"

    # 4. 이 경기를 구독한 사람 찾기 (DynamoDB Scan - 데이터 많으면 비효율적이지만 MVP에선 OK)
    # 실제 프로덕션에선 '구독 테이블'을 따로 만드는 게 좋음 (MatchId -> UserList)
    
    # 여기서는 간단하게 "모든 유저를 훑어서" match_id를 가진 사람을 찾습니다.
    users = user_table.scan().get('Items', [])
    
    tokens_to_send = []
    
    for user in users:
        subscribed = user.get('subscribed_matches', [])
        # DynamoDB Set은 파이썬 set으로 옴
        if match_id in subscribed:
            # 유저 DB에 FCM 토큰을 저장해두는 로직이 필요함!
            # ★ 중요: 현재 우리는 User DB에 FCM 토큰을 저장 안 하고 있음.
            # 이 부분을 해결해야 함.
            pass 
            
    print("⚠️ 알림을 보내려면 User DB에 FCM 토큰이 저장되어 있어야 합니다.")