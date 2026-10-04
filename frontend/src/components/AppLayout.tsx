'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ArrowDownLeft,
  ArrowUpRight,
  Warehouse,
  ReceiptText,
} from 'lucide-react';
import Sidebar from './Sidebar';
import Header from './Header';
import { getLowStock, isLoggedIn } from '@/lib/api';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [lowStockCount, setLowStockCount] = useState<number>(7);
  const [searchTerm, setSearchTerm] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await getLowStock();
        if (res && res.data) {
          setLowStockCount(res.data.length);
        }
      } catch {
        // use default
      }
    };
    if (isLoggedIn()) {
      fetchAlerts();
    }
  }, []);

  const mobileNavItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Inventory', href: '/inventory', icon: Package },
    { name: 'Inward', href: '/stock-inward', icon: ArrowDownLeft },
    { name: 'Outward', href: '/stock-outward', icon: ArrowUpRight },
    { name: 'Bartan', href: '/bartan-inward', icon: Warehouse },
    { name: 'Records', href: '/records', icon: ReceiptText },
  ];

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      {/* Sidebar (Desktop + Mobile Drawer) */}
      <Sidebar
        lowStockCount={lowStockCount}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 p-3.5 sm:p-5 md:p-6 pb-24 md:pb-6 overflow-y-auto">
          {children}
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-gray-200 px-2 py-1.5 flex items-center justify-around shadow-lg">
          {mobileNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-150 ${
                  isActive
                    ? 'text-red-600 font-bold'
                    : 'text-gray-500 hover:text-gray-900 font-medium'
                }`}
              >
                <div
                  className={`p-1 rounded-lg transition-colors ${
                    isActive ? 'bg-red-50 text-red-600' : 'text-gray-500'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] tracking-tight leading-tight mt-0.5">
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
