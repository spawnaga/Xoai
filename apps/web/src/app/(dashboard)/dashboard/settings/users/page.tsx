'use client';

import { useState } from 'react';
import { api } from '@/lib/trpc';

export default function UserManagementPage() {
  const { data: users, refetch } = api.userManagement.list.useQuery();
  const createMutation = api.userManagement.create.useMutation({ onSuccess: () => refetch() });
  const deactivateMutation = api.userManagement.deactivate.useMutation({ onSuccess: () => refetch() });
  const reactivateMutation = api.userManagement.reactivate.useMutation({ onSuccess: () => refetch() });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    username: '',
    password: '',
    firstName: '',
    lastName: '',
    email: '',
    role: 'PHARMACIST' as const,
    pharmacyRole: 'PHARMACIST' as const,
    licenseNumber: '',
    npiNumber: '',
  });

  const handleSubmit = () => {
    createMutation.mutate(form);
    setShowForm(false);
    setForm({
      username: '',
      password: '',
      firstName: '',
      lastName: '',
      email: '',
      role: 'PHARMACIST',
      pharmacyRole: 'PHARMACIST',
      licenseNumber: '',
      npiNumber: '',
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">User Management</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : '+ Add User'}
        </button>
      </div>

      {showForm && (
        <div className="p-6 bg-white rounded-lg shadow space-y-4">
          <h2 className="text-lg font-bold">Create New User</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Username *</label>
              <input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password *</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">First Name *</label>
              <input
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Last Name *</label>
              <input
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Role *</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as any })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="PHARMACIST">Pharmacist</option>
                <option value="PHARMACY_TECH">Pharmacy Technician</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Pharmacy Role</label>
              <select
                value={form.pharmacyRole}
                onChange={(e) => setForm({ ...form, pharmacyRole: e.target.value as any })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="PHARMACIST">Pharmacist</option>
                <option value="STAFF_PHARMACIST">Staff Pharmacist</option>
                <option value="PHARMACY_TECH">Pharmacy Tech</option>
                <option value="TECH_IN_TRAINING">Tech in Training</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">License Number</label>
              <input
                value={form.licenseNumber}
                onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!form.username || !form.password || !form.firstName || !form.lastName}
            className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300"
          >
            Create User
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users?.map((user: any) => (
              <tr key={user.id}>
                <td className="px-6 py-4">{user.username}</td>
                <td className="px-6 py-4">{user.firstName} {user.lastName}</td>
                <td className="px-6 py-4">{user.pharmacyStaff?.role || user.role}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {user.isActive ? (
                    <button
                      onClick={() => deactivateMutation.mutate({ userId: user.id })}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      onClick={() => reactivateMutation.mutate({ userId: user.id })}
                      className="text-green-600 hover:text-green-800 text-sm"
                    >
                      Reactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
