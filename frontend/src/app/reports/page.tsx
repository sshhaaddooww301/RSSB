'use client';

import React, { useState, useEffect } from 'react';
import {
  FileBarChart2,
  Calendar,
  Download,
  FileSpreadsheet,
  Printer,
  Search,
  Building,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { getMonthlyReport, getDepartmentReport, getItems } from '@/lib/api';

export default function ReportsPage() {
  const [reportType, setReportType] = useState<'register' | 'department'>('register');
  const [fromDate, setFromDate] = useState('2026-10-01');
  const [toDate, setToDate] = useState('2026-10-31');
  const [selectedItem, setSelectedItem] = useState('All');
  const [selectedDept, setSelectedDept] = useState('All');
  const [items, setItems] = useState<any[]>([]);

  const [registerData, setRegisterData] = useState<any[]>([]);
  const [deptData, setDeptData] = useState<any>({ Canteen: {}, Langar: {} });
  const [loading, setLoading] = useState(false);

  // Generate day list for table headers
  const getDaysArray = (start: string, end: string) => {
    const arr = [];
    const dt = new Date(start);
    const endDt = new Date(end);
    while (dt <= endDt) {
      arr.push(new Date(dt));
      dt.setDate(dt.getDate() + 1);
    }
    return arr;
  };

  const days = getDaysArray(fromDate, toDate);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const [regRes, deptRes] = await Promise.all([
        getMonthlyReport({
          from_date: fromDate,
          to_date: toDate,
          item_no: selectedItem !== 'All' ? selectedItem : undefined,
          department: selectedDept !== 'All' ? selectedDept : undefined,
        }),
        getDepartmentReport(fromDate, toDate),
      ]);
      if (regRes && regRes.data) setRegisterData(regRes.data);
      if (deptRes && deptRes.data) setDeptData(deptRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getItems().then((res) => res?.data && setItems(res.data));
    fetchReport();
  }, []);

  const handleExportExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const ws = XLSX.utils.json_to_sheet(registerData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Monthly Register');
      XLSX.writeFile(wb, `Monthly_Stock_Register_${fromDate}_to_${toDate}.xlsx`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportCSV = () => {
    if (!registerData.length) return;
    const headerRow = [
      'Item No',
      'Item Name',
      'Unit',
      'Opening Qty',
      'Langar Qty',
      'Inward Qty',
      ...days.map((d) => d.getDate()),
      'Total Outward',
      'Closing Stock',
      'Status',
    ];

    const rows = registerData.map((row) => {
      const dayVals = days.map((d) => {
        const key = d.toISOString().split('T')[0];
        return row.dates?.[key] || 0;
      });
      return [
        row.Item_No,
        `"${row.Item_Name}"`,
        row.Unit,
        row.Opening_Qty,
        row.Langar_Qty,
        row.Inward_Qty,
        ...dayVals,
        row.Total_Outward,
        row.Closing_Stock,
        row.Status,
      ].join(',');
    });

    const csvContent = [headerRow.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Stock_Register_${fromDate}_${toDate}.csv`;
    link.click();
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-[1700px] mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
              <FileBarChart2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                Stock & Consumption Reports
              </h1>
              <p className="text-xs text-gray-500">
                Generate date-wise register reports and department usage summaries
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center space-x-1 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center space-x-1 px-3.5 py-2 bg-white border border-red-200 text-red-700 hover:bg-red-50 rounded-xl text-xs font-semibold shadow-2xs transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-red-600" />
              <span>Export Excel</span>
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center space-x-1 px-3.5 py-2 bg-white border border-red-200 text-red-700 hover:bg-red-50 rounded-xl text-xs font-semibold shadow-2xs transition"
            >
              <Printer className="w-3.5 h-3.5 text-red-600" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
            <button
              onClick={() => setReportType('register')}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition ${
                reportType === 'register'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              📅 Date-Wise Register Format
            </button>
            <button
              onClick={() => setReportType('department')}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition ${
                reportType === 'department'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              🏢 Department Summary (Canteen vs Langar)
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-300 rounded-xl font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-300 rounded-xl font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Item</label>
              <select
                value={selectedItem}
                onChange={(e) => setSelectedItem(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl font-medium"
              >
                <option value="All">All Items</option>
                {items.map((i) => (
                  <option key={i.Item_No} value={i.Item_No}>
                    {i.Item_No} - {i.Item_Name} ({i.Unit})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Department</label>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl font-medium"
              >
                <option value="All">All Departments</option>
                <option value="Canteen">Canteen</option>
                <option value="Langar">Langar</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={fetchReport}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition"
            >
              Generate Report
            </button>
          </div>
        </div>

        {/* Report Content: Date-Wise Register Format */}
        {reportType === 'register' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-red-50/50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">
                Monthly Stock Register ({fromDate} to {toDate})
              </h3>
              <span className="text-xs text-red-600 font-semibold">
                Dynamic Date Matrix (1 to {days.length})
              </span>
            </div>

            <div className="overflow-x-auto max-w-full">
              <table className="w-full text-left text-[11px] text-gray-600 border-collapse">
                <thead className="bg-gray-100/80 text-gray-700 uppercase font-bold border-b border-gray-200 sticky top-0">
                  <tr>
                    <th className="px-2.5 py-2.5 border-r border-gray-200">Item No</th>
                    <th className="px-3 py-2.5 border-r border-gray-200 min-w-[130px]">Item Name</th>
                    <th className="px-2.5 py-2.5 border-r border-gray-200">Unit</th>
                    <th className="px-2.5 py-2.5 border-r border-gray-200 bg-gray-50">Opening</th>
                    <th className="px-2.5 py-2.5 border-r border-gray-200 bg-gray-50">Langar Qty</th>
                    <th className="px-2.5 py-2.5 border-r border-gray-200 bg-emerald-50 text-emerald-800">
                      Inward
                    </th>
                    {days.map((d, i) => (
                      <th
                        key={i}
                        className="px-1.5 py-2 border-r border-gray-200 text-center min-w-[32px] font-semibold text-[10px]"
                      >
                        {d.getDate()}
                      </th>
                    ))}
                    <th className="px-2.5 py-2.5 border-r border-gray-200 bg-red-50 text-red-800 font-bold">
                      Total Outward
                    </th>
                    <th className="px-2.5 py-2.5 border-r border-gray-200 font-bold text-gray-900 bg-gray-50">
                      Closing Stock
                    </th>
                    <th className="px-2.5 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {registerData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-red-50/20 transition">
                      <td className="px-2.5 py-2 border-r border-gray-100 font-bold text-gray-900">
                        {row.Item_No}
                      </td>
                      <td className="px-3 py-2 border-r border-gray-100 font-semibold text-gray-900">
                        {row.Item_Name}
                      </td>
                      <td className="px-2 py-2 border-r border-gray-100 font-bold text-red-600">
                        {row.Unit}
                      </td>
                      <td className="px-2.5 py-2 border-r border-gray-100 bg-gray-50/50">
                        {row.Opening_Qty}
                      </td>
                      <td className="px-2.5 py-2 border-r border-gray-100 bg-gray-50/50">
                        {row.Langar_Qty}
                      </td>
                      <td className="px-2.5 py-2 border-r border-gray-100 bg-emerald-50/30 text-emerald-700 font-bold">
                        {row.Inward_Qty || '-'}
                      </td>
                      {days.map((d, i) => {
                        const dateKey = d.toISOString().split('T')[0];
                        const val = row.dates?.[dateKey];
                        return (
                          <td
                            key={i}
                            className={`px-1 py-2 border-r border-gray-100 text-center font-semibold text-[10px] ${
                              val ? 'bg-red-50 text-red-700' : 'text-gray-300'
                            }`}
                          >
                            {val || '-'}
                          </td>
                        );
                      })}
                      <td className="px-2.5 py-2 border-r border-gray-100 bg-red-50/40 text-red-700 font-bold">
                        {row.Total_Outward}
                      </td>
                      <td className="px-2.5 py-2 border-r border-gray-100 font-bold text-gray-900 bg-gray-50/50">
                        {row.Closing_Stock} {row.Unit}
                      </td>
                      <td className="px-2.5 py-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            row.Status === 'CRITICAL'
                              ? 'bg-red-100 text-red-700'
                              : row.Status === 'LOW STOCK'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {row.Status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Report Content: Department Usage */}
        {reportType === 'department' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Langar Card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
              <div className="bg-red-600 text-white p-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Building className="w-5 h-5" />
                  <h3 className="font-bold text-base">Langar Department Usage</h3>
                </div>
                <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full font-medium">
                  {fromDate} to {toDate}
                </span>
              </div>
              <div className="p-4">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-gray-200 text-gray-400 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2">Item Name</th>
                      <th className="py-2 text-right">Consumed Quantity</th>
                      <th className="py-2 text-right">Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {Object.entries(deptData.Langar || {}).map(([item, info]: any, i) => (
                      <tr key={i} className="hover:bg-red-50/20">
                        <td className="py-2.5 font-semibold text-gray-900">{item}</td>
                        <td className="py-2.5 text-right font-bold text-red-600">
                          {info.quantity}
                        </td>
                        <td className="py-2.5 text-right font-semibold text-gray-600">{info.unit}</td>
                      </tr>
                    ))}
                    {!Object.keys(deptData.Langar || {}).length && (
                      <tr>
                        <td colSpan={3} className="py-4 text-center text-gray-400">
                          No consumption records in this date range.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Canteen Card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
              <div className="bg-[#ea580c] text-white p-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Building className="w-5 h-5" />
                  <h3 className="font-bold text-base">Canteen Department Usage</h3>
                </div>
                <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full font-medium">
                  {fromDate} to {toDate}
                </span>
              </div>
              <div className="p-4">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-gray-200 text-gray-400 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2">Item Name</th>
                      <th className="py-2 text-right">Consumed Quantity</th>
                      <th className="py-2 text-right">Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {Object.entries(deptData.Canteen || {}).map(([item, info]: any, i) => (
                      <tr key={i} className="hover:bg-orange-50/20">
                        <td className="py-2.5 font-semibold text-gray-900">{item}</td>
                        <td className="py-2.5 text-right font-bold text-orange-600">
                          {info.quantity}
                        </td>
                        <td className="py-2.5 text-right font-semibold text-gray-600">{info.unit}</td>
                      </tr>
                    ))}
                    {!Object.keys(deptData.Canteen || {}).length && (
                      <tr>
                        <td colSpan={3} className="py-4 text-center text-gray-400">
                          No consumption records in this date range.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
