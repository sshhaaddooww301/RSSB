'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Package,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  Boxes,
  Plus,
  Edit2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import AppLayout from '@/components/AppLayout';
import { getDashboard, getItems } from '@/lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'current' | 'recent' | 'summary' | 'department'>('current');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({
    total_items: 0,
    todays_inward: 0,
    todays_outward: 0,
    total_current_stock: 0,
    low_stock_items: 0,
    critical_stock_items: 0,
    low_stock_list: [],
    recent_transactions: [],
    daily_outward_chart: [],
    department_usage: [
      { name: 'Langar', value: 0 },
      { name: 'Canteen', value: 0 },
    ],
  });
  const [items, setItems] = useState<any[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchData = async () => {
    try {
      setLoading(true);
      const [dashRes, itemsRes] = await Promise.all([getDashboard(), getItems()]);
      if (dashRes && dashRes.data) {
        setStats(dashRes.data);
      }
      if (itemsRes && itemsRes.data) {
        setItems(itemsRes.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredItems = items.filter((item) => {
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    return (
      item.Item_Name?.toLowerCase().includes(q) ||
      item.Item_No?.toLowerCase().includes(q) ||
      item.SKU?.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getStatusBadge = (status: string) => {
    if (status === 'CRITICAL') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
          <AlertTriangle className="w-3 h-3 mr-1 text-red-600" />
          Critical
        </span>
      );
    }
    if (status === 'LOW STOCK') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <AlertTriangle className="w-3 h-3 mr-1 text-amber-500" />
          Low Stock
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" />
        In Stock
      </span>
    );
  };

  const chartData = stats.daily_outward_chart && stats.daily_outward_chart.length > 0
    ? stats.daily_outward_chart
    : [{ day: 'Today', Langar: 0, Canteen: 0 }];

  const deptTotal = (stats.department_usage || []).reduce((acc: number, cur: any) => acc + (cur.value || 0), 0);

  return (
    <AppLayout>
      <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
        {/* Page Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Live inventory overview and stock movements from Excel
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/stock-inward"
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>+ Stock Inward / Add Item</span>
            </Link>
            <Link
              href="/inventory"
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-semibold shadow-2xs transition"
            >
              <Boxes className="w-3.5 h-3.5 text-gray-600" />
              <span>Stock Overview</span>
            </Link>
            <Link
              href="/stock-outward"
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-white border border-red-200 text-red-700 hover:bg-red-50 rounded-xl text-xs font-semibold shadow-2xs transition"
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-red-600" />
              <span>Stock Out</span>
            </Link>
          </div>
        </div>

        {/* 5 KPI Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: Total Items */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                <Boxes className="w-5 h-5" />
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
            <div className="mt-3">
              <p className="text-xs text-gray-500 font-medium">Total Items</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-0.5">
                {stats.total_items ?? items.length}
              </h3>
              <p className="text-[11px] text-gray-400 mt-1">Catalog in Excel database</p>
            </div>
          </div>

          {/* Card 2: Today's Outward */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
            <div className="mt-3">
              <p className="text-xs text-gray-500 font-medium">Today&apos;s Outward</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-0.5">
                {stats.todays_outward} <span className="text-xs font-normal text-gray-500">Units</span>
              </h3>
              <p className="text-[11px] text-red-600 font-medium mt-1">Issued today</p>
            </div>
          </div>

          {/* Card 3: Today's Inward */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
            <div className="mt-3">
              <p className="text-xs text-gray-500 font-medium">Today&apos;s Inward</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-0.5">
                {stats.todays_inward} <span className="text-xs font-normal text-gray-500">Units</span>
              </h3>
              <p className="text-[11px] text-emerald-600 font-medium mt-1">Received today</p>
            </div>
          </div>

          {/* Card 4: Low Stock Items */}
          <div className="bg-white p-4 rounded-2xl border border-red-100 bg-red-50/20 shadow-xs hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <ChevronRight className="w-4 h-4 text-red-400" />
            </div>
            <div className="mt-3">
              <p className="text-xs text-red-700 font-medium">Low Stock Items</p>
              <h3 className="text-2xl font-bold text-red-600 mt-0.5">
                {stats.low_stock_items || 0}
              </h3>
              <p className="text-[11px] text-red-600 font-semibold mt-1">
                {stats.critical_stock_items ? `${stats.critical_stock_items} Critical` : 'Monitored'}
              </p>
            </div>
          </div>

          {/* Card 5: Total Stock Volume */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-700">
                <Package className="w-5 h-5 text-red-600" />
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
            <div className="mt-3">
              <p className="text-xs text-gray-500 font-medium">Current Stock Volume</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-0.5">
                {stats.total_current_stock?.toLocaleString() || '0'}{' '}
                <span className="text-xs font-normal text-gray-500">Units</span>
              </h3>
              <p className="text-[11px] text-gray-400 mt-1">Sum of all items</p>
            </div>
          </div>
        </div>

        {/* Charts and Alerts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Daily Stock Outward Bar Chart */}
          <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Daily Stock Outward</h3>
                <p className="text-[11px] text-gray-400">Department consumption history</p>
              </div>
              <div className="text-xs bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-lg text-gray-600 font-medium">
                Canteen & Langar
              </div>
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '10px',
                      color: '#fff',
                      fontSize: '11px',
                    }}
                  />
                  <Bar dataKey="Langar" fill="#dc2626" radius={[4, 4, 0, 0]} name="Langar" />
                  <Bar dataKey="Canteen" fill="#f87171" radius={[4, 4, 0, 0]} name="Canteen" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Department-wise Usage Donut Chart */}
          <div className="lg:col-span-3 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Department-wise Usage</h3>
              <p className="text-[11px] text-gray-400">Strictly Canteen vs Langar</p>
            </div>
            <div className="h-44 w-full relative flex items-center justify-center my-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.department_usage || [
                      { name: 'Langar', value: 0 },
                      { name: 'Canteen', value: 0 },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    <Cell fill="#dc2626" />
                    <Cell fill="#f97316" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute text-center pointer-events-none">
                <span className="text-xs text-gray-400 font-medium">Total</span>
                <p className="text-base font-bold text-gray-900">{deptTotal} Qty</p>
              </div>
            </div>
            <div className="space-y-1 text-xs border-t border-gray-100 pt-2.5">
              {(stats.department_usage || []).map((d: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="flex items-center text-gray-600">
                    <span
                      className={`w-2.5 h-2.5 rounded-full mr-1.5 ${
                        d.name === 'Langar' ? 'bg-[#dc2626]' : 'bg-[#f97316]'
                      }`}
                    />
                    {d.name}
                  </span>
                  <span className="font-semibold text-gray-900">{d.value} Qty</span>
                </div>
              ))}
            </div>
          </div>

          {/* Low Stock Alerts Section */}
          <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-1.5">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <h3 className="text-sm font-bold text-gray-900">Low Stock Alerts</h3>
              </div>
              <Link
                href="/low-stock"
                className="text-xs font-semibold text-red-600 hover:text-red-700 transition"
              >
                View All
              </Link>
            </div>
            <div className="space-y-2.5 overflow-y-auto max-h-56 pr-1">
              {stats.low_stock_list && stats.low_stock_list.length > 0 ? (
                stats.low_stock_list.slice(0, 5).map((alertItem: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-red-50/50 border border-red-100/80 text-xs"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                      <div>
                        <p className="font-semibold text-gray-900">{alertItem.Item_Name}</p>
                        <p className="text-[10px] text-gray-400">
                          Item No: {alertItem.Item_No} | Unit: {alertItem.Unit}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-red-600">
                        {alertItem.Current_Stock} {alertItem.Unit}
                      </span>
                      <p className="text-[10px] text-gray-500">Min: {alertItem.Minimum_Stock}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-gray-400 text-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5" />
                  <p className="font-medium text-gray-600">All stock levels are optimal</p>
                  <p className="text-[10px]">No low stock alerts detected.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Master Inventory Data Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center space-x-2 bg-gray-100/80 p-1 rounded-xl text-xs font-medium text-gray-600">
              <button
                onClick={() => setActiveTab('current')}
                className={`px-3.5 py-1.5 rounded-lg transition ${
                  activeTab === 'current'
                    ? 'bg-red-600 text-white font-semibold shadow-xs'
                    : 'hover:text-gray-900'
                }`}
              >
                Current Stock
              </button>
              <button
                onClick={() => setActiveTab('recent')}
                className={`px-3.5 py-1.5 rounded-lg transition ${
                  activeTab === 'recent'
                    ? 'bg-red-600 text-white font-semibold shadow-xs'
                    : 'hover:text-gray-900'
                }`}
              >
                Recent Transactions
              </button>
            </div>

            <div className="flex items-center space-x-2 w-full md:w-auto">
              <input
                type="text"
                placeholder="Search items..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 w-full sm:w-56"
              />
              <Link
                href="/inventory"
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition whitespace-nowrap"
              >
                + Add Item
              </Link>
            </div>
          </div>

          {/* Table Content */}
          {activeTab === 'current' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-600">
                <thead className="bg-gray-50/80 text-gray-500 uppercase text-[10px] font-bold border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3">Item No</th>
                    <th className="px-4 py-3">Item Name</th>
                    <th className="px-4 py-3">Langar Requirement</th>
                    <th className="px-4 py-3">Unit</th>
                    <th className="px-4 py-3">Inward Qty</th>
                    <th className="px-4 py-3">Used Qty</th>
                    <th className="px-4 py-3 font-bold text-gray-900">Current Stock</th>
                    <th className="px-4 py-3">Min Level</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {paginatedItems.map((item, index) => (
                    <tr key={index} className="hover:bg-red-50/30 transition">
                      <td className="px-4 py-3 font-semibold text-gray-900">{item.Item_No}</td>
                      <td className="px-4 py-3 text-gray-900 font-semibold">{item.Item_Name}</td>
                      <td className="px-4 py-3 text-gray-700 font-medium">{item.SKU || '—'}</td>
                      <td className="px-4 py-3 font-bold text-red-600">{item.Unit}</td>
                      <td className="px-4 py-3">{item.Total_Inward ?? 0}</td>
                      <td className="px-4 py-3">{item.Total_Outward ?? 0}</td>
                      <td className="px-4 py-3 font-bold text-red-600 text-sm">
                        {item.Current_Stock}
                      </td>
                      <td className="px-4 py-3">{item.Minimum_Stock}</td>
                      <td className="px-4 py-3">{getStatusBadge(item.Stock_Status || 'IN STOCK')}</td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/inventory?edit=${item.Item_No}`}
                          className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-900 inline-block"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {paginatedItems.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                        No inventory items found. Click &quot;Add Item&quot; to create your first item in Excel.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-600">
                <thead className="bg-gray-50/80 text-gray-500 uppercase text-[10px] font-bold border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3">Txn ID</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Item No</th>
                    <th className="px-4 py-3">Item Name</th>
                    <th className="px-4 py-3">Quantity</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">User</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {(stats.recent_transactions || []).map((txn: any, idx: number) => (
                    <tr key={idx} className="hover:bg-red-50/20">
                      <td className="px-4 py-3 font-semibold text-gray-900">{txn.Transaction_ID}</td>
                      <td className="px-4 py-3">{txn.Inward_Date || txn.Outward_Date}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            txn.Type === 'INWARD'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {txn.Type}
                        </span>
                      </td>
                      <td className="px-4 py-3">{txn.Item_No}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{txn.Item_Name}</td>
                      <td className="px-4 py-3 font-bold">
                        {txn.Quantity} {txn.Unit}
                      </td>
                      <td className="px-4 py-3">{txn.Department || '-'}</td>
                      <td className="px-4 py-3">{txn.Created_By}</td>
                    </tr>
                  ))}
                  {(stats.recent_transactions || []).length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                        No transactions recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {activeTab === 'current' && filteredItems.length > 0 && (
            <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span>
                Showing {(currentPage - 1) * pageSize + 1} to{' '}
                {Math.min(currentPage * pageSize, filteredItems.length)} of {filteredItems.length} items
              </span>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-7 h-7 rounded-lg text-xs font-semibold transition ${
                      currentPage === page
                        ? 'bg-red-600 text-white'
                        : 'border border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
