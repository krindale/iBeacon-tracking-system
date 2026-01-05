import 'dotenv/config';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import os from 'os';
import v8 from 'v8';

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Allow all for local debugging if needed, or keep specific
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

// 6. GET /api/admin/system/status - Get system resource usage
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
                heapUsed: Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100, // MB
                heapTotal: Math.round(mem.heapTotal / 1024 / 1024 * 100) / 100, // MB
                heapLimit: Math.round(heapStats.heap_size_limit / 1024 / 1024 * 100) / 100, // MB
                heapPercent: Math.round((mem.heapUsed / heapStats.heap_size_limit) * 100),
                rss: Math.round(mem.rss / 1024 / 1024 * 100) / 100, // MB
                systemFree: Math.round(freeMem / 1024 / 1024 / 1024 * 100) / 100, // GB
                systemTotal: Math.round(totalMem / 1024 / 1024 / 1024 * 100) / 100, // GB
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

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// 1. GET /api/external/beacons - Get list of beacons
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

// 2. POST /api/users - Register user
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
        // Try to find user by deviceUuid first
        let user = await prisma.user.findUnique({
            where: { deviceUuid }
        });

        if (user) {
            // Check if the nickname is already taken by ANOTHER user
            const existingWithNick = await prisma.user.findUnique({
                where: { nickname: finalNickName }
            });

            if (existingWithNick && existingWithNick.deviceUuid !== deviceUuid) {
                // For this tracking app, we allow "transferring" the nickname to the new device
                // or just updating the existing one. Let's update the existing user's UUID
                // or just allow the update if we want to be permissive.
                // To avoid P2002, if nickname is taken, we update THAT user's record.
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
            // New device. Check if the nickname is already used by another device.
            const existingWithNick = await prisma.user.findUnique({
                where: { nickname: finalNickName }
            });

            if (existingWithNick) {
                // Update the existing user with the new deviceUuid
                user = await prisma.user.update({
                    where: { nickname: finalNickName },
                    data: { deviceUuid: deviceUuid }
                });
            } else {
                // Both are new
                user = await prisma.user.create({
                    data: { deviceUuid, nickname: finalNickName }
                });
            }
        }

        console.log(`[Socket] Emitting update_users`);
        io.emit('update_users'); // Notify dashboard

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

        // Log the API call
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

// 3. POST /api/locations/report - Report location
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

        // Log the API call
        const apiLog = await logApiCall({
            method: 'POST',
            url: '/api/locations/report',
            requestHeaders: req.headers,
            requestBody: req.body,
            responseStatus: 200,
            responseHeaders: res.getHeaders ? res.getHeaders() : {},
            responseBody: responseData
        });

        const report = await prisma.locationReport.create({
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
        io.emit('update_users'); // Notify dashboard
        io.emit(`update_history_${finalNickName}`); // Notify user history page

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

// --- Admin APIs (for Frontend Dashboard) ---

// 4. GET /api/admin/users - Get all users with their latest location
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

// 5. GET /api/admin/locations/:nickname - Get location history for a user
app.get('/api/admin/locations/:nickname', async (req, res) => {
    const { nickname } = req.params;
    const { all, limit, offset, page } = req.query;
    try {
        const { date, all, limit, page, offset } = req.query;
        const itemsPerPage = Number(limit) || 200;
        const currentPage = Number(page) || 1;

        let where: any = { nickname };

        // Date filtering logic
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

// 5. GET /api/admin/locations/:nickname/dates - Get unique dates for user history
app.get('/api/admin/locations/:nickname/dates', async (req, res) => {
    const { nickname } = req.params;
    try {
        const reports = await prisma.locationReport.findMany({
            where: { nickname },
            select: { createdAt: true },
            orderBy: { createdAt: 'desc' }
        });

        // Extract unique dates in YYYY-MM-DD format
        const uniqueDates = [...new Set(reports.map(r => {
            const date = new Date(r.createdAt);
            // Use local date string parts to ensure YYYY-MM-DD in local time
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

// 5.1 GET /api/admin/logs/:id - Get full API log details
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

// 6. DELETE /api/admin/locations/:nickname - Reset location history for a user
app.delete('/api/admin/locations/:nickname', async (req, res) => {
    const { nickname } = req.params;
    try {
        await prisma.locationReport.deleteMany({
            where: { nickname }
        });

        io.emit(`update_history_${nickname}`); // Notify history page
        io.emit('update_users'); // Refresh dashboard

        res.json({
            success: true,
            message: `History for ${nickname} has been reset successfully`
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

// 7. DELETE /api/admin/users/:nickname - Delete a user and their history
app.delete('/api/admin/users/:nickname', async (req, res) => {
    const { nickname } = req.params;
    try {
        // Cascade delete: LocationReport depends on User (via nickname)
        // Since we didn't specify cascade in Prisma schema, let's do it manually
        await prisma.locationReport.deleteMany({
            where: { nickname }
        });

        await prisma.user.delete({
            where: { nickname }
        });

        io.emit('update_users'); // Refresh dashboard

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
});
