'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { getItems, createItem, updateItem, deleteItem } from '@/lib/api';

const UNITS = ['QTL', 'KG', 'PKT', 'LITRE', 'TIN'];

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [unitFilter, setUnitFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [modalForm, setModalForm] = useState({
    Item_No: '',
    Item_Name: '',
    SKU: '', // Stores Langar Requirement
    Unit: 'QTL',
    Opening_Qty: '0',
    Langar_Qty: '0',
    Minimum_Stock: '20',
    Critical_Stock: '5',
    Status: 'Active',
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

  const openAddModal = () => {
    setEditingItem(null);
    setModalForm({
      Item_No: '',
      Item_Name: '',
      SKU: '',
      Unit: 'QTL',
      Opening_Qty: '0',
      Langar_Qty: '0',
      Minimum_Stock: '20',
      Critical_Stock: '5',
      Status: 'Active',
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
    });
    setModalError(null);
    setIsModalOpen(true);
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
      if (editingItem) {
        // Update
        await updateItem(editingItem.Item_No, {
          Item_Name: modalForm.Item_Name,
          SKU: modalForm.SKU,
          Langar_Requirement: modalForm.SKU,
          Unit: modalForm.Unit,
          Opening_Qty: parseFloat(modalForm.Opening_Qty) || 0,
          Langar_Qty: parseFloat(modalForm.Langar_Qty) || 0,
          Minimum_Stock: parseFloat(modalForm.Minimum_Stock) || 0,
          Critical_Stock: parseFloat(modalForm.Critical_Stock) || 0,
          Status: modalForm.Status,
        });
      } else {
        // Create
        await createItem({
          Item_No: modalForm.Item_No,
          Item_Name: modalForm.Item_Name,
          SKU: modalForm.SKU,
          Langar_Requirement: modalForm.SKU,
          Unit: modalForm.Unit,
          Opening_Qty: parseFloat(modalForm.Opening_Qty) || 0,
          Langar_Qty: parseFloat(modalForm.Langar_Qty) || 0,
          Minimum_Stock: parseFloat(modalForm.Minimum_Stock) || 0,
          Critical_Stock: parseFloat(modalForm.Critical_Stock) || 0,
          Status: modalForm.Status,
        });
      }

      setIsModalOpen(false);
      fetchItems();

    } catch (err: any) {
      setModalError(err.message || 'Failed to save item.');
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

  return (
    <AppLayout>
      <div className="space-y-5 sm:space-y-6 max-w-[1600px] mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600 shrink-0">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Items / Inventory Master</h1>
              <p className="text-xs text-gray-500">
                Manage item catalog, units, langar requirements, and threshold levels
              </p>
            </div>
          </div>

          <button
            onClick={openAddModal}
            className="inline-flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Item</span>
          </button>
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
        </div>

        {/* Inventory Master Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50/80 text-gray-500 uppercase text-[10px] font-bold border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3">Item No</th>
                  <th className="px-4 py-3">Item Name</th>
                  <th className="px-4 py-3">Langar Requirement</th>
                  <th className="px-4 py-3">Base Unit</th>
                  <th className="px-4 py-3">Langar Qty</th>
                  <th className="px-4 py-3 font-bold text-gray-900">Current Stock</th>
                  <th className="px-4 py-3">Min Level</th>
                  <th className="px-4 py-3">Critical Level</th>
                  <th className="px-4 py-3">Stock Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {filteredItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-red-50/20 transition">
                    <td className="px-4 py-3 font-bold text-gray-900">{item.Item_No}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{item.Item_Name}</td>
                    <td className="px-4 py-3 text-gray-700 font-medium">{item.SKU || '—'}</td>
                    <td className="px-4 py-3 font-bold text-red-600">{item.Unit}</td>
                    <td className="px-4 py-3">{item.Langar_Qty}</td>
                    <td className="px-4 py-3 font-bold text-red-600 text-sm">
                      {item.Current_Stock} {item.Unit}
                    </td>
                    <td className="px-4 py-3">{item.Minimum_Stock}</td>
                    <td className="px-4 py-3 text-red-600 font-semibold">{item.Critical_Stock}</td>
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
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                          title="Edit Item"
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
                    <td colSpan={10} className="px-4 py-10 text-center text-gray-400">
                      No items found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add / Edit Item Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full border border-gray-100 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              <div className="bg-red-50/80 border-b border-red-100 px-5 py-3.5 flex items-center justify-between shrink-0">
                <h3 className="text-sm font-bold text-gray-900">
                  {editingItem ? `Edit Item: ${editingItem.Item_No}` : 'Add New Inventory Item'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-700 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveModal} className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto">
                {modalError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl font-medium flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{modalError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Item No <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      disabled={!!editingItem}
                      value={modalForm.Item_No}
                      onChange={(e) => setModalForm({ ...modalForm, Item_No: e.target.value })}
                      placeholder="e.g. 7005"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl font-semibold disabled:opacity-60"
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
                      placeholder="e.g. Chana Dal Special"
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">SKU / Langar Requirement</label>
                    <input
                      type="text"
                      value={modalForm.SKU}
                      onChange={(e) => setModalForm({ ...modalForm, SKU: e.target.value })}
                      placeholder="e.g. 50 Bags / 200 KG"
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Base Unit <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={modalForm.Unit}
                      onChange={(e) => setModalForm({ ...modalForm, Unit: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-bold text-red-600 cursor-pointer"
                    >
                      {UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Opening / Base Stock
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={modalForm.Opening_Qty}
                      onChange={(e) => setModalForm({ ...modalForm, Opening_Qty: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-red-500/20"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Langar Qty</label>
                    <input
                      type="number"
                      step="any"
                      value={modalForm.Langar_Qty}
                      onChange={(e) => setModalForm({ ...modalForm, Langar_Qty: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Minimum Stock</label>
                    <input
                      type="number"
                      step="any"
                      value={modalForm.Minimum_Stock}
                      onChange={(e) => setModalForm({ ...modalForm, Minimum_Stock: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Critical Stock</label>
                    <input
                      type="number"
                      step="any"
                      value={modalForm.Critical_Stock}
                      onChange={(e) => setModalForm({ ...modalForm, Critical_Stock: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-medium text-red-600"
                    />
                  </div>
                </div>


                <div className="pt-3 flex items-center justify-between border-t border-gray-100">
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

                  <div className="flex space-x-2">
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
                      className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition disabled:opacity-50 cursor-pointer"
                    >
                      {saving ? 'Saving...' : editingItem ? 'Update Item' : 'Create Item'}
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
                    <span className="font-bold text-gray-900">{deleteConfirmItem.Item_No}</span>
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
