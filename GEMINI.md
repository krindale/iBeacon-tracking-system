# Multi-Project Infrastructure (GEMINI.md)

이 문서는 Gemini 기반 에이전트(Antigravity)를 위해 **멀티 프로젝트 인프라 운영** 정보를 기술합니다.

> 💡 **코딩 스타일 및 개발 가이드**는 `CLAUDE.md`를 참조하세요.

## 📁 프로젝트 구조

```
localserver/
├── ibeacon/              # iBeacon 프로젝트
│   ├── frontend/         # Next.js 대시보드
│   └── backend/          # Express API
├── project2/             # (예비) 새 프로젝트
│   ├── frontend/
│   └── backend/
├── nginx.conf            # 공유 리버스 프록시
├── docker-compose.yml    # 공유 Docker 설정
└── init-db.sh            # DB 초기화 스크립트
```

---

## 🌐 도메인 구조

| 도메인 | 용도 | 라우팅 |
|--------|------|--------|
| `ibeacon.krindale.com` | iBeacon 대시보드 | → ibeacon-frontend:3000 |
| `api.krindale.com/ibeacon/*` | iBeacon API | → ibeacon-backend:4000/api/* |
| `project2.krindale.com` | (예비) 프로젝트2 대시보드 | → project2-frontend:3001 |
| `api.krindale.com/project2/*` | (예비) 프로젝트2 API | → project2-backend:4001/api/* |

---

## 🏗 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────────┐
│                      AWS Lightsail (2GB RAM)                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                      Nginx (Gateway)                      │  │
│  │  ibeacon.krindale.com  api.krindale.com  project2...     │  │
│  └───────────────────────────────────────────────────────────┘  │
│           │                      │                              │
│  ┌────────┴────────┐    ┌───────┴────────┐                     │
│  │ iBeacon Stack   │    │ (Project2...)  │                     │
│  │ frontend :3000  │    │ frontend :3001 │                     │
│  │ backend  :4000  │    │ backend  :4001 │                     │
│  └────────┬────────┘    └───────┬────────┘                     │
│           │                     │                              │
│  ┌────────┴─────────────────────┴────────┐                     │
│  │        Shared PostgreSQL :5432        │                     │
│  │   ibeacon_db  │  project2_db  │ ...   │                     │
│  └───────────────────────────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🐳 Docker 서비스 구성

| 서비스 | 포트 | 역할 |
|--------|------|------|
| `nginx` | 80, 443 | 리버스 프록시, SSL, API Gateway |
| `db` | 5432 | 공유 PostgreSQL (여러 DB 호스팅) |
| `ibeacon-frontend` | 3000 | iBeacon Next.js 대시보드 |
| `ibeacon-backend` | 4000 | iBeacon Express API |
| `certbot` | - | SSL 인증서 자동 갱신 |

---

## ➕ 새 프로젝트 추가 방법

### 1. 디렉토리 구조 생성
```bash
mkdir -p project2/{frontend,backend}
# 각 폴더에 Next.js, Express 프로젝트 초기화
```

### 2. docker-compose.yml 추가
```yaml
project2-backend:
  build: ./project2/backend
  ports:
    - "4001:4001"
  environment:
    - DATABASE_URL=postgresql://ibeacon:password@db:5432/project2_db
    - PORT=4001
  depends_on:
    - db
  restart: always

project2-frontend:
  build:
    context: ./project2/frontend
    args:
      - NEXT_PUBLIC_API_URL=https://api.krindale.com/project2
  depends_on:
    - project2-backend
  restart: always
```

### 3. nginx.conf 추가
```nginx
# Frontend
server {
    listen 443 ssl;
    server_name project2.krindale.com;
    ssl_certificate /etc/letsencrypt/live/project2.krindale.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/project2.krindale.com/privkey.pem;
    location / { proxy_pass http://project2-frontend:3001; ... }
}

# API (api.krindale.com 서버 블록에 추가)
location /project2/ {
    proxy_pass http://project2-backend:4001/api/;
    ...
}
```

### 4. DNS 레코드 추가 (Route 53)
- `project2.krindale.com` → A 레코드 → 15.165.169.154

### 5. SSL 인증서 발급
```bash
sudo docker-compose run --rm certbot certonly \
  --webroot --webroot-path=/var/www/certbot \
  -d project2.krindale.com
```

### 6. 데이터베이스 생성
```bash
docker exec -it ibeacon-tracking-system-db-1 psql -U ibeacon -c "CREATE DATABASE project2_db;"
```

### 7. 배포
```bash
sudo docker-compose up -d --build
```

---

## 🔧 운영 명령어

### 서버 접속
```bash
ssh -i ibeacon-key.pem ubuntu@15.165.169.154
```

### Docker 상태
```bash
sudo docker ps
sudo docker logs ibeacon-tracking-system-ibeacon-backend-1 --tail 50
```

### DB 백업
```bash
# 전체 백업
sudo docker exec ibeacon-tracking-system-db-1 pg_dumpall -U ibeacon > backup_all.sql

# 특정 DB만
sudo docker exec ibeacon-tracking-system-db-1 pg_dump -U ibeacon ibeacon_db > backup_ibeacon.sql
```

---

## 📡 iBeacon API 엔드포인트

### 모바일 앱용 (/api/ 포함)
| 엔드포인트 | 용도 |
|------------|------|
| `api.krindale.com/ibeacon/api/external/beacons` | 비콘 목록 조회 |
| `api.krindale.com/ibeacon/api/users` | 사용자 등록 |
| `api.krindale.com/ibeacon/api/locations/report` | 위치 보고 |

### 대시보드용
| 엔드포인트 | 용도 |
|------------|------|
| `api.krindale.com/ibeacon/admin/*` | 관리자 API |
| `api.krindale.com/ibeacon/docs/` | Swagger API 문서 |

---

## ⚠️ 메모리 제약

| 구성 | 예상 메모리 |
|------|------------|
| 1개 프로젝트 (현재) | ~800MB |
| 2개 프로젝트 | ~1.2GB |
| 3개 프로젝트 | ~1.6GB (한계) |

> 2GB RAM 인스턴스에서 3개 이상 프로젝트 운영 시 업그레이드 필요

---

## 🤖 에이전트 가이드

1. **새 프로젝트 추가 시** 위의 6단계 순서대로 진행
2. **모바일 API 경로**: `/ibeacon/api/*` (모바일 앱이 `/api/` 포함)
3. **대시보드 API 경로**: `/ibeacon/*`
4. **Swagger 문서**: https://api.krindale.com/ibeacon/docs/
5. **Docker 빌드** 시 RAM 제약으로 시간 소요 예상
6. **DNS 변경** 시 Route 53에서 A 레코드 추가 후 최대 5분 전파 대기
7. **CORS**: nginx에서 OPTIONS preflight 처리 (모바일 앱은 영향 없음)
