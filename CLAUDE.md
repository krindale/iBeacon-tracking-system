# iBeacon Tracking System - AI Assistant Guide (CLAUDE.md)

이 문서는 AI 어시스턴트(Claude)가 이 프로젝트의 코드를 이해하고 유지보수하기 위한 기술 지침입니다.

## 🏗 프로젝트 구조

```text
.
├── backend/            # Express + Prisma + SQLite 백엔드
│   ├── prisma/        # 데이터베이스 스키마 및 마이그레이션
│   │   ├── schema.prisma
│   │   └── seed.ts    # 비콘 초기 데이터 설정
│   └── src/
│       └── index.ts   # 서버 엔트리포인트 (API + Socket.io)
├── frontend/           # Next.js + shadcn/ui 프론트엔드
│   ├── src/
│   │   ├── app/       # Next.js App Router (Dashboard, History)
│   │   ├── components/# shadcn/ui 컴포넌트
│   │   └── lib/       # API 클라이언트 및 유틸리티
│   └── tailwind.config.ts
├── docker-compose.yml  # 로컬 컨테이너 실행 설정
└── README.md
```

## 🛠 주요 기술 사양

- **Runtime**: TypeScript (CommonJS/ESM 혼합 주의, 현재 `tsx` 사용 중)
- **Database**: SQLite (Prisma v5.22.0). `ApiLog` 모델을 통해 모든 통신 로그를 저장합니다.
- **Real-time**: `socket.io`를 사용하며, 성능 최적화를 위해 **Silent Refresh** (1페이지 한정) 전략을 사용합니다.
    - `update_users`: 전체 사용자 리스트 갱신 (신규 가입, 위치 보고 공통)
    - `update_history_{nickname}`: 특정 사용자의 히스토리 Timeline 갱신
- **Mobile Client**: `NetworkService`는 `MiroIT-iBeacon` User-Agent를 사용하여 요청을 보냅니다.
- **Pagination**: 날짜별 조회를 지원하며(Date-based Navigation), 특정 날짜 선택 시 해당일의 모든 데이터를 제한 없이 보여줍니다.
- **Endpoints**: 
    - `GET /api/admin/locations/:nickname/dates`: 사용자의 전체 기록 중 날짜 목록 조회
    - `GET /api/admin/locations/:nickname?date=YYYY-MM-DD`: 특정 날짜의 전체 기록 조회
- **Port**: Backend (4000), Frontend (3000)

## 📝 코딩 스타일 및 규칙

- **Types**: 모든 API 요청/응답 및 데이터 모델에 TypeScript Interface를 정의하여 사용합니다.
- **UI**: 프론트엔드 UI 수정 시 `shadcn/ui`의 디자인 원칙을 준수하며, `Lucide React` 아이콘을 활용합니다.
- **Error Handling**: API 컨트롤러는 try-catch 블록으로 감싸져 있으며, 특히 보고 시 유저가 없는 경우 404를 반환하도록 처리되어 있습니다.
- **API Logging**: `logApiCall` 헬퍼를 통해 Request/Response의 Header와 Body를 JSON 문자열로 저장합니다.
- **Admin APIs**: `/api/admin` 경로는 대시보드 전용 데이터를 제공하며, 상세보기 클릭 시 상세 로그를 Fetch 합니다.

## 🚀 워크플로우 명령

### Backend
- `npm run dev`: 서버 실행
- `npm run seed`: 비콘 데이터 초기화
- `npx prisma studio`: 데이터베이스 GUI 확인

### Frontend
- `npm run dev`: 개발 서버 실행 (port 3000)
- `npx shadcn@latest add [component]`: 새로운 UI 컴포넌트 추가

### Docker
- `docker-compose up`: 전체 스택 실행
- `docker build -t [image-name] .`: 이미지 빌드

## 🚧 향후 개선 과제
- **DB Migration**: SQLite에서 AWS RDS(PostgreSQL) 전환.
- **Auth**: Admin 대시보드 접근 제어 (JWT/Session).
- **Dashboard Charts**: 사용자 방문 빈도 시각화 (Recharts).
- **API Documentation**: Swagger/OpenAPI 사양서 자동 생성.

## 💡 개발 팁
- 실시간 업데이트 확인 시 `curl`을 통해 `/api/locations/report`에 POST 요청을 보내면 대시보드 화면이 즉시 갱신되는지 확인할 수 있습니다.
- 비콘 데이터 수정 시 `backend/prisma/seed.ts`를 수정하고 `npm run seed`를 실행하십시오.
