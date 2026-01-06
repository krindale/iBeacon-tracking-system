import swaggerJsdoc from 'swagger-jsdoc';

const swaggerOptions: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'iBeacon Tracking API',
            version: '1.0.0',
            description: `
iBeacon 위치 추적 시스템을 위한 REST API 문서입니다.

## 개요
- 모바일 앱에서 iBeacon을 감지하고 서버에 위치를 보고합니다.
- 관리자 대시보드에서 실시간으로 사용자 위치를 확인할 수 있습니다.

## API 구분
- **External API**: 모바일 앱에서 호출하는 API
- **Admin API**: 관리자 대시보드에서 호출하는 API

## 실시간 업데이트
Socket.io를 통해 위치 변경 시 실시간 알림을 받을 수 있습니다:
- \`update_users\`: 사용자 목록 갱신
- \`update_history_{nickname}\`: 특정 사용자 히스토리 갱신
            `,
            contact: {
                name: 'Krindale',
                url: 'https://krindale.com'
            }
        },
        servers: [
            {
                url: 'https://api.krindale.com/ibeacon',
                description: 'Production Server'
            },
            {
                url: 'http://localhost:4000/api',
                description: 'Local Development'
            }
        ],
        tags: [
            {
                name: 'External',
                description: '모바일 앱용 API'
            },
            {
                name: 'Admin',
                description: '관리자 대시보드용 API'
            },
            {
                name: 'System',
                description: '시스템 관리 API'
            }
        ]
    },
    apis: ['./src/index.ts', './src/routes/*.ts']
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);
