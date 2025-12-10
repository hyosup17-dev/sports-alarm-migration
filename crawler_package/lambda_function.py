import requests
import boto3
import os
from datetime import datetime
import time

# 환경 변수
REGION = os.environ.get('DB_REGION', 'ap-northeast-2')

def lambda_handler(event, context):
    print("🚀 [GitHub Actions 배포 성공] 크롤러 & 자동 구독 봇 시작!")
    
    # DynamoDB 연결
    try:
        dynamodb = boto3.resource('dynamodb', region_name=REGION)
        schedule_table = dynamodb.Table('SportsSchedules')
        user_table = dynamodb.Table('SportsUsers') # 유저 테이블 추가
    except Exception as e:
        print(f"❌ DB 연결 실패: {e}")
        return {"statusCode": 500, "body": "DB Error"}

    # 1. 오늘 경기 수집 및 저장
    today_matches = []
    today_matches.extend(collect_schedule(schedule_table, "baseball"))
    today_matches.extend(collect_schedule(schedule_table, "soccer"))
    
    print(f"📊 총 {len(today_matches)}개의 오늘 경기를 수집했습니다.")

    # 2. 응원팀 팬들에게 자동 구독 (Auto Subscribe)
    if today_matches:
        auto_subscribe_fans(user_table, today_matches)
    
    return {
        'statusCode': 200,
        'body': '크롤링 및 자동 구독 완료!'
    }

def collect_schedule(table, sport_type):
    today = datetime.now().strftime("%Y%m%d")
    date_formatted = datetime.now().strftime("%Y-%m-%d")
    category = "kbo" if sport_type == "baseball" else "kleague"
    
    api_url = f"https://m.sports.naver.com/{category}/schedule/index.json?date={today}"
    headers = {'User-Agent': 'Mozilla/5.0'}
    
    collected_matches = []

    try:
        print(f"📡 [{sport_type}] 데이터 요청: {today}")
        response = requests.get(api_url, headers=headers)
        data = response.json()
        game_list = data.get('scheduleList', [])
        
        for game in game_list:
            if game.get('gameStatus') == 'CANCELED': continue

            home = game.get('homeTeamName', '')
            away = game.get('awayTeamName', '')
            game_time = game.get('gameStartTime', '00:00')
            
            match_id = f"{sport_type}_{date_formatted}_{home}"
            
            item = {
                'date': date_formatted,
                'match_id': match_id,
                'home_team': home,
                'away_team': away,
                'time': game_time,
                'type': sport_type
            }
            
            # DB 저장
            table.put_item(Item=item)
            # 자동 구독을 위해 리스트에 담아둠
            collected_matches.append(item)
            print(f"   💾 저장됨: {home} vs {away}")
            
    except Exception as e:
        print(f"❌ 수집 에러 ({sport_type}): {e}")
        
    return collected_matches

def auto_subscribe_fans(user_table, matches):
    print("\n👥 [팬 찾기] 응원팀 설정 유저 자동 구독 시작...")
    
    try:
        # 모든 유저 스캔 (Scan)
        # 유저가 수십만 명이 아니면 Scan도 충분히 빠릅니다.
        response = user_table.scan()
        users = response.get('Items', [])
        
        count = 0
        
        for user in users:
            user_id = user.get('user_id')
            favorite_team = user.get('favorite_team') # 예: "LG 트윈스"
            
            if not favorite_team: continue

            # 이 유저가 좋아할 만한 경기가 있는지 확인
            for match in matches:
                # 네이버 데이터는 "LG", "한화" 처럼 짧게 옴
                # 유저 설정은 "LG 트윈스" 처럼 길게 옴
                # 따라서 "포함되는지(in)" 확인해야 함
                
                home = match['home_team'] # LG
                away = match['away_team'] # KIA
                
                # "LG" 가 "LG 트윈스" 안에 들어있는가? OR "KIA"가 "LG 트윈스" 안에 들어있는가?
                if home in favorite_team or away in favorite_team:
                    
                    # 빙고! 이 경기를 구독 목록에 추가 (ADD)
                    user_table.update_item(
                        Key={'user_id': user_id},
                        UpdateExpression="ADD subscribed_matches :m",
                        ExpressionAttributeValues={
                            ':m': {match['match_id']} # Set 형태로 추가
                        }
                    )
                    print(f"   ✅ [자동구독] {favorite_team} 팬({user_id[:5]}..) -> {home} vs {away}")
                    count += 1
                    
        print(f"👉 총 {count}건의 자동 구독 처리 완료.")
        
    except Exception as e:
        print(f"❌ 자동 구독 실패: {e}")