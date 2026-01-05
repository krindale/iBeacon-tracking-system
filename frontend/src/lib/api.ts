const API_BASE_URL = 'http://localhost:4000/api';

export interface UserStatus {
    nickname: string;
    deviceUuid: string;
    lastSeen: string;
    currentBeacon: string;
    status: 'Active' | 'Away';
}

export interface LocationHistory {
    id: number;
    nickname: string;
    beaconUuid: string;
    beaconMajor: string;
    beaconMinor: string;
    timestamp: string;
    createdAt: string;
    beaconAlias: string;
    apiLogId?: number;
}

export interface SystemStatus {
    memory: {
        heapUsed: number;
        heapTotal: number;
        heapLimit: number;
        heapPercent: number;
        rss: number;
        systemFree: number;
        systemTotal: number;
        systemPercent: number;
    };
    cpu: {
        load: number[];
        count: number;
        model: string;
    };
    uptime: number;
    timestamp: string;
}

export interface PaginatedResult<T> {
    data: T[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export interface ApiLog {
    id: number;
    method: string;
    url: string;
    requestHeaders: any;
    requestBody: any;
    responseStatus: number;
    responseHeaders: any;
    responseBody: any;
    createdAt: string;
}

export async function getUsersStatus(): Promise<UserStatus[]> {
    const res = await fetch(`${API_BASE_URL}/admin/users`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
}

export async function getUserHistory(
    nickname: string,
    all: boolean = false,
    limit?: number,
    page?: number,
    offset?: number,
    date?: string
): Promise<PaginatedResult<LocationHistory> | LocationHistory[]> {
    const url = new URL(`${API_BASE_URL}/admin/locations/${nickname}`);
    if (all) {
        url.searchParams.append('all', 'true');
    }
    if (limit) {
        url.searchParams.append('limit', limit.toString());
    }
    if (page) {
        url.searchParams.append('page', page.toString());
    }
    if (offset) {
        url.searchParams.append('offset', offset.toString());
    }
    if (date) {
        url.searchParams.append('date', date);
    }
    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch history');
    return res.json();
}

export async function getUserHistoryDates(nickname: string): Promise<string[]> {
    const res = await fetch(`${API_BASE_URL}/admin/locations/${nickname}/dates`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch history dates');
    return res.json();
}

export async function getApiLogDetails(id: number): Promise<ApiLog> {
    const res = await fetch(`${API_BASE_URL}/admin/logs/${id}`);
    if (!res.ok) throw new Error('Failed to fetch log details');
    return res.json();
}

export async function resetUserHistory(nickname: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE_URL}/admin/locations/${nickname}`, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to reset history');
    return res.json();
}
export async function deleteUser(nickname: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE_URL}/admin/users/${nickname}`, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete user');
    return res.json();
}

export async function getSystemStatus(): Promise<SystemStatus> {
    const res = await fetch(`${API_BASE_URL}/admin/system/status`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch system status');
    return res.json();
}
