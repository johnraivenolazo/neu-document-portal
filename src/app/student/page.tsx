"use client";

import { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import { useFirebase } from '@/firebase/provider';
import { searchDocuments, logDownload, getActiveUser, checkIsAdmin, updateUserRole } from '@/lib/firestore-service';
import { CICSDocument, UserProfile } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Search, Download, FileText, Loader2, ShieldCheck, RefreshCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';


export default function StudentDashboard() {
    const { user, firestore } = useFirebase();
    const [query, setQuery] = useState('');
    const [documents, setDocuments] = useState<CICSDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [switchingStatus, setSwitchingStatus] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
        async function load() {
            if (!firestore || !user) return;
            try {
                const [results, adminCheck] = await Promise.all([
                   searchDocuments(firestore, query),
                   checkIsAdmin(firestore, user.uid, user.email || undefined)
                ]);
                setDocuments(results);
                setIsAdmin(adminCheck);
            } catch (err) {
                console.error('Failed to load data:', err);
            } finally {
                setLoading(false);
            }
        }
        const timeoutId = setTimeout(() => {
            load();
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [firestore, query, user]);

    const handleDownload = async (doc: CICSDocument) => {
        if (!user || !firestore) return;
        
        try {
            // Check if user is blocked
            const profile = await getActiveUser(firestore, user.uid);
            if (profile?.status === 'blocked') {
                toast({
                    variant: 'destructive',
                    title: 'Access Restricted',
                    description: 'Your account is restricted. Please contact the administrator.',
                });
                return;
            }

            // Log the download
            await logDownload(firestore, doc.id, profile as UserProfile, doc.title);

            // Trigger browser download
            const link = document.createElement('a');
            link.href = doc.downloadUrl || doc.fileUrl;
            link.target = '_blank';

            // Ensure the download filename has the correct extension
            const safeTitle = doc.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const extension = doc.extension || doc.fileUrl.split('.').pop()?.split('?')[0] || 'pdf';
            link.download = `${safeTitle}.${extension}`;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast({
                title: 'Download Started',
                description: `Downloading ${doc.title}.${extension}...`,
            });
        } catch (err) {
            console.error('Download error:', err);
            toast({
                variant: 'destructive',
                title: 'Download Failed',
                description: 'Could not log download. Please try again.',
            });
        }
    };

    const handleSwitchRole = async () => {
        if (!user || !firestore) return;
        setSwitchingStatus(true);
        try {
            await updateUserRole(firestore, user.uid, 'admin');
            toast({ title: 'Role Switched', description: 'Returning to Admin Dashboard...' });
            router.push('/admin');
        } catch (err) {
            console.error(err);
            toast({ variant: 'destructive', title: 'Switch Failed' });
        } finally {
            setSwitchingStatus(false);
        }
    };

    if (!user) return null; // Or loading spinner

    return (
        <div className="min-h-screen bg-black">
            <Navbar user={{
                displayName: user.displayName || 'Student',
                email: user.email || '',
                role: 'student',
                photoURL: user.photoURL || undefined
            }} />

            <main className="container mx-auto px-4 py-8 space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold text-white">Document Repository</h1>
                        <p className="text-zinc-400">Search and download official CICS documents.</p>
                    </div>
                    {isAdmin && (
                        <Button 
                            variant="outline" 
                            onClick={handleSwitchRole} 
                            disabled={switchingStatus}
                            className="border-zinc-800 text-zinc-300 hover:bg-zinc-900 font-bold gap-2"
                        >
                            {switchingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                            Switch back to Admin
                        </Button>
                    )}
                </div>

                <div className="relative max-w-xl">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <Input
                        placeholder="Search documents by title or category..."
                        className="pl-10 bg-zinc-900 border-zinc-800 text-white h-12"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {documents.map((doc) => (
                            <Card key={doc.id} className="bg-zinc-950 border-zinc-900 hover:border-zinc-700 transition-colors">
                                <CardHeader className="pb-3">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="p-2 bg-zinc-900 rounded-lg">
                                            <FileText className="h-6 w-6 text-blue-400" />
                                        </div>
                                        <span className="text-xs font-mono text-zinc-500 bg-zinc-900 px-2 py-1 rounded">
                                            {doc.category}
                                        </span>
                                    </div>
                                    <CardTitle className="text-lg text-white mt-4 line-clamp-2 leading-tight">
                                        {doc.title}
                                    </CardTitle>
                                    <CardDescription className="line-clamp-2 mt-1">
                                        {doc.description}
                                    </CardDescription>
                                </CardHeader>
                                <CardFooter className="pt-0">
                                    <Button
                                        className="w-full bg-zinc-100 text-black hover:bg-white font-semibold gap-2"
                                        onClick={() => handleDownload(doc)}
                                    >
                                        <Download className="h-4 w-4" />
                                        Download
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}

                        {documents.length === 0 && !loading && (
                            <div className="col-span-full text-center py-12 text-zinc-500">
                                No documents found matching &quot;{query}&quot;.
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
