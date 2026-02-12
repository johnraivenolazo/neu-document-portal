"use client";

import { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Search, UserX, UserCheck, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import AuthGuard from '@/components/auth/AuthGuard';
import { useFirebase } from '@/firebase/provider';
import { getAllProfessors, updateUserStatus } from '@/lib/firestore-service';
import type { UserProfile } from '@/lib/types';

export default function UserManagementPage() {
  return (
    <AuthGuard requiredRole="admin">
      <UsersContent />
    </AuthGuard>
  );
}

function UsersContent() {
  const { user, firestore } = useFirebase();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function load() {
      if (!firestore) return;
      try {
        const data = await getAllProfessors(firestore);
        setUsers(data);
      } catch (err) {
        console.error('Failed to load users:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [firestore]);

  const handleToggleBlock = async (userId: string, currentStatus: 'active' | 'blocked') => {
    if (!firestore) return;
    const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
    setTogglingId(userId);
    try {
      await updateUserStatus(firestore, userId, newStatus);
      setUsers(prev => prev.map(u => u.uid === userId ? { ...u, status: newStatus } : u));
      toast({
        title: newStatus === 'blocked' ? 'User Blocked' : 'Access Restored',
        description: `Access for this professor has been ${newStatus === 'blocked' ? 'revoked' : 'granted'} instantly.`,
      });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message || 'Failed to update status.' });
    } finally {
      setTogglingId(null);
    }
  };

  const filteredUsers = users.filter(u =>
    u.displayName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const currentUser = {
    displayName: user?.displayName || 'Admin',
    email: user?.email || '',
    role: 'admin' as const,
    photoURL: user?.photoURL || undefined,
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
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white font-headline">Professor Access Control</h1>
          <p className="text-zinc-500">Manage laboratory privileges for faculty members.</p>
        </div>

        <Card className="shadow-2xl border-zinc-800 bg-zinc-950">
          <CardHeader className="pb-3 border-b border-zinc-900">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                <Input
                  placeholder="Search by name or institutional email..."
                  className="pl-10 bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-4 text-sm font-medium">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span className="text-zinc-300">{users.filter(u => u.status === 'active').length} Active</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                  <span className="text-zinc-300">{users.filter(u => u.status === 'blocked').length} Blocked</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-900 hover:bg-transparent">
                  <TableHead className="w-[80px] text-zinc-500 font-bold uppercase tracking-wider text-[10px]"></TableHead>
                  <TableHead className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">Professor Details</TableHead>
                  <TableHead className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">ID Number</TableHead>
                  <TableHead className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">Status</TableHead>
                  <TableHead className="text-right text-zinc-500 font-bold uppercase tracking-wider text-[10px]">Grant Access</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((prof) => (
                  <TableRow key={prof.uid} className="group border-zinc-900 hover:bg-zinc-900/40 transition-colors">
                    <TableCell>
                      <Avatar>
                        <AvatarImage src={prof.photoURL} />
                        <AvatarFallback className="bg-zinc-800 text-zinc-400">{prof.displayName.charAt(0)}</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-zinc-100">{prof.displayName}</span>
                        <span className="text-xs text-zinc-500">{prof.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-mono text-zinc-500">{prof.employeeId || 'N/A'}</span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={prof.status === 'active' ? 'outline' : 'destructive'}
                        className={prof.status === 'active' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : ''}
                      >
                        {prof.status === 'active' ? <UserCheck className="h-3 w-3 mr-1" /> : <UserX className="h-3 w-3 mr-1" />}
                        {prof.status.charAt(0).toUpperCase() + prof.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-3">
                        <span className="text-xs text-zinc-600 italic opacity-0 group-hover:opacity-100 transition-opacity">
                          {prof.status === 'active' ? 'Revoke Access' : 'Grant Access'}
                        </span>
                        <Switch
                          checked={prof.status === 'active'}
                          onCheckedChange={() => handleToggleBlock(prof.uid, prof.status)}
                          disabled={togglingId === prof.uid}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-zinc-600">
                      No professors found matching your search.
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
