"use client";

import { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import { useFirebase } from '@/firebase/provider';
import { searchDocuments, logDownload, getActiveUser, checkIsAdmin, updateUserRole } from '@/lib/firestore-service';
import { CICSDocument, UserProfile } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Download, FileText, Loader2, RefreshCcw, Filter } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';


export default function StudentDashboard() {
    const { user, firestore } = useFirebase();
    const [query, setQuery] = useState('');
    const [documents, setDocuments] = useState<CICSDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [isAdmin, setIsAdmin] = useState(false);
    const [canSwitchView, setCanSwitchView] = useState(false);
    const [switchingStatus, setSwitchingStatus] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
        async function load() {
            if (!firestore || !user) return;
            try {
                const [results, adminCheck, profile] = await Promise.all([
                   searchDocuments(firestore, query),
                   checkIsAdmin(firestore, user.uid, user.email || undefined),
                   getActiveUser(firestore, user.uid)
                ]);
                setDocuments(results);
                setIsAdmin(adminCheck);
                setCanSwitchView(Boolean(profile?.canSwitchView));
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
            toast({ title: 'Role Updated', description: 'Opening the admin dashboard...' });
            router.push('/admin');
        } catch (err) {
            console.error(err);
            toast({ variant: 'destructive', title: 'Switch Failed' });
        } finally {
            setSwitchingStatus(false);
        }
    };

    if (!user) return null; // Or loading spinner

    const categories = ['All', ...Array.from(new Set(documents.map((doc) => doc.category).filter(Boolean)))];
    const filteredDocuments = selectedCategory === 'All'
        ? documents
        : documents.filter((doc) => doc.category === selectedCategory);

    return (
        <div className="min-h-screen bg-black">
            <Navbar user={{
                displayName: user.displayName || 'Student',
                email: user.email || '',
                role: 'student',
                photoURL: user.photoURL || undefined
            }} />

            <main className="container mx-auto px-4 py-8 space-y-8">
                <motion.div
                    className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                >
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold text-white">CICS Document Library</h1>
                        <p className="text-zinc-400">Find and download official CICS files quickly.</p>
                    </div>
                    {(isAdmin || canSwitchView) && (
                        <Button 
                            variant="outline" 
                            onClick={handleSwitchRole} 
                            disabled={switchingStatus}
                            className="border-zinc-800 text-zinc-300 hover:bg-zinc-900 font-bold gap-2"
                        >
                            {switchingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                            Return to Admin
                        </Button>
                    )}
                </motion.div>

                <motion.section
                    className="sticky top-16 z-30 -mx-4 px-4 py-4 bg-black/85 backdrop-blur-md border-y border-zinc-900 space-y-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.05, ease: 'easeOut' }}
                >
                    <div className="relative max-w-xl">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                        <Input
                            placeholder="Search documents by title or category..."
                            className="pl-10 bg-zinc-900 border-zinc-800 text-white h-12"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center text-xs uppercase tracking-wide text-zinc-500 gap-1">
                            <Filter className="h-3.5 w-3.5" />
                            Category
                        </span>
                        {categories.map((category) => (
                            <Button
                                key={category}
                                size="sm"
                                variant={selectedCategory === category ? 'default' : 'outline'}
                                onClick={() => setSelectedCategory(category)}
                                className={selectedCategory === category
                                    ? 'bg-zinc-100 text-black hover:bg-white'
                                    : 'border-zinc-800 text-zinc-300 hover:bg-zinc-900'}
                            >
                                {category}
                            </Button>
                        ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-400">
                        <Badge variant="outline" className="border-zinc-800 bg-zinc-950 text-zinc-300">
                            {filteredDocuments.length} result{filteredDocuments.length === 1 ? '' : 's'}
                        </Badge>
                        {query.trim() && (
                            <Badge variant="outline" className="border-zinc-800 bg-zinc-950 text-zinc-300">
                                Query: {query}
                            </Badge>
                        )}
                    </div>
                </motion.section>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Card key={i} className="bg-zinc-950 border-zinc-900">
                                <CardHeader className="space-y-3">
                                    <div className="h-4 w-24 bg-zinc-900 rounded animate-pulse" />
                                    <div className="h-6 w-2/3 bg-zinc-900 rounded animate-pulse" />
                                    <div className="h-4 w-full bg-zinc-900 rounded animate-pulse" />
                                </CardHeader>
                                <CardFooter>
                                    <div className="h-10 w-full bg-zinc-900 rounded animate-pulse" />
                                </CardFooter>
                            </Card>
                        ))}
                        <div className="col-span-full flex items-center justify-center gap-2 text-zinc-500">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading documents...
                        </div>
                    </div>
                ) : (
                    <motion.div
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.25 }}
                    >
                        {filteredDocuments.map((doc) => (
                            <motion.div
                                key={doc.id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.25 }}
                            >
                            <Card className="bg-zinc-950 border-zinc-900 hover:border-zinc-700 transition-colors">
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
                            </motion.div>
                        ))}

                        {filteredDocuments.length === 0 && !loading && (
                            <div className="col-span-full py-12">
                                <Card className="bg-zinc-950 border-zinc-900 max-w-2xl mx-auto">
                                    <CardHeader className="text-center space-y-3">
                                        <div className="mx-auto p-3 rounded-xl bg-zinc-900 border border-zinc-800 w-fit">
                                            <Search className="h-5 w-5 text-zinc-400" />
                                        </div>
                                        <CardTitle className="text-zinc-100">No matching documents</CardTitle>
                                        <CardDescription className="text-zinc-500">
                                            Try another keyword, or clear filters to view all available documents.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardFooter className="justify-center gap-3">
                                        <Button
                                            variant="outline"
                                            className="border-zinc-800 text-zinc-300 hover:bg-zinc-900"
                                            onClick={() => setSelectedCategory('All')}
                                        >
                                            Show all categories
                                        </Button>
                                        <Button
                                            className="bg-zinc-100 text-black hover:bg-white"
                                            onClick={() => setQuery('')}
                                        >
                                            Clear search
                                        </Button>
                                    </CardFooter>
                                </Card>
                            </div>
                        )}
                    </motion.div>
                )}
            </main>
        </div>
    );
}
