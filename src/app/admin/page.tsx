"use client";

import { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import { useFirebase } from '@/firebase/provider';
import {
  getAllUsers,
  updateStudentStatus,
  searchDocuments,
  saveDocumentMetadata,
  getDownloadStats,
  updateUserRole,
  createOrUpdateStudentProfile,
  getActiveUser,
  ensurePrimaryAdmin
} from '@/lib/firestore-service';
import { upload } from '@vercel/blob/client';
import { CICSDocument, UserProfile, DownloadLog, UserRole } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, Upload, Ban, CheckCircle, RefreshCcw, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, isAfter, subDays, startOfDay } from 'date-fns';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const { user, firestore } = useFirebase();
  const router = useRouter();
  const [stats, setStats] = useState({
    users: 0,
    downloads: 0,
    today: 0,
    week: 0,
    month: 0
  });

  // State for Tabs
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [documents, setDocuments] = useState<CICSDocument[]>([]);
  const [downloadLogs, setDownloadLogs] = useState<DownloadLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(false);

  // Upload State
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newDoc, setNewDoc] = useState({ title: '', description: '', category: '' });
  const [file, setFile] = useState<File | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    async function load() {
      if (!firestore) return;
      try {
        const [users, docs, dlLogs] = await Promise.all([
          getAllUsers(firestore),
          searchDocuments(firestore),
          getDownloadStats(firestore)
        ]);
        setAllUsers(users);
        setDocuments(docs);
        setDownloadLogs(dlLogs);

        const now = new Date();
        const dailyLimit = startOfDay(now);
        const weeklyLimit = subDays(now, 7);
        const monthlyLimit = subDays(now, 30);

        const dailyCount = dlLogs.filter(l => isAfter(new Date(l.timestamp), dailyLimit)).length;
        const weeklyCount = dlLogs.filter(l => isAfter(new Date(l.timestamp), weeklyLimit)).length;
        const monthlyCount = dlLogs.filter(l => isAfter(new Date(l.timestamp), monthlyLimit)).length;

        setStats({ 
          users: users.length, 
          downloads: dlLogs.length,
          today: dailyCount,
          week: weeklyCount,
          month: monthlyCount
        });
      } catch (err) {
        console.error('Data load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [firestore]);

  const handleBlock = async (uid: string, currentStatus: string) => {
    if (!firestore) return;
    const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
    try {
      await updateStudentStatus(firestore, uid, newStatus);
      setAllUsers(prev => prev.map(s => s.uid === uid ? { ...s, status: newStatus } : s));
      toast({ title: `User ${newStatus === 'active' ? 'Unblocked' : 'Blocked'}` });
    } catch {
      toast({ variant: 'destructive', title: 'Action Failed' });
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !newDoc.title || !newDoc.category || !firestore || !user) return;

    setUploading(true);
    try {
      const blob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
      });

      const extension = file.name.split('.').pop() || 'pdf';
      await saveDocumentMetadata(firestore!, {
        ...newDoc,
        fileUrl: blob.url,
        downloadUrl: blob.downloadUrl,
        fileType: file.type,
        extension: extension,
        uploadedBy: user.uid
      });

      toast({ title: 'Document Uploaded' });
      setUploadOpen(false);
      setNewDoc({ title: '', description: '', category: '' });
      setFile(null);
      const docs = await searchDocuments(firestore);
      setDocuments(docs);
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Upload Failed' });
    } finally {
      setUploading(false);
    }
  };

  const handleSwitchRole = async () => {
    if (!user || !firestore) return;
    setRoleLoading(true);
    try {
      const newRole: UserRole = 'student';
      await updateUserRole(firestore, user.uid, newRole);
      toast({ title: 'Role Switched', description: 'Redirecting to student view...' });
      router.push('/student');
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Switch Failed' });
    } finally {
      setRoleLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar user={{
        displayName: user?.displayName || 'Admin',
        email: user?.email || '',
        role: 'admin',
        photoURL: user?.photoURL || undefined
      }} />

      <main className="container mx-auto px-4 py-8 space-y-8">
        <TooltipProvider delayDuration={0}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
              <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-zinc-500 text-sm mt-1">Manage documents, students, and view analytics.</p>
            </div>
            <div className="flex gap-3">
              <Button 
                  variant="outline" 
                  onClick={handleSwitchRole} 
                  disabled={roleLoading}
                  className="border-zinc-800 text-zinc-300 hover:bg-zinc-900 font-bold gap-2"
              >
                {roleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                Switch to Student View
              </Button>
              <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-white text-black hover:bg-zinc-200 font-bold gap-2">
                    <Upload className="h-4 w-4" /> Upload Document
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-zinc-950 border-zinc-800 text-white">
                  <DialogHeader>
                    <DialogTitle>Upload Document</DialogTitle>
                    <DialogDescription>Upload a new PDF file to the repository.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleUpload} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input
                        value={newDoc.title}
                        onChange={e => setNewDoc({ ...newDoc, title: e.target.value })}
                        className="bg-zinc-900 border-zinc-800"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input
                        value={newDoc.description}
                        onChange={e => setNewDoc({ ...newDoc, description: e.target.value })}
                        className="bg-zinc-900 border-zinc-800"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select onValueChange={v => setNewDoc({ ...newDoc, category: v })} value={newDoc.category}>
                        <SelectTrigger className="w-full bg-zinc-900 border-zinc-800">
                          <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                          <SelectItem value="Memo">Memo</SelectItem>
                          <SelectItem value="Form">Form</SelectItem>
                          <SelectItem value="Curriculum">Curriculum</SelectItem>
                          <SelectItem value="News">News</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>File (PDF)</Label>
                      <Input
                        type="file"
                        accept="application/pdf"
                        onChange={e => setFile(e.target.files?.[0] || null)}
                        className="bg-zinc-900 border-zinc-800 cursor-pointer"
                        required
                      />
                    </div>
                    <Button type="submit" disabled={uploading} className="w-full bg-white text-black font-bold">
                      {uploading ? <Loader2 className="mr-2 animate-spin" /> : 'Upload'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">Total Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.users}</div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-zinc-400">Total DLs</CardTitle>
                <TrendingUp className="h-4 w-4 text-zinc-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.downloads}</div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900/40 border-zinc-800 border-dashed">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-medium text-zinc-500">Today</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-blue-400">{stats.today}</div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900/40 border-zinc-800 border-dashed">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-medium text-zinc-500">This Week</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-emerald-400">{stats.week}</div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900/40 border-zinc-800 border-dashed">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-medium text-zinc-500">This Month</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-purple-400">{stats.month}</div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="documents" className="w-full">
            <TabsList className="bg-zinc-900 text-zinc-400 border border-zinc-800">
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="logs">Download Logs</TabsTrigger>
            </TabsList>

            <TabsContent value="documents" className="mt-4 space-y-4">
              <Card className="bg-zinc-950 border-zinc-800">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-zinc-900/50">
                      <TableHead className="text-zinc-400">Title</TableHead>
                      <TableHead className="text-zinc-400">Category</TableHead>
                      <TableHead className="text-zinc-400">Downloads</TableHead>
                      <TableHead className="text-zinc-400">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc) => (
                      <TableRow key={doc.id} className="border-zinc-800 hover:bg-zinc-900/50">
                        <TableCell className="font-medium text-white">{doc.title}</TableCell>
                        <TableCell className="text-zinc-400">{doc.category}</TableCell>
                        <TableCell className="text-zinc-400">{doc.downloadCount}</TableCell>
                        <TableCell className="text-zinc-400">
                          {doc.createdAt && format(new Date(doc.createdAt), 'MMM d, yyyy')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            <TabsContent value="users" className="mt-4">
              <Card className="bg-zinc-950 border-zinc-800">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-zinc-900/50">
                      <TableHead className="text-zinc-400">Name</TableHead>
                      <TableHead className="text-zinc-400">Email</TableHead>
                      <TableHead className="text-zinc-400">Role</TableHead>
                      <TableHead className="text-zinc-400">Status</TableHead>
                      <TableHead className="text-zinc-400">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allUsers.map((userProfile) => (
                      <TableRow key={userProfile.uid} className="border-zinc-800 hover:bg-zinc-900/50">
                        <TableCell className="font-medium text-white">{userProfile.displayName}</TableCell>
                        <TableCell className="text-zinc-400">{userProfile.email}</TableCell>
                        <TableCell className="text-zinc-400">
                          {user?.uid === userProfile.uid ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="cursor-help">
                                  <Select disabled value={userProfile.role}>
                                    <SelectTrigger className="w-24 bg-zinc-900 border-zinc-800 h-8 text-xs opacity-50">
                                      <SelectValue />
                                    </SelectTrigger>
                                  </Select>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="bg-zinc-900 border-zinc-800 text-white">
                                <p>Use the &quot;Switch to Student View&quot; button above to verify student role.</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <Select
                              onValueChange={async (val) => {
                                if (!firestore) return;
                                try {
                                  await updateUserRole(firestore, userProfile.uid, val as UserRole);
                                  setAllUsers(prev => prev.map(u => u.uid === userProfile.uid ? { ...u, role: val as UserRole } : u));
                                  toast({ title: 'Role Updated' });
                                } catch {
                                  toast({ variant: 'destructive', title: 'Update Failed' });
                                }
                              }}
                              value={userProfile.role}
                            >
                              <SelectTrigger className="w-24 bg-zinc-900 border-zinc-800 h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="student">Student</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell className="text-zinc-400">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${userProfile.status === 'blocked' ? 'bg-red-900/50 text-red-400' : 'bg-green-900/50 text-green-400'}`}>
                            {userProfile.status.toUpperCase()}
                          </span>
                        </TableCell>
                        <TableCell>
                          {user?.uid === userProfile.uid ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="cursor-not-allowed opacity-50">
                                  <Button size="sm" variant="ghost" disabled className="text-zinc-500">
                                    <Ban className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="bg-zinc-900 border-zinc-800 text-white">
                                <p>You cannot block your own active session.</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleBlock(userProfile.uid, userProfile.status)}
                              className={userProfile.status === 'blocked' ? 'text-green-400 hover:text-green-300' : 'text-red-400 hover:text-red-300'}
                            >
                              {userProfile.status === 'blocked' ? <CheckCircle className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            <TabsContent value="logs" className="mt-4">
              <Card className="bg-zinc-950 border-zinc-800">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-zinc-900/50">
                      <TableHead className="text-zinc-400">Document</TableHead>
                      <TableHead className="text-zinc-400">Student</TableHead>
                      <TableHead className="text-zinc-400">Program</TableHead>
                      <TableHead className="text-zinc-400">Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {downloadLogs.map((log) => (
                      <TableRow key={log.id} className="border-zinc-800 hover:bg-zinc-900/50">
                        <TableCell className="font-medium text-white">{log.documentTitle}</TableCell>
                        <TableCell className="text-zinc-400">{log.studentName}</TableCell>
                        <TableCell className="text-zinc-400">{log.studentProgram}</TableCell>
                        <TableCell className="text-zinc-400">
                          {log.timestamp && format(new Date(log.timestamp), 'MMM d, HH:mm')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>
          </Tabs>
        </TooltipProvider>
      </main>
    </div>
  );
}