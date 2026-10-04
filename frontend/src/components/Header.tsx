'use client';

import React, { useState, useEffect } from 'react';
import { Search, Calendar, Bell, RefreshCw, Database, Menu } from 'lucide-react';
import { getSyncStatus, forceSync } from '@/lib/api';

interface HeaderProps {
  searchTerm?: string;
  onSearchChange?: (val: string) => void;
  dateRange?: string;
  onMenuClick?: () => void;
}

export default function Header({
  searchTerm = '',
  onSearchChange,
  dateRange = '01 Oct 2026 - 31 Oct 2026',
  onMenuClick,
}: HeaderProps) {
  const [syncing, setSyncing] = useState(false);
  const [excelStatus, setExcelStatus] = useState<{
    connected: boolean;
    mode?: string;
    last_synced?: string;
    error?: string;
  }>({
    connected: true,
    mode: 'Excel Database (Kitchen_Stock_Database.xlsx)',
    last_synced: '02 Oct 2026 10:42 PM',
  });

  const checkStatus = async () => {
    try {
      const res = await getSyncStatus();
      if (res && res.data) {
        setExcelStatus({
          connected: res.data.connected ?? true,
          mode: res.data.mode || 'Excel Database (Kitchen_Stock_Database.xlsx)',
          last_synced: res.data.last_synced
            ? new Date(res.data.last_synced).toLocaleString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Just now',
        });
      }
    } catch {
      // Keep existing status
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      await forceSync();
      await checkStatus();
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setSyncing(false), 600);
    }
  };

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-20 px-3 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between shadow-xs gap-2 sm:gap-4">
      {/* Left: Mobile Menu Toggle & Search Input */}
      <div className="flex items-center space-x-2 sm:space-x-3 flex-1 max-w-lg">
        {/* Mobile Menu Button */}
        <button
          onClick={onMenuClick}
          className="p-2 text-gray-700 hover:bg-gray-100 active:bg-gray-200 rounded-xl md:hidden shrink-0 cursor-pointer"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5 text-gray-700" />
        </button>

        {/* Search Input */}
        <div className="relative w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            placeholder="Search items by name, item no..."
            className="w-full pl-8 sm:pl-9 pr-3 py-2 bg-gray-50/80 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
        {/* Excel Connection Status & Sync Button (Desktop) */}
        <div className="hidden lg:flex items-center space-x-2 bg-gray-50 border border-gray-200/80 px-3 py-1.5 rounded-xl text-xs">
          <div className="flex items-center space-x-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                excelStatus.connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
              }`}
            />
            <span className="font-semibold text-gray-700 flex items-center gap-1">
              <Database className="w-3 h-3 text-gray-500" />
              {excelStatus.connected ? 'Excel Connected' : 'Excel Error'}
            </span>
          </div>
          <span className="text-gray-300">|</span>
          <span className="text-gray-500 text-[11px]">
            Synced: {excelStatus.last_synced || 'Just now'}
          </span>
          <button
            onClick={handleSyncNow}
            disabled={syncing}
            title="Sync Excel Database Now"
            className="p-1 text-red-600 hover:bg-red-50 rounded-md transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Mobile Excel Sync Icon Button */}
        <button
          onClick={handleSyncNow}
          disabled={syncing}
          title={`Excel Sync: ${excelStatus.last_synced || 'Just now'}`}
          className="lg:hidden p-2 text-red-600 hover:bg-red-50 active:bg-red-100 rounded-xl transition cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
        </button>

        {/* Date Range Selector (Tablet/Desktop) */}
        <div className="hidden sm:flex items-center space-x-2 bg-gray-50/90 border border-gray-200 px-3 py-1.5 rounded-xl text-xs font-medium text-gray-700">
          <Calendar className="w-3.5 h-3.5 text-red-600" />
          <span className="truncate max-w-[140px] md:max-w-none">{dateRange}</span>
        </div>

        {/* Notification Bell */}
        <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-xl transition cursor-pointer">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-red-600 text-white text-[8px] font-bold rounded-full flex items-center justify-center border-2 border-white">
            3
          </span>
        </button>

        {/* User Avatar */}
        <div className="flex items-center space-x-2 pl-1 sm:pl-2 border-l border-gray-200">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-red-100 border border-red-200 flex items-center justify-center text-red-700 font-bold text-xs shadow-inner shrink-0">
            A
          </div>
          <div className="hidden sm:block">
            <span className="text-xs font-semibold text-gray-800">Admin</span>
          </div>
        </div>
      </div>
    </header>
  );
}
