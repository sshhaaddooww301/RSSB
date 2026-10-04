'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Warehouse,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertCircle,
  CalendarDays,
  MapPin,
  Package,
  Hash,
  AlertTriangle,
  ClipboardList,
  MessageSquare,
  User,
  Clock,
  ChevronDown,
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { getBartanInward, createBartanInward, getCurrentUser } from '@/lib/api';

const COMING_CENTERS = [
  'Amritsar',
  'Ludhiana',
  'Jalandhar',
  'Chandigarh',
  'Patiala',
  'Bathinda',
  'Mohali',
  'Gurdaspur',
  'Hoshiarpur',
  'Pathankot',
  'Firozpur',
  'Lucknow',
  'Raipur',
  'Muktsar',
  'Sangrur',
  'Fatehgarh Sahib',
  'Nawanshahr',
  'Ropar',
  'Kapurthala',
  'Barnala',
  'Mansa',
  'Tarn Taran',
  'Delhi',
  'Mumbai',
  'Kolkata',
  'Chennai',
  'Hyderabad',
  'Bengaluru',
  'Ahmedabad',
  'Pune',
  'Surat',
  'Jaipur',
  'Lucknow',
  'Kanpur',
  'Nagpur',
  'Indore',
  'Bhopal',
  'Vadodara',
  'Agra',
  'Varanasi',
  'Dehradun',
  'Haridwar',
  'Rishikesh',
  'Shimla',
  'Manali',
  'Srinagar',
  'Jammu',
];

const ITEM_NAMES = [
  'S S Thali',
  'S S Glass',
  'Steel Spoon',
  'Dala',
  'Chapati Trolley (55"X37"X20")',
  'Rice Tank (72"X54"X20")',
  'Bichar Patta',
  'S S Bucket',
  'Dal Karchi',
  'Rice Karchi',
  'Big Khupra',
  'Small Khupra',
  'Small Achaar Bucket',
  'Steel Tub',
  'Patila (500 Ltrs & Above)',
  'S S Patila with Net',
  'Aata Bessan Machine',
  'Daal Filling Pump',
  'Bucket with Long Handle',
  'Bucket with Small Handle',
  'Steel Mug (Water Supply)',
  'Rice Trolley',
  'Kadahi',
  'Peda Machine',
  'Steel Parat',
  'Grinder Mixture',
  'Aalu Pealing M/c',
  'Wooden Khupra',
  'Tea Cane (40 Ltrs)',
  'Tea Cattle (5 Ltrs)',
  'Stick for Ghee Apply',
  'Steel Tea Kip',
  'Gloves',
  'Blower 2 HP',
  'Onion Chopper',
];

interface RecentRecord {
  Record_ID: string;
  Inward_Date: string;
  Coming_Center: string;
  Item_Name: string;
  Item_Qty: number;
  Missing_Items_Qty: number;
  Item_Requirement: string;
  Remarks: string;
  Created_By: string;
  Created_At: string;
}

const emptyForm = {
  Inward_Date: new Date().toISOString().split('T')[0],
  Coming_Center: '',
  Item_Name: '',
  Item_Qty: '',
  Missing_Items_Qty: '',
  Item_Requirement: '',
  Remarks: '',
};

export default function BartanInwardPage() {
  const user = getCurrentUser() || { full_name: 'Admin', username: 'admin' };
  const isViewer = (user.role || '').toUpperCase() === 'VIEWER';

  const [formData, setFormData] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [recentRecords, setRecentRecords] = useState<RecentRecord[]>([]);

  const [centerOpen, setCenterOpen] = useState(false);
  const [itemOpen, setItemOpen] = useState(false);
  const [centerFilter, setCenterFilter] = useState('');
  const [itemFilter, setItemFilter] = useState('');

  useEffect(() => {
    fetchRecords();
  }, []);

  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(t);
    }
  }, [message]);

  useEffect(() => {
    const handler = () => {
      setCenterOpen(false);
      setItemOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function fetchRecords() {
    setLoading(true);
    try {
      const res = await getBartanInward();
      if (res.success && Array.isArray(res.data)) {
        const sorted = [...(res.data as RecentRecord[])].reverse().slice(0, 20);
        setRecentRecords(sorted);
      }
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }

  function handleChange(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  function handleReset() {
    setFormData({ ...emptyForm, Inward_Date: new Date().toISOString().split('T')[0] });
    setCenterFilter('');
    setItemFilter('');
    setMessage(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.Coming_Center.trim()) {
      setMessage({ type: 'error', text: 'Coming Center is required.' });
      return;
    }
    if (!formData.Item_Name.trim()) {
      setMessage({ type: 'error', text: 'Item Name is required.' });
      return;
    }
    const qty = parseFloat(formData.Item_Qty);
    if (!formData.Item_Qty || isNaN(qty) || qty <= 0) {
      setMessage({ type: 'error', text: 'Item Qty must be a positive number.' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        Inward_Date: formData.Inward_Date,
        Coming_Center: formData.Coming_Center.trim(),
        Item_Name: formData.Item_Name.trim(),
        Item_Qty: qty,
        Missing_Items_Qty: parseFloat(formData.Missing_Items_Qty) || 0,
        Item_Requirement: formData.Item_Requirement.trim(),
        Remarks: formData.Remarks.trim(),
      };

      const res = await createBartanInward(payload);
      if (res.success) {
        setMessage({
          type: 'success',
          text: `Bartan Inward recorded! ID: ${(res.data as any)?.Record_ID || ''}`,
        });
        handleReset();
        fetchRecords();
      } else {
        setMessage({ type: 'error', text: res.message || 'Failed to save record.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'An error occurred while saving.' });
    } finally {
      setSaving(false);
    }
  }

  const filteredCenters = COMING_CENTERS.filter((c) =>
    c.toLowerCase().includes(centerFilter.toLowerCase())
  );
  const filteredItems = ITEM_NAMES.filter((i) =>
    i.toLowerCase().includes(itemFilter.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/30 to-amber-50/20">
        {/* Page Header */}
        <div className="bg-gradient-to-r from-[#c8102e] via-[#dc2626] to-[#b91c1c] px-6 py-5 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 transition text-white"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shadow-inner">
                  <Warehouse className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-white font-bold text-xl tracking-wide leading-none">Bartan Inward</h1>
                  <p className="text-red-200 text-xs mt-0.5">Record incoming utensils</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2 bg-white/10 rounded-xl px-3 py-2">
              <User className="w-4 h-4 text-red-200" />
              <span className="text-white text-sm font-medium">{user.full_name || user.username}</span>
            </div>
          </div>
        </div>

        <div className="p-6 max-w-5xl mx-auto">
          {/* Alert / Message */}
          {message && (
            <div
              className={`mb-5 flex items-start space-x-3 px-4 py-3.5 rounded-xl border text-sm font-medium shadow-sm ${message.type === 'success'
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-800'
                }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* Viewer Mode Banner */}
          {isViewer && (
            <div className="mb-5 bg-blue-50/90 border-2 border-blue-200 p-4 rounded-2xl flex items-center justify-between text-xs text-blue-900 shadow-xs">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Warehouse className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-blue-950 text-sm">Viewer Mode (Read-Only)</p>
                  <p className="text-blue-700 mt-0.5">
                    You have view-only access. You can view all recent bartan inward records, but creating new entries is disabled.
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 bg-blue-200/80 text-blue-900 rounded-lg font-black uppercase tracking-wider text-[11px] shrink-0">
                View Only
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* FORM CARD */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                    <ClipboardList className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-800 text-base">New Entry</h2>
                    <p className="text-xs text-slate-400">Fields marked * are required</p>
                  </div>
                </div>

                <form onSubmit={handleSave} className="p-6 space-y-5">
                  {/* Date + Created By */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                        <span className="text-red-500">*</span> Date
                      </label>
                      <div className="relative">
                        <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                          type="date"
                          value={formData.Inward_Date}
                          onChange={(e) => handleChange('Inward_Date', e.target.value)}
                          required
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                        Created By
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          readOnly
                          value={user.full_name || user.username || 'Admin'}
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 text-sm cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Coming Center */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                      <span className="text-red-500">*</span> Coming Center
                    </label>
                    <div className="relative" onMouseDown={(e) => e.stopPropagation()}>
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
                      <input
                        type="text"
                        placeholder="Search or type center name…"
                        value={formData.Coming_Center || centerFilter}
                        onChange={(e) => {
                          setCenterFilter(e.target.value);
                          handleChange('Coming_Center', e.target.value);
                          setCenterOpen(true);
                        }}
                        onFocus={() => setCenterOpen(true)}
                        className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition"
                      />
                      <ChevronDown
                        className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-transform cursor-pointer ${centerOpen ? 'rotate-180' : ''}`}
                        onMouseDown={(e) => { e.stopPropagation(); setCenterOpen((o) => !o); }}
                      />
                      {centerOpen && filteredCenters.length > 0 && (
                        <ul className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-44 overflow-y-auto">
                          {filteredCenters.map((c) => (
                            <li
                              key={c}
                              onMouseDown={() => { handleChange('Coming_Center', c); setCenterFilter(''); setCenterOpen(false); }}
                              className="px-4 py-2.5 text-sm text-slate-700 hover:bg-red-50 hover:text-red-700 cursor-pointer transition"
                            >
                              {c}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  {/* Item Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                      <span className="text-red-500">*</span> Item Name
                    </label>
                    <div className="relative" onMouseDown={(e) => e.stopPropagation()}>
                      <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
                      <input
                        type="text"
                        placeholder="Search or type item name…"
                        value={formData.Item_Name || itemFilter}
                        onChange={(e) => { setItemFilter(e.target.value); handleChange('Item_Name', e.target.value); setItemOpen(true); }}
                        onFocus={() => setItemOpen(true)}
                        className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition"
                      />
                      <ChevronDown
                        className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-transform cursor-pointer ${itemOpen ? 'rotate-180' : ''}`}
                        onMouseDown={(e) => { e.stopPropagation(); setItemOpen((o) => !o); }}
                      />
                      {itemOpen && filteredItems.length > 0 && (
                        <ul className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-44 overflow-y-auto">
                          {filteredItems.map((item) => (
                            <li
                              key={item}
                              onMouseDown={() => { handleChange('Item_Name', item); setItemFilter(''); setItemOpen(false); }}
                              className="px-4 py-2.5 text-sm text-slate-700 hover:bg-red-50 hover:text-red-700 cursor-pointer transition"
                            >
                              {item}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  {/* Qty row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                        <span className="text-red-500">*</span> Item Qty
                      </label>
                      <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                          type="number"
                          min="1"
                          step="1"
                          placeholder="0"
                          value={formData.Item_Qty}
                          onChange={(e) => handleChange('Item_Qty', e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                        Missing Items Qty
                      </label>
                      <div className="relative">
                        <AlertTriangle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400 pointer-events-none" />
                        <input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="0"
                          value={formData.Missing_Items_Qty}
                          onChange={(e) => handleChange('Missing_Items_Qty', e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Item Requirement */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                      Item Requirement
                    </label>
                    <div className="relative">
                      <ClipboardList className="absolute left-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                      <textarea
                        rows={2}
                        placeholder="Describe what items are needed or any special requirements…"
                        value={formData.Item_Requirement}
                        onChange={(e) => handleChange('Item_Requirement', e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition resize-none"
                      />
                    </div>
                  </div>

                  {/* Remarks */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                      Remarks
                    </label>
                    <div className="relative">
                      <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                      <textarea
                        rows={2}
                        placeholder="Any additional remarks or notes…"
                        value={formData.Remarks}
                        onChange={(e) => handleChange('Remarks', e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition resize-none"
                      />
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={handleReset}
                      disabled={isViewer}
                      className="flex items-center space-x-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-medium hover:bg-slate-50 hover:border-slate-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Reset</span>
                    </button>
                    {isViewer ? (
                      <div className="flex-1 flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-slate-100 text-slate-400 border border-slate-200 text-sm font-bold cursor-not-allowed">
                        <span>🔒 Read-Only (Saving Disabled for Viewer)</span>
                      </div>
                    ) : (
                      <button
                        type="submit"
                        disabled={saving}
                        className="flex-1 flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#c8102e] to-[#dc2626] text-white text-sm font-semibold hover:from-[#b91c1c] hover:to-[#c8102e] transition shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {saving ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            <span>Saving…</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            <span>Save Record</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>

            {/* RECENT RECORDS PANEL */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden h-full">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 text-sm">Recent Records</h3>
                      <p className="text-xs text-slate-400">Last 20 entries</p>
                    </div>
                  </div>
                  {loading && (
                    <div className="w-4 h-4 border-2 border-slate-200 border-t-red-500 rounded-full animate-spin" />
                  )}
                </div>

                <div className="overflow-y-auto max-h-[560px]">
                  {recentRecords.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                      <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mb-3">
                        <Warehouse className="w-7 h-7 text-slate-300" />
                      </div>
                      <p className="text-slate-500 font-medium text-sm">No records yet</p>
                      <p className="text-slate-400 text-xs mt-1">Saved entries will appear here.</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-50">
                      {recentRecords.map((rec) => (
                        <li key={rec.Record_ID} className="px-5 py-3.5 hover:bg-slate-50 transition">
                          <div className="flex items-start justify-between mb-1">
                            <span className="font-semibold text-slate-700 text-sm truncate max-w-[130px]">{rec.Item_Name}</span>
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md ml-1 flex-shrink-0">{rec.Record_ID}</span>
                          </div>
                          <div className="text-xs text-slate-500 space-y-0.5">
                            <div className="flex items-center space-x-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span className="truncate">{rec.Coming_Center}</span>
                            </div>
                            <div className="flex items-center space-x-3">
                              <span className="flex items-center space-x-1">
                                <Hash className="w-3 h-3 text-green-500" />
                                <span className="text-green-700 font-medium">Qty: {rec.Item_Qty}</span>
                              </span>
                              {Number(rec.Missing_Items_Qty) > 0 && (
                                <span className="flex items-center space-x-1">
                                  <AlertTriangle className="w-3 h-3 text-amber-500" />
                                  <span className="text-amber-700 font-medium">Missing: {rec.Missing_Items_Qty}</span>
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-1 text-[10px] text-slate-400">
                              <CalendarDays className="w-3 h-3" />
                              <span>{rec.Inward_Date}</span>
                              <span>·</span>
                              <User className="w-3 h-3" />
                              <span>{rec.Created_By}</span>
                            </div>
                          </div>
                          {rec.Remarks && (
                            <p className="mt-1 text-[11px] text-slate-400 italic truncate">"{rec.Remarks}"</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
