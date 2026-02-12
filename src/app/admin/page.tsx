"use client";

import { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import StatCard from '@/components/admin/StatCard';
import AIUsageSummary from '@/components/admin/AIUsageSummary';
import {
  Users,
  DoorOpen,
  Activity,
  Calendar,
  Clock,
  ArrowRight,
  History,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import AuthGuard from '@/components/auth/AuthGuard';
import { useFirebase } from '@/firebase/provider';
import { getAllLogs, getAllProfessors } from '@/lib/firestore-service';

import type { LabLog, UserProfile } from '@/lib/types';

export default function AdminDashboard() {
  return (
    <AuthGuard requiredRole="admin">
      <AdminContent />
    </AuthGuard>
  );
}

function AdminContent() {
  const { user, firestore } = useFirebase();
  const [logs, setLogs] = useState<LabLog[]>([]);
  const [professors, setProfessors] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!firestore) return;

      try {
        const [logsData, profsData] = await Promise.all([
          getAllLogs(firestore),
          getAllProfessors(firestore),
        ]);

        // Fallback to mock data if Firestore is empty (for demo purposes)
        setLogs(logsData);
        setProfessors(profsData);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [firestore]);

  const currentUser = {
    displayName: user?.displayName || 'Admin',
    email: user?.email || '',
    role: 'admin' as const,
    photoURL: user?.photoURL || undefined,
  };

  // Derived stats
  const today = format(new Date(), 'yyyy-MM-dd');
  const totalUsageToday = logs.filter(log => format(log.checkIn, 'yyyy-MM-dd') === today).length;
  const activeSessions = logs.filter(log => !log.checkOut).length;

  const roomCounts = logs.reduce((acc, log) => {
    acc[log.roomNumber] = (acc[log.roomNumber] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const mostActiveRoom = Object.entries(roomCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';

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

      <main className="container mx-auto px-4 py-12 space-y-10">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tight text-white font-headline">The Nerve Center</h1>
            <p className="text-zinc-400 text-lg">Overview of laboratory activity and access control.</p>
          </div>
          <div className="flex items-center gap-3 bg-zinc-900 px-5 py-3 rounded-2xl border border-zinc-800 shadow-xl">
            <Calendar className="h-5 w-5 text-zinc-400" />
            <span className="text-sm font-semibold text-white">{format(new Date(), 'MMMM d, yyyy')}</span>
          </div>
        </header>

        {/* Statistic Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Usage Today" value={totalUsageToday} description="Logins recorded today" icon={Activity} />
          <StatCard title="Currently Active" value={activeSessions} description="Professors in labs now" icon={DoorOpen} />
          <StatCard title="Most Active Lab" value={`Room ${mostActiveRoom}`} description="Highest traffic room" icon={DoorOpen} />
          <StatCard title="Total Faculty" value={professors.length} description="Registered accounts" icon={Users} />
        </div>

        <div className="grid gap-10 lg:grid-cols-3">
          {/* Main Activity Table */}
          <Card className="lg:col-span-2 shadow-2xl border-zinc-800 bg-zinc-950">
            <CardHeader className="flex flex-row items-center justify-between pb-6 border-b border-zinc-900">
              <div className="space-y-1">
                <CardTitle className="text-2xl text-white">Recent Activity</CardTitle>
                <CardDescription className="text-zinc-500">Live stream of check-ins and check-outs.</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm" className="border-zinc-800 hover:bg-zinc-900 text-zinc-300">
                <Link href="/admin/logs">View All Logs</Link>
              </Button>
            </CardHeader>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-900 hover:bg-transparent">
                    <TableHead className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">Professor</TableHead>
                    <TableHead className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">Room</TableHead>
                    <TableHead className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">Time In</TableHead>
                    <TableHead className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">Duration</TableHead>
                    <TableHead className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length > 0 ? (
                    logs.slice(0, 5).map((log) => (
                      <TableRow key={log.id} className="border-zinc-900 hover:bg-zinc-900/40 transition-colors">
                        <TableCell className="font-semibold text-zinc-100">{log.professorName}</TableCell>
                        <TableCell className="text-zinc-300">Room {log.roomNumber}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                            <Clock className="h-3 w-3" />
                            {format(log.checkIn, 'hh:mm a')}
                          </div>
                        </TableCell>
                        <TableCell className="text-zinc-300">{log.duration ? `${log.duration} min` : '--'}</TableCell>
                        <TableCell>
                          <Badge variant={log.checkOut ? "secondary" : "default"} className={!log.checkOut ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-zinc-800 text-zinc-400 border-zinc-700"}>
                            {log.checkOut ? "Completed" : "Active"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-zinc-600">
                        No usage logs recorded yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* AI Insights and Sidebar */}
          <div className="space-y-8">
            <AIUsageSummary logs={logs} />

            <Card className="shadow-2xl border-zinc-800 bg-zinc-950">
              <CardHeader>
                <CardTitle className="text-xl text-white">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <Button variant="outline" className="justify-start gap-3 h-14 bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-200" asChild>
                  <Link href="/admin/users">
                    <Users className="h-5 w-5 text-zinc-400" />
                    Manage Faculty Access
                    <ArrowRight className="ml-auto h-4 w-4 opacity-30" />
                  </Link>
                </Button>
                <Button variant="outline" className="justify-start gap-3 h-14 bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-200" asChild>
                  <Link href="/admin/logs">
                    <History className="h-5 w-5 text-zinc-400" />
                    Export Usage Reports
                    <ArrowRight className="ml-auto h-4 w-4 opacity-30" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}