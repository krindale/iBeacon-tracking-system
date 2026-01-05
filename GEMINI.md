# iBeacon Tracking System - System Context (GEMINI.md)

이 문서는 Gemini 기반 에이전트(Antigravity)를 위해 프로젝트의 **운영, 배포 및 인프라 관리** 정보를 기술합니다.

> 💡 **코딩 스타일 및 개발 가이드**는 `CLAUDE.md`를 참조하세요.

---

## 🌐 현재 운영 환경

| 항목 | 값 |
| :--- | :--- |
| **대시보드 URL** | https://ibeacon.krindale.com |
| **API Endpoint** | https://ibeacon.krindale.com/api |
| **호스팅** | AWS Lightsail (Seoul, ap-northeast-2) |
| **인스턴스** | `ibeacon-server-v2` (2GB RAM, Ubuntu 22.04) |
| **고정 IP** | 15.165.169.154 |
| **월 요금** | $12.00 (약 16,000원) |
| **SSL** | Let's Encrypt (자동 갱신) |

---

## 🏗 아키텍처 개요

```
┌─────────────────────────────────────────────────────────┐
│                    AWS Lightsail                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Docker Compose Stack               │   │
│  │  ┌─────────┐  ┌──────────┐  ┌─────────────┐    │   │
│  │  │  Nginx  │──│ Frontend │  │   Backend   │    │   │
│  │  │  :80    │  │  :3000   │  │   :4000     │    │   │
│  │  │  :443   │  └──────────┘  └─────────────┘    │   │
│  │  └─────────┘                       │           │   │
│  │       │                     ┌──────┴──────┐    │   │
│  │       └─────────────────────│ PostgreSQL  │    │   │
│  │                             │   :5432     │    │   │
│  │                             └─────────────┘    │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 🐳 Docker 서비스 구성

| 서비스 | 이미지 | 포트 | 역할 |
| :--- | :--- | :--- | :--- |
| `nginx` | nginx:alpine | 80, 443 | 리버스 프록시, SSL 종단 |
| `frontend` | 커스텀 빌드 | 3000 | Next.js 대시보드 |
| `backend` | 커스텀 빌드 | 4000 | Express API + Socket.io |
| `db` | postgres:17-alpine | 5432 | PostgreSQL 데이터베이스 |
| `certbot` | certbot/certbot | - | SSL 인증서 자동 갱신 |

---

## 📡 주요 API 엔드포인트

### 모바일 앱용 (External)
- `GET /api/external/beacons` - 비콘 목록 조회
- `POST /api/users` - 사용자 등록
- `POST /api/locations/report` - 위치 보고

### 관리자 대시보드용 (Admin)
- `GET /api/admin/users` - 전체 사용자 현황
- `GET /api/admin/locations/:nickname` - 사용자별 히스토리
- `GET /api/admin/locations/:nickname/dates` - 날짜 목록 조회
- `GET /api/admin/system/status` - 서버 리소스 상태
- `GET /api/admin/logs/:id` - API 통신 상세 로그

---

## 🚀 배포 워크플로우

### 코드 업데이트 배포
```bash
# 1. 서버 접속
ssh -i ibeacon-key.pem ubuntu@15.165.169.154

# 2. 최신 코드 가져오기
cd iBeacon-tracking-system
git pull origin main

# 3. 컨테이너 재빌드 및 실행
sudo docker-compose down
sudo docker-compose up -d --build
```

### 프론트엔드만 재빌드
```bash
sudo docker-compose build --no-cache frontend
sudo docker-compose up -d
```

---

## 🔐 보안 및 접근 관리

### SSH 접속
```bash
ssh -i ibeacon-key.pem ubuntu@15.165.169.154
# 또는
ssh -i ibeacon-key.pem ubuntu@ibeacon.krindale.com
```

### 방화벽 (Lightsail)
- 22 (SSH), 80 (HTTP), 443 (HTTPS) 오픈

### SSL 인증서
- **발급자**: Let's Encrypt
- **자동 갱신**: Certbot 컨테이너가 12시간마다 체크

---

## 📊 모니터링

### 서버 리소스 확인
```bash
ssh -i ibeacon-key.pem ubuntu@15.165.169.154 "free -h && top -bn1 | head -n 15"
```

### Docker 상태 확인
```bash
ssh -i ibeacon-key.pem ubuntu@15.165.169.154 "sudo docker ps"
```

### 로그 확인
```bash
# 백엔드 로그
ssh -i ibeacon-key.pem ubuntu@15.165.169.154 "sudo docker logs ibeacon-tracking-system-backend-1 --tail 50"

# Nginx 로그
ssh -i ibeacon-key.pem ubuntu@15.165.169.154 "sudo docker logs ibeacon-tracking-system-nginx-1 --tail 50"
```

---

## 🗄 데이터베이스 관리

### DB 접속 (컨테이너 내)
```bash
sudo docker exec -it ibeacon-tracking-system-db-1 psql -U postgres -d ibeacon_db
```

### 백업
```bash
sudo docker exec ibeacon-tracking-system-db-1 pg_dump -U postgres ibeacon_db > backup_$(date +%Y%m%d).sql
```

### 복원
```bash
cat backup.sql | sudo docker exec -i ibeacon-tracking-system-db-1 psql -U postgres -d ibeacon_db
```

---

## 🚧 향후 인프라 개선 과제

- [ ] **DB 분리**: AWS RDS(PostgreSQL) 전환으로 데이터 신뢰성 확보
- [ ] **Auth**: Admin 대시보드 JWT/Session 인증 추가
- [ ] **CI/CD**: GitHub Actions 자동 배포 파이프라인
- [ ] **Monitoring**: CloudWatch 또는 Prometheus/Grafana 도입
- [ ] **Backup**: 자동 일일 백업 스크립트 및 S3 저장

---

## 🤖 에이전트 가이드

1. **서버 작업 시** 반드시 SSH 키 파일(`ibeacon-key.pem`)이 로컬에 있는지 확인
2. **Docker 빌드** 시 서버 RAM 제약(2GB)으로 인해 시간이 소요될 수 있음
3. **환경 변수 변경** 시 `docker-compose.yml` 수정 후 재빌드 필요
4. **DNS 변경** 시 Route 53에서 A 레코드 수정 후 전파까지 최대 5분 소요
