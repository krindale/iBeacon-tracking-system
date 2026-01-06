# iBeacon Tracking System

비콘(iBeacon) 기반의 사용자 위치 추정 및 실시간 모니터링 시스템입니다. iOS/Android 앱에서 보고되는 비콘 데이터를 수집하고, 관리자 대시보드를 통해 사용자의 현재 상태와 이동 경로를 실시간으로 확인할 수 있습니다.

## 🚀 주요 기능

### 1. 실시간 모니터링 (Admin Dashboard)
- **사용자 현황**: 현재 활성 사용자 수와 각 사용자의 가장 가까운 비콘(위치) 정보를 실시간으로 표시합니다.
- **상태 자동 갱신**: Socket.io를 사용하여 브라우저 새로고침 없이 위치 변경 사항이 즉시 화면에 반영됩니다.
- **Glassmorphism UI**: modern하고 미려한 shadcn/ui 기반의 디자인 시스템을 적용하였습니다.
- **최적화된 동기화**: Silent Refresh 기술을 적용하여 데이터 갱신 시 화면 깜빡임 없이 부드러운 업데이트를 지원합니다.

### 2. 위치 히스토리
- **타임라인 뷰**: 특정 사용자의 과거 이동 경로를 시간순으로 시각화하여 제공합니다. (100개 단위 페이지네이션 적용)
- **API 상세 로그**: 각 보고 시점의 실제 API 통신 데이터(Header, Body)를 상세히 확인할 수 있는 디버그 패널을 제공합니다.
- **Reset 기능**: 특정 사용자의 전체 위치 기록을 초기화할 수 있습니다.
- **Swagger 연동**: 모든 API 규격을 [Swagger UI](https://api.krindale.com/ibeacon/docs/)에서 한눈에 확인하고 테스트할 수 있습니다.

### 3. 백엔드 API 서비스
- **사용자 등록**: 기기 UUID 기반의 익명 닉네임 등록 기능을 제공합니다.
- **위치 보고**: 앱의 백그라운드/포어그라운드에서 전송되는 비콘 데이터를 수집합니다.
- **비콘 관리**: 서비스 구역 내의 비콘 목록을 동적으로 관리하고 앱에 제공합니다. (현재 본사 1층~4층 포함 총 6개 등록)

## 🛠 기술 스택

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI Library**: shadcn/ui, Tailwind CSS
- **State/Real-time**: React Hooks, Socket.io-client
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js (TypeScript)
- **Framework**: Express
- **DB**: PostgreSQL (Relational Database)
- **ORM**: Prisma
- **Real-time**: Socket.io

## ⚙️ 시작하기

### 사전 요구 사항
- Node.js 18+ 
- npm 또는 yarn

### 1. 백엔드 설정
```bash
cd backend
npm install
# DB 마이그레이션 및 초기 비콘 데이터 시딩
npx prisma migrate dev --name init
npm run seed
# 서버 실행 (기본 4000 포트)
npm run dev
```

### 2. 프론트엔드 설정
```bash
cd frontend
npm install
# 개발 서버 실행 (기본 3000 포트)
npm run dev
```
### 3. Docker 실행 (권장)
```bash
docker-compose up --build
```
로컬에서 백엔드(4000)와 프론트엔드(3000)를 한 번에 실행할 수 있습니다.

## 🏗 AWS 배포 및 운영

### CI/CD 계획
- **GitHub Actions**: 코드를 Git에 푸시하면 자동으로 Docker 이미지를 빌드하고 ECR에 전송합니다.
- **AWS App Runner / ECS**: ECR에 저장된 이미지를 기반으로 서버를 구동합니다.

> [!WARNING]
> SQLite를 사용하는 경우, AWS 배포 시 데이터 영속성을 위해 볼륨 마운트 설정이 필요하거나, Amazon RDS와 같은 관리형 DB로 전환해야 합니다.

## 📡 API 엔드포인트 주요 요약 (api.krindale.com)

### 모바일 앱용
- `GET /ibeacon/api/external/beacons`: 현재 등록된 비콘 목록 조회
- `POST /ibeacon/api/users`: 사용자 등록 및 닉네임 설정
- `POST /ibeacon/api/locations/report`: 현재 위치 보고

### 관리자 및 문서
- `GET /ibeacon/docs/`: Swagger API 문서
- `GET /ibeacon/admin/users`: 전체 사용자 현황
- `GET /ibeacon/admin/locations/:nickname`: 사용자별 위치 히스토리
- `GET /ibeacon/admin/logs/:id`: 특정 API 통신의 상세 로그 조회
- `DELETE /ibeacon/admin/locations/:nickname`: 위치 히스토리 초기화
