'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Edit2,
  Shield,
  CheckCircle2,
  X,
  AlertCircle,
  UserCheck,
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { getUsers, createUser, updateUser } from '@/lib/api';

const ROLES = ['ADMIN', 'MANAGER', 'STAFF', 'VIEWER'];

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [modalForm, setModalForm] = useState({
    Username: '',
    Full_Name: '',
    Email: '',
    Role: 'STAFF',
    Status: 'Active',
    Password: '',
  });
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await getUsers();
      if (res && res.data) setUsers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openAddModal = () => {
    setEditingUser(null);
    setModalForm({
      Username: '',
      Full_Name: '',
      Email: '',
      Role: 'STAFF',
      Status: 'Active',
      Password: '',
    });
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (u: any) => {
    setEditingUser(u);
    setModalForm({
      Username: u.Username,
      Full_Name: u.Full_Name || '',
      Email: u.Email || '',
      Role: u.Role || 'STAFF',
      Status: u.Status || 'Active',
      Password: '',
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalForm.Username || !modalForm.Full_Name) {
      setError('Username and Full Name are required.');
      return;
    }
    if (!editingUser && !modalForm.Password) {
      setError('Password is required for new users.');
      return;
    }

    try {
      setError(null);
      if (editingUser) {
        await updateUser(editingUser.Username, {
          Full_Name: modalForm.Full_Name,
          Email: modalForm.Email,
          Role: modalForm.Role,
          Status: modalForm.Status,
          Password: modalForm.Password || undefined,
        });
      } else {
        await createUser({
          Username: modalForm.Username,
          Full_Name: modalForm.Full_Name,
          Email: modalForm.Email,
          Role: modalForm.Role,
          Status: modalForm.Status,
          Password: modalForm.Password,
        });
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to save user.');
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">User Management</h1>
              <p className="text-xs text-gray-500">
                Manage accounts, roles (Admin, Manager, Staff, Viewer), and access permissions
              </p>
            </div>
          </div>

          <button
            onClick={openAddModal}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add User</span>
          </button>
        </div>

        {/* Roles Breakdown Card */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700">ADMIN</span>
            <p className="text-xs text-gray-600 mt-2">Full unrestricted system & database access</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">MANAGER</span>
            <p className="text-xs text-gray-600 mt-2">Dashboard, Inventory, Reports & Records</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">STAFF</span>
            <p className="text-xs text-gray-600 mt-2">Stock Inward, Outward & Inventory view</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">VIEWER</span>
            <p className="text-xs text-gray-600 mt-2">Read-only inventory & dashboard access</p>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50/80 text-gray-500 uppercase text-[10px] font-bold border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3">User ID</th>
                  <th className="px-4 py-3">Username</th>
                  <th className="px-4 py-3">Full Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last Login</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {users.map((u, idx) => (
                  <tr key={idx} className="hover:bg-red-50/20 transition">
                    <td className="px-4 py-3 text-gray-400">{u.User_ID}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">{u.Username}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{u.Full_Name}</td>
                    <td className="px-4 py-3 text-gray-500">{u.Email || '-'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          u.Role === 'ADMIN'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : u.Role === 'MANAGER'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : u.Role === 'STAFF'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {u.Role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" />
                        {u.Status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{u.Last_Login || 'Never'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openEditModal(u)}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full border border-gray-100 shadow-2xl overflow-hidden">
              <div className="bg-red-50 border-b border-red-100 px-5 py-3.5 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900">
                  {editingUser ? `Edit User: ${editingUser.Username}` : 'Create New User'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-1 text-gray-400">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl font-medium flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Username</label>
                  <input
                    type="text"
                    disabled={!!editingUser}
                    value={modalForm.Username}
                    onChange={(e) => setModalForm({ ...modalForm, Username: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl font-semibold disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={modalForm.Full_Name}
                    onChange={(e) => setModalForm({ ...modalForm, Full_Name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={modalForm.Email}
                    onChange={(e) => setModalForm({ ...modalForm, Email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Role</label>
                    <select
                      value={modalForm.Role}
                      onChange={(e) => setModalForm({ ...modalForm, Role: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl font-bold"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Status</label>
                    <select
                      value={modalForm.Status}
                      onChange={(e) => setModalForm({ ...modalForm, Status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl font-medium"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    {editingUser ? 'New Password (leave blank to keep current)' : 'Password'}
                  </label>
                  <input
                    type="password"
                    value={modalForm.Password}
                    onChange={(e) => setModalForm({ ...modalForm, Password: e.target.value })}
                    placeholder={editingUser ? '••••••••' : 'Enter strong password'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl"
                  />
                </div>

                <div className="pt-3 flex justify-end space-x-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-xl font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold"
                  >
                    Save User
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
