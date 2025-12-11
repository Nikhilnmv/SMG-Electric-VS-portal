'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  History,
  Focus,
  BarChart3,
  Shield,
  User,
  LogOut,
  Menu,
  X,
  Users,
  BookOpen,
} from 'lucide-react';
import { isAuthenticated, isAdmin, logout as authLogout } from '@/lib/auth';
import { useAuth } from '@/hooks/useAuth';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Modules', href: '/modules', icon: BookOpen },
  { label: 'Watch History', href: '/watch-history', icon: History },
  { label: 'Focus Mode', href: '/focus-mode', icon: Focus },
  { label: 'Admin Panel', href: '/admin', icon: Shield, adminOnly: true },
  { label: 'Profile', href: '/profile', icon: User },
];

// Admin navigation items
const adminNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'User Management', href: '/admin/users', icon: Users },
  { label: 'Modules & Lessons', href: '/admin/modules', icon: BookOpen },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { label: 'Profile', href: '/profile', icon: User },
];

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { isAdmin: userIsAdmin } = useAuth();

  useEffect(() => {
    setMounted(true);
    // Check authentication on mount
    if (!isAuthenticated()) {
      router.push('/login');
    }
  }, [router]);

  // Close sidebar on mobile when route changes
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    authLogout();
    router.push('/login');
  };
  
  // For admin users, show admin navigation items; for regular users, show regular nav items
  const visibleNavItems = userIsAdmin 
    ? adminNavItems 
    : navItems.filter((item) => {
        if (item.adminOnly) {
          return false;
        }
        return true;
      });

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B214A]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Branding Bar */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
                aria-label="Toggle sidebar"
              >
                {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
              <Link href="/dashboard" className="flex items-center">
                <h1 className="font-serif text-4xl lg:text-5xl font-extrabold text-[#0A1A3A] tracking-tight uppercase leading-none">SMG</h1>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:flex lg:flex-shrink-0">
          <div className="flex flex-col w-64 bg-[#0B214A] min-h-[calc(100vh-4rem)]">
            <nav className="flex-1 px-4 py-6 space-y-2">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-white/10 text-white'
                        : 'text-white/80 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Logout Button */}
            <div className="px-4 py-4 border-t border-white/10">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-white/80 hover:bg-white/5 hover:text-white transition-colors"
              >
                <LogOut className="h-5 w-5" />
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Sidebar - Mobile */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
            <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[#0B214A] shadow-xl overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <Link href="/dashboard" className="text-xl font-bold text-white">VS Platform</Link>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 rounded-md text-white hover:bg-white/10"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <nav className="flex-1 px-4 py-6 space-y-2">
                {visibleNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-white/10 text-white'
                          : 'text-white/80 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
              <div className="px-4 py-4 border-t border-white/10">
                <button
                  onClick={() => {
                    handleLogout();
                    setSidebarOpen(false);
                  }}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-white/80 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="font-medium">Logout</span>
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 lg:ml-0">
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="bg-white rounded-lg shadow-sm min-h-[calc(100vh-8rem)] p-6">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

