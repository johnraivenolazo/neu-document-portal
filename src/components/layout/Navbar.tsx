"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LogOut, LayoutDashboard, History } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { usePathname, useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useFirebase } from '@/firebase/provider';
import { signOutUser } from '@/lib/auth-service';

interface NavbarProps {
  user: {
    displayName: string;
    email: string;
    role: 'admin' | 'student';
    photoURL?: string;
  };
}

export default function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { auth } = useFirebase();

  const handleLogout = async () => {
    try {
      await signOutUser(auth);
      router.push('/');
    } catch (err) {
      console.error('Logout failed:', err);
      router.push('/');
    }
  };

  return (
    <nav className="border-b border-zinc-900 bg-black/80 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          {user.role === 'admin' ? (
            <NavLink href="/admin" active={pathname === '/admin'} icon={<LayoutDashboard className="h-4 w-4" />}>Dashboard</NavLink>
          ) : (
            <NavLink href="/student" active={pathname === '/student'} icon={<History className="h-4 w-4" />}>Documents</NavLink>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-zinc-100">{user.displayName}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">{user.role}</p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full ring-offset-background transition-colors hover:ring-2 hover:ring-zinc-800">
                <Avatar className="h-10 w-10 border border-zinc-800">
                  <AvatarImage src={user.photoURL} alt={user.displayName} />
                  <AvatarFallback className="bg-zinc-900 text-zinc-400">{user.displayName.charAt(0)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-zinc-950 border-zinc-900 text-zinc-100" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.displayName}</p>
                  <p className="text-xs leading-none text-zinc-500">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-zinc-900" />
              <DropdownMenuItem onClick={handleLogout} className="text-rose-500 focus:text-rose-400 focus:bg-rose-500/10 cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, active, children, icon }: { href: string; active: boolean; children: React.ReactNode; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${active
        ? 'bg-zinc-100 text-black'
        : 'text-zinc-500 hover:text-zinc-100'
        }`}
    >
      {icon}
      {children}
    </Link>
  );
}