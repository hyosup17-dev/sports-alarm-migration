⚾ Sports Alarm Service (스포츠 알람)

"내가 응원하는 팀의 경기 시작 10분 전, 자동으로 알려주는 PWA 서비스"

🏗️ Architecture (아키텍처)
이 프로젝트는 Serverless 아키텍처에서 시작하여 On-Premise Kubernetes 환경으로 마이그레이션 되었습니다.

graph LR
    User[📱 User] --> |Web/PWA| Amplify[🖥️ Frontend (Next.js)]
    Amplify --> |API| DDB[(DynamoDB)]
    
    subgraph Automation
        Cron[⏰ Scheduler] --> Crawler[⚙️ Crawler (Python)]
        Cron --> Notifier[🔔 Notifier (Python)]
    end
    
    Crawler --> |Data| Naver[N Naver Sports]
    Crawler --> |Save| DDB
    
    Notifier --> |Read| DDB
    Notifier --> |Push| FCM[🔥 Firebase FCM]
    FCM --> |Alarm| User

![Architecture](./architecture_v2.png)

🛠️ Tech Stack (기술 스택)
분류                                  기술
Frontend                 Next.js, TypeScript, Tailwind
Backend                  Python, AWS Lambda
Database                 DynamoDB
Infra & DevOps           Terraform, Docker, Kubernetes(K3s)

🔥 Key Features (핵심 기능)
개인화된 알람: 별도 회원가입 없이 UUID 기반으로 내 응원팀 설정 및 구독 관리.
완전 자동화: EventBridge와 CronJob을 활용하여 매일 새벽 데이터 수집 및 경기 직전 알람 발송 자동화.
인프라 코드 관리 (IaC): Terraform을 사용하여 AWS 리소스 관리 및 Docker 컨테이너 기반 배포.
PWA 지원: 모바일 웹이지만 앱처럼 설치 가능하며 푸시 알림 수신.

🚀 Trouble Shooting (문제 해결)
이슈: Docker Desktop K8s에서 로컬 이미지를 찾지 못해 ImagePullBackOff 에러 발생.
해결: imagePullPolicy: Never 옵션을 추가하고 로컬 레지스트리를 활용하거나 Docker Hub를 경유하여 해결.
이슈: AWS Lambda 환경 변수(AWS_) 예약어 충돌 문제.
해결: Terraform 변수명을 DB_ 접두사로 변경하여 해결.

🏃 How to Run (실행 방법)
Docker Composedocker build -t sports-web .
docker run -p 3000:3000 --env-file .env.docker sports-web
Kuberneteskubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/website-deploy.yaml
