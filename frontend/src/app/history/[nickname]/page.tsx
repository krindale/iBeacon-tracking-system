'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
    getUserHistory,
    getUserHistoryDates,
    LocationHistory,
    ApiLog,
    resetUserHistory,
    getApiLogDetails
} from '@/lib/api';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    ChevronLeft, MapPin, Clock, Trash2, Download, Terminal,
    ChevronRight, Info, Calendar, ChevronDown,
    ChevronRight as ChevronRightIconSmall
} from 'lucide-react';
import Link from 'next/link';
import { io } from 'socket.io-client';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function HistoryPage() {
    const params = useParams();
    const nickname = decodeURIComponent(params.nickname as string);
    const { toast } = useToast();
    const [history, setHistory] = useState<LocationHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [resetting, setResetting] = useState(false);
    const [selectedLog, setSelectedLog] = useState<ApiLog | null>(null);
    const [loadingLog, setLoadingLog] = useState(false);
    const [showLogDetails, setShowLogDetails] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const [totalItems, setTotalItems] = useState(0);
    const [availableDates, setAvailableDates] = useState<string[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>("");
    const selectedDateRef = useRef(selectedDate);

    useEffect(() => {
        selectedDateRef.current = selectedDate;
    }, [selectedDate]);

    const fetchDates = useCallback(async () => {
        try {
            const dates = await getUserHistoryDates(nickname);
            setAvailableDates(dates);
            if (dates.length > 0 && !selectedDateRef.current) {
                setSelectedDate(dates[0]); // Default to latest date
            }
        } catch (error) {
            console.error('Failed to fetch dates:', error);
        }
    }, [nickname]);

    const fetchHistory = useCallback(async (silent = false) => {
        if (!selectedDateRef.current) return;
        try {
            if (!silent) setLoading(true);
            const result = await getUserHistory(nickname, false, undefined, undefined, undefined, selectedDateRef.current);

            if (Array.isArray(result)) {
                setHistory(result);
                setTotalItems(result.length);
            } else if ('data' in result) {
                setHistory(result.data);
                setTotalItems(result.pagination?.total || result.data.length);
            }
        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: "Failed to fetch history data.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }, [nickname, toast]);

    useEffect(() => {
        fetchDates();
    }, [nickname]);

    useEffect(() => {
        if (selectedDate) {
            fetchHistory();
        }
    }, [selectedDate, nickname]);

    const handleViewApiDetails = async (logId: number) => {
        setLoadingLog(true);
        setShowLogDetails(true);
        try {
            const log = await getApiLogDetails(logId);
            setSelectedLog(log);
        } catch (error) {
            console.error('Failed to fetch log details:', error);
            toast({
                title: "Error",
                description: "Failed to fetch API log details.",
                variant: "destructive",
            });
            setShowLogDetails(false);
        } finally {
            setLoadingLog(false);
        }
    };

    const handleReset = async () => {
        if (!confirm("Are you sure you want to reset the history?")) return;

        setResetting(true);
        try {
            await resetUserHistory(nickname);
            toast({
                title: "History Reset",
                description: `Successfully cleared history for ${nickname}`,
            });
            setHistory([]);
            setHistory([]);
            setTotalItems(0);
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to reset history. Please try again.",
                variant: "destructive",
            });
        } finally {
            setResetting(false);
        }
    };

    const handleDownloadMarkdown = async () => {
        try {
            const result = await getUserHistory(nickname, true);
            const allHistory = Array.isArray(result) ? result : result.data;

            if (allHistory.length === 0) {
                toast({
                    title: "No Data",
                    description: "There is no history to download for this user.",
                    variant: "destructive",
                });
                return;
            }

            let markdown = `# Location History for ${nickname}\n\n`;
            markdown += `Generated on: ${new Date().toLocaleString()}\n\n`;
            markdown += `| Time | Location | UUID/Major/Minor |\n`;
            markdown += `| :--- | :--- | :--- |\n`;

            let lastDate = "";
            allHistory.forEach((item) => {
                const dateObj = new Date(item.createdAt);
                const currentDate = dateObj.toLocaleDateString();
                const time = dateObj.toLocaleTimeString();

                if (currentDate !== lastDate) {
                    markdown += `| **${currentDate}** | --- | --- |\n`;
                    lastDate = currentDate;
                }

                const beaconInfo = `${item.beaconUuid.slice(-8)} / ${item.beaconMajor} / ${item.beaconMinor}`;
                markdown += `| ${time} | ${item.beaconAlias} | ${beaconInfo} |\n`;
            });

            const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const safeNickname = nickname.trim().replace(/[/\\?%*:|"<>]/g, '-');
            link.download = `${safeNickname}_history.md`;
            document.body.appendChild(link);
            link.click();
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 100);

            toast({
                title: "Download Started",
                description: `Full history (${allHistory.length} records) has been exported.`,
            });
        } catch (error) {
            console.error('Error downloading markdown:', error);
            toast({
                title: "Download Failed",
                description: "An error occurred during export.",
                variant: "destructive",
            });
        }
    };

    useEffect(() => {
        const socketUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        console.log(`Connecting to socket at ${socketUrl} for user ${nickname}`);
        const socket = io(socketUrl);

        socket.on('connect', () => {
            console.log('Socket connected successfully');
        });

        socket.on(`update_history_${nickname}`, () => {
            console.log(`[Socket] Received update_history_${nickname}`);
            fetchDates(); // Update available dates
            fetchHistory(true); // Silent refresh current date
            toast({
                title: "New Report",
                description: "A new location report has been received.",
            });
        });

        socket.on('disconnect', () => {
            console.log('Socket disconnected');
        });

        return () => {
            socket.disconnect();
        };
    }, [nickname, fetchDates, fetchHistory, toast]);

    const toggleGroup = (groupId: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(groupId)) next.delete(groupId);
            else next.add(groupId);
            return next;
        });
    };

    const groupedHistory = [...history].reverse().reduce((acc: GroupedHistory[], item) => {
        const d = new Date(item.createdAt);
        const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        let dateGroup = acc.find(g => g.date === date);
        if (!dateGroup) {
            dateGroup = { date, beaconGroups: [] };
            acc.push(dateGroup);
        }

        const lastBeaconGroup = dateGroup.beaconGroups[dateGroup.beaconGroups.length - 1];
        if (lastBeaconGroup && lastBeaconGroup.alias === item.beaconAlias) {
            lastBeaconGroup.items.unshift(item); // Prepend so group items stay desc
        } else {
            dateGroup.beaconGroups.push({
                id: `group-${item.id}`, // Anchor to the OLDEST item in the streak
                alias: item.beaconAlias,
                items: [item]
            });
        }
        return acc;
    }, []).reverse(); // Reverse date groups to show latest date first

    // Reverse beacon groups within each date group to show latest streak first
    groupedHistory.forEach(dg => {
        dg.beaconGroups.reverse();
    });

    type GroupedHistory = {
        date: string;
        beaconGroups: {
            id: string;
            alias: string;
            items: LocationHistory[];
        }[];
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950">
            <header className="border-b bg-white dark:bg-slate-900 sticky top-0 z-10 transition-all">
                <div className="container mx-auto px-4 h-16 flex items-center gap-4">
                    <Link href="/">
                        <Button variant="ghost" size="icon">
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div className="flex-1 flex items-center justify-between">
                        <div className="flex flex-col">
                            <h1 className="text-xl font-bold tracking-tight">History: {nickname}</h1>
                            <p className="text-xs text-muted-foreground hidden sm:block">Real-time beacon tracking logs</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDownloadMarkdown}
                                disabled={history.length === 0}
                            >
                                <Download className="mr-2 h-4 w-4" />
                                Export
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleReset}
                                disabled={resetting || history.length === 0}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Reset
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 container mx-auto px-4 py-8 flex gap-6 relative">
                <div className={`flex-1 transition-all duration-300 ${showLogDetails ? 'mr-[400px]' : ''}`}>
                    <Card className="shadow-sm overflow-hidden border-slate-200 dark:border-slate-800">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 bg-white dark:bg-slate-900 border-b">
                            <div>
                                <CardTitle className="text-lg">Activity for {selectedDate || '...'}</CardTitle>
                                <CardDescription>
                                    Found <strong>{totalItems}</strong> events on this day
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground mr-2 font-medium">Select Date:</span>
                                <div className="flex items-center border rounded-md p-1 bg-slate-50 dark:bg-slate-950">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => {
                                            const idx = availableDates.indexOf(selectedDate);
                                            if (idx < availableDates.length - 1) setSelectedDate(availableDates[idx + 1]);
                                        }}
                                        disabled={availableDates.indexOf(selectedDate) === availableDates.length - 1 || loading || availableDates.length === 0}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <span className="px-3 text-sm font-bold min-w-[110px] text-center flex items-center justify-center gap-2">
                                        {selectedDate || '---'}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => {
                                            const idx = availableDates.indexOf(selectedDate);
                                            if (idx > 0) setSelectedDate(availableDates[idx - 1]);
                                        }}
                                        disabled={availableDates.indexOf(selectedDate) === 0 || loading || availableDates.length === 0}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0"> {/* Remove padding to let sections handle it */}
                            {loading ? (
                                <div className="p-6 space-y-10 ml-3 border-l-2 border-slate-200 dark:border-slate-800">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <div key={i} className="relative pl-8 animate-pulse">
                                            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-800" />
                                            <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/4 mb-2" />
                                            <div className="h-3 bg-slate-50 dark:bg-slate-900 rounded w-1/2" />
                                        </div>
                                    ))}
                                </div>
                            ) : groupedHistory.length === 0 ? (
                                <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-2">
                                    <Info className="h-8 w-8 opacity-20" />
                                    No location history found for this user.
                                </div>
                            ) : (
                                groupedHistory.map((dateGroup) => (
                                    <section key={dateGroup.date} className="border-b last:border-0 border-slate-100 dark:border-slate-800 overflow-hidden">
                                        {/* Date Header */}
                                        <div className="bg-slate-50/50 dark:bg-slate-800/20 px-6 py-3 flex items-center gap-3 border-b border-slate-50 dark:border-slate-800/50">
                                            <div className="bg-white dark:bg-slate-800 p-1.5 rounded-lg shadow-sm border">
                                                <Calendar className="h-4 w-4 text-slate-500" />
                                            </div>
                                            <span className="font-bold text-sm tracking-tight text-slate-600 dark:text-slate-400">
                                                {dateGroup.date}
                                            </span>
                                            <Badge variant="outline" className="ml-auto bg-white/50 dark:bg-slate-900/50 text-[10px] font-medium opacity-60">
                                                {dateGroup.beaconGroups.reduce((sum, bg) => sum + bg.items.length, 0)} records
                                            </Badge>
                                        </div>

                                        {/* Activity List */}
                                        <div className="p-6">
                                            <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-3 space-y-10">
                                                {dateGroup.beaconGroups.map((bg) => {
                                                    const isExpanded = expandedGroups.has(bg.id);
                                                    const mainItem = bg.items[0];
                                                    const hasMultiple = bg.items.length > 1;

                                                    return (
                                                        <div key={bg.id} className="relative pl-8 group">
                                                            {/* Marker */}
                                                            <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-4 border-white dark:border-slate-950 transition-colors ${bg.alias === 'Disconnected' ? 'bg-slate-300' : 'bg-blue-500'}`} />

                                                            <div className="flex flex-col gap-3">
                                                                {/* Group Header */}
                                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                                    <div className="space-y-1">
                                                                        <div className="flex items-center gap-2 font-semibold text-lg">
                                                                            <MapPin className={`h-4 w-4 ${bg.alias === 'Disconnected' ? 'text-slate-400' : 'text-blue-500'}`} />
                                                                            {bg.alias}
                                                                            {hasMultiple && !isExpanded && (
                                                                                <Badge variant="secondary" className="text-[10px] py-0 px-2 h-5 bg-blue-50 text-blue-600 border-blue-100">
                                                                                    {bg.items.length} records
                                                                                </Badge>
                                                                            )}
                                                                            {!isExpanded && mainItem.apiLogId && (
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    className="h-6 w-6 text-blue-400 hover:text-blue-600 hover:bg-blue-50 ml-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                                                                                    onClick={() => handleViewApiDetails(mainItem.apiLogId!)}
                                                                                >
                                                                                    <Terminal className="h-3.5 w-3.5" />
                                                                                </Button>
                                                                            )}
                                                                        </div>
                                                                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                                                                            <Badge variant="outline" className="text-[10px] py-0 font-mono">
                                                                                {mainItem.beaconUuid.slice(-8)} / {mainItem.beaconMajor} / {mainItem.beaconMinor}
                                                                            </Badge>
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center gap-3">
                                                                        <div className="text-sm text-muted-foreground flex items-center gap-2 whitespace-nowrap bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full w-fit">
                                                                            <Clock className="h-4 w-4" />
                                                                            {new Date(mainItem.createdAt).toLocaleTimeString()}
                                                                            {hasMultiple && (
                                                                                <span className="opacity-60 text-[10px] ml-1">
                                                                                    ~ {new Date(bg.items[bg.items.length - 1].createdAt).toLocaleTimeString()}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        {hasMultiple && (
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-8 w-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                                                                                onClick={() => toggleGroup(bg.id)}
                                                                            >
                                                                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRightIconSmall className="h-4 w-4" />}
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Expanded Items */}
                                                                {isExpanded && (
                                                                    <div className="mt-2 ml-2 space-y-3 border-l-2 border-dashed border-slate-100 dark:border-slate-800 pl-6 py-2">
                                                                        {bg.items.map((subItem) => (
                                                                            <div key={subItem.id} className="flex items-center justify-between text-sm py-1 border-b border-slate-50 dark:border-slate-900 last:border-0 group/sub">
                                                                                <div className="flex items-center gap-3">
                                                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                                                                    <span className="font-mono text-xs text-muted-foreground">
                                                                                        {new Date(subItem.createdAt).toLocaleTimeString()}
                                                                                    </span>
                                                                                </div>
                                                                                {subItem.apiLogId && (
                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="icon"
                                                                                        className="h-7 w-7 text-slate-400 hover:text-blue-500 hover:bg-blue-50"
                                                                                        onClick={() => handleViewApiDetails(subItem.apiLogId!)}
                                                                                    >
                                                                                        <Terminal className="h-3 w-3" />
                                                                                    </Button>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </section>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* API Logs Sidebar */}
                <aside
                    className={`fixed right-0 top-16 bottom-0 w-[400px] border-l bg-white dark:bg-slate-950 shadow-2xl transition-transform duration-300 z-20 ${showLogDetails ? 'translate-x-0' : 'translate-x-full'}`}
                >
                    <div className="flex items-center justify-between p-4 border-b">
                        <h2 className="font-bold flex items-center gap-2">
                            <Terminal className="h-5 w-5 text-blue-500" />
                            API Communication Details
                        </h2>
                        <Button variant="ghost" size="icon" onClick={() => setShowLogDetails(false)}>
                            <ChevronRight className="h-5 w-5" />
                        </Button>
                    </div>

                    <ScrollArea className="h-[calc(100vh-120px)]">
                        <div className="p-4 space-y-6">
                            {loadingLog ? (
                                <div className="space-y-4 animate-pulse">
                                    <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
                                    <div className="h-32 bg-slate-50 dark:bg-slate-900 rounded" />
                                    <div className="h-32 bg-slate-50 dark:bg-slate-900 rounded" />
                                </div>
                            ) : selectedLog ? (
                                <>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Badge className={selectedLog.method === 'POST' ? 'bg-orange-500' : 'bg-blue-500'}>
                                                {selectedLog.method}
                                            </Badge>
                                            <code className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                                                {selectedLog.url}
                                            </code>
                                        </div>
                                        <Badge variant={selectedLog.responseStatus === 200 ? 'default' : 'destructive'} className="bg-green-600">
                                            {selectedLog.responseStatus} OK
                                        </Badge>
                                    </div>

                                    <div className="space-y-4">
                                        <Tabs defaultValue="request" className="w-full">
                                            <TabsList className="grid w-full grid-cols-2 bg-slate-100 dark:bg-slate-900">
                                                <TabsTrigger value="request">Request</TabsTrigger>
                                                <TabsTrigger value="response">Response</TabsTrigger>
                                            </TabsList>

                                            <TabsContent value="request" className="space-y-4 pt-4">
                                                <div>
                                                    <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                                                        <Info className="h-3 w-3" /> Headers
                                                    </h3>
                                                    <pre className="text-[10px] font-mono bg-slate-50 dark:bg-slate-900 p-3 rounded-md border text-slate-500 overflow-x-auto">
                                                        {JSON.stringify(selectedLog.requestHeaders, null, 2)}
                                                    </pre>
                                                </div>
                                                <div>
                                                    <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Body</h3>
                                                    <pre className="text-[10px] font-mono bg-slate-900 text-green-400 p-3 rounded-md border border-slate-700 overflow-x-auto">
                                                        {JSON.stringify(selectedLog.requestBody, null, 2)}
                                                    </pre>
                                                </div>
                                            </TabsContent>

                                            <TabsContent value="response" className="space-y-4 pt-4">
                                                <div>
                                                    <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Headers</h3>
                                                    <pre className="text-[10px] font-mono bg-slate-50 dark:bg-slate-900 p-3 rounded-md border text-slate-500 overflow-x-auto">
                                                        {JSON.stringify(selectedLog.responseHeaders, null, 2)}
                                                    </pre>
                                                </div>
                                                <div>
                                                    <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Body</h3>
                                                    <pre className="text-[10px] font-mono bg-slate-900 text-blue-400 p-3 rounded-md border border-slate-700 overflow-x-auto">
                                                        {JSON.stringify(selectedLog.responseBody, null, 2)}
                                                    </pre>
                                                </div>
                                            </TabsContent>
                                        </Tabs>
                                    </div>

                                    <div className="pt-4 border-t text-[10px] text-muted-foreground">
                                        Timestamp: {new Date(selectedLog.createdAt).toISOString()}
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-20 text-muted-foreground">
                                    Click the terminal icon to view API details.
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </aside>
            </main>
        </div>
    );
}
