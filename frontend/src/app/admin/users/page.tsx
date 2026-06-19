'use client';

import React, { useEffect, useState } from 'react';
import api from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { 
  Users, 
  Search, 
  Ban, 
  CheckCircle, 
  ShieldAlert, 
  ShieldCheck, 
  Mail, 
  Calendar, 
  UserCheck, 
  AlertCircle,
  Loader2
} from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  role: 'ADMIN' | 'USER';
  status: 'ACTIVE' | 'BANNED';
  createdAt: string;
}

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch users from API
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users');
      setUsers(res.data);
      setFilteredUsers(res.data);
    } catch (err: any) {
      console.error('Failed to load users:', err);
      showNotification('error', err.response?.data?.message || 'Failed to fetch user directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filter users on search query change
  useEffect(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(
        (u) => u.email.toLowerCase().includes(query) || u.id.toLowerCase().includes(query)
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  // Show auto-dismiss notification
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Toggle user status Ban/Unban
  const handleToggleStatus = async (userId: string, currentStatus: 'ACTIVE' | 'BANNED') => {
    if (userId === currentUser?.id) {
      showNotification('error', 'Safety Lock: You cannot ban yourself!');
      return;
    }

    const nextStatus = currentStatus === 'ACTIVE' ? 'BANNED' : 'ACTIVE';
    
    try {
      setActionLoading(`${userId}-status`);
      const res = await api.patch(`/users/${userId}/status`, { status: nextStatus });
      
      // Update local state
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: res.data.status } : u))
      );
      
      showNotification(
        'success', 
        `Successfully ${nextStatus === 'BANNED' ? 'banned' : 'unbanned'} user account.`
      );
    } catch (err: any) {
      console.error('Failed to update status:', err);
      showNotification('error', err.response?.data?.message || 'Failed to update user status.');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle role changes
  const handleRoleChange = async (userId: string, nextRole: 'ADMIN' | 'USER') => {
    if (userId === currentUser?.id) {
      showNotification('error', 'Safety Lock: You cannot change your own admin role!');
      return;
    }

    try {
      setActionLoading(`${userId}-role`);
      const res = await api.patch(`/users/${userId}/role`, { role: nextRole });
      
      // Update local state
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: res.data.role } : u))
      );
      
      showNotification('success', `Successfully updated user role to ${nextRole}.`);
    } catch (err: any) {
      console.error('Failed to update role:', err);
      showNotification('error', err.response?.data?.message || 'Failed to update user role.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl w-full mx-auto relative">
      {/* Notifications */}
      {notification && (
        <div 
          className={`fixed top-6 right-6 z-55 flex items-center space-x-3 px-5 py-4 rounded-xl shadow-xl transition-all duration-300 animate-float border ${
            notification.type === 'success' 
              ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300' 
              : 'bg-red-950/90 border-red-500/30 text-red-300'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400" />
          )}
          <span className="text-xs font-bold uppercase tracking-wider">{notification.message}</span>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5 text-violet-400 mb-1.5">
            <Users className="w-5 h-5" />
            <span className="text-[10px] uppercase font-black tracking-widest bg-violet-500/10 border border-violet-500/20 px-2.5 py-0.5 rounded-full">
              Access Governance
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight">User Directory</h1>
          <p className="text-xs text-neutral-450 mt-1">
            Manage application privileges, configure credentials, or restrict access on standard and administrator roles.
          </p>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Search email or UUID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-900/60 hover:bg-neutral-900 focus:bg-neutral-900 border border-neutral-850 hover:border-neutral-800 focus:border-violet-500/50 outline-none text-xs rounded-xl pl-10 pr-4 py-3 text-white placeholder-neutral-500 transition-all font-medium"
          />
        </div>
      </div>

      {/* Table grid */}
      <div className="glass-panel overflow-hidden rounded-2xl border border-neutral-900">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
            <span className="text-xs text-neutral-500 font-bold uppercase tracking-widest animate-pulse">
              Retrieving platform registry...
            </span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <AlertCircle className="w-12 h-12 text-neutral-600 mb-4" />
            <h3 className="text-sm font-bold text-neutral-300">No registry matches found</h3>
            <p className="text-xs text-neutral-500 max-w-xs mt-1">
              {searchQuery ? 'Adjust your search queries or keywords and check for spelling errors.' : 'No users have been registered on the server.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-900/80 bg-neutral-950/40 text-[10px] uppercase font-black tracking-widest text-neutral-450">
                  <th className="py-4.5 px-6">User profile</th>
                  <th className="py-4.5 px-6">Joined Date</th>
                  <th className="py-4.5 px-6">Privilege Role</th>
                  <th className="py-4.5 px-6">Account Status</th>
                  <th className="py-4.5 px-6 text-right">Console Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900/60">
                {filteredUsers.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  const isBanned = u.status === 'BANNED';
                  const isAdmin = u.role === 'ADMIN';

                  return (
                    <tr 
                      key={u.id} 
                      className={`hover:bg-neutral-900/20 transition-all duration-150 ${
                        isSelf ? 'bg-violet-900/5' : ''
                      }`}
                    >
                      {/* Email Profile */}
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-neutral-200 flex items-center space-x-2">
                            <Mail className="w-3.5 h-3.5 text-neutral-500" />
                            <span>{u.email}</span>
                            {isSelf && (
                              <span className="text-[9px] uppercase font-black tracking-widest px-2 py-0.5 rounded bg-violet-500/10 border border-violet-500/25 text-violet-400 select-none">
                                You
                              </span>
                            )}
                          </span>
                          <span className="text-[10px] text-neutral-500 font-mono mt-1 tracking-tight select-all">
                            {u.id}
                          </span>
                        </div>
                      </td>

                      {/* Created At Date */}
                      <td className="py-4 px-6 text-xs text-neutral-400 font-medium">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-3.5 h-3.5 text-neutral-600" />
                          <span>
                            {new Date(u.createdAt).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      </td>

                      {/* Role Select Dropdown */}
                      <td className="py-4 px-6">
                        {isSelf ? (
                          <div className="inline-flex items-center space-x-1.5 text-violet-400 text-xs font-bold uppercase tracking-wider">
                            <ShieldCheck className="w-4 h-4 text-violet-500" />
                            <span>{u.role}</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            {isAdmin ? (
                              <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
                            ) : (
                              <UserCheck className="w-3.5 h-3.5 text-neutral-500" />
                            )}
                            <select
                              value={u.role}
                              disabled={actionLoading === `${u.id}-role`}
                              onChange={(e) => handleRoleChange(u.id, e.target.value as 'ADMIN' | 'USER')}
                              className="bg-neutral-900 border border-neutral-850 hover:border-neutral-750 text-xs font-extrabold rounded-lg px-2.5 py-1.5 focus:border-violet-500 outline-none text-neutral-350 cursor-pointer disabled:opacity-50 transition-colors"
                            >
                              <option value="USER">USER</option>
                              <option value="ADMIN">ADMIN</option>
                            </select>
                          </div>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-4 px-6">
                        <span 
                          className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                            isBanned
                              ? 'bg-red-500/5 border-red-500/20 text-red-400'
                              : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isBanned ? 'bg-red-400' : 'bg-emerald-400'}`} />
                          <span>{u.status}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => handleToggleStatus(u.id, u.status)}
                          disabled={isSelf || actionLoading === `${u.id}-status`}
                          className={`inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 border select-none disabled:opacity-40 disabled:cursor-not-allowed ${
                            isSelf
                              ? 'bg-neutral-900/30 border-neutral-900 text-neutral-600'
                              : isBanned
                              ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-neutral-950 hover:border-emerald-500 cursor-pointer'
                              : 'bg-red-500/5 border-red-500/10 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 cursor-pointer'
                          }`}
                        >
                          {actionLoading === `${u.id}-status` ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : isBanned ? (
                            <CheckCircle className="w-3.5 h-3.5" />
                          ) : (
                            <Ban className="w-3.5 h-3.5" />
                          )}
                          <span>{isBanned ? 'Unban Account' : 'Ban Account'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
