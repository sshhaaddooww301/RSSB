'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  X,
  RotateCcw,
  ArrowDownLeft,
  Boxes,
  TrendingUp,
  Info,
  Calculator,
  Layers,
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { getItems, createItem, updateItem, deleteItem, createStockInward } from '@/lib/api';

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

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [unitFilter, setUnitFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modal State for adding/editing item
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // Packaging & Quantity Calculator State for Add Item
  const [calcMode, setCalcMode] = useState<'package' | 'direct'>('package');
  const [packageType, setPackageType] = useState('Bags / Sacks');
  const [packCount, setPackCount] = useState('100');
  const [packSize, setPackSize] = useState('30');

  const [modalForm, setModalForm] = useState({
    Item_No: '',
    Item_Name: '',
    SKU: '', // Stores Langar Requirement
    Unit: 'QTL',
    Opening_Qty: '3000',
    Langar_Qty: '0',
    Minimum_Stock: '20',
    Critical_Stock: '5',
    Status: 'Active',
    Remarks: '100 Bags @ 30 QTL/bag',
  });
  const [modalError, setModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete State
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await getItems();
      if (res && res.data) {
        setItems(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // Update calculated quantity when packCount, packSize or packageType changes
  useEffect(() => {
    if (calcMode === 'package' && !editingItem) {
      const count = parseFloat(packCount) || 0;
      const size = parseFloat(packSize) || 0;
      const total = count * size;
      const selectedPkg = PACKAGE_TYPES.find((p) => p.label === packageType);
      const pkgLabel = selectedPkg ? selectedPkg.singular : 'Pack';

      setModalForm((prev) => ({
        ...prev,
        Opening_Qty: total > 0 ? String(total) : '',
        Remarks:
          count > 0 && size > 0
            ? `${count} ${pkgLabel}s @ ${size} ${prev.Unit}/${pkgLabel.toLowerCase()}`
            : prev.Remarks,
      }));
    }
  }, [packCount, packSize, packageType, calcMode, modalForm.Unit, editingItem]);

  const openAddModal = () => {
    setEditingItem(null);
    setCalcMode('package');
    setPackageType('Bags / Sacks');
    setPackCount('100');
    setPackSize('30');
    setModalForm({
      Item_No: '',
      Item_Name: '',
      SKU: '',
      Unit: 'QTL',
      Opening_Qty: '3000',
      Langar_Qty: '0',
      Minimum_Stock: '20',
      Critical_Stock: '5',
      Status: 'Active',
      Remarks: '100 Bags @ 30 QTL/bag',
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setModalForm({
      Item_No: item.Item_No,
      Item_Name: item.Item_Name,
      SKU: item.SKU || item.Langar_Requirement || '',
      Unit: item.Unit,
      Opening_Qty: String(item.Opening_Qty ?? item.Current_Stock ?? 0),
      Langar_Qty: String(item.Langar_Qty || 0),
      Minimum_Stock: String(item.Minimum_Stock || 0),
      Critical_Stock: String(item.Critical_Stock || 0),
      Status: item.Status || 'Active',
      Remarks: '',
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleUnitChange = (newUnit: string) => {
    const isOilOrLiquid = newUnit === 'LITRE' || newUnit === 'TIN';
    if (isOilOrLiquid) {
      setPackageType('Tins / Cans');
      setPackSize('15');
      setPackCount((prev) => prev || '20');
    } else {
      setPackageType('Bags / Sacks');
      setPackSize('30');
      setPackCount((prev) => prev || '100');
    }
    setModalForm((prev) => ({ ...prev, Unit: newUnit }));
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalForm.Item_No || !modalForm.Item_Name) {
      setModalError('Item No and Item Name are required.');
      return;
    }

    try {
      setSaving(true);
      setModalError(null);
      const startingQty = parseFloat(modalForm.Opening_Qty) || 0;

      if (editingItem) {
        // Update Item Details
        await updateItem(editingItem.Item_No, {
          Item_Name: modalForm.Item_Name.trim(),
          SKU: modalForm.SKU.trim(),
          Langar_Requirement: modalForm.SKU.trim(),
          Unit: modalForm.Unit,
          Langar_Qty: parseFloat(modalForm.Langar_Qty) || 0,
          Minimum_Stock: parseFloat(modalForm.Minimum_Stock) || 0,
          Critical_Stock: parseFloat(modalForm.Critical_Stock) || 0,
          Status: modalForm.Status,
        });
      } else {
        // Create New Item in Catalog
        await createItem({
          Item_No: modalForm.Item_No.trim(),
          Item_Name: modalForm.Item_Name.trim(),
          SKU: modalForm.SKU.trim(),
          Langar_Requirement: modalForm.SKU.trim(),
          Unit: modalForm.Unit,
          Opening_Qty: startingQty,
          Langar_Qty: parseFloat(modalForm.Langar_Qty) || 0,
          Minimum_Stock: parseFloat(modalForm.Minimum_Stock) || 0,
          Critical_Stock: parseFloat(modalForm.Critical_Stock) || 0,
          Status: modalForm.Status,
        });

        // Also record an initial Stock Inward transaction if quantity > 0
        if (startingQty > 0) {
          try {
            await createStockInward({
              Item_No: modalForm.Item_No.trim(),
              Item_Name: modalForm.Item_Name.trim(),
              SKU: modalForm.SKU.trim(),
              Unit: modalForm.Unit,
              Inward_Date: new Date().toISOString().split('T')[0],
              Quantity: startingQty,
              Supplier: 'Initial Inward / Add Item',
              Invoice_No: 'OPENING',
              Storage_Location: 'Main Kitchen / Store',
              Remarks: modalForm.Remarks.trim() || `Initial Inward: ${startingQty} ${modalForm.Unit}`,
            });
          } catch (inwErr) {
            console.warn('Initial inward note:', inwErr);
          }
        }
      }

      setIsModalOpen(false);
      await fetchItems();
    } catch (err: any) {
      setModalError(err.message || 'Failed to save item details.');
    } finally {
      setSaving(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      !search ||
      item.Item_Name?.toLowerCase().includes(search.toLowerCase()) ||
      item.Item_No?.toLowerCase().includes(search.toLowerCase()) ||
      (item.SKU && item.SKU.toLowerCase().includes(search.toLowerCase()));

    const matchesUnit = unitFilter === 'All' || item.Unit === unitFilter;
    const matchesStatus = statusFilter === 'All' || item.Stock_Status === statusFilter;

    return matchesSearch && matchesUnit && matchesStatus;
  });

  const totalItemsCount = items.length;
  const inStockCount = items.filter((i) => i.Stock_Status === 'IN STOCK').length;
  const lowStockCount = items.filter((i) => i.Stock_Status === 'LOW STOCK').length;
  const criticalStockCount = items.filter((i) => i.Stock_Status === 'CRITICAL').length;

  const quickSizes = QUICK_SIZES_BY_UNIT[modalForm.Unit] || [5, 10, 20, 25, 30, 50];
  const activePackage = PACKAGE_TYPES.find((p) => p.label === packageType);
  const containerSingular = activePackage ? activePackage.singular : 'Container';

  return (
    <AppLayout>
      <div className="space-y-5 sm:space-y-6 max-w-[1600px] mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600 shrink-0 shadow-2xs">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                <span>Items / Inventory Stock</span>
                <span className="text-[11px] font-semibold bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-full border border-gray-200">
                  Live Stock & Catalog
                </span>
              </h1>
              <p className="text-xs text-gray-500">
                View all inventory items, current stock in hand, and requirement levels
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={openAddModal}
              className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add New Item</span>
            </button>
            <Link
              href="/stock-inward"
              className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-white border border-red-200 text-red-700 hover:bg-red-50 rounded-xl text-xs font-semibold shadow-2xs transition"
            >
              <ArrowDownLeft className="w-4 h-4 text-red-600" />
              <span>Stock Inward</span>
            </Link>
          </div>
        </div>

        {/* 4 Summary Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Total Items</span>
              <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-600">
                <Boxes className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-gray-900 mt-2">{totalItemsCount}</div>
            <p className="text-[11px] text-gray-400 mt-0.5">Catalog database items</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">In Stock (Healthy)</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-700 mt-2">{inStockCount}</div>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Sufficient inventory</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Low Stock Alert</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-amber-700 mt-2">{lowStockCount}</div>
            <p className="text-[11px] text-amber-600 font-medium mt-0.5">Near reorder level</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Critical / Zero</span>
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-red-700 mt-2">{criticalStockCount}</div>
            <p className="text-[11px] text-red-600 font-medium mt-0.5">Needs immediate inward</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Item No, Name, or Langar Requirement..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-xs font-semibold text-gray-600">Unit:</label>
            <select
              value={unitFilter}
              onChange={(e) => setUnitFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl font-medium cursor-pointer"
            >
              <option value="All">All Units</option>
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-xs font-semibold text-gray-600">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl font-medium cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="IN STOCK">IN STOCK</option>
              <option value="LOW STOCK">LOW STOCK</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
          </div>

          <button
            onClick={fetchItems}
            className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-xl border border-gray-200 transition cursor-pointer"
            title="Refresh Inventory"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Inventory Master Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50/90 text-gray-700 uppercase text-[10px] font-bold border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3.5">Item No</th>
                  <th className="px-4 py-3.5 min-w-[160px]">Item Name</th>
                  <th className="px-4 py-3.5">Langar Requirement</th>
                  <th className="px-4 py-3.5">Unit</th>
                  <th className="px-4 py-3.5 font-bold text-gray-900 bg-red-50/50">Current Stock</th>
                  <th className="px-4 py-3.5 text-gray-500">Total Inward</th>
                  <th className="px-4 py-3.5 text-gray-500">Total Outward</th>
                  <th className="px-4 py-3.5">Langar Qty</th>
                  <th className="px-4 py-3.5">Min Level</th>
                  <th className="px-4 py-3.5">Stock Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {filteredItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-red-50/20 transition">
                    <td className="px-4 py-3 font-bold text-gray-900">#{item.Item_No}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{item.Item_Name}</td>
                    <td className="px-4 py-3 text-gray-700 font-medium">{item.SKU || item.Langar_Requirement || '—'}</td>
                    <td className="px-4 py-3 font-bold text-gray-800">{item.Unit}</td>
                    <td className="px-4 py-3 bg-red-50/30">
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-black text-sm text-red-700 bg-white border border-red-200 shadow-2xs">
                        <span>{item.Current_Stock}</span>
                        <span className="text-[11px] font-semibold text-gray-500">{item.Unit}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-emerald-700 font-semibold">
                      +{item.Total_Inward ?? 0} {item.Unit}
                    </td>
                    <td className="px-4 py-3 text-red-600 font-semibold">
                      -{item.Total_Outward ?? 0} {item.Unit}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{item.Langar_Qty || 0}</td>
                    <td className="px-4 py-3 text-gray-500">{item.Minimum_Stock || 0}</td>
                    <td className="px-4 py-3">
                      {item.Stock_Status === 'CRITICAL' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                          CRITICAL
                        </span>
                      )}
                      {item.Stock_Status === 'LOW STOCK' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          LOW STOCK
                        </span>
                      )}
                      {item.Stock_Status === 'IN STOCK' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          IN STOCK
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <Link
                          href="/stock-inward"
                          className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition shadow-2xs"
                          title="Inward more stock"
                        >
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                          <span>+Inward</span>
                        </Link>
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                          title="Edit Item Details"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteConfirmItem(item);
                            setDeleteError(null);
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                          title="Delete Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center text-gray-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Package className="w-8 h-8 text-gray-300" />
                        <p className="text-xs font-medium text-gray-500">No items found matching your filters.</p>
                        <button
                          onClick={openAddModal}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 underline cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Click here to Add First Item</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Add / Edit Item Modal with Stock Inward Style Packaging Calculator ── */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full border border-gray-100 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
              <div className="bg-gradient-to-r from-red-50/90 to-red-50/40 border-b border-red-100 px-6 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                    {editingItem ? <Edit2 className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">
                      {editingItem ? `Edit Item: #${editingItem.Item_No}` : 'Add New Inventory Item'}
                    </h3>
                    <p className="text-[11px] text-gray-500">
                      {editingItem
                        ? 'Update item name, unit, langar reference, or thresholds'
                        : 'Enter item details and packaging breakdown (Count × Size)'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-700 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveModal} className="p-5 sm:p-6 space-y-5 text-xs overflow-y-auto">
                {modalError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl font-medium flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{modalError}</span>
                  </div>
                )}

                {/* Edit Mode Stock Info Callout */}
                {editingItem && (
                  <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-900 font-medium">
                      <Info className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        Current Stock in Hand: <strong>{editingItem.Current_Stock} {editingItem.Unit}</strong> (Inward: +{editingItem.Total_Inward ?? 0}, Outward: -{editingItem.Total_Outward ?? 0})
                      </span>
                    </div>
                    <Link
                      href="/stock-inward"
                      className="text-[11px] font-bold text-red-700 hover:underline bg-white px-2 py-0.5 rounded border border-amber-200"
                    >
                      + Add Inward Stock
                    </Link>
                  </div>
                )}

                {/* Section 1: Item Core Identification */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Item No <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      disabled={!!editingItem}
                      value={modalForm.Item_No}
                      onChange={(e) => setModalForm({ ...modalForm, Item_No: e.target.value })}
                      placeholder="e.g. 6745 or 101"
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-bold text-gray-900 disabled:bg-gray-100 disabled:opacity-80 focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Item Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={modalForm.Item_Name}
                      onChange={(e) => setModalForm({ ...modalForm, Item_Name: e.target.value })}
                      placeholder="e.g. Basmati Rice, Mustard Oil..."
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-medium text-gray-900 focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Base Unit <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={modalForm.Unit}
                      onChange={(e) => handleUnitChange(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-bold text-red-600 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 cursor-pointer"
                      required
                    >
                      {UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">SKU / Langar Req.</label>
                    <input
                      type="text"
                      value={modalForm.SKU}
                      onChange={(e) => setModalForm({ ...modalForm, SKU: e.target.value })}
                      placeholder="e.g. 50 Bags / 200 KG"
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-medium text-gray-900 focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                    />
                  </div>
                </div>

                {/* Section 2: Packaging & Stock Quantity Calculator (Exact Same as Stock Inward) */}
                {!editingItem && (
                  <div className="bg-gradient-to-r from-red-50/60 to-orange-50/60 border border-red-200/80 rounded-2xl p-4 sm:p-5 space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Calculator className="w-4 h-4 text-red-600" />
                        <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                          Packaging & Initial Stock Calculator (Bags / Tins / Packets)
                        </h4>
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
                          🔢 Direct Total Qty
                        </button>
                      </div>
                    </div>

                    {calcMode === 'package' ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {/* Container Type */}
                          <div>
                            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                              Container Type
                            </label>
                            <select
                              value={packageType}
                              onChange={(e) => setPackageType(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-medium"
                            >
                              {PACKAGE_TYPES.map((p) => (
                                <option key={p.label} value={p.label}>
                                  {p.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Number of Containers */}
                          <div>
                            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                              Number of {containerSingular}s <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              step="any"
                              value={packCount}
                              onChange={(e) => setPackCount(e.target.value)}
                              placeholder="e.g. 100"
                              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-red-500/20"
                              required
                            />
                          </div>

                          {/* Size per Container */}
                          <div>
                            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                              Size per {containerSingular} ({modalForm.Unit}) <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              step="any"
                              value={packSize}
                              onChange={(e) => setPackSize(e.target.value)}
                              placeholder="e.g. 30"
                              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-red-500/20"
                              required
                            />
                          </div>
                        </div>

                        {/* Quick Size Preset Chips */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          <span className="text-[11px] text-gray-500 font-medium">Quick sizes ({modalForm.Unit}):</span>
                          {quickSizes.map((sz) => (
                            <button
                              key={sz}
                              type="button"
                              onClick={() => setPackSize(String(sz))}
                              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                                packSize === String(sz)
                                  ? 'bg-red-600 text-white'
                                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-red-50'
                              }`}
                            >
                              {sz} {modalForm.Unit}
                            </button>
                          ))}
                        </div>

                        {/* Total Calculated Quantity Live Display */}
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
                          <div>
                            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">
                              Total Calculated Initial Stock
                            </span>
                            <div className="text-lg font-black text-emerald-700 mt-0.5">
                              {modalForm.Opening_Qty || '0'} {modalForm.Unit}
                            </div>
                          </div>
                          <span className="text-[11px] font-semibold text-gray-600 bg-white px-2.5 py-1 rounded-lg border border-emerald-200">
                            {packCount || 0} {containerSingular}s × {packSize || 0} {modalForm.Unit}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-bold text-gray-800 mb-1">
                          Total Initial Stock Quantity <span className="text-red-500">*</span> ({modalForm.Unit})
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={modalForm.Opening_Qty}
                          onChange={(e) => setModalForm({ ...modalForm, Opening_Qty: e.target.value })}
                          placeholder="e.g. 3000"
                          className="w-full max-w-sm px-3 py-2 bg-white border-2 border-red-300 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-red-500/20"
                          required
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Section 3: Langar Qty & Threshold Levels */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2 border-t border-gray-100">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Langar Reference Qty</label>
                    <input
                      type="number"
                      step="any"
                      value={modalForm.Langar_Qty}
                      onChange={(e) => setModalForm({ ...modalForm, Langar_Qty: e.target.value })}
                      placeholder="e.g. 240"
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-medium focus:ring-2 focus:ring-red-500/20"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Minimum Stock Alert</label>
                    <input
                      type="number"
                      step="any"
                      value={modalForm.Minimum_Stock}
                      onChange={(e) => setModalForm({ ...modalForm, Minimum_Stock: e.target.value })}
                      placeholder="e.g. 20"
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-medium focus:ring-2 focus:ring-red-500/20"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Critical Stock Level</label>
                    <input
                      type="number"
                      step="any"
                      value={modalForm.Critical_Stock}
                      onChange={(e) => setModalForm({ ...modalForm, Critical_Stock: e.target.value })}
                      placeholder="e.g. 5"
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-medium text-red-600 focus:ring-2 focus:ring-red-500/20"
                    />
                  </div>
                </div>

                {/* Packaging Breakdown Note / Remarks */}
                {!editingItem && (
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Packaging Notes / Remarks
                    </label>
                    <input
                      type="text"
                      value={modalForm.Remarks}
                      onChange={(e) => setModalForm({ ...modalForm, Remarks: e.target.value })}
                      placeholder="e.g. 100 Bags @ 30 QTL/bag"
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-medium"
                    />
                  </div>
                )}

                <div className="pt-4 flex items-center justify-between border-t border-gray-100">
                  {editingItem ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsModalOpen(false);
                        setDeleteConfirmItem(editingItem);
                        setDeleteError(null);
                      }}
                      className="px-3.5 py-2 text-red-600 hover:bg-red-50 border border-red-200 rounded-xl font-semibold flex items-center space-x-1.5 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Item</span>
                    </button>
                  ) : (
                    <div />
                  )}

                  <div className="flex space-x-2.5">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 border border-gray-300 rounded-xl font-semibold hover:bg-gray-50 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-6 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl font-bold shadow-xs transition disabled:opacity-50 cursor-pointer flex items-center space-x-1.5"
                    >
                      {saving ? (
                        <span>Saving...</span>
                      ) : (
                        <span>{editingItem ? 'Update Details' : 'Save & Create Item'}</span>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmItem && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white rounded-2xl max-w-md w-full border border-gray-100 shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
              <div className="bg-red-50 border-b border-red-100 px-5 py-4 flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Delete Inventory Item</h3>
                  <p className="text-[11px] text-gray-500">Database se item permanently remove hoga</p>
                </div>
              </div>

              <div className="p-5 space-y-3.5 text-xs">
                {deleteError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl font-medium flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{deleteError}</span>
                  </div>
                )}

                <p className="text-gray-700">
                  Kya aap sach mein is item ko delete karna chahte hain?
                </p>

                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Item No:</span>
                    <span className="font-bold text-gray-900">#{deleteConfirmItem.Item_No}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Item Name:</span>
                    <span className="font-bold text-gray-900">{deleteConfirmItem.Item_Name}</span>
                  </div>
                  {(deleteConfirmItem.SKU || deleteConfirmItem.Langar_Requirement) && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">SKU / Requirement:</span>
                      <span className="font-medium text-gray-800">{deleteConfirmItem.SKU || deleteConfirmItem.Langar_Requirement}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Current Stock:</span>
                    <span className="font-bold text-red-600">{deleteConfirmItem.Current_Stock} {deleteConfirmItem.Unit}</span>
                  </div>
                </div>

                <div className="p-2.5 bg-red-50/70 border border-red-200/80 rounded-xl text-[11px] text-red-700 flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <span>Yeh item Database (PostgreSQL/Excel) se permanently delete ho jayega.</span>
                </div>
              </div>

              <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 flex justify-end space-x-2">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setDeleteConfirmItem(null)}
                  className="px-4 py-2 border border-gray-300 rounded-xl font-semibold hover:bg-gray-100 transition cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={async () => {
                    try {
                      setDeleting(true);
                      setDeleteError(null);
                      await deleteItem(deleteConfirmItem.Item_No);
                      setDeleteConfirmItem(null);
                      await fetchItems();
                    } catch (err: any) {
                      setDeleteError(err.message || 'Failed to delete item.');
                    } finally {
                      setDeleting(false);
                    }
                  }}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition disabled:opacity-50 cursor-pointer text-xs flex items-center space-x-1.5"
                >
                  {deleting ? (
                    <span>Deleting...</span>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Item</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
