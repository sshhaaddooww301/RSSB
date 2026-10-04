'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowDownLeft,
  Package,
  Boxes,
  AlertCircle,
  CheckCircle2,
  Search,
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { getLowStock } from '@/lib/api';

export default function LowStockPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await getLowStock();
      if (res && res.data) {
        setAlerts(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const critical = alerts.filter((i) => i.Stock_Status === 'CRITICAL');
  const low = alerts.filter((i) => i.Stock_Status === 'LOW STOCK');

  const filtered = alerts.filter((i) =>
    !search ||
    i.Item_Name?.toLowerCase().includes(search.toLowerCase()) ||
    i.Item_No?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                Low & Critical Stock Alerts
              </h1>
              <p className="text-xs text-gray-500">
                Items requiring immediate replenishment or procurement
              </p>
            </div>
          </div>

          <Link
            href="/stock-inward"
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Add Stock Inward</span>
          </Link>
        </div>

        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-red-50/80 border border-red-200 p-5 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-red-700 uppercase">Critical Stock Items</span>
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
            </div>
            <h2 className="text-3xl font-extrabold text-red-700 mt-2">{critical.length}</h2>
            <p className="text-[11px] text-red-600 mt-1">Below critical survival limit</p>
          </div>

          <div className="bg-amber-50/80 border border-amber-200 p-5 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-700 uppercase">Low Stock Items</span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            </div>
            <h2 className="text-3xl font-extrabold text-amber-700 mt-2">{low.length}</h2>
            <p className="text-[11px] text-amber-600 mt-1">Below recommended threshold</p>
          </div>

          <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-600 uppercase">Total Items Monitored</span>
              <Package className="w-4 h-4 text-gray-400" />
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 mt-2">{alerts.length}</h2>
            <p className="text-[11px] text-gray-400 mt-1">Requiring restock attention</p>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search alert items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl"
            />
          </div>
        </div>

        {/* Alerts Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50/80 text-gray-500 uppercase text-[10px] font-bold border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Item No</th>
                  <th className="px-4 py-3">Item Name</th>
                  <th className="px-4 py-3">Base Unit</th>
                  <th className="px-4 py-3 font-bold text-red-600">Current Stock</th>
                  <th className="px-4 py-3">Min Threshold</th>
                  <th className="px-4 py-3">Critical Threshold</th>
                  <th className="px-4 py-3">Deficit / Reorder Needed</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {filtered.map((item, idx) => {
                  const current = Number(item.Current_Stock || 0);
                  const min = Number(item.Minimum_Stock || 0);
                  const deficit = Math.max(0, min - current);
                  const isCrit = item.Stock_Status === 'CRITICAL';

                  return (
                    <tr key={idx} className={`hover:bg-red-50/20 transition ${isCrit ? 'bg-red-50/30' : ''}`}>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isCrit
                              ? 'bg-red-100 text-red-700 border border-red-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {item.Stock_Status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-900">{item.Item_No}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{item.Item_Name}</td>
                      <td className="px-4 py-3 font-bold text-red-600">{item.Unit}</td>
                      <td className="px-4 py-3 font-extrabold text-red-600 text-sm">
                        {item.Current_Stock} {item.Unit}
                      </td>
                      <td className="px-4 py-3">{item.Minimum_Stock} {item.Unit}</td>
                      <td className="px-4 py-3 text-red-600 font-semibold">{item.Critical_Stock} {item.Unit}</td>
                      <td className="px-4 py-3 font-bold text-gray-900">
                        +{deficit} {item.Unit}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/stock-inward?item=${item.Item_No}`}
                          className="inline-flex items-center space-x-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition"
                        >
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                          <span>Restock</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
