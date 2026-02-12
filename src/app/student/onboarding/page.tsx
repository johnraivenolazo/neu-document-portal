"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase/provider';
import { createOrUpdateStudentProfile } from '@/lib/firestore-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PROGRAMS = [
    'BS Computer Science',
    'BS Information Technology',
    'BS Information Systems',
    'BS Entertainment and Multimedia Computing',
    'BS Library Information Science'
];

export default function OnboardingPage() {
    const router = useRouter();
    const { user, firestore } = useFirebase();
    const [program, setProgram] = useState('');
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!program || !user || !firestore) return;

        setLoading(true);
        try {
            await createOrUpdateStudentProfile(firestore, user.uid, { program });
            toast({
                title: 'Profile Completed',
                description: 'Welcome to the CICS Document Portal!',
            });
            router.push('/student');
        } catch (err) {
            console.error('Onboarding error:', err);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to update profile. Please try again.',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-black p-4">
            <Card className="w-full max-w-md bg-zinc-950 border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-2xl text-white">Complete Your Profile</CardTitle>
                    <CardDescription className="text-zinc-400">
                        Please select your undergraduate program to continue.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="program" className="text-zinc-200">Program</Label>
                            <Select onValueChange={setProgram} value={program}>
                                <SelectTrigger className="w-full bg-zinc-900 border-zinc-700 text-zinc-100">
                                    <SelectValue placeholder="Select your program" />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-100">
                                    {PROGRAMS.map((p) => (
                                        <SelectItem key={p} value={p} className="focus:bg-zinc-800 focus:text-white cursor-pointer hover:bg-zinc-800">
                                            {p}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-white text-black hover:bg-zinc-200 font-bold"
                            disabled={!program || loading}
                        >
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Continue to Portal
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
