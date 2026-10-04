'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowUpRight,
  Search,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertCircle,
  PackageMinus,
  Info,
  Calculator,
  Eye,
  Shield,
  Edit2,
  Trash2,
  X,
  Download,
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import {
  getItems,
  createStockOutward,
  updateStockOutward,
  deleteStockOutward,
  getStockOutward,
  getDepartments,
  getCurrentUser,
  isUserViewer,
  isUserAdmin,
} from '@/lib/api';

const UNITS = ['QTL', 'KG', 'PKT', 'LITRE', 'TIN'];

interface PackageTypeConfig {
  label: string;
  singular: string;
  defaultSize: string;
  defaultUnit: string;
  quickSizes: number[];
}

const PACKAGE_TYPES: PackageTypeConfig[] = [
  { label: 'Bags / Sacks', singular: 'Bag', defaultSize: '30', defaultUnit: 'KG', quickSizes: [5, 10, 20, 25, 30, 50, 100] },
  { label: 'Tins / Cans', singular: 'Tin', defaultSize: '15', defaultUnit: 'LITRE', quickSizes: [1, 2, 5, 10, 15, 20] },
  { label: 'Packets / Pouches', singular: 'Packet', defaultSize: '1', defaultUnit: 'PKT', quickSizes: [0.5, 1, 2, 5, 10, 25] },
  { label: 'Boxes / Cartons', singular: 'Box', defaultSize: '24', defaultUnit: 'PKT', quickSizes: [6, 12, 20, 24, 48, 100] },
  { label: 'Drums / Barrels', singular: 'Drum', defaultSize: '200', defaultUnit: 'LITRE', quickSizes: [50, 100, 200, 250] },
  { label: 'Units / Pieces', singular: 'Unit', defaultSize: '1', defaultUnit: 'KG', quickSizes: [1, 2, 5, 10, 50] },
];

const QUICK_SIZES_BY_UNIT: Record<string, number[]> = {
  QTL: [1, 2, 5, 10, 20, 50, 100],
  KG: [5, 10, 20, 25, 30, 50, 100],
  PKT: [6, 12, 24, 50, 100, 200],
  LITRE: [1, 2, 5, 10, 15, 20, 200],
  TIN: [1, 2, 5, 10, 15, 20, 50],
};

export default function StockOutwardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const isViewer = isUserViewer(currentUser);
  const isAdmin = isUserAdmin(currentUser);

  const [items, setItems] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [recentOutwards, setRecentOutwards] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit Outward Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingOutward, setEditingOutward] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    Transaction_ID: '',
    Item_No: '',
    Item_Name: '',
    SKU: '',
    Unit: 'KG',
    Outward_Date: '',
    Quantity: '',
    Department: 'Langar',
    Issued_To: '',
    Receiver_Name: '',
    Purpose: '',
    Remarks: '',
    calcMode: 'direct' as 'package' | 'direct',
    packageType: 'Bags / Sacks',
    packCount: '',
    packSize: '30',
  });
  const [editModalError, setEditModalError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // Delete Outward State
  const [deleteConfirmOutward, setDeleteConfirmOutward] = useState<any | null>(null);
  const [deletingOutward, setDeletingOutward] = useState(false);

  // Packaging State
  const [calcMode, setCalcMode] = useState<'package' | 'direct'>('package');
  const [packageType, setPackageType] = useState('Bags / Sacks');
  const [packCount, setPackCount] = useState('');
  const [packSize, setPackSize] = useState('30');

  const [formData, setFormData] = useState({
    Item_No: '',
    Item_Name: '',
    SKU: '',
    Unit: 'QTL',
    Current_Stock: '',
    Langar_Qty: '',
    Outward_Date: new Date().toISOString().split('T')[0],
    Quantity: '',
    Department: 'Langar', // strictly Canteen or Langar
    Issued_To: '',
    Receiver_Name: '',
    Purpose: '',
    Remarks: '',
  });

  useEffect(() => {
    fetchInitialData();
    const u = getCurrentUser();
    if (u) setCurrentUser(u);
  }, []);

  const handleExportOutwardCSV = () => {
    if (!recentOutwards || recentOutwards.length === 0) {
      alert('No stock outward records to export.');
      return;
    }
    const headers = [
      'Transaction ID',
      'Outward Date',
      'Item No',
      'Item Name',
      'SKU',
      'Unit',
      'Quantity',
      'Department',
      'Issued To',
      'Receiver Name',
      'Purpose',
      'Packaging / Remarks',
      'Created By',
      'Created At',
    ];
    const rows = [
      headers.join(','),
      ...recentOutwards.map((r) =>
        [
          `"${r.Transaction_ID || ''}"`,
          `"${r.Outward_Date || ''}"`,
          `"${r.Item_No || ''}"`,
          `"${(r.Item_Name || '').replace(/"/g, '""')}"`,
          `"${(r.SKU || '').replace(/"/g, '""')}"`,
          `"${r.Unit || ''}"`,
          `"${r.Quantity || 0}"`,
          `"${(r.Department || '').replace(/"/g, '""')}"`,
          `"${(r.Issued_To || '').replace(/"/g, '""')}"`,
          `"${(r.Receiver_Name || '').replace(/"/g, '""')}"`,
          `"${(r.Purpose || '').replace(/"/g, '""')}"`,
          `"${(r.Remarks || '').replace(/"/g, '""')}"`,
          `"${(r.Created_By || '').replace(/"/g, '""')}"`,
          `"${r.Created_At || ''}"`,
        ].join(',')
      ),
    ];
    const blob = new Blob(['\uFEFF' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Stock_Outward_Records_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSelectPackageType = (ptLabel: string) => {
    const pkg = PACKAGE_TYPES.find((p) => p.label === ptLabel);
    if (!pkg) return;
    setPackageType(pkg.label);
    setPackSize(pkg.defaultSize);

    if (!packCount || parseFloat(packCount) <= 0) {
      setPackCount(pkg.label === 'Tins / Cans' ? '2' : pkg.label === 'Drums / Barrels' ? '1' : '5');
    }
  };

  // Update calculated outward quantity when packCount, packSize or packageType changes
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
          count > 0 && size > 0 && (!prev.Remarks || prev.Remarks.includes('@') || prev.Remarks.includes('Bags') || prev.Remarks.includes('Tins') || prev.Remarks.includes('Boxes') || prev.Remarks.includes('Drums') || prev.Remarks.includes('Packets'))
            ? `${count} ${pkgLabel}s @ ${size} ${prev.Unit}/${pkgLabel.toLowerCase()} issued to ${prev.Department}`
            : prev.Remarks,
      }));
    }
  }, [packCount, packSize, packageType, calcMode, formData.Unit, formData.Department]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [itemsRes, outwardRes, deptRes] = await Promise.all([
        getItems(),
        getStockOutward(),
        getDepartments(),
      ]);
      if (itemsRes && itemsRes.data) {
        setItems(itemsRes.data);
      }
      if (outwardRes && outwardRes.data) {
        setRecentOutwards(outwardRes.data);
      }
      if (deptRes && deptRes.data) {
        setDepartments(deptRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (row: any) => {
    setEditingOutward(row);
    setEditModalError(null);

    const remarks = String(row.Remarks || '');
    const pkgMatch = remarks.match(/(\d+(?:\.\d+)?)\s*(Bags?|Tins?|Packets?|Boxes?|Drums?|Units?|Sacks?|Cartons?|Pouches?|Cans?|Barrels?|Pieces?)\s*@\s*(\d+(?:\.\d+)?)/i);

    let calcMode: 'package' | 'direct' = 'direct';
    let packageType = 'Bags / Sacks';
    let packCount = '';
    let packSize = '30';

    if (pkgMatch) {
      calcMode = 'package';
      packCount = pkgMatch[1];
      const foundPkgType = pkgMatch[2].toLowerCase();
      packSize = pkgMatch[3];
      if (foundPkgType.includes('tin') || foundPkgType.includes('can')) packageType = 'Tins / Cans';
      else if (foundPkgType.includes('bag') || foundPkgType.includes('sack')) packageType = 'Bags / Sacks';
      else if (foundPkgType.includes('packet') || foundPkgType.includes('pouch')) packageType = 'Packets / Pouches';
      else if (foundPkgType.includes('box') || foundPkgType.includes('carton')) packageType = 'Boxes / Cartons';
      else if (foundPkgType.includes('drum') || foundPkgType.includes('barrel')) packageType = 'Drums / Barrels';
      else packageType = 'Units / Pieces';
    }

    setEditForm({
      Transaction_ID: String(row.Transaction_ID || ''),
      Item_No: String(row.Item_No || ''),
      Item_Name: String(row.Item_Name || ''),
      SKU: String(row.SKU || ''),
      Unit: String(row.Unit || 'KG').toUpperCase(),
      Outward_Date: row.Outward_Date || new Date().toISOString().split('T')[0],
      Quantity: String(row.Quantity || ''),
      Department: row.Department === 'Canteen' ? 'Canteen' : 'Langar',
      Issued_To: String(row.Issued_To || ''),
      Receiver_Name: String(row.Receiver_Name || ''),
      Purpose: String(row.Purpose || ''),
      Remarks: String(row.Remarks || ''),
      calcMode,
      packageType,
      packCount,
      packSize,
    });
    setIsEditModalOpen(true);
  };

  const handleEditPackageTypeSelect = (ptLabel: string) => {
    const pkg = PACKAGE_TYPES.find((p) => p.label === ptLabel);
    if (!pkg) return;
    const currentCount = editForm.packCount || (pkg.label === 'Tins / Cans' ? '2' : '5');
    const newSize = pkg.defaultSize;
    const countNum = parseFloat(currentCount) || 0;
    const sizeNum = parseFloat(newSize) || 0;
    const total = countNum * sizeNum;

    setEditForm((prev) => ({
      ...prev,
      packageType: pkg.label,
      packSize: newSize,
      packCount: currentCount,
      Quantity: total > 0 ? String(total) : prev.Quantity,
      Remarks: `${countNum} ${pkg.singular}s @ ${sizeNum} ${prev.Unit}/${pkg.singular.toLowerCase()} issued to ${prev.Department}`,
    }));
  };

  const handleEditPackageCountOrSize = (newCount: string, newSize: string) => {
    const countNum = parseFloat(newCount) || 0;
    const sizeNum = parseFloat(newSize) || 0;
    const total = countNum * sizeNum;
    const selectedPkg = PACKAGE_TYPES.find((p) => p.label === editForm.packageType);
    const pkgLabel = selectedPkg ? selectedPkg.singular : 'Pack';

    setEditForm((prev) => ({
      ...prev,
      packCount: newCount,
      packSize: newSize,
      Quantity: total > 0 ? String(total) : '',
      Remarks:
        countNum > 0 && sizeNum > 0
          ? `${countNum} ${pkgLabel}s @ ${sizeNum} ${prev.Unit}/${pkgLabel.toLowerCase()} issued to ${prev.Department}`
          : prev.Remarks,
    }));
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditModalError(null);
    const qty = parseFloat(editForm.Quantity);
    if (isNaN(qty) || qty <= 0) {
      setEditModalError('Please enter a valid positive Quantity.');
      return;
    }
    if (!editForm.Department) {
      setEditModalError('Please select a Department (Canteen or Langar).');
      return;
    }

    try {
      setEditSaving(true);
      await updateStockOutward(editForm.Transaction_ID, {
        Outward_Date: editForm.Outward_Date,
        Quantity: qty,
        Department: editForm.Department,
        Issued_To: editForm.Issued_To.trim(),
        Receiver_Name: editForm.Receiver_Name.trim(),
        Purpose: editForm.Purpose.trim(),
        Remarks: editForm.Remarks.trim(),
      });

      setMessage({
        type: 'success',
        text: `Stock Outward #${editForm.Transaction_ID} updated successfully in Excel & Database!`,
      });

      setIsEditModalOpen(false);
      setEditingOutward(null);

      // Refresh data
      const [itemsRes, outwardRes] = await Promise.all([getItems(), getStockOutward()]);
      if (itemsRes && itemsRes.data) setItems(itemsRes.data);
      if (outwardRes && outwardRes.data) setRecentOutwards(outwardRes.data);
    } catch (err: any) {
      setEditModalError(err.message || 'Failed to update stock outward record.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteOutward = async () => {
    if (!deleteConfirmOutward) return;
    try {
      setDeletingOutward(true);
      await deleteStockOutward(deleteConfirmOutward.Transaction_ID);
      setMessage({
        type: 'success',
        text: `Outward record #${deleteConfirmOutward.Transaction_ID} deleted successfully!`,
      });
      setDeleteConfirmOutward(null);

      // Refresh data
      const [itemsRes, outwardRes] = await Promise.all([getItems(), getStockOutward()]);
      if (itemsRes && itemsRes.data) setItems(itemsRes.data);
      if (outwardRes && outwardRes.data) setRecentOutwards(outwardRes.data);
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'Failed to delete stock outward record.',
      });
    } finally {
      setDeletingOutward(false);
    }
  };

  const populateItemDetails = (item: any) => {
    const itemUnit = String(item.Unit || 'KG').toUpperCase();
    const isOilOrLiquid = itemUnit === 'LITRE' || String(item.Item_Name || '').toLowerCase().includes('oil') || String(item.Item_Name || '').toLowerCase().includes('ghee');

    if (isOilOrLiquid) {
      setPackageType('Tins / Cans');
      setPackSize('15');
      setPackCount('2');
    } else {
      setPackageType('Bags / Sacks');
      setPackSize('30');
      setPackCount('5');
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
          setPackCount((prevCount) => prevCount || '2');
        } else {
          setPackageType('Bags / Sacks');
          setPackSize('30');
          setPackCount((prevCount) => prevCount || '5');
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
        text: `Item found: ${found.Item_Name} (Available Stock: ${found.Current_Stock} ${found.Unit})`,
      });
    } else {
      setMessage({
        type: 'error',
        text: `Item '${formData.Item_No}' not found in active inventory. Please check Item No or select from dropdown.`,
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
      Outward_Date: new Date().toISOString().split('T')[0],
      Quantity: '',
      Department: 'Langar',
      Issued_To: '',
      Receiver_Name: '',
      Purpose: '',
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

    if (formData.Current_Stock !== '') {
      const currentStock = parseFloat(formData.Current_Stock);
      if (qty > currentStock) {
        setMessage({
          type: 'error',
          text: `INSUFFICIENT STOCK: Cannot issue ${qty} ${formData.Unit}. Only ${currentStock} ${formData.Unit} is available in stock.`,
        });
        return;
      }
    }

    if (!formData.Department) {
      setMessage({ type: 'error', text: 'Please select a Department (Canteen or Langar).' });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);
      const res = await createStockOutward({
        Item_No: formData.Item_No.trim(),
        Item_Name: formData.Item_Name.trim(),
        SKU: formData.SKU.trim(),
        Unit: formData.Unit,
        Outward_Date: formData.Outward_Date,
        Quantity: qty,
        Department: formData.Department,
        Issued_To: formData.Issued_To.trim(),
        Receiver_Name: formData.Receiver_Name.trim(),
        Purpose: formData.Purpose.trim(),
        Remarks: formData.Remarks.trim(),
      });

      setMessage({
        type: 'success',
        text: `Stock Outward recorded in Excel! Txn ID: ${res.data?.Transaction_ID || 'Recorded'}. Issued ${qty} ${formData.Unit} to ${formData.Department}.`,
      });

      // Refresh items and recent outwards from Excel
      const [itemsRes, outwardRes] = await Promise.all([getItems(), getStockOutward()]);
      if (itemsRes && itemsRes.data) setItems(itemsRes.data);
      if (outwardRes && outwardRes.data) setRecentOutwards(outwardRes.data);

      handleReset();
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'Failed to record Stock Outward in Excel.',
      });
    } finally {
      setSaving(false);
    }
  };

  const activePackage = PACKAGE_TYPES.find((p) => p.label === packageType);
  const containerSingular = activePackage ? activePackage.singular : 'Container';
  const quickSizes = activePackage?.quickSizes || QUICK_SIZES_BY_UNIT[formData.Unit] || [5, 10, 20, 25, 30, 50];

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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center text-white shadow-xs">
              <ArrowUpRight className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                Stock Outward Issue
                <span className="text-[11px] font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                  Department Issue
                </span>
              </h1>
              <p className="text-xs text-gray-500">
                Issue goods (Tins, Bags, Packets) to Langar or Canteen (records directly to Excel <code className="text-red-700 font-semibold">STOCK_OUTWARD</code>)
              </p>
            </div>
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

        {/* Read-Only Viewer Notice */}
        {isViewer && (
          <div className="bg-blue-50/90 border-2 border-blue-200 p-4 rounded-2xl flex items-center justify-between text-xs text-blue-900 shadow-xs">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-blue-950 text-sm">Viewer Access (Read-Only Mode)</p>
                <p className="text-blue-700 mt-0.5">
                  You are signed in with the <strong>VIEWER</strong> role. You can inspect stock balances and outward issue history below, but recording stock outward issues is disabled.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-blue-200/80 text-blue-900 rounded-lg font-black uppercase tracking-wider text-[11px] shrink-0">
              View Only
            </span>
          </div>
        )}

        {/* Quick Item Picker Dropdown */}
        {items.length > 0 && (
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
              <PackageMinus className="w-4 h-4 text-red-600" />
              <span>Select Item to Issue:</span>
            </div>
            <select
              value={formData.Item_No}
              onChange={handleSelectItemChange}
              className="w-full sm:w-2/3 text-xs bg-gray-50 border border-gray-300 rounded-xl py-2 px-3 font-semibold text-gray-800 focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            >
              <option value="">-- Choose item to issue from Excel inventory --</option>
              {items.map((i) => (
                <option key={i.Item_No} value={i.Item_No}>
                  #{i.Item_No} - {i.Item_Name} ({i.Unit}) | Available Stock: {i.Current_Stock}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Main Outward Form Card */}
        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          {/* Section 1: Item Details */}
          <div className="bg-gradient-to-r from-red-50/90 to-red-50/40 border-b border-red-100/80 px-6 py-3.5 flex items-center justify-between">
            <h2 className="text-sm font-bold text-red-800">Item & Outward Details</h2>
            <span className="text-[11px] text-red-600 font-medium bg-white px-2.5 py-0.5 rounded-full border border-red-100 shadow-2xs">
              All fields are directly editable
            </span>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Item No with Search Button */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Item No <span className="text-red-500">*</span>
                </label>
                <div className="relative flex">
                  <input
                    type="text"
                    list="outward-items-datalist"
                    value={formData.Item_No}
                    onChange={(e) => handleItemNoChange(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleItemNoLookup())}
                    placeholder="e.g. 6745 or 101"
                    className="w-full pl-3 pr-10 py-2.5 text-xs bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-bold text-gray-900"
                    required
                  />
                  <datalist id="outward-items-datalist">
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

              {/* Unit */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Unit <span className="text-red-500">*</span>
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
              <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-emerald-900 font-medium">
                  <Info className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Available in Excel Stock for #{formData.Item_No}:{' '}
                    <strong className="text-emerald-700 font-bold text-sm">
                      {formData.Current_Stock} {formData.Unit}
                    </strong>
                  </span>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-md">
                  In Stock
                </span>
              </div>
            )}

            {/* ── Packaging & Container Multiplier Section ── */}
            <div className="bg-gradient-to-r from-red-50/60 to-orange-50/60 border border-red-200/70 rounded-2xl p-5 space-y-4 mb-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-red-600" />
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Issue Quantity Calculator (Tins / Bags / Packets)
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
                    ⚖️ Direct Quantity
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
                          onClick={() => handleSelectPackageType(pt.label)}
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
                        Number of {containerSingular}s to Issue <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        disabled={isViewer}
                        value={packCount}
                        onChange={(e) => setPackCount(e.target.value)}
                        placeholder="e.g. 5 Bags or 2 Tins"
                        className="w-full px-3 py-2.5 text-xs bg-white border-2 border-red-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-bold text-gray-900 text-base disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>

                    {/* Size per Container */}
                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1">
                        Size per {containerSingular} ({formData.Unit}) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        disabled={isViewer}
                        value={packSize}
                        onChange={(e) => setPackSize(e.target.value)}
                        placeholder="e.g. 30 KG or 15 Litres"
                        className="w-full px-3 py-2.5 text-xs bg-white border-2 border-red-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-bold text-gray-900 text-base disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {quickSizes.map((s) => (
                          <button
                            key={s}
                            type="button"
                            disabled={isViewer}
                            onClick={() => setPackSize(String(s))}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
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

                    {/* Calculated Total */}
                    <div className="bg-white border-2 border-red-400/80 rounded-xl p-3.5 flex flex-col justify-center">
                      <span className="text-[11px] font-bold text-red-800 uppercase tracking-wider">
                        Total Outward Stock
                      </span>
                      <div className="text-xl font-black text-red-700 mt-1">
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
                    Issue Quantity <span className="text-red-500">*</span> ({formData.Unit})
                  </label>
                  <input
                    type="number"
                    step="any"
                    disabled={isViewer}
                    value={formData.Quantity}
                    onChange={(e) => setFormData({ ...formData, Quantity: e.target.value })}
                    placeholder="e.g. 150"
                    className="w-full max-w-sm px-3 py-2.5 text-xs bg-white border-2 border-red-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-bold text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    required
                  />
                </div>
              )}
            </div>

            {/* Section 2: Outward Details */}
            <div className="pt-2 border-t border-gray-100">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
                Issue Details & Destination
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                {/* Outward Date */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Outward Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    disabled={isViewer}
                    value={formData.Outward_Date}
                    onChange={(e) => setFormData({ ...formData, Outward_Date: e.target.value })}
                    className="w-full px-3 py-2.5 text-xs bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium text-gray-800 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    required
                  />
                </div>

                {/* Department strictly CANTEEN and LANGAR */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <select
                    disabled={isViewer}
                    value={formData.Department}
                    onChange={(e) => setFormData({ ...formData, Department: e.target.value })}
                    className="w-full px-3 py-2.5 text-xs bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-bold text-gray-800 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    required
                  >
                    <option value="Langar">Langar</option>
                    <option value="Canteen">Canteen</option>
                  </select>
                </div>

                {/* Issued To */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Issued To (Team/Incharge)
                  </label>
                  <input
                    type="text"
                    disabled={isViewer}
                    value={formData.Issued_To}
                    onChange={(e) => setFormData({ ...formData, Issued_To: e.target.value })}
                    placeholder="e.g. Kitchen Sevadar / Incharge"
                    className="w-full px-3 py-2.5 text-xs bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Receiver Name */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Receiver Person Name
                  </label>
                  <input
                    type="text"
                    disabled={isViewer}
                    value={formData.Receiver_Name}
                    onChange={(e) => setFormData({ ...formData, Receiver_Name: e.target.value })}
                    placeholder="e.g. Harpreet Singh"
                    className="w-full px-3 py-2.5 text-xs bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Purpose */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Purpose / Event
                  </label>
                  <input
                    type="text"
                    disabled={isViewer}
                    value={formData.Purpose}
                    onChange={(e) => setFormData({ ...formData, Purpose: e.target.value })}
                    placeholder="e.g. Morning Prasad Cooking"
                    className="w-full px-3 py-2.5 text-xs bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Remarks */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Remarks / Packaging Breakdown
                  </label>
                  <input
                    type="text"
                    disabled={isViewer}
                    value={formData.Remarks}
                    onChange={(e) => setFormData({ ...formData, Remarks: e.target.value })}
                    placeholder="e.g. 2 Tins @ 15 LITRE/tin or 5 Bags @ 30 KG/bag"
                    className="w-full px-3 py-2.5 text-xs bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-end space-x-3 pt-5 border-t border-gray-100">
              <button
                type="button"
                onClick={handleReset}
                disabled={isViewer}
                className="inline-flex items-center space-x-1.5 px-4 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-semibold transition cursor-pointer shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
                <span>Reset</span>
              </button>

              {isViewer ? (
                <div className="px-5 py-2.5 bg-gray-100 text-gray-400 border border-gray-200 rounded-xl text-xs font-bold flex items-center gap-2 cursor-not-allowed">
                  <span>🔒 Read-Only (Issue Disabled for Viewer)</span>
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Recording Outward...' : 'Save Outward Stock'}</span>
                </button>
              )}
            </div>
          </div>
        </form>

        {/* Recent Outwards Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Recent Stock Outward Issues</h3>
              <p className="text-[11px] text-gray-500">Click &quot;Edit&quot; under Actions to modify any outward record</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleExportOutwardCSV}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                title="Download all outward records as CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV ({recentOutwards.length})</span>
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50/80 text-gray-500 uppercase text-[10px] font-bold border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3">Txn ID</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Item No</th>
                  <th className="px-4 py-3">Item Name</th>
                  <th className="px-4 py-3">Issued Qty</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Issued To</th>
                  <th className="px-4 py-3">Packaging / Remarks</th>
                  <th className="px-4 py-3">Created By</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {recentOutwards.slice(0, 15).map((row, idx) => (
                  <tr key={idx} className="hover:bg-red-50/20 transition">
                    <td className="px-4 py-3 font-semibold text-gray-900">{row.Transaction_ID}</td>
                    <td className="px-4 py-3">{row.Outward_Date}</td>
                    <td className="px-4 py-3 font-semibold text-red-700">#{row.Item_No}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{row.Item_Name}</td>
                    <td className="px-4 py-3 font-bold text-red-600">-{row.Quantity} {row.Unit}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          row.Department === 'Langar'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {row.Department}
                      </span>
                    </td>
                    <td className="px-4 py-3">{row.Issued_To || row.Receiver_Name || '-'}</td>
                    <td className="px-4 py-3 text-gray-600 font-medium">{row.Remarks || row.Purpose || '-'}</td>
                    <td className="px-4 py-3">{row.Created_By}</td>
                    <td className="px-4 py-3 text-right">
                      {isViewer ? (
                        <span className="text-[10px] text-gray-400 font-semibold italic bg-gray-100 px-2 py-1 rounded">
                          View Only
                        </span>
                      ) : (
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(row)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-[11px] font-bold transition border border-red-200 cursor-pointer shadow-2xs"
                            title="Edit this outward record"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmOutward(row)}
                              className="inline-flex items-center p-1 hover:bg-red-100 text-red-600 rounded-lg text-xs transition border border-transparent hover:border-red-200 cursor-pointer"
                              title="Delete outward transaction"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {recentOutwards.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                      No outward issues recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit Outward Modal */}
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-2xl w-full overflow-hidden my-8 animate-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="px-6 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                    <Edit2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      Edit Stock Outward
                      <span className="text-[10px] font-mono bg-white/20 px-2 py-0.5 rounded text-white">
                        #{editForm.Transaction_ID}
                      </span>
                    </h3>
                    <p className="text-[11px] text-red-100">
                      Update details, department, or quantity for this issue
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleSaveEdit} className="p-6 space-y-5">
                {/* Error Banner inside Modal */}
                {editModalError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-800 flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{editModalError}</span>
                  </div>
                )}

                {/* Item Readonly Card */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded">
                        Item #{editForm.Item_No}
                      </span>
                      <span className="text-xs font-bold text-gray-900">
                        {editForm.Item_Name}
                      </span>
                    </div>
                    {editForm.SKU && (
                      <p className="text-[11px] text-gray-500 mt-0.5">SKU: {editForm.SKU}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Unit</span>
                    <span className="text-xs font-bold text-gray-800">{editForm.Unit}</span>
                  </div>
                </div>

                {/* Date & Department Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Outward Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={editForm.Outward_Date}
                      onChange={(e) => setEditForm({ ...editForm, Outward_Date: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium text-gray-800"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Department <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={editForm.Department}
                      onChange={(e) => setEditForm({ ...editForm, Department: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-bold text-gray-800"
                      required
                    >
                      <option value="Langar">Langar</option>
                      <option value="Canteen">Canteen</option>
                    </select>
                  </div>
                </div>

                {/* Calculation Mode Toggle */}
                <div className="bg-red-50/50 p-4 rounded-xl border border-red-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5 text-red-600" />
                      Issue Quantity Breakdown
                    </span>
                    <div className="flex bg-gray-200/80 p-0.5 rounded-lg text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() =>
                          setEditForm((prev) => ({ ...prev, calcMode: 'package' }))
                        }
                        className={`px-2.5 py-1 rounded-md transition ${
                          editForm.calcMode === 'package'
                            ? 'bg-white text-red-700 shadow-2xs'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        📦 Container Breakdown
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setEditForm((prev) => ({ ...prev, calcMode: 'direct' }))
                        }
                        className={`px-2.5 py-1 rounded-md transition ${
                          editForm.calcMode === 'direct'
                            ? 'bg-white text-red-700 shadow-2xs'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        ⚡ Direct Quantity
                      </button>
                    </div>
                  </div>

                  {editForm.calcMode === 'package' ? (
                    <div className="space-y-3">
                      {/* Package Type Pills */}
                      <div>
                        <span className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">
                          Select Container Type
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {PACKAGE_TYPES.map((pt) => (
                            <button
                              key={pt.label}
                              type="button"
                              onClick={() => handleEditPackageTypeSelect(pt.label)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                                editForm.packageType === pt.label
                                  ? 'bg-red-600 text-white border-red-600 shadow-2xs'
                                  : 'bg-white text-gray-700 border-gray-200 hover:border-red-300'
                              }`}
                            >
                              {pt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Count & Size Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 mb-1">
                            Number of Containers <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={editForm.packCount}
                            onChange={(e) =>
                              handleEditPackageCountOrSize(e.target.value, editForm.packSize)
                            }
                            placeholder="e.g. 5"
                            className="w-full px-3 py-2 text-xs bg-white border-2 border-red-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-bold text-gray-900"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 mb-1">
                            Size per Container ({editForm.Unit}) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={editForm.packSize}
                            onChange={(e) =>
                              handleEditPackageCountOrSize(editForm.packCount, e.target.value)
                            }
                            placeholder="e.g. 30"
                            className="w-full px-3 py-2 text-xs bg-white border-2 border-red-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-bold text-gray-900"
                            required
                          />
                        </div>

                        <div className="bg-white border-2 border-red-400 rounded-xl p-2.5 flex flex-col justify-center">
                          <span className="text-[10px] font-bold text-red-800 uppercase">
                            Total Quantity
                          </span>
                          <span className="text-base font-black text-red-700">
                            {editForm.Quantity || '0'} {editForm.Unit}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1">
                        Issued Quantity ({editForm.Unit}) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={editForm.Quantity}
                        onChange={(e) => setEditForm({ ...editForm, Quantity: e.target.value })}
                        placeholder="e.g. 150"
                        className="w-full px-3 py-2 text-xs bg-white border-2 border-red-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-bold text-gray-900"
                        required
                      />
                    </div>
                  )}
                </div>

                {/* Additional Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Issued To (Team/Incharge)
                    </label>
                    <input
                      type="text"
                      value={editForm.Issued_To}
                      onChange={(e) => setEditForm({ ...editForm, Issued_To: e.target.value })}
                      placeholder="e.g. Kitchen Sevadar"
                      className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Receiver Person Name
                    </label>
                    <input
                      type="text"
                      value={editForm.Receiver_Name}
                      onChange={(e) => setEditForm({ ...editForm, Receiver_Name: e.target.value })}
                      placeholder="e.g. Harpreet Singh"
                      className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Purpose / Event
                    </label>
                    <input
                      type="text"
                      value={editForm.Purpose}
                      onChange={(e) => setEditForm({ ...editForm, Purpose: e.target.value })}
                      placeholder="e.g. Sunday Langar"
                      className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Remarks
                    </label>
                    <input
                      type="text"
                      value={editForm.Remarks}
                      onChange={(e) => setEditForm({ ...editForm, Remarks: e.target.value })}
                      placeholder="e.g. 5 Bags @ 30 KG/bag"
                      className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                    />
                  </div>
                </div>

                {/* Modal Footer Buttons */}
                <div className="flex items-center justify-end space-x-2.5 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    disabled={editSaving}
                    className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editSaving}
                    className="inline-flex items-center space-x-1.5 px-5 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{editSaving ? 'Updating...' : 'Save & Update Outward'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmOutward && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-gray-900 text-center">
                Delete Outward Transaction?
              </h3>
              <p className="text-xs text-gray-500 text-center mt-1.5">
                Are you sure you want to delete transaction <strong>#{deleteConfirmOutward.Transaction_ID}</strong> for <strong>{deleteConfirmOutward.Item_Name}</strong> (-{deleteConfirmOutward.Quantity} {deleteConfirmOutward.Unit})?
                This will automatically return the stock to available balance.
              </p>
              <div className="flex items-center justify-center space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmOutward(null)}
                  disabled={deletingOutward}
                  className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteOutward}
                  disabled={deletingOutward}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{deletingOutward ? 'Deleting...' : 'Yes, Delete Record'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

