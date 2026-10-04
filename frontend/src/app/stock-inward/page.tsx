'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowDownLeft,
  Search,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertCircle,
  PackagePlus,
  Info,
  Calculator,
  Layers,
  Plus,
  Trash2,
  Package,
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { getItems, createStockInward, getStockInward } from '@/lib/api';

const UNITS = ['QTL', 'KG', 'PKT', 'LITRE', 'TIN'];
const PACKAGE_TYPES = [
  { label: 'Bags / Sacks', singular: 'Bag' },
  { label: 'Tins / Cans', singular: 'Tin' },
  { label: 'Packets / Pouches', singular: 'Packet' },
  { label: 'Boxes / Cartons', singular: 'Box' },
  { label: 'Drums / Barrels', singular: 'Drum' },
  { label: 'Units / Pieces', singular: 'Unit' },
];

const QUICK_SIZES_BY_UNIT: Record<string, number[]> = {
  QTL: [1, 2, 5, 10, 20, 50, 100],
  KG: [5, 10, 20, 25, 30, 50, 100],
  PKT: [6, 12, 24, 50, 100, 200],
  LITRE: [1, 2, 5, 10, 15, 20, 200],
  TIN: [1, 2, 5, 10, 15, 20, 50],
};

interface BulkRow {
  id: string;
  Item_No: string;
  Item_Name: string;
  SKU: string;
  Unit: string;
  calcMode: 'package' | 'direct';
  packageType: string;
  packCount: string;
  packSize: string;
  Quantity: string;
  Remarks: string;
}

export default function StockInwardPage() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [recentInwards, setRecentInwards] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Tab mode: 'single' or 'bulk'
  const [entryMode, setEntryMode] = useState<'single' | 'bulk'>('single');

  // Single Item Packaging State
  const [calcMode, setCalcMode] = useState<'package' | 'direct'>('package');
  const [packageType, setPackageType] = useState('Bags / Sacks');
  const [packCount, setPackCount] = useState('100');
  const [packSize, setPackSize] = useState('30');

  const [formData, setFormData] = useState({
    Item_No: '',
    Item_Name: '',
    SKU: '',
    Unit: 'QTL',
    Current_Stock: '',
    Langar_Qty: '',
    Inward_Date: new Date().toISOString().split('T')[0],
    Quantity: '3000',
    Supplier: '',
    Invoice_No: '',
    Storage_Location: '',
    Remarks: '',
  });

  // Bulk Inward State
  const [bulkCommon, setBulkCommon] = useState({
    Inward_Date: new Date().toISOString().split('T')[0],
    Supplier: '',
    Invoice_No: '',
    Storage_Location: '',
  });

  const [bulkRows, setBulkRows] = useState<BulkRow[]>([
    {
      id: 'row-1',
      Item_No: '',
      Item_Name: '',
      SKU: '',
      Unit: 'QTL',
      calcMode: 'package',
      packageType: 'Bags / Sacks',
      packCount: '100',
      packSize: '30',
      Quantity: '3000',
      Remarks: '100 Bags @ 30 KG/bag',
    },
  ]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Update single form calculated quantity when packCount, packSize or packageType changes
  useEffect(() => {
    if (calcMode === 'package') {
      const count = parseFloat(packCount) || 0;
      const size = parseFloat(packSize) || 0;
      const total = count * size;
      const selectedPkg = PACKAGE_TYPES.find((p) => p.label === packageType);
      const pkgLabel = selectedPkg ? selectedPkg.singular : 'Pack';

      setFormData((prev) => ({
        ...prev,
        Quantity: total > 0 ? String(total) : '',
        Remarks:
          count > 0 && size > 0 && (!prev.Remarks || prev.Remarks.includes('@') || prev.Remarks.includes('Bags') || prev.Remarks.includes('Tins'))
            ? `${count} ${pkgLabel}s @ ${size} ${prev.Unit}/${pkgLabel.toLowerCase()}`
            : prev.Remarks,
      }));
    }
  }, [packCount, packSize, packageType, calcMode, formData.Unit]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [itemsRes, inwardRes] = await Promise.all([getItems(), getStockInward()]);
      if (itemsRes && itemsRes.data) {
        setItems(itemsRes.data);
      }
      if (inwardRes && inwardRes.data) {
        setRecentInwards(inwardRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const populateItemDetails = (item: any) => {
    const itemUnit = String(item.Unit || 'KG').toUpperCase();
    const isOilOrLiquid = itemUnit === 'LITRE' || String(item.Item_Name || '').toLowerCase().includes('oil') || String(item.Item_Name || '').toLowerCase().includes('ghee');

    // Default container type: Tins for Oil/Liquid, Bags for dry goods
    if (isOilOrLiquid) {
      setPackageType('Tins / Cans');
      setPackSize('15');
      setPackCount('20');
    } else {
      setPackageType('Bags / Sacks');
      setPackSize('30');
      setPackCount('100');
    }

    setFormData((prev) => ({
      ...prev,
      Item_No: String(item.Item_No || ''),
      Item_Name: String(item.Item_Name || ''),
      SKU: String(item.SKU || ''),
      Unit: itemUnit,
      Current_Stock: String(item.Current_Stock ?? item.Opening_Qty ?? 0),
      Langar_Qty: String(item.Langar_Qty ?? 0),
    }));
  };

  const handleItemNoChange = (val: string) => {
    const q = val.trim().toLowerCase();
    setFormData((prev) => {
      const updated = { ...prev, Item_No: val };
      if (!q) {
        return updated;
      }
      const found = items.find(
        (i) =>
          String(i.Item_No).trim().toLowerCase() === q ||
          String(i.SKU || '').trim().toLowerCase() === q
      );
      if (found) {
        const itemUnit = String(found.Unit || 'KG').toUpperCase();
        const isOilOrLiquid =
          itemUnit === 'LITRE' ||
          String(found.Item_Name || '').toLowerCase().includes('oil') ||
          String(found.Item_Name || '').toLowerCase().includes('ghee');

        if (isOilOrLiquid) {
          setPackageType('Tins / Cans');
          setPackSize('15');
          setPackCount((prevCount) => prevCount || '20');
        } else {
          setPackageType('Bags / Sacks');
          setPackSize('30');
          setPackCount((prevCount) => prevCount || '100');
        }

        updated.Item_Name = String(found.Item_Name || '');
        updated.SKU = String(found.SKU || '');
        updated.Unit = itemUnit;
        updated.Current_Stock = String(found.Current_Stock ?? found.Opening_Qty ?? 0);
        updated.Langar_Qty = String(found.Langar_Qty ?? 0);
      }
      return updated;
    });
  };

  const handleItemNoLookup = () => {
    if (!formData.Item_No.trim()) {
      setMessage({ type: 'error', text: 'Please enter an Item No or Name to search.' });
      return;
    }
    const q = formData.Item_No.trim().toLowerCase();
    const found = items.find(
      (i) =>
        String(i.Item_No).trim().toLowerCase() === q ||
        String(i.Item_Name).trim().toLowerCase().includes(q) ||
        String(i.SKU || '').trim().toLowerCase() === q
    );
    if (found) {
      populateItemDetails(found);
      setMessage({
        type: 'success',
        text: `Found item: ${found.Item_Name} (Item No: ${found.Item_No}, Current Stock: ${found.Current_Stock} ${found.Unit})`,
      });
    } else {
      setMessage({
        type: 'error',
        text: `Item '${formData.Item_No}' not in catalog. You can enter details below to register it.`,
      });
    }
  };

  const handleSelectItemChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) {
      handleReset();
      return;
    }
    const found = items.find((i) => String(i.Item_No).trim() === val);
    if (found) {
      populateItemDetails(found);
      setMessage(null);
    }
  };

  const handleReset = () => {
    setFormData({
      Item_No: '',
      Item_Name: '',
      SKU: '',
      Unit: 'QTL',
      Current_Stock: '',
      Langar_Qty: '',
      Inward_Date: new Date().toISOString().split('T')[0],
      Quantity: '',
      Supplier: '',
      Invoice_No: '',
      Storage_Location: '',
      Remarks: '',
    });
    setPackCount('');
    setPackSize('30');
    setMessage(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.Item_No.trim()) {
      setMessage({ type: 'error', text: 'Please enter or select an Item No.' });
      return;
    }
    const qty = parseFloat(formData.Quantity);
    if (isNaN(qty) || qty <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid positive Quantity.' });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);
      const res = await createStockInward({
        Item_No: formData.Item_No.trim(),
        Item_Name: formData.Item_Name.trim(),
        SKU: formData.SKU.trim(),
        Unit: formData.Unit,
        Inward_Date: formData.Inward_Date,
        Quantity: qty,
        Supplier: formData.Supplier.trim(),
        Invoice_No: formData.Invoice_No.trim(),
        Storage_Location: formData.Storage_Location.trim(),
        Remarks: formData.Remarks.trim(),
      });

      setMessage({
        type: 'success',
        text: `Stock Inward saved to Excel! Txn ID: ${res.data?.Transaction_ID || 'Recorded'}. Added ${qty} ${formData.Unit} for ${res.data?.Item_Name || formData.Item_No}.`,
      });

      // Refresh recent inwards and items from Excel
      const [itemsRes, inwardRes] = await Promise.all([getItems(), getStockInward()]);
      if (itemsRes && itemsRes.data) setItems(itemsRes.data);
      if (inwardRes && inwardRes.data) setRecentInwards(inwardRes.data);

      handleReset();
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'Failed to save Stock Inward to Excel.',
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Bulk Inward Helpers ─────────────────────────────────────────────
  const addBulkRow = () => {
    setBulkRows((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}`,
        Item_No: '',
        Item_Name: '',
        SKU: '',
        Unit: 'KG',
        calcMode: 'package',
        packageType: 'Bags / Sacks',
        packCount: '',
        packSize: '30',
        Quantity: '',
        Remarks: '',
      },
    ]);
  };

  const removeBulkRow = (id: string) => {
    if (bulkRows.length === 1) return;
    setBulkRows((prev) => prev.filter((r) => r.id !== id));
  };

  const updateBulkRow = (id: string, field: keyof BulkRow, val: any) => {
    setBulkRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: val };

        // If item selected from dropdown or typed
        if (field === 'Item_No') {
          const q = String(val).trim().toLowerCase();
          const item = items.find(
            (i) =>
              String(i.Item_No).trim().toLowerCase() === q ||
              String(i.SKU || '').trim().toLowerCase() === q
          );
          if (item) {
            updated.Item_Name = item.Item_Name;
            updated.SKU = item.SKU || '';
            updated.Unit = item.Unit || 'KG';
            if (updated.Unit === 'LITRE') {
              updated.packageType = 'Tins / Cans';
              updated.packSize = '15';
            }
          }
        }

        // Auto calculate quantity in package mode
        if (updated.calcMode === 'package') {
          const count = parseFloat(updated.packCount) || 0;
          const size = parseFloat(updated.packSize) || 0;
          const total = count * size;
          updated.Quantity = total > 0 ? String(total) : '';
          if (count > 0 && size > 0) {
            const selectedPkg = PACKAGE_TYPES.find((p) => p.label === updated.packageType);
            const pkgLabel = selectedPkg ? selectedPkg.singular : 'Pack';
            updated.Remarks = `${count} ${pkgLabel}s @ ${size} ${updated.Unit}/${pkgLabel.toLowerCase()}`;
          }
        }

        return updated;
      })
    );
  };

  const handleSaveBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    const validRows = bulkRows.filter((r) => r.Item_No && parseFloat(r.Quantity) > 0);
    if (validRows.length === 0) {
      setMessage({ type: 'error', text: 'Please add at least one valid item with positive quantity.' });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);
      let successCount = 0;

      for (const row of validRows) {
        await createStockInward({
          Item_No: row.Item_No.trim(),
          Item_Name: row.Item_Name.trim(),
          SKU: row.SKU.trim(),
          Unit: row.Unit,
          Inward_Date: bulkCommon.Inward_Date,
          Quantity: parseFloat(row.Quantity),
          Supplier: bulkCommon.Supplier.trim(),
          Invoice_No: bulkCommon.Invoice_No.trim(),
          Storage_Location: bulkCommon.Storage_Location.trim(),
          Remarks: row.Remarks.trim(),
        });
        successCount++;
      }

      setMessage({
        type: 'success',
        text: `Successfully recorded all ${successCount} items into Excel database!`,
      });

      // Refresh recent inwards and items from Excel
      const [itemsRes, inwardRes] = await Promise.all([getItems(), getStockInward()]);
      if (itemsRes && itemsRes.data) setItems(itemsRes.data);
      if (inwardRes && inwardRes.data) setRecentInwards(inwardRes.data);

      setBulkRows([
        {
          id: `row-${Date.now()}`,
          Item_No: '',
          Item_Name: '',
          SKU: '',
          Unit: 'KG',
          calcMode: 'package',
          packageType: 'Bags / Sacks',
          packCount: '',
          packSize: '30',
          Quantity: '',
          Remarks: '',
        },
      ]);
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'Failed to save items to Excel.',
      });
    } finally {
      setSaving(false);
    }
  };

  const quickSizes = QUICK_SIZES_BY_UNIT[formData.Unit] || [5, 10, 20, 25, 30, 50];
  const activePackage = PACKAGE_TYPES.find((p) => p.label === packageType);
  const containerSingular = activePackage ? activePackage.singular : 'Container';

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center space-x-3.5">
            <Link
              href="/"
              className="w-9 h-9 rounded-xl bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-600 transition shadow-2xs"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white shadow-xs">
              <ArrowDownLeft className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                Stock Inward Entry
                <span className="text-[11px] font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                  Goods Receipt
                </span>
              </h1>
              <p className="text-xs text-gray-500">
                Record received stock (Bags, Tins, Packets, Boxes) directly into Excel <code className="text-red-700 font-semibold">STOCK_INWARD</code>
              </p>
            </div>
          </div>

          {/* Entry Mode Switcher */}
          <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setEntryMode('single')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
                entryMode === 'single'
                  ? 'bg-white text-red-600 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Single Item Inward</span>
            </button>
            <button
              type="button"
              onClick={() => setEntryMode('bulk')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
                entryMode === 'bulk'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Multi-Item Challan / Bulk</span>
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {message && (
          <div
            className={`p-4 rounded-xl flex items-center space-x-3 text-xs font-semibold animate-in fade-in transition ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* ── MODE 1: SINGLE ITEM INWARD WITH PACKAGING CALCULATOR ── */}
        {entryMode === 'single' && (
          <>
            {/* Quick Item Picker Dropdown */}
            {items.length > 0 && (
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                  <PackagePlus className="w-4 h-4 text-red-600" />
                  <span>Select Existing Item:</span>
                </div>
                <select
                  value={formData.Item_No}
                  onChange={handleSelectItemChange}
                  className="w-full sm:w-2/3 text-xs bg-gray-50 border border-gray-300 rounded-xl py-2 px-3 font-semibold text-gray-800 focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                >
                  <option value="">-- Choose an item to auto-fill or enter manually below --</option>
                  {items.map((i) => (
                    <option key={i.Item_No} value={i.Item_No}>
                      #{i.Item_No} - {i.Item_Name} ({i.Unit}) | In Stock: {i.Current_Stock}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Main Inward Form Card */}
            <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
              <div className="bg-gradient-to-r from-red-50/90 to-red-50/40 border-b border-red-100/80 px-6 py-3.5 flex items-center justify-between">
                <h2 className="text-sm font-bold text-red-800 flex items-center gap-2">
                  <span>Item & Inward Details</span>
                </h2>
                <span className="text-[11px] text-red-600 font-medium bg-white px-2.5 py-0.5 rounded-full border border-red-100 shadow-2xs">
                  All fields are directly editable
                </span>
              </div>

              <div className="p-6 space-y-6">
                {/* Section 1: Item Identification */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Item No with Search Button */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Item No <span className="text-red-500">*</span>
                    </label>
                    <div className="relative flex">
                      <input
                        type="text"
                        list="inward-items-datalist"
                        value={formData.Item_No}
                        onChange={(e) => handleItemNoChange(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleItemNoLookup())}
                        placeholder="e.g. 6745 or 101"
                        className="w-full pl-3 pr-10 py-2.5 text-xs bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-bold text-gray-900"
                        required
                      />
                      <datalist id="inward-items-datalist">
                        {items.map((i) => (
                          <option key={i.Item_No} value={i.Item_No}>
                            {i.Item_Name} ({i.Unit}) - Stock: {i.Current_Stock}
                          </option>
                        ))}
                      </datalist>
                      <button
                        type="button"
                        onClick={handleItemNoLookup}
                        className="absolute right-1.5 top-1.5 bottom-1.5 px-2.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg border border-red-200 flex items-center justify-center transition cursor-pointer"
                        title="Lookup in catalog"
                      >
                        <Search className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Item Name */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Item Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.Item_Name}
                      onChange={(e) => setFormData({ ...formData, Item_Name: e.target.value })}
                      placeholder="e.g. Basmati Rice, Mustard Oil, Atta..."
                      className="w-full px-3 py-2.5 text-xs bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium text-gray-900"
                      required
                    />
                  </div>

                  {/* Base Unit */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Base Unit <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.Unit}
                      onChange={(e) => setFormData({ ...formData, Unit: e.target.value })}
                      className="w-full px-3 py-2.5 text-xs bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-bold text-gray-800"
                      required
                    >
                      {UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* SKU */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      SKU / Langar Req.
                    </label>
                    <input
                      type="text"
                      value={formData.SKU}
                      onChange={(e) => setFormData({ ...formData, SKU: e.target.value })}
                      placeholder="e.g. 50 Bags / 200 KG"
                      className="w-full px-3 py-2.5 text-xs bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium text-gray-900"
                    />
                  </div>
                </div>

                {/* Current Stock Banner if selected */}
                {formData.Current_Stock !== '' && (
                  <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-amber-900 font-medium">
                      <Info className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        Current Stock in Excel for #{formData.Item_No}: <strong>{formData.Current_Stock} {formData.Unit}</strong>
                        {formData.Langar_Qty ? ` (Langar Reference: ${formData.Langar_Qty} ${formData.Unit})` : ''}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded-md">
                      Active
                    </span>
                  </div>
                )}

                {/* ── Packaging & Multiplier Section (Bags / Tins / Packets) ── */}
                <div className="bg-gradient-to-r from-red-50/60 to-orange-50/60 border border-red-200/70 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-red-600" />
                      <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                        Packaging & Quantity Calculator (Bags / Tins / Packets)
                      </h3>
                    </div>
                    <div className="flex bg-white p-0.5 rounded-lg border border-red-200 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setCalcMode('package')}
                        className={`px-3 py-1 rounded-md transition cursor-pointer ${
                          calcMode === 'package'
                            ? 'bg-red-600 text-white shadow-2xs'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        📦 Packaging Mode (Count × Size)
                      </button>
                      <button
                        type="button"
                        onClick={() => setCalcMode('direct')}
                        className={`px-3 py-1 rounded-md transition cursor-pointer ${
                          calcMode === 'direct'
                            ? 'bg-red-600 text-white shadow-2xs'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        ⚖️ Direct Total Quantity
                      </button>
                    </div>
                  </div>

                  {calcMode === 'package' ? (
                    <div className="space-y-3 pt-1">
                      {/* Packaging Type selector */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-gray-700">Container Type:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {PACKAGE_TYPES.map((pt) => (
                            <button
                              key={pt.label}
                              type="button"
                              onClick={() => setPackageType(pt.label)}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                                packageType === pt.label
                                  ? 'bg-red-600 text-white shadow-xs'
                                  : 'bg-white text-gray-700 border border-gray-200 hover:border-red-300'
                              }`}
                            >
                              {pt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                        {/* Number of Containers */}
                        <div>
                          <label className="block text-xs font-bold text-gray-800 mb-1">
                            Number of {containerSingular}s <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={packCount}
                            onChange={(e) => setPackCount(e.target.value)}
                            placeholder="e.g. 100 Bags or 20 Tins"
                            className="w-full px-3 py-2.5 text-xs bg-white border-2 border-red-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-bold text-gray-900 text-base"
                          />
                        </div>

                        {/* Size / Weight per Container */}
                        <div>
                          <label className="block text-xs font-bold text-gray-800 mb-1">
                            Size / Volume per {containerSingular} ({formData.Unit}) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={packSize}
                            onChange={(e) => setPackSize(e.target.value)}
                            placeholder="e.g. 30 KG or 15 Litres"
                            className="w-full px-3 py-2.5 text-xs bg-white border-2 border-red-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-bold text-gray-900 text-base"
                          />
                          {/* Quick Size Chips */}
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {quickSizes.map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setPackSize(String(s))}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                                  packSize === String(s)
                                    ? 'bg-red-600 text-white border-red-600'
                                    : 'bg-white text-gray-700 border-gray-200 hover:border-red-300'
                                }`}
                              >
                                {s} {formData.Unit}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Total Auto Calculated */}
                        <div className="bg-white border-2 border-emerald-400/80 rounded-xl p-3.5 flex flex-col justify-center">
                          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                            Total Inward Stock
                          </span>
                          <div className="text-xl font-black text-emerald-700 mt-1">
                            {formData.Quantity || '0'} {formData.Unit}
                          </div>
                          <span className="text-[11px] font-semibold text-gray-500 mt-0.5">
                            ({packCount || 0} {containerSingular}s × {packSize || 0} {formData.Unit})
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1">
                        Total Inward Quantity <span className="text-red-500">*</span> ({formData.Unit})
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={formData.Quantity}
                        onChange={(e) => setFormData({ ...formData, Quantity: e.target.value })}
                        placeholder="e.g. 3000"
                        className="w-full max-w-sm px-3 py-2.5 text-xs bg-white border-2 border-red-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-bold text-gray-900"
                        required
                      />
                    </div>
                  )}
                </div>

                {/* Section 2: Inward Date & Supplier Details */}
                <div className="pt-2 border-t border-gray-100">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
                    Receipt & Supplier Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {/* Inward Date */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Inward Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.Inward_Date}
                        onChange={(e) => setFormData({ ...formData, Inward_Date: e.target.value })}
                        className="w-full px-3 py-2.5 text-xs bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium text-gray-800"
                        required
                      />
                    </div>

                    {/* Supplier */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Supplier / Vendor / Mandi
                      </label>
                      <input
                        type="text"
                        value={formData.Supplier}
                        onChange={(e) => setFormData({ ...formData, Supplier: e.target.value })}
                        placeholder="e.g. Kisan Mandi / Local Vendor"
                        className="w-full px-3 py-2.5 text-xs bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
                      />
                    </div>

                    {/* Invoice Number */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Invoice / Challan / Bill No
                      </label>
                      <input
                        type="text"
                        value={formData.Invoice_No}
                        onChange={(e) => setFormData({ ...formData, Invoice_No: e.target.value })}
                        placeholder="e.g. INV-8821 or CH-990"
                        className="w-full px-3 py-2.5 text-xs bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Storage & Remarks */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Storage Location
                    </label>
                    <input
                      type="text"
                      value={formData.Storage_Location}
                      onChange={(e) => setFormData({ ...formData, Storage_Location: e.target.value })}
                      placeholder="e.g. Main Kitchen Store Room 1, Rack B"
                      className="w-full px-3 py-2.5 text-xs bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Remarks / Notes (Packaging Breakdown)
                    </label>
                    <input
                      type="text"
                      value={formData.Remarks}
                      onChange={(e) => setFormData({ ...formData, Remarks: e.target.value })}
                      placeholder="e.g. 100 Bags @ 30 KG/bag or 20 Tins @ 15 LITRE/tin"
                      className="w-full px-3 py-2.5 text-xs bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
                    />
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="flex items-center justify-end space-x-3 pt-5 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex items-center space-x-1.5 px-4 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-semibold transition cursor-pointer shadow-2xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
                    <span>Reset</span>
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saving ? 'Saving to Excel...' : 'Save Inward Stock'}</span>
                  </button>
                </div>
              </div>
            </form>
          </>
        )}

        {/* ── MODE 2: MULTI-ITEM BULK CHALLAN INWARD ── */}
        {entryMode === 'bulk' && (
          <form onSubmit={handleSaveBulk} className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
            <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  <span>Multi-Item Challan / Truck Delivery Entry</span>
                </h2>
                <p className="text-[11px] text-red-100 mt-0.5">
                  Enter supplier & invoice once, then add multiple items with container counts below
                </p>
              </div>
              <button
                type="button"
                onClick={addBulkRow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Item Row</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Common Header Info */}
              <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200/80 grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Inward Date *</label>
                  <input
                    type="date"
                    value={bulkCommon.Inward_Date}
                    onChange={(e) => setBulkCommon({ ...bulkCommon, Inward_Date: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Supplier / Mandi</label>
                  <input
                    type="text"
                    value={bulkCommon.Supplier}
                    onChange={(e) => setBulkCommon({ ...bulkCommon, Supplier: e.target.value })}
                    placeholder="e.g. Kisan Mandi / Local Store"
                    className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Invoice / Challan No</label>
                  <input
                    type="text"
                    value={bulkCommon.Invoice_No}
                    onChange={(e) => setBulkCommon({ ...bulkCommon, Invoice_No: e.target.value })}
                    placeholder="e.g. BILL-2026-09"
                    className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Storage Location</label>
                  <input
                    type="text"
                    value={bulkCommon.Storage_Location}
                    onChange={(e) => setBulkCommon({ ...bulkCommon, Storage_Location: e.target.value })}
                    placeholder="e.g. Main Godown / Shed 2"
                    className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg font-medium"
                  />
                </div>
              </div>

              {/* Items Rows */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Invoice Line Items ({bulkRows.length})
                  </h3>
                  <button
                    type="button"
                    onClick={addBulkRow}
                    className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item Row</span>
                  </button>
                </div>

                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                      <tr>
                        <th className="p-2.5 w-10">#</th>
                        <th className="p-2.5 min-w-[180px]">Select Item *</th>
                        <th className="p-2.5 w-28">Packaging</th>
                        <th className="p-2.5 w-24">Containers</th>
                        <th className="p-2.5 w-24">Size/Unit</th>
                        <th className="p-2.5 w-28">Total Qty *</th>
                        <th className="p-2.5 w-20">Unit</th>
                        <th className="p-2.5 min-w-[150px]">Remarks / Packaging Note</th>
                        <th className="p-2.5 w-12 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {bulkRows.map((row, idx) => (
                        <tr key={row.id} className="hover:bg-gray-50/60">
                          <td className="p-2.5 text-gray-500 font-bold">{idx + 1}</td>
                          <td className="p-2.5">
                            <select
                              value={row.Item_No}
                              onChange={(e) => updateBulkRow(row.id, 'Item_No', e.target.value)}
                              className="w-full p-2 bg-white border border-gray-300 rounded-lg text-xs font-semibold"
                              required
                            >
                              <option value="">-- Choose Item --</option>
                              {items.map((i) => (
                                <option key={i.Item_No} value={i.Item_No}>
                                  #{i.Item_No} - {i.Item_Name} ({i.Unit})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2.5">
                            <select
                              value={row.packageType}
                              onChange={(e) => updateBulkRow(row.id, 'packageType', e.target.value)}
                              className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium"
                            >
                              {PACKAGE_TYPES.map((p) => (
                                <option key={p.label} value={p.label}>
                                  {p.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2.5">
                            <input
                              type="number"
                              step="any"
                              value={row.packCount}
                              onChange={(e) => updateBulkRow(row.id, 'packCount', e.target.value)}
                              placeholder="100"
                              className="w-full p-2 bg-white border border-red-200 rounded-lg text-xs font-bold"
                            />
                          </td>
                          <td className="p-2.5">
                            <input
                              type="number"
                              step="any"
                              value={row.packSize}
                              onChange={(e) => updateBulkRow(row.id, 'packSize', e.target.value)}
                              placeholder="30"
                              className="w-full p-2 bg-white border border-red-200 rounded-lg text-xs font-bold"
                            />
                          </td>
                          <td className="p-2.5">
                            <input
                              type="number"
                              step="any"
                              value={row.Quantity}
                              onChange={(e) => updateBulkRow(row.id, 'Quantity', e.target.value)}
                              placeholder="3000"
                              className="w-full p-2 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300"
                              required
                            />
                          </td>
                          <td className="p-2.5 font-bold text-gray-700">{row.Unit || 'KG'}</td>
                          <td className="p-2.5">
                            <input
                              type="text"
                              value={row.Remarks}
                              onChange={(e) => updateBulkRow(row.id, 'Remarks', e.target.value)}
                              placeholder="Notes"
                              className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs"
                            />
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => removeBulkRow(row.id)}
                              disabled={bulkRows.length === 1}
                              className="p-1.5 text-gray-400 hover:text-red-600 disabled:opacity-30 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bulk Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100 flex-wrap gap-3">
                <div className="text-xs font-bold text-gray-600">
                  Total Items in Challan: <span className="text-red-600 font-black">{bulkRows.length}</span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setBulkRows([
                        {
                          id: `row-${Date.now()}`,
                          Item_No: '',
                          Item_Name: '',
                          SKU: '',
                          Unit: 'KG',
                          calcMode: 'package',
                          packageType: 'Bags / Sacks',
                          packCount: '',
                          packSize: '30',
                          Quantity: '',
                          Remarks: '',
                        },
                      ])
                    }
                    className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 cursor-pointer"
                  >
                    Reset Grid
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center space-x-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saving ? 'Saving All to Excel...' : 'Save All Items'}</span>
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* Recent Inwards Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">Recent Stock Inward Records</h3>
            <span className="text-xs text-gray-400">Live synced from Excel database</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50/80 text-gray-500 uppercase text-[10px] font-bold border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3">Txn ID</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Item No</th>
                  <th className="px-4 py-3">Item Name</th>
                  <th className="px-4 py-3">Quantity</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3">Packaging / Remarks</th>
                  <th className="px-4 py-3">Created By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {recentInwards.slice(0, 8).map((row, idx) => (
                  <tr key={idx} className="hover:bg-red-50/20 transition">
                    <td className="px-4 py-3 font-semibold text-gray-900">{row.Transaction_ID}</td>
                    <td className="px-4 py-3">{row.Inward_Date}</td>
                    <td className="px-4 py-3 font-semibold text-red-700">#{row.Item_No}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{row.Item_Name}</td>
                    <td className="px-4 py-3 font-bold text-emerald-600">+{row.Quantity}</td>
                    <td className="px-4 py-3">{row.Unit}</td>
                    <td className="px-4 py-3">{row.Supplier || '-'}</td>
                    <td className="px-4 py-3 text-gray-600 font-medium">{row.Remarks || row.Invoice_No || '-'}</td>
                    <td className="px-4 py-3">{row.Created_By}</td>
                  </tr>
                ))}
                {recentInwards.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                      No stock inward records yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
