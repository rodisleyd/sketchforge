import { User, signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { Button } from "@/components/ui/button";
import { LogOut, User as UserIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  user: User;
}

export function Header({ user }: HeaderProps) {
  const handleLogout = () => signOut(auth);

  return (
    <header className="h-16 border-b border-zinc-100 px-6 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
      <div className="flex items-center gap-2">
      </div>
      
      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="rounded-full p-1 h-9 w-9 overflow-hidden border border-zinc-100">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'Avatar'} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <UserIcon className="w-4 h-4 text-zinc-400" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-xl p-2 border-zinc-100">
            <div className="px-2 py-1.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">
              {user.displayName || user.email}
            </div>
            <div className="h-px bg-zinc-100 my-1" />
            <DropdownMenuItem 
              onClick={handleLogout}
              className="text-red-500 focus:text-red-500 focus:bg-red-50 rounded-lg cursor-pointer"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
