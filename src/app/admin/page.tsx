"use client";

import { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import { useFirebase } from '@/firebase/provider';
import {
  getAllStudents,
  updateStudentStatus,
  searchDocuments,
  uploadDocument,
  getDownloadStats
} from '@/lib/firestore-service';
import { CICSDocument, UserProfile, DownloadLog } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Upload, Ban, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function AdminDashboard() {
  const { user, firestore, storage } = useFirebase(); // Need storage!
  const [stats, setStats] = useState({ users: 0, downloads: 0 });

  // State for Tabs
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [documents, setDocuments] = useState<CICSDocument[]>([]);
  const [downloadLogs, setDownloadLogs] = useState<DownloadLog[]>([]);
  const [loading, setLoading] = useState(true);

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
        const [stds, docs, dlLogs] = await Promise.all([
          getAllStudents(firestore),
          searchDocuments(firestore), // get all
          getDownloadStats(firestore)
        ]);
        setStudents(stds);
        setDocuments(docs);
        setDownloadLogs(dlLogs);
        setStats({ users: stds.length, downloads: dlLogs.length });
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
      setStudents(prev => prev.map(s => s.uid === uid ? { ...s, status: newStatus } : s));
      toast({ title: `User ${newStatus === 'active' ? 'Unblocked' : 'Blocked'}` });
    } catch {
      toast({ variant: 'destructive', title: 'Action Failed' });
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !newDoc.title || !newDoc.category || !firestore || !storage || !user) return;

    setUploading(true);
    try {
      await uploadDocument(firestore, storage, file, {
        ...newDoc,
        uploadedBy: user.uid
      });
      toast({ title: 'Document Uploaded' });
      setUploadOpen(false);
      setNewDoc({ title: '', description: '', category: '' });
      setFile(null);
      // Refresh list
      const docs = await searchDocuments(firestore);
      setDocuments(docs);
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Upload Failed' });
    } finally {
      setUploading(false);
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
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
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

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">Total Students</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.users}</div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">Total Downloads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.downloads}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="documents" className="w-full">
          <TabsList className="bg-zinc-900 text-zinc-400 border border-zinc-800">
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
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

          <TabsContent value="students" className="mt-4">
            <Card className="bg-zinc-950 border-zinc-800">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-zinc-900/50">
                    <TableHead className="text-zinc-400">Name</TableHead>
                    <TableHead className="text-zinc-400">Email</TableHead>
                    <TableHead className="text-zinc-400">Program</TableHead>
                    <TableHead className="text-zinc-400">Status</TableHead>
                    <TableHead className="text-zinc-400">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.uid} className="border-zinc-800 hover:bg-zinc-900/50">
                      <TableCell className="font-medium text-white">{student.displayName}</TableCell>
                      <TableCell className="text-zinc-400">{student.email}</TableCell>
                      <TableCell className="text-zinc-400">{student.program || 'N/A'}</TableCell>
                      <TableCell className="text-zinc-400">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${student.status === 'blocked' ? 'bg-red-900/50 text-red-400' : 'bg-green-900/50 text-green-400'}`}>
                          {student.status.toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleBlock(student.uid, student.status)}
                          className={student.status === 'blocked' ? 'text-green-400 hover:text-green-300' : 'text-red-400 hover:text-red-300'}
                        >
                          {student.status === 'blocked' ? <CheckCircle className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                        </Button>
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
      </main>
    </div>
  );
}