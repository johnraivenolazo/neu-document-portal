"use client";

import { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import { useFirebase } from '@/firebase/provider';
import { searchDocuments, logDownload } from '@/lib/firestore-service';
import { CICSDocument, UserProfile } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Search, Download, FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function StudentDashboard() {
    const { user, firestore } = useFirebase();
    const [query, setQuery] = useState('');
    const [documents, setDocuments] = useState<CICSDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        async function load() {
            if (!firestore) return;
            try {
                const results = await searchDocuments(firestore, query);
                setDocuments(results);
            } catch (err) {
                console.error('Failed to load documents:', err);
            } finally {
                setLoading(false);
            }
        }
        // Debounce query? Need complex useEffect.
        // For now, load all initially, filter locally or reload on strict search?
        // searchDocuments handles exact query or empty.
        const timeoutId = setTimeout(() => {
            load();
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [firestore, query]);

    const handleDownload = async (doc: CICSDocument) => {
        if (!user || !firestore) return;
        try {
            // Log the download
            await logDownload(firestore, doc.id, user as unknown as UserProfile, doc.title);

            // Trigger browser download
            const link = document.createElement('a');
            link.href = doc.fileUrl;
            link.target = '_blank';
            link.download = doc.title;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast({
                title: 'Download Started',
                description: `Downloading ${doc.title}...`,
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
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold text-white">Document Repository</h1>
                    <p className="text-zinc-400">Search and download official CICS documents.</p>
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
                                No documents found matching "{query}".
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
