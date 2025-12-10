# 1. AWS 공급자 설정 (서울 리전)
provider "aws" {
  region = "ap-northeast-2"
}

# =================================================================
# 1. 경기 일정 테이블 (SportsSchedules)
# =================================================================
resource "aws_dynamodb_table" "schedules" {
  name         = "SportsSchedules"       # 테이블 이름 (API 코드랑 일치해야 함!)
  billing_mode = "PAY_PER_REQUEST"       # 온디맨드 (쓴 만큼만 냄 - 초보자 추천)
  
  hash_key     = "date"                  # 파티션 키 (Partition Key)
  range_key    = "match_id"              # 정렬 키 (Sort Key)

  # 속성 정의 (키로 쓰는 것만 정의하면 됩니다)
  attribute {
    name = "date"
    type = "S"  # String (문자열)
  }

  attribute {
    name = "match_id"
    type = "S"  # String
  }

  tags = {
    Name        = "SportsSchedules"
    Environment = "Dev"
    Project     = "SportsAlarm"
  }
}

# =================================================================
# 2. 사용자 정보/토큰 테이블 (SportsUsers)
# =================================================================
resource "aws_dynamodb_table" "users" {
  name         = "SportsUsers"
  billing_mode = "PAY_PER_REQUEST"
  
  hash_key     = "user_id"               # 사용자 고유 ID (파티션 키)

  attribute {
    name = "user_id"
    type = "S"
  }

  tags = {
    Name        = "SportsUsers"
    Environment = "Dev"
    Project     = "SportsAlarm"
  }
}

# =================================================================
# AWS Amplify App (Next.js)
# =================================================================
resource "aws_amplify_app" "sports_alarm" {
  name       = "sports-alarm"
  repository = var.repository
  
  # GitHub 토큰 (OAuth 토큰)
  access_token = var.github_token

  # Next.js (App Router)를 위한 설정 ★중요
  platform = "WEB_COMPUTE"

  # 빌드 설정 (Next.js가 배포될 때 실행할 명령어)
  build_spec = <<-EOT
    version: 1
    frontend:
      phases:
        preBuild:
          commands:
            - npm ci
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: .next
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
  EOT

  # 환경 변수 설정 (DB 접속용 키)
  environment_variables = {
    "DB_ACCESS_KEY_ID"     = var.aws_access_key  # ✅ 이름 변경
    "DB_SECRET_ACCESS_KEY" = var.aws_secret_key  # ✅ 이름 변경
    "DB_REGION"            = var.region          # ✅ 이름 변경
    "NEXT_PUBLIC_API_URL"  = "/"
  }

  # 리액트/Next.js 라우팅을 위한 리다이렉트 규칙
  custom_rule {
    source = "/<*>"
    status = "404-200"
    target = "/index.html"
  }
}

# =================================================================
# Branch 연결 (Main 브랜치)
# =================================================================
resource "aws_amplify_branch" "main" {
  app_id      = aws_amplify_app.sports_alarm.id
  branch_name = "main"

  # 프레임워크 자동 감지
  framework = "Next.js - SSR"
  
  # 코드가 푸시되면 자동으로 빌드 시작
  enable_auto_build = true
}

# =================================================================
# 3. 크롤러 람다 (Backend Logic)
# =================================================================

# 1) 람다가 사용할 역할(Role) 생성 - DB 쓰기 권한 필요
resource "aws_iam_role" "lambda_crawler_role" {
  name = "sports_crawler_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

# 2) 람다에게 DynamoDB 모든 권한 부여
resource "aws_iam_role_policy_attachment" "lambda_dynamo_access" {
  role       = aws_iam_role.lambda_crawler_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess"
}

# 3) 람다에게 로그 남길 권한 부여 (CloudWatch)
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_crawler_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# 4) 람다 함수 생성
resource "aws_lambda_function" "crawler" {
  filename      = "crawler_package.zip"    # 아까 만든 압축파일 이름
  function_name = "SportsDataCrawler"
  role          = aws_iam_role.lambda_crawler_role.arn
  handler       = "lambda_function.lambda_handler" # 파일명.함수명
  runtime       = "python3.9"
  source_code_hash = filebase64sha256("crawler_package.zip") # 파일 바뀌면 재배포

  # 환경 변수 (리전 정보 등)
  environment {
    variables = {
      DB_REGION = var.region
    }
  }
}

# =================================================================
# 4. 스케줄러 (EventBridge) - 매일 자동 실행
# =================================================================

# 1 규칙 생성: 한국 시간 새벽 4시 = UTC 19시 (전날)
resource "aws_cloudwatch_event_rule" "daily_schedule" {
  name                = "daily-sports-crawl"
  description         = "매일 새벽 4시에 야구/축구 데이터 수집"
  # cron(분 시 일 월 요일 연도) - UTC 기준
  schedule_expression = "cron(0 19 * * ? *)" 
}

# 2 규칙을 람다와 연결
resource "aws_cloudwatch_event_target" "trigger_crawler" {
  rule      = aws_cloudwatch_event_rule.daily_schedule.name
  target_id = "SportsCrawlerLambda"
  arn       = aws_lambda_function.crawler.arn
}

# 3 EventBridge가 람다를 실행할 수 있게 권한 허용
resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.crawler.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.daily_schedule.arn
}

# =================================================================
# 5. 알람 발송 람다 (Notifier)
# =================================================================

# 1 람다 함수 생성
resource "aws_lambda_function" "notifier" {
  filename      = "notifier_package.zip"
  function_name = "SportsNotifier"
  role          = aws_iam_role.lambda_crawler_role.arn # 아까 만든 권한 재사용 (DB 읽기 필요)
  handler       = "notifier.lambda_handler"
  runtime       = "python3.9"
  source_code_hash = filebase64sha256("notifier_package.zip")
  
  # 실행 시간 넉넉하게 (알림 보낼 사람 많을 수 있으니)
  timeout = 60

  environment {
    variables = {
      DB_REGION = var.region
    }
  }
}

# 2 스케줄러 (매분 실행)
resource "aws_cloudwatch_event_rule" "every_minute" {
  name                = "check-match-every-minute"
  description         = "Fires every minute"
  schedule_expression = "rate(1 minute)"
}

# 3 스케줄러 연결
resource "aws_cloudwatch_event_target" "trigger_notifier" {
  rule      = aws_cloudwatch_event_rule.every_minute.name
  target_id = "SportsNotifierLambda"
  arn       = aws_lambda_function.notifier.arn
}

# 4 권한 허용
resource "aws_lambda_permission" "allow_eventbridge_notifier" {
  statement_id  = "AllowExecutionFromEventBridgeNotifier"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.notifier.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.every_minute.arn
}
