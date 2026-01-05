# iBeacon Tracking System - AI Assistant Guide (CLAUDE.md)

이 문서는 AI 어시스턴트(Claude)가 이 프로젝트의 **코드 품질과 개발 가이드**를 이해하기 위한 기술 지침입니다.

> 💡 **운영/배포 관련 정보**는 `GEMINI.md`를 참조하세요.

---

## 🏗 프로젝트 구조

```text
.
├── backend/            # Express + Prisma 백엔드
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
├── nginx.conf          # 리버스 프록시 설정 (HTTPS/SSL)
├── docker-compose.yml  # 컨테이너 오케스트레이션
└── README.md
```

---

## 🛠 주요 기술 사양

| 항목 | 기술 | 비고 |
| :--- | :--- | :--- |
| **Runtime** | TypeScript (tsx) | CommonJS/ESM 혼합 주의 |
| **Database** | PostgreSQL (Docker) | 운영: AWS Lightsail 내 컨테이너 |
| **ORM** | Prisma v5.22.0 | `ApiLog` 모델로 통신 로그 저장 |
| **Real-time** | Socket.io | Silent Refresh 전략 사용 |
| **UI Framework** | Next.js 14 + shadcn/ui | Tailwind CSS 기반 |
| **Icons** | Lucide React | - |

---

## 📝 코딩 스타일 및 규칙

### TypeScript
- 모든 API 요청/응답 및 데이터 모델에 **Interface 정의 필수**
- `any` 타입 사용 최소화, `unknown` 또는 제네릭 활용

### API 설계
- **Error Handling**: 모든 컨트롤러는 try-catch 블록 필수
- **Logging**: `logApiCall` 헬퍼로 Request/Response 저장
- **Response Format**: 모바일 앱 호환을 위해 `code`, `timestamp` 필드 포함

```typescript
// 표준 응답 형식
{
  success: boolean,
  code: number,
  message: string,
  data?: any,
  timestamp: string  // ISO 8601
}
```

### Frontend
- `shadcn/ui` 디자인 원칙 준수
- 컴포넌트 추가: `npx shadcn@latest add [component]`
- 상태 관리: React hooks 기본 사용 (Context 필요시 추가)

---

## 🔌 Socket.io 이벤트 규약

| 이벤트 | 용도 | 트리거 |
| :--- | :--- | :--- |
| `update_users` | 사용자 목록 갱신 | 신규 가입, 위치 보고 |
| `update_history_{nickname}` | 특정 사용자 히스토리 갱신 | 위치 보고 |

---

## 🚀 로컬 개발 명령

### Backend
```bash
cd backend
npm run dev          # 서버 실행 (Port 4000)
npm run seed         # 비콘 데이터 초기화
npx prisma studio    # DB GUI 확인
npx prisma migrate dev  # 스키마 변경 시
```

### Frontend
```bash
cd frontend
npm run dev          # 개발 서버 (Port 3000)
```

---

## 🚧 향후 개선 과제

- [ ] **Auth**: Admin 대시보드 JWT/Session 인증
- [ ] **Charts**: 방문 빈도 시각화 (Recharts)
- [ ] **API Docs**: Swagger/OpenAPI 자동 생성
- [ ] **Testing**: Jest + React Testing Library 도입

---

## 💡 개발 팁

1. **실시간 업데이트 테스트**:
   ```bash
   curl -X POST https://ibeacon.krindale.com/api/locations/report \
     -H "Content-Type: application/json" \
     -d '{"nickName":"테스트","beaconUuid":"test-uuid","beaconMajor":"1","beaconMinor":"1"}'
   ```

2. **비콘 데이터 수정**: `backend/prisma/seed.ts` 수정 → `npm run seed`

3. **새 컴포넌트 추가**: `npx shadcn@latest add button` 형식으로 설치
