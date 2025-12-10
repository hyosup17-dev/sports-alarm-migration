# 1. 베이스 이미지: 파이썬 3.9가 설치된 가벼운 리눅스(Slim) 사용
FROM python:3.9-slim

# 2. 작업 폴더 설정 (컨테이너 내부의 /app 폴더에서 작업하겠다)
WORKDIR /app

# 3. 라이브러리 설치 파일 복사 및 설치
# (캐싱 효율을 위해 소스코드 복사 전에 실행)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. 소스 코드 복사
COPY main.py .

# 5. 실행 명령어 (컨테이너가 켜지면 이 명령어를 실행해라)
CMD ["python", "main.py"]