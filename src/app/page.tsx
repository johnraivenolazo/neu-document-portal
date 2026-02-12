"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase/provider';
import { signInWithGoogle } from '@/lib/auth-service';
import { checkIsAdmin, createOrUpdateStudentProfile, getActiveUser } from '@/lib/firestore-service';
import type { User } from 'firebase/auth';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { auth, firestore, user, isUserLoading } = useFirebase();

  // Auto-redirect if already signed in
  useEffect(() => {
    if (!isUserLoading && user && firestore) {
      routeAfterLogin(user);
    }
  }, [user, isUserLoading]);

  const routeAfterLogin = async (fbUser: User) => {
    try {
      const admin = await checkIsAdmin(firestore!, fbUser.uid);
      if (admin) {
        router.push('/admin');
        return;
      }

      // Student Logic
      await createOrUpdateStudentProfile(firestore!, fbUser.uid, {
        email: fbUser.email!,
        displayName: fbUser.displayName || fbUser.email!,
        photoURL: fbUser.photoURL || undefined,
      });

      // Check if profile is complete (has program)
      const profile = await getActiveUser(firestore!, fbUser.uid);
      if (profile && !profile.program) {
        router.push('/student/onboarding'); // Redirect to onboarding
      } else {
        router.push('/student');
      }
    } catch (err) {
      console.error('Post-login routing error:', err);
    }
  };

  const handleGoogleLogin = async (hint?: string) => {
    setLoading(true);
    try {
      const fbUser = await signInWithGoogle(auth!, hint);
      await routeAfterLogin(fbUser);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: err.message || 'Authentication failed. Please use your @neu.edu.ph account.',
      });
    } finally {
      setLoading(false);
    }
  };



  // Show loading while checking existing session
  if (isUserLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-black">
      <div className="hidden lg:flex flex-col justify-center p-16 bg-zinc-950 text-white relative overflow-hidden border-r border-zinc-900">
        <div className="absolute top-0 right-0 w-96 h-96 bg-zinc-100/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-[120px]" />

        <div className="relative z-10 space-y-12">
          <div className="space-y-4">
            <p className="text-xl text-zinc-400 max-w-sm leading-relaxed font-light">
              Secure authentication for institutional facility management.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-zinc-900 rounded-lg border border-zinc-800">
                <ShieldCheck className="h-6 w-6 text-zinc-300" />
              </div>
              <div>
                <span className="font-semibold text-zinc-200 block">Verified Access</span>
                <p className="text-zinc-500 text-sm">Restricted to @neu.edu.ph domains.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <Card className="w-full max-w-md border-zinc-900 bg-zinc-950/40 backdrop-blur-xl shadow-2xl">
          <CardHeader className="space-y-2 text-center sm:text-left">
            <CardTitle className="text-3xl font-bold tracking-tight text-zinc-100">Welcome</CardTitle>
            <CardDescription className="text-zinc-500">
              Please authenticate with your institutional credentials.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <Button
              className="w-full h-12 text-sm font-bold bg-white text-black hover:bg-zinc-200 transition-all active:scale-[0.98] gap-3"
              onClick={() => handleGoogleLogin()}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              )}
              {loading ? 'Authenticating...' : 'Sign in with Google Workspace'}
            </Button>

            <div className="bg-blue-900/20 border border-blue-900/50 rounded-lg p-3">
              <p className="text-blue-200 text-xs text-center leading-relaxed">
                Only <strong>@neu.edu.ph</strong> accounts are authorized.
              </p>
            </div>
          </CardContent>
          <CardFooter className="pt-2">
            <p className="text-center w-full text-[10px] text-zinc-700 leading-relaxed uppercase tracking-[0.2em] font-bold">
              Institutional Security Standards Applied
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}