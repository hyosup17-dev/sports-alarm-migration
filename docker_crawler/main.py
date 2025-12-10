import requests
import boto3
import os
import time
from datetime import datetime

# ==========================================
# 환경 변수 설정 (Docker 실행 시 주입받음)
# ==========================================
AWS_ACCESS_KEY = os.environ.get('DB_ACCESS_KEY_ID')
AWS_SECRET_KEY = os.environ.get('DB_SECRET_ACCESS_KEY')
REGION = os.environ.get('DB_REGION', 'ap-northeast-2')

# DynamoDB 연결
try:
    dynamodb = boto3.resource(
        'dynamodb',
        region_name=REGION,
        aws_access_key_id=AWS_ACCESS_KEY,
        aws_secret_access_key=AWS_SECRET_KEY
    )
    schedule_table = dynamodb.Table('SportsSchedules')
    user_table = dynamodb.Table('SportsUsers')
    print("✅ AWS DynamoDB 연결 성공")
except Exception as e:
    print(f"❌ AWS 연결 실패: {e}")
    exit(1)

# ==========================================
# 크롤링 로직
# ==========================================
def run_crawler():
    print("🚀 [Docker] 스포츠 데이터 크롤러 시작!")
    
    # 1. 야구/축구 데이터 수집
    matches = []
    matches.extend(collect_schedule("baseball"))
    matches.extend(collect_schedule("soccer"))
    
    print(f"📊 총 {len(matches)}개의 경기 수집 완료.")

    # 2. 자동 구독 로직 실행
    if matches:
        auto_subscribe_fans(matches)
    
    print("🎉 모든 작업 완료. 컨테이너를 종료합니다.")

def collect_schedule(sport_type):
    today = datetime.now().strftime("%Y%m%d")
    date_formatted = datetime.now().strftime("%Y-%m-%d")
    category = "kbo" if sport_type == "baseball" else "kleague"
    
    api_url = f"https://m.sports.naver.com/{category}/schedule/index.json?date={today}"
    headers = {'User-Agent': 'Mozilla/5.0'}
    
    collected = []
    
    try:
        print(f"📡 [{sport_type}] 데이터 요청: {today}")
        res = requests.get(api_url, headers=headers)
        data = res.json()
        game_list = data.get('scheduleList', [])
        
        for game in game_list:
            if game.get('gameStatus') == 'CANCELED': continue

            home = game.get('homeTeamName', '')
            away = game.get('awayTeamName', '')
            time = game.get('gameStartTime', '00:00')
            match_id = f"{sport_type}_{date_formatted}_{home}"
            
            item = {
                'date': date_formatted,
                'match_id': match_id,
                'home_team': home,
                'away_team': away,
                'time': time,
                'type': sport_type
            }
            
            schedule_table.put_item(Item=item)
            collected.append(item)
            print(f"   💾 저장: {home} vs {away}")
            
    except Exception as e:
        print(f"❌ 수집 중 에러 ({sport_type}): {e}")
        
    return collected

def auto_subscribe_fans(matches):
    print("\n👥 자동 구독 처리 중...")
    try:
        users = user_table.scan().get('Items', [])
        count = 0
        for user in users:
            fav_team = user.get('favorite_team')
            if not fav_team: continue
            
            for match in matches:
                if match['home_team'] in fav_team or match['away_team'] in fav_team:
                    user_table.update_item(
                        Key={'user_id': user.get('user_id')},
                        UpdateExpression="ADD subscribed_matches :m",
                        ExpressionAttributeValues={':m': {match['match_id']}}
                    )
                    count += 1
        print(f"   👉 총 {count}건 자동 구독 완료.")
    except Exception as e:
        print(f"❌ 자동 구독 실패: {e}")

if __name__ == "__main__":
    run_test_mode = os.environ.get('TEST_MODE', 'false')
    # 테스트 모드면 가짜 데이터라도 넣어서 동작 확인
    if run_test_mode == 'true':
        print("⚠️ 테스트 모드로 실행합니다.")
    
    run_crawler()