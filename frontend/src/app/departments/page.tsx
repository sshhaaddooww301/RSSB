'use client';

import React, { useState, useEffect } from 'react';
import { Building2, Edit2, CheckCircle2, ShieldCheck, X, Eye } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { getDepartments, updateDepartment, getCurrentUser, isUserViewer } from '@/lib/api';

export default function DepartmentsPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const isViewer = isUserViewer(currentUser);

  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDept, setEditingDept] = useState<any | null>(null);
  const [desc, setDesc] = useState('');
  const [code, setCode] = useState('');

  const fetchDepts = async () => {
    try {
      setLoading(true);
      const res = await getDepartments();
      if (res && res.data) setDepartments(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepts();
    const u = getCurrentUser();
    if (u) setCurrentUser(u);
  }, []);

  const handleEdit = (dept: any) => {
    if (isViewer) return;
    setEditingDept(dept);
    setDesc(dept.Description || '');
    setCode(dept.Short_Code || '');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept || isViewer) return;
    try {
      await updateDepartment(editingDept.Department_ID, {
        Description: desc,
        Short_Code: code,
      });
      setEditingDept(null);
      fetchDepts();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto pb-12">
        {/* Read-only notice for Viewer role */}
        {isViewer && (
          <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl flex items-center justify-between text-xs text-amber-900 shadow-2xs">
            <div className="flex items-center space-x-2.5">
              <Eye className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Viewer Access Mode:</strong> You have Read-Only permissions. Department configuration editing is restricted.
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900 uppercase">
              View Only
            </span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Departments Master</h1>
            <p className="text-xs text-gray-500">
              Strictly 2 designated operational departments: Canteen and Langar
            </p>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-center space-x-3 text-xs text-red-800">
          <ShieldCheck className="w-5 h-5 text-red-600 shrink-0" />
          <span>
            <strong>System Rule:</strong> Only two departments (<strong>Canteen</strong> and <strong>Langar</strong>) are permitted. All stock outward operations strictly map to these two units.
          </span>
        </div>

        {/* Departments Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {departments.map((dept) => (
            <div
              key={dept.Department_ID}
              className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                    {dept.Short_Code}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" />
                    {dept.Status}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-gray-900">{dept.Department_Name}</h3>
                <p className="text-xs text-gray-500 mt-1">{dept.Description || 'Operational Kitchen Unit'}</p>
              </div>

              <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                <span>Dept ID: {dept.Department_ID}</span>
                {!isViewer ? (
                  <button
                    onClick={() => handleEdit(dept)}
                    className="inline-flex items-center space-x-1 px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg font-semibold transition cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Edit Details</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-gray-400 italic">View Only</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Edit Modal */}
        {editingDept && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full border border-gray-100 shadow-2xl overflow-hidden">
              <div className="bg-red-50 border-b border-red-100 px-5 py-3.5 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900">
                  Edit Department: {editingDept.Department_Name}
                </h3>
                <button onClick={() => setEditingDept(null)} className="p-1 text-gray-400">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Short Code</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Description</label>
                  <textarea
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl"
                  />
                </div>

                <div className="pt-3 flex justify-end space-x-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setEditingDept(null)}
                    className="px-4 py-2 border border-gray-300 rounded-xl font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold"
                  >
                    Save Changes
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
