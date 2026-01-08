'use client';

import { useEffect, useState } from 'react';
import { getUsersStatus, UserStatus, deleteUser, getSystemStatus, SystemStatus } from '@/lib/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Users, History as HistoryIcon, MapPin, Trash2, Server, Cpu, HardDrive, Activity, Clock, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';

export default function DashboardPage() {
  const [users, setUsers] = useState<UserStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const router = useRouter();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await getUsersStatus();
      setUsers(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemStatus = async () => {
    try {
      const status = await getSystemStatus();
      setSystemStatus(status);
    } catch (error) {
      console.error('Failed to fetch system status:', error);
    }
  };

  const handleDeleteUser = async (nickname: string) => {
    try {
      await deleteUser(nickname);
      // fetchUsers() will be called automatically by socket event 'update_users'
    } catch (error) {
      console.error(error);
      alert('Failed to delete user');
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchSystemStatus();

    const statusInterval = setInterval(fetchSystemStatus, 3000); // 3 seconds

    // Socket.io connects directly to ibeacon.krindale.com (not through API gateway)
    const socketUrl = typeof window !== 'undefined'
      ? (window.location.hostname === 'localhost' ? 'http://localhost:4000' : 'https://ibeacon.krindale.com')
      : 'http://localhost:4000';
    const socket = io(socketUrl);

    socket.on('update_users', () => {
      console.log('Real-time update received');
      fetchUsers();
    });

    return () => {
      socket.disconnect();
      clearInterval(statusInterval);
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b bg-white dark:bg-slate-900 sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
              B
            </div>
            <h1 className="text-xl font-bold tracking-tight">iBeacon Tracking Admin</h1>
          </div>
          <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
            <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="grid gap-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{users.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Now</CardTitle>
                <MapPin className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {users.filter(u => u.status === 'Active').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Away</CardTitle>
                <RefreshCcw className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {users.filter(u => u.status === 'Away').length}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Real-time System Resources
            </h2>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground tabular-nums">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Last updated: {systemStatus ? new Date(systemStatus.timestamp).toLocaleTimeString() : '...'}
            </div>
          </div>

          {/* System Resource Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Activity className="h-4 w-4 text-blue-500" />
                  <span className="text-xs font-medium uppercase tracking-wider">System Load (1/5/15m)</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold tabular-nums">
                  {systemStatus?.cpu.load.map(l => l.toFixed(2)).join(' / ') || 'Loading...'}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Server className="h-4 w-4 text-purple-500" />
                    <span className="text-xs font-medium uppercase tracking-wider">Node Memory (Heap)</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-normal py-0">
                    System: {systemStatus?.memory.systemPercent || 0}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-end">
                  <div className="text-xl font-bold tabular-nums">
                    {systemStatus?.memory.heapPercent || 0}%
                  </div>
                  <div className="text-[10px] text-muted-foreground tabular-nums">
                    {systemStatus?.memory.heapUsed || 0}MB / {systemStatus?.memory.heapLimit || 0}MB
                  </div>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${(systemStatus?.memory.heapPercent || 0) > 80 ? 'bg-red-500' :
                      (systemStatus?.memory.heapPercent || 0) > 60 ? 'bg-amber-500' : 'bg-purple-500'
                      }`}
                    style={{ width: `${systemStatus?.memory.heapPercent || 0}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <HardDrive className="h-4 w-4 text-slate-500" />
                  <span className="text-xs font-medium uppercase tracking-wider">System Memory</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold tabular-nums">
                  {systemStatus?.memory.systemTotal || 0} GB
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  Free: {systemStatus?.memory.systemFree || 0} GB (OS Cached incl.)
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs font-medium uppercase tracking-wider">Uptime</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold tabular-nums">
                  {systemStatus ? (() => {
                    const s = systemStatus.uptime;
                    const h = Math.floor(s / 3600);
                    const m = Math.floor((s % 3600) / 60);
                    const sec = s % 60;
                    return `${h}h ${m}m ${sec}s`;
                  })() : '...'}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>User Status</CardTitle>
              <CardDescription>
                Real-time tracking of users based on nearest iBeacon (via Socket.io).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Mobile View: Cards */}
              <div className="md:hidden space-y-4">
                {users.map((user) => (
                  <div
                    key={user.deviceUuid}
                    className="p-4 border rounded-lg bg-white dark:bg-slate-900 shadow-sm active:bg-slate-50 dark:active:bg-slate-800 transition-colors flex items-center justify-between gap-4"
                    onClick={() => router.push(`/history/${user.nickname}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold truncate">{user.nickname}</span>
                        <Badge variant={user.status === 'Active' ? 'default' : 'secondary'} className="text-[10px] h-4">
                          {user.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <MapPin className="h-3 w-3 text-blue-500 shrink-0" />
                        <span className="truncate">{user.currentBeacon}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(user.lastSeen).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteUser(user.nickname);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <ChevronRight className="h-5 w-5 text-slate-300" />
                    </div>
                  </div>
                ))}
                {users.length === 0 && !loading && (
                  <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                    No users connected yet.
                  </div>
                )}
              </div>

              {/* Desktop View: Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nickname</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Current Location</TableHead>
                      <TableHead>Last Seen</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow
                        key={user.deviceUuid}
                        className="cursor-pointer group"
                        onClick={() => router.push(`/history/${user.nickname}`)}
                      >
                        <TableCell className="font-medium">{user.nickname}</TableCell>
                        <TableCell>
                          <Badge variant={user.status === 'Active' ? 'default' : 'secondary'}>
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-blue-500" />
                            {user.currentBeacon}
                          </div>
                        </TableCell>
                        <TableCell>{new Date(user.lastSeen).toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <HistoryIcon className="mr-2 h-4 w-4" />
                              History
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteUser(user.nickname);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {users.length === 0 && !loading && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No users connected yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
