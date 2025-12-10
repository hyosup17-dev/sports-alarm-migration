# 1단계: 의존성 설치 (Builder)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
# CI는 clean install로 더 빠르고 안정적입니다
RUN npm ci

# 2단계: 소스 빌드
COPY . .
# Next.js 빌드 (이때 .env가 없어서 에러 날 수 있으니 더미 변수 주입하거나 무시 설정)
ENV NEXT_TELEMETRY_DISABLED = 1
RUN npm run build

# 3단계: 실행 준비 (Runner)
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV = production
ENV NEXT_TELEMETRY_DISABLED = 1

# 보안을 위해 root 권한이 없는 nextjs 사용자 생성
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 빌드된 결과물만 복사 (용량 최적화)
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 사용자 변경
USER nextjs

# 포트 노출
EXPOSE 3000
ENV PORT = 3000

# 서버 실행
CMD ["node", "server.js"]