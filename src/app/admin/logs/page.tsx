"use client";

import { useState, useEffect, useMemo } from 'react';
import Navbar from '@/components/layout/Navbar';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Download, Clock, ArrowUpDown, Loader2, CalendarDays } from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay, subDays, startOfWeek, startOfMonth } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import AuthGuard from '@/components/auth/AuthGuard';
import { useFirebase } from '@/firebase/provider';
import { getAllLogs } from '@/lib/firestore-service';
import type { LabLog } from '@/lib/types';

export default function UsageLogsPage() {
  return (
    <AuthGuard requiredRole="admin">
      <LogsContent />
    </AuthGuard>
  );
}

function LogsContent() {
  const { user, firestore } = useFirebase();
  const [logs, setLogs] = useState<LabLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roomFilter, setRoomFilter] = useState('all');
  const [datePreset, setDatePreset] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    async function load() {
      if (!firestore) return;
      try {
        const data = await getAllLogs(firestore);
        setLogs(data);
      } catch (err) {
        console.error('Failed to load logs:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [firestore]);

  const rooms = useMemo(() => Array.from(new Set(logs.map(l => l.roomNumber))), [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = log.professorName.toLowerCase().includes(search.toLowerCase());
      const matchesRoom = roomFilter === 'all' || log.roomNumber === roomFilter;

      // Date filter
      let matchesDate = true;
      const now = new Date();

      if (datePreset === 'today') {
        matchesDate = isWithinInterval(log.checkIn, { start: startOfDay(now), end: endOfDay(now) });
      } else if (datePreset === 'week') {
        matchesDate = isWithinInterval(log.checkIn, { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfDay(now) });
      } else if (datePreset === 'month') {
        matchesDate = isWithinInterval(log.checkIn, { start: startOfMonth(now), end: endOfDay(now) });
      } else if (datePreset === 'custom' && dateFrom && dateTo) {
        matchesDate = isWithinInterval(log.checkIn, {
          start: startOfDay(new Date(dateFrom)),
          end: endOfDay(new Date(dateTo)),
        });
      }

      return matchesSearch && matchesRoom && matchesDate;
    });
  }, [logs, search, roomFilter, datePreset, dateFrom, dateTo]);

  const currentUser = {
    displayName: user?.displayName || 'Admin',
    email: user?.email || '',
    role: 'admin' as const,
    photoURL: user?.photoURL || undefined,
  };

  const handleExportCSV = () => {
    const headers = 'Professor,Room,Check-In,Check-Out,Duration (min),Status\n';
    const rows = filteredLogs.map(log =>
      `"${log.professorName}","${log.roomNumber}","${format(log.checkIn, 'yyyy-MM-dd HH:mm')}","${log.checkOut ? format(log.checkOut, 'yyyy-MM-dd HH:mm') : ''}","${log.duration || ''}","${log.checkOut ? 'Closed' : 'Active'}"`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lab-usage-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar user={currentUser} />

      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white font-headline">Usage History</h1>
            <p className="text-zinc-500">Comprehensive laboratory access logs and audit trails.</p>
          </div>
          <Button className="gap-2 bg-zinc-100 text-black hover:bg-zinc-200" onClick={handleExportCSV}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>

        <Card className="shadow-2xl border-zinc-800 bg-zinc-950">
          <CardHeader className="pb-3 border-b border-zinc-900">
            <div className="flex flex-col xl:flex-row xl:items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                <Input
                  placeholder="Search by professor name..."
                  className="pl-10 h-10 bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-zinc-500" />
                  <span className="text-sm font-medium text-zinc-400">Filters:</span>
                </div>
                <Select value={roomFilter} onValueChange={setRoomFilter}>
                  <SelectTrigger className="w-[150px] h-10 bg-zinc-900 border-zinc-800 text-zinc-300">
                    <SelectValue placeholder="All Rooms" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950 border-zinc-800">
                    <SelectItem value="all">All Rooms</SelectItem>
                    {rooms.map(room => (
                      <SelectItem key={room} value={room}>Room {room}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={datePreset} onValueChange={(v) => { setDatePreset(v); if (v !== 'custom') { setDateFrom(''); setDateTo(''); } }}>
                  <SelectTrigger className="w-[150px] h-10 bg-zinc-900 border-zinc-800 text-zinc-300">
                    <CalendarDays className="h-4 w-4 mr-2 text-zinc-500" />
                    <SelectValue placeholder="Date Range" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950 border-zinc-800">
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {datePreset === 'custom' && (
              <div className="flex items-center gap-3 mt-4">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-10 w-auto bg-zinc-900 border-zinc-800 text-zinc-300"
                />
                <span className="text-zinc-600 text-sm">to</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-10 w-auto bg-zinc-900 border-zinc-800 text-zinc-300"
                />
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-900 hover:bg-transparent">
                  <TableHead className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">Professor <ArrowUpDown className="inline h-3 w-3 ml-1 opacity-50" /></TableHead>
                  <TableHead className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">Laboratory Room</TableHead>
                  <TableHead className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">Check-In</TableHead>
                  <TableHead className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">Check-Out</TableHead>
                  <TableHead className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">Total Duration</TableHead>
                  <TableHead className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">Session Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id} className="border-zinc-900 hover:bg-zinc-900/40 transition-colors">
                    <TableCell className="font-medium text-zinc-100">{log.professorName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono bg-zinc-900 border-zinc-800 text-zinc-300">
                        {log.roomNumber}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm text-zinc-300">{format(log.checkIn, 'MMM d, yyyy')}</span>
                        <span className="text-xs text-zinc-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {format(log.checkIn, 'hh:mm a')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.checkOut ? (
                        <div className="flex flex-col">
                          <span className="text-sm text-zinc-300">{format(log.checkOut, 'MMM d, yyyy')}</span>
                          <span className="text-xs text-zinc-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {format(log.checkOut, 'hh:mm a')}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs italic text-emerald-400 font-medium">Currently In-Lab</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-zinc-300">{log.duration ? `${log.duration} minutes` : '--'}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={log.checkOut ? "secondary" : "default"} className={!log.checkOut ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-zinc-800 text-zinc-400 border-zinc-700"}>
                        {log.checkOut ? "Closed" : "Active Now"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredLogs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-zinc-600">
                      No matching records found for the selected filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
