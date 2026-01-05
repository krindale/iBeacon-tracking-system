# iBeacon Tracking System - System Context (GEMINI.md)

이 문서는 Gemini 기반 에이전트(Antigravity)를 위해 프로젝트의 핵심 로직과 통합 포인트를 기술합니다.

## 🎯 핵심 아키텍처 (Key Logic)

### 1. 실시간 데이터 파이프라인 (Real-time Pipeline)
- **Trigger**: `POST /api/locations/report` API 호출 시 DB 저장 후 `io.emit` 발생.
- **Payload**: 알림 수신 시 프론트엔드는 현재 페이지가 1페이지일 경우에만 **Silent Refresh**(Loading 처리 없는 fetch)를 수행하여 UX를 개선합니다.
- **Socket Events**: 
  - `update_users`: 전체 사용자 리스트 갱신 필요 시 사용. (신규 가입, 위치 보고 공통)
  - `update_history_{nickname}`: 특정 사용자의 히스토리 Timeline 갱신 시 사용.

### 2. 비콘 매칭 로직
- 사용자가 보고한 `(uuid, major, minor)` 튜플은 Prisma의 `@@unique([uuid, major, minor])` 인덱스를 통해 `Beacon` 테이블의 `alias`와 매칭됩니다.
- `beaconUuid`가 빈 값으로 들어오면 "Disconnected" 상태로 처리됩니다.

### 3. 데이터 보존 및 관리
- **Retention**: 히스토리는 성능을 위해 페이지네이션(100 items/page) 기반으로 조회됩니다. 전체 데이터는 DB에 영구 보존됩니다.
- **API Logging**: `ApiLog` 모델을 통해 모바일 앱과의 모든 통신 Header와 Body를 기록하여 디버깅 편의성을 극대화했습니다.
- **SQLite**: 경량 DB인 SQLite를 사용하여 데이터 일관성을 유지합니다.

### 4. 배포 및 운영 (Deployment)
- **Containerization**: Docker를 사용하여 백엔드와 프론트엔드를 독립된 서비스로 관리합니다.
- **Environment Management**: 백엔드는 SQLite를 사용하므로, 컨테이너 재생성 시 데이터 보존을 위해 볼륨 마운트가 필수적입니다.

## 🔗 외부 시스템 통합

- **Mobile Clients**: 본 시스템의 `NetworkService`는 `MiroIT-iBeacon` User-Agent를 사용하여 요청을 보냅니다.
- **Environment**: `.env` 파일을 통해 `DATABASE_URL` 및 `PORT` 설정을 관리합니다.

## 🚧 향후 개선 과제
- **DB Migration**: AWS RDS(PostgreSQL) 전환을 통한 데이터 신뢰성 확보.
- **Auth**: 현재 Admin 대시보드에 인증 로직이 없습니다. 운영 환경 도입 시 JWT 또는 Session 기반 인증 추가가 필수적입니다.
- **Dashboard Charts**: 사용자 방문 빈도 등을 시각화할 수 있는 리차트(Recharts) 통합.
- **API Documentation**: Swagger/OpenAPI 사양서 자동 생성 추가 고려.

## 🤖 에이전트 가이드
- 이 프로젝트의 백엔드 수정 시 반드시 `backend/node_modules`의 Prisma 클라이언트 상태를 확인하십시오.
- 프론트엔드 작업 시 `shadcn/ui` 컴포넌트 추가가 필요하면 `/tmp/npm-cache`를 활용하여 권한 문제를 피할 수 있습니다.
