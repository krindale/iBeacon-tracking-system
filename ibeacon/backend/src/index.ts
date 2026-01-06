import 'dotenv/config';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import os from 'os';
import v8 from 'v8';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger.js';

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

// Swagger UI setup
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'iBeacon API Documentation'
}));

// Swagger JSON endpoint
app.get('/api/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);
    socket.on('disconnect', () => {
        console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 4000;

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: AWS 헬스체크용 엔드포인트
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * @swagger
 * /admin/system/status:
 *   get:
 *     summary: Get system resource usage
 *     description: 서버의 CPU, 메모리, 업타임 등 시스템 리소스 상태를 조회합니다.
 *     tags: [System]
 *     responses:
 *       200:
 *         description: System status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 memory:
 *                   type: object
 *                   properties:
 *                     heapUsed:
 *                       type: number
 *                       description: Node.js 힙 사용량 (MB)
 *                     heapTotal:
 *                       type: number
 *                       description: Node.js 힙 총량 (MB)
 *                     heapPercent:
 *                       type: number
 *                       description: 힙 사용률 (%)
 *                     systemFree:
 *                       type: number
 *                       description: 시스템 여유 메모리 (GB)
 *                     systemTotal:
 *                       type: number
 *                       description: 시스템 총 메모리 (GB)
 *                 cpu:
 *                   type: object
 *                   properties:
 *                     load:
 *                       type: array
 *                       items:
 *                         type: number
 *                       description: 1분/5분/15분 평균 부하
 *                     count:
 *                       type: number
 *                       description: CPU 코어 수
 *                 uptime:
 *                   type: number
 *                   description: 서버 업타임 (초)
 */
app.get('/api/admin/system/status', (req, res) => {
    try {
        const mem = process.memoryUsage();
        const heapStats = v8.getHeapStatistics();
        const uptime = process.uptime();
        const freeMem = os.freemem();
        const totalMem = os.totalmem();
        const loadAvg = os.loadavg();
        const cpus = os.cpus();

        res.json({
            memory: {
                heapUsed: Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100,
                heapTotal: Math.round(mem.heapTotal / 1024 / 1024 * 100) / 100,
                heapLimit: Math.round(heapStats.heap_size_limit / 1024 / 1024 * 100) / 100,
                heapPercent: Math.round((mem.heapUsed / heapStats.heap_size_limit) * 100),
                rss: Math.round(mem.rss / 1024 / 1024 * 100) / 100,
                systemFree: Math.round(freeMem / 1024 / 1024 / 1024 * 100) / 100,
                systemTotal: Math.round(totalMem / 1024 / 1024 / 1024 * 100) / 100,
                systemPercent: Math.round((totalMem - freeMem) / totalMem * 100)
            },
            cpu: {
                load: loadAvg,
                count: cpus.length,
                model: cpus[0].model
            },
            uptime: Math.round(uptime),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Failed to get system status:', error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

// Helper to log API calls
async function logApiCall(data: {
    method: string;
    url: string;
    requestHeaders: any;
    requestBody: any;
    responseStatus: number;
    responseHeaders: any;
    responseBody: any;
}) {
    try {
        return await prisma.apiLog.create({
            data: {
                method: data.method,
                url: data.url,
                requestHeaders: JSON.stringify(data.requestHeaders),
                requestBody: JSON.stringify(data.requestBody),
                responseStatus: data.responseStatus,
                responseHeaders: JSON.stringify(data.responseHeaders),
                responseBody: JSON.stringify(data.responseBody),
            }
        });
    } catch (error) {
        console.error('Failed to log API call:', error);
        return null;
    }
}

/**
 * @swagger
 * /external/beacons:
 *   get:
 *     summary: Get list of registered beacons
 *     description: 등록된 모든 iBeacon 목록을 조회합니다. 모바일 앱에서 비콘 매칭에 사용합니다.
 *     tags: [External]
 *     responses:
 *       200:
 *         description: Beacons retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 code:
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Beacons fetched successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       uuid:
 *                         type: string
 *                         example: FDA50693-A4E2-4FB1-AFCF-C6EB07647825
 *                       major:
 *                         type: string
 *                         example: "10001"
 *                       minor:
 *                         type: string
 *                         example: "19645"
 *                       alias:
 *                         type: string
 *                         example: Office
 */
app.get('/api/external/beacons', async (req, res) => {
    try {
        const beacons = await prisma.beacon.findMany();
        res.json({
            success: true,
            code: 200,
            message: "Beacons fetched successfully",
            data: beacons.map((b: any) => ({
                uuid: b.uuid,
                major: b.major,
                minor: b.minor,
                alias: b.alias
            })),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Register a new user
 *     description: |
 *       새로운 사용자를 등록하거나 기존 사용자 정보를 업데이트합니다.
 *       - 같은 deviceUuid로 재등록 시 닉네임이 업데이트됩니다.
 *       - 같은 nickName이 다른 기기에서 사용될 경우 기기가 이전됩니다.
 *     tags: [External]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deviceUuid
 *               - nickName
 *             properties:
 *               deviceUuid:
 *                 type: string
 *                 description: 기기 고유 식별자
 *                 example: F924C6AC-091E-4259-ADA2-860AF10F0EF7
 *               nickName:
 *                 type: string
 *                 description: 사용자 닉네임 (userNickName도 가능)
 *                 example: 장강아지_i
 *     responses:
 *       200:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 code:
 *                   type: number
 *                   example: 200
 *                 data:
 *                   type: object
 *                   properties:
 *                     nickName:
 *                       type: string
 *                     deviceUuid:
 *                       type: string
 *       400:
 *         description: Missing required fields
 */
app.post('/api/users', async (req, res) => {
    const { deviceUuid, nickName, userNickName } = req.body;
    const finalNickName = nickName || userNickName;

    if (!deviceUuid || !finalNickName) {
        return res.status(400).json({
            success: false,
            code: 400,
            message: "deviceUuid and nickName (or userNickName) are required",
            timestamp: new Date().toISOString()
        });
    }

    try {
        let user = await prisma.user.findUnique({
            where: { deviceUuid }
        });

        if (user) {
            const existingWithNick = await prisma.user.findUnique({
                where: { nickname: finalNickName }
            });

            if (existingWithNick && existingWithNick.deviceUuid !== deviceUuid) {
                user = await prisma.user.update({
                    where: { nickname: finalNickName },
                    data: { deviceUuid: deviceUuid }
                });
            } else {
                user = await prisma.user.update({
                    where: { deviceUuid },
                    data: { nickname: finalNickName }
                });
            }
        } else {
            const existingWithNick = await prisma.user.findUnique({
                where: { nickname: finalNickName }
            });

            if (existingWithNick) {
                user = await prisma.user.update({
                    where: { nickname: finalNickName },
                    data: { deviceUuid: deviceUuid }
                });
            } else {
                user = await prisma.user.create({
                    data: { deviceUuid, nickname: finalNickName }
                });
            }
        }

        console.log(`[Socket] Emitting update_users`);
        io.emit('update_users');

        const responseData = {
            success: true,
            code: 200,
            message: "User registered successfully",
            data: {
                nickName: user.nickname,
                deviceUuid: user.deviceUuid
            },
            timestamp: new Date().toISOString()
        };

        await logApiCall({
            method: 'POST',
            url: '/api/users',
            requestHeaders: req.headers,
            requestBody: req.body,
            responseStatus: 200,
            responseHeaders: res.getHeaders ? res.getHeaders() : {},
            responseBody: responseData
        });

        res.json(responseData);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            code: 500,
            message: "Internal server error",
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * @swagger
 * /locations/report:
 *   post:
 *     summary: Report current location
 *     description: |
 *       현재 감지된 비콘 정보를 서버에 보고합니다.
 *       비콘 정보가 비어있으면 "Disconnected" 상태로 처리됩니다.
 *       위치 보고 시 Socket.io를 통해 실시간 알림이 발생합니다.
 *     tags: [External]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nickName
 *             properties:
 *               nickName:
 *                 type: string
 *                 description: 사용자 닉네임
 *                 example: 장강아지_i
 *               beaconUuid:
 *                 type: string
 *                 description: 감지된 비콘 UUID
 *                 example: FDA50693-A4E2-4FB1-AFCF-C6EB07647825
 *               beaconMajor:
 *                 type: string
 *                 description: 비콘 Major 값
 *                 example: "10001"
 *               beaconMinor:
 *                 type: string
 *                 description: 비콘 Minor 값
 *                 example: "19645"
 *               timeStamp:
 *                 type: string
 *                 format: date-time
 *                 description: 클라이언트 측 타임스탬프 (선택)
 *     responses:
 *       200:
 *         description: Location reported successfully
 *       400:
 *         description: Missing nickName
 */
app.post('/api/locations/report', async (req, res) => {
    const { nickName, userNickName, beaconUuid, beaconMajor, beaconMinor, timeStamp } = req.body;
    const finalNickName = nickName || userNickName;

    if (!finalNickName) {
        return res.status(400).json({
            success: false,
            code: 400,
            message: "nickName or userNickName is required",
            timestamp: new Date().toISOString()
        });
    }

    try {
        const responseData = {
            success: true,
            code: 200,
            message: "Location reported successfully",
            data: {
                nickName: finalNickName
            },
            timestamp: new Date().toISOString()
        };

        const apiLog = await logApiCall({
            method: 'POST',
            url: '/api/locations/report',
            requestHeaders: req.headers,
            requestBody: req.body,
            responseStatus: 200,
            responseHeaders: res.getHeaders ? res.getHeaders() : {},
            responseBody: responseData
        });

        await prisma.locationReport.create({
            data: {
                nickname: finalNickName,
                beaconUuid: beaconUuid || "",
                beaconMajor: beaconMajor || "",
                beaconMinor: beaconMinor || "",
                timestamp: timeStamp,
                apiLogId: apiLog?.id
            }
        });

        console.log(`[Socket] Emitting update_history_${finalNickName}`);
        io.emit('update_users');
        io.emit(`update_history_${finalNickName}`);

        res.json(responseData);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            code: 500,
            message: "Internal server error",
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Get all users with latest location
 *     description: 모든 사용자의 현재 상태와 마지막 위치를 조회합니다.
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   nickname:
 *                     type: string
 *                     example: 장강아지_i
 *                   deviceUuid:
 *                     type: string
 *                   lastSeen:
 *                     type: string
 *                     format: date-time
 *                   currentBeacon:
 *                     type: string
 *                     example: Office
 *                   status:
 *                     type: string
 *                     enum: [Active, Away]
 */
app.get('/api/admin/users', async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            include: {
                reports: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            }
        });

        const data = await Promise.all(users.map(async (user: any) => {
            const latestReport = user.reports[0];
            let beaconAlias = "Unknown";

            if (latestReport && latestReport.beaconUuid) {
                const beacon = await prisma.beacon.findUnique({
                    where: {
                        uuid_major_minor: {
                            uuid: latestReport.beaconUuid,
                            major: latestReport.beaconMajor,
                            minor: latestReport.beaconMinor
                        }
                    }
                });
                beaconAlias = beacon?.alias || "Outside Range";
            } else if (latestReport) {
                beaconAlias = "Disconnected";
            }

            return {
                nickname: user.nickname,
                deviceUuid: user.deviceUuid,
                lastSeen: latestReport?.createdAt || user.updatedAt,
                currentBeacon: beaconAlias,
                status: latestReport && latestReport.beaconUuid ? "Active" : "Away"
            };
        }));

        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

/**
 * @swagger
 * /admin/locations/{nickname}:
 *   get:
 *     summary: Get location history for a user
 *     description: 특정 사용자의 위치 히스토리를 조회합니다. 날짜별 필터링과 페이징을 지원합니다.
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: nickname
 *         required: true
 *         schema:
 *           type: string
 *         description: 사용자 닉네임
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: 특정 날짜로 필터링 (YYYY-MM-DD)
 *       - in: query
 *         name: all
 *         schema:
 *           type: boolean
 *         description: 전체 조회 (페이징 무시)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 200
 *         description: 페이지당 개수
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 페이지 번호
 *     responses:
 *       200:
 *         description: History retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: number
 *                       nickname:
 *                         type: string
 *                       beaconUuid:
 *                         type: string
 *                       beaconAlias:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                     page:
 *                       type: number
 *                     limit:
 *                       type: number
 *                     totalPages:
 *                       type: number
 *   delete:
 *     summary: Reset location history for a user
 *     description: 특정 사용자의 모든 위치 히스토리를 삭제합니다.
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: nickname
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: History reset successfully
 */
app.get('/api/admin/locations/:nickname', async (req, res) => {
    const { nickname } = req.params;
    try {
        const { date, all, limit, page, offset } = req.query;
        const itemsPerPage = Number(limit) || 200;
        const currentPage = Number(page) || 1;

        let where: any = { nickname };

        if (date) {
            const startOfDay = new Date(date as string);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date as string);
            endOfDay.setHours(23, 59, 59, 999);

            where.createdAt = {
                gte: startOfDay,
                lte: endOfDay
            };
        }

        let take = (all === 'true' || date) ? undefined : itemsPerPage;
        let skip = (all === 'true' || date) ? undefined : (offset ? Number(offset) : (currentPage - 1) * itemsPerPage);

        const [reports, totalCount] = await Promise.all([
            prisma.locationReport.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take,
                skip
            }),
            prisma.locationReport.count({
                where
            })
        ]);

        const data = await Promise.all(reports.map(async (report: any) => {
            let beaconAlias = report.beaconUuid ? "Checking..." : "Disconnected";

            if (report.beaconUuid) {
                const beacon = await prisma.beacon.findUnique({
                    where: {
                        uuid_major_minor: {
                            uuid: report.beaconUuid,
                            major: report.beaconMajor,
                            minor: report.beaconMinor
                        }
                    }
                });
                beaconAlias = beacon?.alias || "Unknown Beacon";
            }

            return {
                ...report,
                beaconAlias
            };
        }));

        res.json({
            data,
            pagination: {
                total: totalCount,
                page: currentPage,
                limit: itemsPerPage,
                totalPages: Math.ceil(totalCount / itemsPerPage)
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

/**
 * @swagger
 * /admin/locations/{nickname}/dates:
 *   get:
 *     summary: Get available dates for user history
 *     description: 사용자의 히스토리가 존재하는 날짜 목록을 조회합니다.
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: nickname
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dates retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 *               example: ["2026-01-06", "2026-01-05", "2026-01-04"]
 */
app.get('/api/admin/locations/:nickname/dates', async (req, res) => {
    const { nickname } = req.params;
    try {
        const reports = await prisma.locationReport.findMany({
            where: { nickname },
            select: { createdAt: true },
            orderBy: { createdAt: 'desc' }
        });

        const uniqueDates = [...new Set(reports.map(r => {
            const date = new Date(r.createdAt);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }))];

        res.json(uniqueDates);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

/**
 * @swagger
 * /admin/logs/{id}:
 *   get:
 *     summary: Get API log details
 *     description: 특정 API 호출의 상세 로그를 조회합니다 (요청/응답 헤더 및 바디 포함).
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: API 로그 ID
 *     responses:
 *       200:
 *         description: Log retrieved successfully
 *       404:
 *         description: Log not found
 */
app.get('/api/admin/logs/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const log = await prisma.apiLog.findUnique({
            where: { id: Number(id) }
        });

        if (!log) {
            return res.status(404).json({ success: false, message: "Log not found" });
        }

        res.json({
            ...log,
            requestHeaders: JSON.parse(log.requestHeaders),
            requestBody: JSON.parse(log.requestBody),
            responseHeaders: JSON.parse(log.responseHeaders),
            responseBody: JSON.parse(log.responseBody),
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

app.delete('/api/admin/locations/:nickname', async (req, res) => {
    const { nickname } = req.params;
    try {
        await prisma.locationReport.deleteMany({
            where: { nickname }
        });

        io.emit(`update_history_${nickname}`);
        io.emit('update_users');

        res.json({
            success: true,
            message: `History for ${nickname} has been reset successfully`
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

/**
 * @swagger
 * /admin/users/{nickname}:
 *   delete:
 *     summary: Delete a user and their history
 *     description: 사용자와 해당 사용자의 모든 위치 히스토리를 삭제합니다.
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: nickname
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted successfully
 */
app.delete('/api/admin/users/:nickname', async (req, res) => {
    const { nickname } = req.params;
    try {
        await prisma.locationReport.deleteMany({
            where: { nickname }
        });

        await prisma.user.delete({
            where: { nickname }
        });

        io.emit('update_users');

        res.json({
            success: true,
            message: `User ${nickname} and their history have been deleted successfully`
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Swagger docs available at http://localhost:${PORT}/api/docs`);
});
