'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ReceiptText,
  Search,
  RotateCcw,
  Download,
  FileSpreadsheet,
  Printer,
  ChevronLeft,
  ChevronRight,
  Eye,
  ArrowDownLeft,
  ArrowUpRight,
  X,
  Warehouse,
  MapPin,
  Hash,
  AlertTriangle,
  CalendarDays,
  User,
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { getRecords, getItems, getUsers, getBartanInward } from '@/lib/api';

// ─── Kitchen Stock Records ────────────────────────────────────────────

function KitchenRecordsTab() {
  const [records, setRecords] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [itemsList, setItemsList] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);

  const [filters, setFilters] = useState({
    from_date: '2026-10-01',
    to_date: '2026-10-31',
    transaction_type: 'All',
    item_no: 'All',
    department: 'All',
    unit: 'All',
    user: 'All',
    search: '',
  });

  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  const fetchFiltersData = async () => {
    try {
      const [itRes, uRes] = await Promise.all([
        getItems(),
        getUsers().catch(() => ({ data: [] })),
      ]);
      if (itRes?.data) {
        setItemsList(itRes.data);
      }
      if (uRes?.data) setUsersList(uRes.data);
    } catch (err) { console.error(err); }
  };

  const fetchRecords = async (pageNum = 1) => {
    try {
      setLoading(true);
      const params: any = { page: pageNum, page_size: 10, from_date: filters.from_date, to_date: filters.to_date };
      if (filters.transaction_type !== 'All') params.transaction_type = filters.transaction_type;
      if (filters.item_no !== 'All') params.item_no = filters.item_no;
      if (filters.department !== 'All') params.department = filters.department;
      if (filters.unit !== 'All') params.unit = filters.unit;
      if (filters.user !== 'All') params.user = filters.user;
      if (filters.search) params.search = filters.search;
      const res = await getRecords(params);
      if (res?.data) {
        setRecords(res.data);
        setTotal(res.total ?? res.data.length);
        setPage(res.page ?? 1);
        setTotalPages(res.total_pages ?? Math.max(1, Math.ceil((res.total ?? 1) / 10)));
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchFiltersData(); fetchRecords(1); }, []);
  useEffect(() => { fetchRecords(page); }, [page]);

  const handleReset = () => {
    setFilters({ from_date: '2026-10-01', to_date: '2026-10-31', transaction_type: 'All', item_no: 'All', department: 'All', unit: 'All', user: 'All', search: '' });
    fetchRecords(1);
  };

  const handleExportCSV = () => {
    if (!records.length) return;
    const headers = ['Transaction ID','Date & Time','Type','Item No','Item Name','Unit','Quantity','Department','Issued To / Received From','User','Remarks'];
    const rows = [headers.join(','), ...records.map(r => [`"${r.Transaction_ID||''}"`,`"${r.Date_Time||''}"`,`"${r.Type||''}"`,`"${r.Item_No||''}"`,`"${r.Item_Name||''}"`,`"${r.Unit||''}"`,`"${r.Quantity||''}"`,`"${r.Department||''}"`,`"${r.Issued_To_Received_From||''}"`,`"${r.User||''}"`,`"${r.Remarks||''}"`].join(','))];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `KitchenStock_Records_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const handleExportExcel = async () => {
    try { const XLSX = await import('xlsx'); const ws = XLSX.utils.json_to_sheet(records); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Records'); XLSX.writeFile(wb, `KitchenStock_Records_${new Date().toISOString().split('T')[0]}.xlsx`); } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-5">
      {/* Filters */}
      <form onSubmit={(e) => { e.preventDefault(); fetchRecords(1); }} className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="bg-red-50/70 border-b border-red-100/60 px-5 py-2.5">
          <h2 className="text-xs font-bold text-red-700 uppercase tracking-wider">Filter Records</h2>
        </div>
        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">From Date</label>
              <input type="date" value={filters.from_date} onChange={(e) => setFilters({ ...filters, from_date: e.target.value })} className="w-full px-3 py-2 text-xs bg-gray-50/50 border border-gray-300 rounded-xl font-medium" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">To Date</label>
              <input type="date" value={filters.to_date} onChange={(e) => setFilters({ ...filters, to_date: e.target.value })} className="w-full px-3 py-2 text-xs bg-gray-50/50 border border-gray-300 rounded-xl font-medium" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Transaction Type</label>
              <select value={filters.transaction_type} onChange={(e) => setFilters({ ...filters, transaction_type: e.target.value })} className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl font-medium cursor-pointer">
                <option value="All">All (Inward & Outward)</option>
                <option value="INWARD">Inward Only</option>
                <option value="OUTWARD">Outward Only</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Item</label>
              <select value={filters.item_no} onChange={(e) => setFilters({ ...filters, item_no: e.target.value })} className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl font-medium cursor-pointer">
                <option value="All">All Items</option>
                {itemsList.map((item) => (<option key={item.Item_No} value={item.Item_No}>{item.Item_No} - {item.Item_Name} ({item.Unit})</option>))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Department</label>
              <select value={filters.department} onChange={(e) => setFilters({ ...filters, department: e.target.value })} className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl font-medium cursor-pointer">
                <option value="All">All Departments</option>
                <option value="Canteen">Canteen</option>
                <option value="Langar">Langar</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">User</label>
              <select value={filters.user} onChange={(e) => setFilters({ ...filters, user: e.target.value })} className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl font-medium cursor-pointer">
                <option value="All">All Users</option>
                {usersList.map((u) => (<option key={u.Username} value={u.Username}>{u.Full_Name || u.Username} ({u.Role})</option>))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Search</label>
              <input type="text" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Search by item name, remarks..." className="w-full px-3 py-2 text-xs bg-gray-50/50 border border-gray-300 rounded-xl font-medium" />
            </div>
          </div>
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button type="button" onClick={handleReset} className="inline-flex items-center space-x-1.5 px-4 py-2 border border-red-200 text-red-700 hover:bg-red-50 rounded-xl text-xs font-semibold transition cursor-pointer">
              <RotateCcw className="w-3.5 h-3.5 text-red-600" /><span>Reset</span>
            </button>
            <button type="submit" className="inline-flex items-center space-x-1.5 px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer">
              <Search className="w-3.5 h-3.5" /><span>Search Records</span>
            </button>
          </div>
        </div>
      </form>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-gray-900">Records ({filters.from_date} → {filters.to_date})</h3>
          <div className="flex items-center space-x-2">
            <button onClick={handleExportCSV} className="inline-flex items-center space-x-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer"><Download className="w-3.5 h-3.5" /><span>Export CSV</span></button>
            <button onClick={handleExportExcel} className="inline-flex items-center space-x-1 px-3 py-1.5 bg-white border border-red-200 text-red-700 hover:bg-red-50 rounded-xl text-xs font-semibold transition cursor-pointer"><FileSpreadsheet className="w-3.5 h-3.5 text-red-600" /><span>Export Excel</span></button>
            <button onClick={() => window.print()} className="inline-flex items-center space-x-1 px-3 py-1.5 bg-white border border-red-200 text-red-700 hover:bg-red-50 rounded-xl text-xs font-semibold transition cursor-pointer"><Printer className="w-3.5 h-3.5 text-red-600" /><span>Print</span></button>
          </div>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
              <div className="w-5 h-5 border-2 border-gray-200 border-t-red-500 rounded-full animate-spin mr-3" />Loading records…
            </div>
          ) : (
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50/80 text-gray-500 uppercase text-[10px] font-bold border-b border-gray-100">
                <tr>
                  <th className="px-3.5 py-3">#</th>
                  <th className="px-3.5 py-3">Date & Time</th>
                  <th className="px-3.5 py-3">Type</th>
                  <th className="px-3.5 py-3">Item No</th>
                  <th className="px-3.5 py-3">Item Name</th>
                  <th className="px-3.5 py-3">Quantity</th>
                  <th className="px-3.5 py-3">Department</th>
                  <th className="px-3.5 py-3">Issued To / Received From</th>
                  <th className="px-3.5 py-3">User</th>
                  <th className="px-3.5 py-3">Remarks</th>
                  <th className="px-3.5 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {records.map((r, idx) => {
                  const isInward = r.Type === 'INWARD';
                  return (
                    <tr key={idx} className="hover:bg-red-50/20 transition">
                      <td className="px-3.5 py-3 text-gray-400">{(page - 1) * 10 + idx + 1}</td>
                      <td className="px-3.5 py-3 text-gray-700 whitespace-nowrap">{r.Date_Time}</td>
                      <td className="px-3.5 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${isInward ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                          {isInward ? <ArrowDownLeft className="w-3 h-3 mr-1 text-emerald-600" /> : <ArrowUpRight className="w-3 h-3 mr-1 text-red-600" />}
                          {r.Type}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 font-semibold text-gray-900">{r.Item_No}</td>
                      <td className="px-3.5 py-3 text-gray-900 font-semibold">{r.Item_Name}</td>
                      <td className={`px-3.5 py-3 font-bold ${isInward ? 'text-emerald-700' : 'text-red-600'}`}>{isInward ? '+' : '-'}{r.Quantity} {r.Unit}</td>
                      <td className="px-3.5 py-3">
                        {r.Department && r.Department !== '-' ? (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${r.Department === 'Langar' ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-700'}`}>{r.Department}</span>
                        ) : '-'}
                      </td>
                      <td className="px-3.5 py-3">{r.Issued_To_Received_From || '-'}</td>
                      <td className="px-3.5 py-3">{r.User}</td>
                      <td className="px-3.5 py-3 max-w-[140px] truncate text-gray-500">{r.Remarks || '-'}</td>
                      <td className="px-3.5 py-3 text-center">
                        <button onClick={() => setSelectedRecord(r)} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer" title="View Details">
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {records.length === 0 && (
                  <tr><td colSpan={11} className="px-4 py-10 text-center text-gray-400">No records found matching the selected filters.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        {records.length > 0 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Showing {(page - 1) * 10 + 1} to {Math.min(page * 10, total)} of {total} records</span>
            <div className="flex items-center space-x-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)} className={`w-7 h-7 rounded-lg text-xs font-semibold transition ${page === p ? 'bg-red-600 text-white' : 'border border-gray-200 hover:bg-gray-50 text-gray-700'}`}>{p}</button>
              ))}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-gray-100 shadow-2xl overflow-hidden">
            <div className="bg-red-50/80 border-b border-red-100 px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ReceiptText className="w-4 h-4 text-red-600" />
                <h3 className="text-sm font-bold text-gray-900">Transaction Details: {selectedRecord.Transaction_ID}</h3>
              </div>
              <button onClick={() => setSelectedRecord(null)} className="p-1 text-gray-400 hover:text-gray-700 rounded-lg cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 pb-3 border-b border-gray-100">
                <div><span className="text-gray-400">Type</span><p className="font-bold text-gray-900">{selectedRecord.Type}</p></div>
                <div><span className="text-gray-400">Date & Time</span><p className="font-medium text-gray-900">{selectedRecord.Date_Time}</p></div>
                <div><span className="text-gray-400">Item No & Name</span><p className="font-bold text-gray-900">{selectedRecord.Item_No} - {selectedRecord.Item_Name}</p></div>
                <div><span className="text-gray-400">Quantity</span><p className="font-bold text-red-600 text-sm">{selectedRecord.Quantity} {selectedRecord.Unit}</p></div>
                <div><span className="text-gray-400">Department</span><p className="font-medium text-gray-900">{selectedRecord.Department || '-'}</p></div>
                <div><span className="text-gray-400">Issued To / Supplier</span><p className="font-medium text-gray-900">{selectedRecord.Issued_To_Received_From || '-'}</p></div>
                <div><span className="text-gray-400">Created By</span><p className="font-medium text-gray-900">{selectedRecord.User}</p></div>
              </div>
              <div><span className="text-gray-400">Remarks / Purpose</span><p className="font-medium text-gray-800 bg-gray-50 p-2.5 rounded-xl border border-gray-200 mt-1">{selectedRecord.Remarks || 'No remarks provided.'}</p></div>
              <div className="pt-3 flex justify-end">
                <button onClick={() => setSelectedRecord(null)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-semibold transition cursor-pointer">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Bartan Ward Records ──────────────────────────────────────────────

function BartanWardTab() {
  const [records, setRecords] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [centerFilter, setCenterFilter] = useState('All');
  const [itemFilter, setItemFilter] = useState('All');
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  useEffect(() => { fetchBartanRecords(); }, []);

  useEffect(() => {
    let r = [...records];
    if (fromDate) r = r.filter(x => x.Inward_Date >= fromDate);
    if (toDate)   r = r.filter(x => x.Inward_Date <= toDate);
    if (centerFilter !== 'All') r = r.filter(x => x.Coming_Center === centerFilter);
    if (itemFilter !== 'All')   r = r.filter(x => x.Item_Name === itemFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(x =>
        (x.Item_Name || '').toLowerCase().includes(q) ||
        (x.Coming_Center || '').toLowerCase().includes(q) ||
        (x.Record_ID || '').toLowerCase().includes(q) ||
        (x.Remarks || '').toLowerCase().includes(q) ||
        (x.Item_Requirement || '').toLowerCase().includes(q)
      );
    }
    setFiltered(r);
    setPage(1);
  }, [search, fromDate, toDate, centerFilter, itemFilter, records]);

  async function fetchBartanRecords() {
    setLoading(true);
    try {
      const res = await getBartanInward();
      if (res.success && Array.isArray(res.data)) {
        const sorted = [...(res.data as any[])].reverse();
        setRecords(sorted);
        setFiltered(sorted);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const centerOptions = ['All', ...Array.from(new Set(records.map(r => r.Coming_Center).filter(Boolean)))];
  const itemOptions = ['All', ...Array.from(new Set(records.map(r => r.Item_Name).filter(Boolean)))];

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleReset = () => { setSearch(''); setFromDate(''); setToDate(''); setCenterFilter('All'); setItemFilter('All'); };

  const handleExportCSV = () => {
    if (!filtered.length) return;
    const headers = ['Record ID','Date','Coming Center','Item Name','Item Qty','Missing Items Qty','Item Requirement','Remarks','Created By','Created At'];
    const rows = [headers.join(','), ...filtered.map(r => [`"${r.Record_ID||''}"`,`"${r.Inward_Date||''}"`,`"${r.Coming_Center||''}"`,`"${r.Item_Name||''}"`,`"${r.Item_Qty||''}"`,`"${r.Missing_Items_Qty||''}"`,`"${r.Item_Requirement||''}"`,`"${r.Remarks||''}"`,`"${r.Created_By||''}"`,`"${r.Created_At||''}"`].join(','))];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `BartanWard_Records_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const handleExportExcel = async () => {
    try { const XLSX = await import('xlsx'); const ws = XLSX.utils.json_to_sheet(filtered); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Bartan Inward'); XLSX.writeFile(wb, `BartanWard_Records_${new Date().toISOString().split('T')[0]}.xlsx`); } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="bg-amber-50/70 border-b border-amber-100/60 px-5 py-2.5">
          <h2 className="text-xs font-bold text-amber-700 uppercase tracking-wider">Filter Bartan Ward Records</h2>
        </div>
        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">From Date</label>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full px-3 py-2 text-xs bg-gray-50/50 border border-gray-300 rounded-xl font-medium" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">To Date</label>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full px-3 py-2 text-xs bg-gray-50/50 border border-gray-300 rounded-xl font-medium" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Coming Center</label>
              <select value={centerFilter} onChange={(e) => setCenterFilter(e.target.value)} className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl font-medium cursor-pointer">
                {centerOptions.map(c => <option key={c} value={c}>{c === 'All' ? 'All Centers' : c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Item Name</label>
              <select value={itemFilter} onChange={(e) => setItemFilter(e.target.value)} className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl font-medium cursor-pointer">
                {itemOptions.map(i => <option key={i} value={i}>{i === 'All' ? 'All Items' : i}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Search</label>
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by item, center, record ID, remarks…" className="w-full px-3 py-2 text-xs bg-gray-50/50 border border-gray-300 rounded-xl font-medium" />
            </div>
            <div className="flex items-center space-x-2 pt-5">
              <button onClick={handleReset} className="inline-flex items-center space-x-1.5 px-4 py-2 border border-amber-200 text-amber-700 hover:bg-amber-50 rounded-xl text-xs font-semibold transition cursor-pointer">
                <RotateCcw className="w-3.5 h-3.5 text-amber-600" /><span>Reset</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Warehouse className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold text-gray-900">
              Bartan Ward Records
              <span className="ml-2 text-xs font-normal text-gray-400">({filtered.length} entries)</span>
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={handleExportCSV} className="inline-flex items-center space-x-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer"><Download className="w-3.5 h-3.5" /><span>Export CSV</span></button>
            <button onClick={handleExportExcel} className="inline-flex items-center space-x-1 px-3 py-1.5 bg-white border border-amber-200 text-amber-700 hover:bg-amber-50 rounded-xl text-xs font-semibold transition cursor-pointer"><FileSpreadsheet className="w-3.5 h-3.5 text-amber-600" /><span>Export Excel</span></button>
            <button onClick={() => window.print()} className="inline-flex items-center space-x-1 px-3 py-1.5 bg-white border border-amber-200 text-amber-700 hover:bg-amber-50 rounded-xl text-xs font-semibold transition cursor-pointer"><Printer className="w-3.5 h-3.5 text-amber-600" /><span>Print</span></button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
              <div className="w-5 h-5 border-2 border-gray-200 border-t-amber-500 rounded-full animate-spin mr-3" />Loading bartan records…
            </div>
          ) : (
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-amber-50/60 text-gray-500 uppercase text-[10px] font-bold border-b border-amber-100">
                <tr>
                  <th className="px-3.5 py-3">#</th>
                  <th className="px-3.5 py-3">Record ID</th>
                  <th className="px-3.5 py-3">Date</th>
                  <th className="px-3.5 py-3">Coming Center</th>
                  <th className="px-3.5 py-3">Item Name</th>
                  <th className="px-3.5 py-3 text-center">Item Qty</th>
                  <th className="px-3.5 py-3 text-center">Missing Qty</th>
                  <th className="px-3.5 py-3">Item Requirement</th>
                  <th className="px-3.5 py-3">Remarks</th>
                  <th className="px-3.5 py-3">Created By</th>
                  <th className="px-3.5 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {paginated.map((r, idx) => (
                  <tr key={r.Record_ID || idx} className="hover:bg-amber-50/20 transition">
                    <td className="px-3.5 py-3 text-gray-400">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                    <td className="px-3.5 py-3 font-mono text-[10px] text-gray-500 bg-gray-50/50 whitespace-nowrap">{r.Record_ID}</td>
                    <td className="px-3.5 py-3 whitespace-nowrap text-gray-700">
                      <span className="inline-flex items-center space-x-1">
                        <CalendarDays className="w-3 h-3 text-gray-400" />
                        <span>{r.Inward_Date}</span>
                      </span>
                    </td>
                    <td className="px-3.5 py-3">
                      <span className="inline-flex items-center space-x-1">
                        <MapPin className="w-3 h-3 text-red-400" />
                        <span className="font-semibold text-gray-900">{r.Coming_Center}</span>
                      </span>
                    </td>
                    <td className="px-3.5 py-3 font-semibold text-gray-900">{r.Item_Name}</td>
                    <td className="px-3.5 py-3 text-center">
                      <span className="inline-flex items-center justify-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                        <Hash className="w-3 h-3" /><span>{r.Item_Qty}</span>
                      </span>
                    </td>
                    <td className="px-3.5 py-3 text-center">
                      {Number(r.Missing_Items_Qty) > 0 ? (
                        <span className="inline-flex items-center justify-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold border border-amber-200">
                          <AlertTriangle className="w-3 h-3" /><span>{r.Missing_Items_Qty}</span>
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3.5 py-3 max-w-[160px] truncate text-gray-600">{r.Item_Requirement || '—'}</td>
                    <td className="px-3.5 py-3 max-w-[140px] truncate text-gray-500 italic">{r.Remarks || '—'}</td>
                    <td className="px-3.5 py-3">
                      <span className="inline-flex items-center space-x-1">
                        <User className="w-3 h-3 text-gray-400" />
                        <span>{r.Created_By}</span>
                      </span>
                    </td>
                    <td className="px-3.5 py-3 text-center">
                      <button onClick={() => setSelectedRecord(r)} className="p-1 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer" title="View Details">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {paginated.length === 0 && (
                  <tr><td colSpan={11} className="px-4 py-10 text-center text-gray-400">No bartan inward records found.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {filtered.length > PAGE_SIZE && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
            <div className="flex items-center space-x-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)} className={`w-7 h-7 rounded-lg text-xs font-semibold transition ${page === p ? 'bg-amber-500 text-white' : 'border border-gray-200 hover:bg-gray-50 text-gray-700'}`}>{p}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-gray-100 shadow-2xl overflow-hidden">
            <div className="bg-amber-50/80 border-b border-amber-100 px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Warehouse className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-gray-900">Bartan Record: {selectedRecord.Record_ID}</h3>
              </div>
              <button onClick={() => setSelectedRecord(null)} className="p-1 text-gray-400 hover:text-gray-700 rounded-lg cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 pb-3 border-b border-gray-100">
                <div><span className="text-gray-400">Date</span><p className="font-bold text-gray-900">{selectedRecord.Inward_Date}</p></div>
                <div><span className="text-gray-400">Coming Center</span><p className="font-bold text-gray-900">{selectedRecord.Coming_Center}</p></div>
                <div><span className="text-gray-400">Item Name</span><p className="font-bold text-gray-900">{selectedRecord.Item_Name}</p></div>
                <div><span className="text-gray-400">Item Qty</span><p className="font-bold text-emerald-700 text-sm">{selectedRecord.Item_Qty}</p></div>
                <div><span className="text-gray-400">Missing Items Qty</span><p className={`font-bold text-sm ${Number(selectedRecord.Missing_Items_Qty) > 0 ? 'text-amber-600' : 'text-gray-400'}`}>{selectedRecord.Missing_Items_Qty || 0}</p></div>
                <div><span className="text-gray-400">Created By</span><p className="font-medium text-gray-900">{selectedRecord.Created_By}</p></div>
              </div>
              <div><span className="text-gray-400">Item Requirement</span><p className="font-medium text-gray-800 bg-gray-50 p-2.5 rounded-xl border border-gray-200 mt-1">{selectedRecord.Item_Requirement || 'None specified.'}</p></div>
              <div><span className="text-gray-400">Remarks</span><p className="font-medium text-gray-800 bg-gray-50 p-2.5 rounded-xl border border-gray-200 mt-1">{selectedRecord.Remarks || 'No remarks provided.'}</p></div>
              <div className="pt-3 flex justify-end">
                <button onClick={() => setSelectedRecord(null)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-semibold transition cursor-pointer">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────

export default function AllRecordsPage() {
  const [activeTab, setActiveTab] = useState<'kitchen' | 'bartan'>('kitchen');

  return (
    <AppLayout>
      <div className="space-y-5 sm:space-y-6 max-w-[1600px] mx-auto pb-12">
        {/* Page Header */}
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600 shrink-0">
            <ReceiptText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">All Records</h1>
            <p className="text-xs text-gray-500">View Langar stock and bartan ward transactions</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab('kitchen')}
            className={`inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'kitchen'
                ? 'bg-white text-red-700 shadow-sm border border-red-100'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <ReceiptText className="w-4 h-4" />
            <span>Langar Stock Records</span>
          </button>
          <button
            onClick={() => setActiveTab('bartan')}
            className={`inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'bartan'
                ? 'bg-white text-amber-700 shadow-sm border border-amber-100'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Warehouse className="w-4 h-4" />
            <span>Bartan Ward Records</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'kitchen' ? <KitchenRecordsTab /> : <BartanWardTab />}
      </div>
    </AppLayout>
  );
}
