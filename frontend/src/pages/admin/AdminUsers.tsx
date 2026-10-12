import React, { useState, useEffect } from 'react';
import { Users, Shield, Edit2, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { api } from '../../lib/api';
import { StatusBadge } from '../../components/common/StatusBadge';

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [newRole, setNewRole] = useState('patient');
  const [newStatus, setNewStatus] = useState('active');
  const [newVerification, setNewVerification] = useState('verified');
  const [updating, setUpdating] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await api.getAdminUsers();
      if (data?.users) setUsers(data.users);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenEdit = (user: any) => {
    setSelectedUser(user);
    setNewRole(user.role || 'patient');
    setNewStatus(user.accountStatus || 'active');
    setNewVerification(user.doctorProfile?.verificationStatus || 'verified');
    setError(null);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setUpdating(true);
    setError(null);

    try {
      await api.updateUserRole(selectedUser.uid, {
        role: newRole,
        accountStatus: newStatus,
        verificationStatus: newRole === 'doctor' ? newVerification : undefined,
      });

      setSuccess(`User "${selectedUser.fullName || selectedUser.email}" updated to ${newRole.toUpperCase()}.`);
      setSelectedUser(null);
      await fetchUsers();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to update user.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-navy-900">User & Role Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Govern registered identities, clinical credential verification, and account statuses.
          </p>
        </div>

        <div className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
          Registered Accounts: <span className="font-bold text-slate-900">{users.length}</span>
        </div>
      </div>

      {success && (
        <div className="bg-teal-50 border border-teal-200 text-teal-800 p-4 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
          {success}
        </div>
      )}

      {/* Users Table */}
      <div className="clinical-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase">User Name & Email</th>
                <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase">Current Role</th>
                <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase">Account Status</th>
                <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase">Professional Info</th>
                <th className="px-4 py-3 text-right font-bold text-slate-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">Loading platform users...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">No registered users located.</td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.uid} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-navy-900">{u.fullName || 'User'}</div>
                      <div className="text-slate-400 text-[11px]">{u.email}</div>
                      <div className="font-mono text-[10px] text-slate-300">UID: {u.uid.slice(0, 10)}...</div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={u.role || 'patient'} type="role" />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={u.accountStatus || 'active'} />
                    </td>
                    <td className="px-4 py-3">
                      {u.doctorProfile ? (
                        <div>
                          <span className="font-bold text-slate-700 block">{u.doctorProfile.specialization}</span>
                          <span className="text-[10px] text-slate-400">{u.doctorProfile.hospitalAffiliation || 'Hospital'}</span>
                          <div className="mt-1">
                            <StatusBadge status={u.doctorProfile.verificationStatus || 'verified'} type="verification" />
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Standard Patient Account</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Modify
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modify Role Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h2 className="text-lg font-bold text-navy-900">Modify Role & Governance</h2>
              <button onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Critical Security Warning */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 mb-4 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Administrative Privilege Escalation Notice:</span> Role transitions alter data isolation boundaries. Granting doctor or administrator roles must be strictly verified.
              </div>
            </div>

            {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-xs mb-4">{error}</div>}

            <form onSubmit={handleSaveRole} className="space-y-4">
              <div>
                <span className="text-xs text-slate-500 font-semibold block">Target Account:</span>
                <span className="text-sm font-bold text-navy-900">{selectedUser.fullName} ({selectedUser.email})</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Assign Platform Role
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="patient">Patient (Standard Patient Portal)</option>
                  <option value="doctor">Doctor / Healthcare Professional</option>
                  <option value="admin">Platform Administrator</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Account Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="active">Active (Full operational access)</option>
                  <option value="suspended">Suspended (Access restricted)</option>
                </select>
              </div>

              {newRole === 'doctor' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Doctor Credential Verification Status
                  </label>
                  <select
                    value={newVerification}
                    onChange={(e) => setNewVerification(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="verified">Verified (Approved for patient consent)</option>
                    <option value="unverified">Unverified (Pending credentials)</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  {updating ? 'Updating...' : 'Save Role Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
