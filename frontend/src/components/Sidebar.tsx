'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  FileBarChart2,
  ReceiptText,
  AlertTriangle,
  Users,
  ShieldAlert,
  Settings as SettingsIcon,
  LogOut,
  UtensilsCrossed,
  Warehouse,
  X,
} from 'lucide-react';
import { logout, getCurrentUser } from '@/lib/api';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Items / Inventory', href: '/inventory', icon: Package },
  { name: 'Stock Inward', href: '/stock-inward', icon: ArrowDownLeft },
  { name: 'Stock Outward', href: '/stock-outward', icon: ArrowUpRight },
  { name: 'Bartan Inward', href: '/bartan-inward', icon: Warehouse },
  { name: 'Departments', href: '/departments', icon: Building2 },
  { name: 'Reports', href: '/reports', icon: FileBarChart2 },
  { name: 'All Records', href: '/records', icon: ReceiptText },
  { name: 'Low Stock Alerts', href: '/low-stock', icon: AlertTriangle, badge: 7 },
  { name: 'Users', href: '/users', icon: Users },
  { name: 'Audit Logs', href: '/audit-logs', icon: ShieldAlert },
  { name: 'Settings', href: '/settings', icon: SettingsIcon },
];

interface SidebarProps {
  lowStockCount?: number;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ lowStockCount = 7, isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const user = getCurrentUser() || { full_name: 'Admin', role: 'System Administrator' };

  const handleLogout = async () => {
    if (onClose) onClose();
    await logout();
    router.push('/login');
  };

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-xs z-40 transition-opacity duration-300 md:hidden ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 sm:w-64 bg-gradient-to-b from-[#dc2626] via-[#c8102e] to-[#991b1b] text-white flex flex-col justify-between shadow-2xl transition-transform duration-300 ease-in-out md:static md:translate-x-0 md:min-w-64 md:w-64 md:z-30 min-h-screen ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Brand Header */}
          <div className="p-4 sm:p-5 flex items-center justify-between border-b border-red-500/30">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-inner shrink-0">
                <UtensilsCrossed className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-base tracking-wider leading-none text-white">
                  RSSB LANGAR
                </h1>
                <span className="text-[10px] text-red-200 tracking-widest font-medium uppercase mt-0.5 block">
                  JSR
                </span>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl md:hidden cursor-pointer"
              aria-label="Close Sidebar"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation items */}
          <nav className="p-3 space-y-1 mt-2 flex-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              const badgeValue = item.name === 'Low Stock Alerts' ? lowStockCount : item.badge;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={handleNavClick}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group active:scale-[0.98] ${
                    isActive
                      ? 'bg-white text-[#c8102e] shadow-md font-semibold translate-x-1'
                      : 'text-red-100 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon
                      className={`w-4 h-4 transition-colors shrink-0 ${
                        isActive ? 'text-[#c8102e]' : 'text-red-200 group-hover:text-white'
                      }`}
                    />
                    <span className="truncate">{item.name}</span>
                  </div>
                  {badgeValue !== undefined && Number(badgeValue) > 0 && (
                    <span
                      className={`px-2 py-0.5 text-[11px] font-bold rounded-full transition-colors ${
                        isActive
                          ? 'bg-[#c8102e] text-white'
                          : 'bg-white text-[#c8102e] shadow-sm'
                      }`}
                    >
                      {badgeValue}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User info & Logout at bottom */}
        <div className="p-4 border-t border-red-500/30 bg-black/10 backdrop-blur-xs shrink-0">
          <div className="flex items-center space-x-3 mb-3 px-2">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold text-sm border border-white/30 shrink-0 shadow-inner">
              {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-bold text-white truncate leading-tight">
                {user.full_name || 'Admin'}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                    String(user.role).toUpperCase() === 'ADMIN'
                      ? 'bg-amber-400 text-amber-950 shadow-2xs'
                      : String(user.role).toUpperCase() === 'VIEWER'
                      ? 'bg-blue-300 text-blue-950 shadow-2xs'
                      : 'bg-white/20 text-white'
                  }`}
                >
                  {user.role || 'ADMIN'}
                </span>
                <span className="text-[10px] text-red-200 truncate">
                  {String(user.role).toUpperCase() === 'ADMIN'
                    ? 'Full Access'
                    : String(user.role).toUpperCase() === 'VIEWER'
                    ? 'View Only'
                    : 'Standard'}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center sm:justify-start space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-red-100 hover:bg-white/10 hover:text-white transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
