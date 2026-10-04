'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert, Search, Filter, CheckCircle2, Shield } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { getAuditLogs } from '@/lib/api';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('All');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await getAuditLogs();
      if (res && res.data) setLogs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((l) => {
    const matchesSearch =
      !search ||
      l.Action?.toLowerCase().includes(search.toLowerCase()) ||
      l.User?.toLowerCase().includes(search.toLowerCase()) ||
      l.Details?.toLowerCase().includes(search.toLowerCase()) ||
      l.Transaction_ID?.toLowerCase().includes(search.toLowerCase());

    const matchesModule = moduleFilter === 'All' || l.Module === moduleFilter;
    return matchesSearch && matchesModule;
  });

  return (
    <AppLayout>
      <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
        {/* Header */}
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">System Audit Logs</h1>
            <p className="text-xs text-gray-500">
              Immutable audit trail recording all user logins, stock inward/outward events, and edits
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search audit trail by user, action, details..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl"
            />
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-xs font-semibold text-gray-600">Module:</label>
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl font-medium"
            >
              <option value="All">All Modules</option>
              <option value="Stock Inward">Stock Inward</option>
              <option value="Stock Outward">Stock Outward</option>
              <option value="Items">Items Master</option>
              <option value="Auth">Auth & Logins</option>
              <option value="Users">Users</option>
              <option value="Settings">Settings</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50/80 text-gray-500 uppercase text-[10px] font-bold border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3">Log ID</th>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Module</th>
                  <th className="px-4 py-3">Transaction ID / Item</th>
                  <th className="px-4 py-3">Details</th>
                  <th className="px-4 py-3">IP Address</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {filteredLogs.map((log, idx) => (
                  <tr key={idx} className="hover:bg-red-50/20 transition">
                    <td className="px-4 py-3 font-mono text-[11px] text-gray-400">{log.Log_ID}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-800">{log.Date_Time}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">{log.User}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                        {log.Action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{log.Module}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {log.Transaction_ID || log.Item_No || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{log.Details}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-gray-400">
                      {log.IP_Address || '127.0.0.1'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                        <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" />
                        {log.Status || 'Success'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
