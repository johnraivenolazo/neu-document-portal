'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase/provider';
import { checkIsAdmin } from '@/lib/firestore-service';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
    children: React.ReactNode;
    requiredRole?: 'admin' | 'student';
}

export default function AuthGuard({ children, requiredRole }: AuthGuardProps) {
    const { user, isUserLoading, firestore } = useFirebase();
    const router = useRouter();
    const [authorized, setAuthorized] = useState(false);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        let cancelled = false;

        async function verify() {
            if (isUserLoading) return;

            if (!user) {
                router.replace('/');
                return;
            }

            if (!user.email?.endsWith('@neu.edu.ph')) {
                router.replace('/');
                return;
            }

            if (requiredRole && firestore) {
                const admin = await checkIsAdmin(firestore, user.uid);
                if (cancelled) return;

                if (requiredRole === 'admin' && !admin) {
                    router.replace('/student');
                    return;
                }
                if (requiredRole === 'student' && admin) {
                    router.replace('/admin');
                    return;
                }
            }

            if (!cancelled) {
                setAuthorized(true);
                setChecking(false);
            }
        }

        verify();
        return () => { cancelled = true; };
    }, [user, isUserLoading, requiredRole, firestore, router]);

    if (isUserLoading || checking) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
                    <p className="text-sm text-zinc-500">Verifying access...</p>
                </div>
            </div>
        );
    }

    if (!authorized) return null;

    return <>{children}</>;
}
