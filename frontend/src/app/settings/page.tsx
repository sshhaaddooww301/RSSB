'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  CheckCircle2,
  Database,
  Shield,
  Bell,
  Sliders,
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { getSettings, updateSetting } from '@/lib/api';

export default function SettingsPage() {
  const [settingsList, setSettingsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Form values
  const [form, setForm] = useState<Record<string, string>>({
    DEFAULT_UNIT: 'KG',
    DEFAULT_MIN_STOCK: '20',
    DEFAULT_CRITICAL_STOCK: '5',
    ALLOW_NEGATIVE_STOCK: 'FALSE',
    OUTWARD_APPROVAL_REQUIRED: 'FALSE',
    APP_NAME: 'RSSB Langar JSR',
  });

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await getSettings();
      if (res && res.data) {
        setSettingsList(res.data);
        const dict: Record<string, string> = {};
        res.data.forEach((s: any) => {
          dict[s.Setting_Key] = s.Setting_Value;
        });
        setForm((prev) => ({ ...prev, ...dict }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage(null);
      await Promise.all(
        Object.entries(form).map(([k, v]) => updateSetting(k, v).catch(() => null))
      );
      setMessage('System preferences and stock configuration updated in Excel!');
      fetchSettings();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto pb-12">
        {/* Header */}
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
            <SettingsIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">System Settings</h1>
            <p className="text-xs text-gray-500">
              Configure stock rules, alert thresholds, and Excel database connection parameters
            </p>
          </div>
        </div>

        {message && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{message}</span>
          </div>
        )}

        <form onSubmit={handleSaveAll} className="space-y-6">
          {/* Section 1: Stock Settings */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
            <div className="bg-red-50/70 border-b border-red-100/60 px-5 py-3 flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-red-700" />
              <h2 className="text-sm font-bold text-red-700">Stock & Unit Settings</h2>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Default Unit for New Items
                  </label>
                  <select
                    value={form.DEFAULT_UNIT}
                    onChange={(e) => setForm({ ...form, DEFAULT_UNIT: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl font-bold text-red-600"
                  >
                    <option value="KG">KG</option>
                    <option value="QTL">QTL</option>
                    <option value="LITRE">LITRE</option>
                    <option value="PACKET">PACKET</option>
                    <option value="PIECE">PIECE</option>
                  </select>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Note: Each individual item preserves its own configured base unit.
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Allow Negative Available Stock
                  </label>
                  <select
                    value={form.ALLOW_NEGATIVE_STOCK}
                    onChange={(e) => setForm({ ...form, ALLOW_NEGATIVE_STOCK: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl font-medium"
                  >
                    <option value="FALSE">FALSE (Strict - Block Outward on insufficient stock)</option>
                    <option value="TRUE">TRUE (Allow temporary negative variance)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-gray-100">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Default Minimum Stock Threshold
                  </label>
                  <input
                    type="number"
                    value={form.DEFAULT_MIN_STOCK}
                    onChange={(e) => setForm({ ...form, DEFAULT_MIN_STOCK: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Default Critical Stock Threshold
                  </label>
                  <input
                    type="number"
                    value={form.DEFAULT_CRITICAL_STOCK}
                    onChange={(e) => setForm({ ...form, DEFAULT_CRITICAL_STOCK: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl font-medium text-red-600"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Excel Database & Graph API Architecture */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
            <div className="bg-red-50/70 border-b border-red-100/60 px-5 py-3 flex items-center space-x-2">
              <Database className="w-4 h-4 text-red-700" />
              <h2 className="text-sm font-bold text-red-700">Excel Database Architecture</h2>
            </div>

            <div className="p-5 space-y-3 text-xs text-gray-600">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <p className="font-semibold text-gray-900 mb-1">Primary Excel Workbook Target:</p>
                <p className="font-mono text-red-700 font-bold">Kitchen_Stock_Database.xlsx</p>
                <p className="mt-2 text-[11px] text-gray-500">
                  Tables configured: <code>ITEMS</code>, <code>STOCK_INWARD</code>,{' '}
                  <code>STOCK_OUTWARD</code>, <code>DEPARTMENTS</code>, <code>USERS</code>,{' '}
                  <code>AUDIT_LOGS</code>, <code>SETTINGS</code>.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center space-x-1.5 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-xs transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
