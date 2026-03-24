/// <reference types="vite/client" />
import React, { useState, useEffect } from 'react';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string | null;
  banned: boolean | null;
  createdAt: string;
}

export const AdminUsersTab: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteStatus, setInviteStatus] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  const loadUsers = () => {
    setIsLoading(true);
    fetch('/api/admin/users')
      .then((r) => r.json())
      .then((d) => setUsers(d.users || []))
      .finally(() => setIsLoading(false));
  };

  useEffect(loadUsers, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);
    setInviteStatus('');

    const r = await fetch('/api/admin/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail }),
    });

    if (r.ok) {
      setInviteStatus(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
    } else {
      const body = await r.json().catch(() => ({}));
      setInviteStatus(`Error: ${body.error || 'Failed to send invitation'}`);
    }
    setIsInviting(false);
  };

  const handleBanToggle = async (userId: string, currentlyBanned: boolean | null) => {
    const action = currentlyBanned ? 'unban' : 'ban';
    await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action }),
    });
    loadUsers();
  };

  return (
    <div className="space-y-8">
      {/* Invite form */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="font-semibold text-slate-800 mb-4">Invite User</h3>
        <form onSubmit={handleInvite} className="flex gap-3">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="user@example.com"
            required
            disabled={isInviting}
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-100"
          />
          <button
            type="submit"
            disabled={isInviting || !inviteEmail}
            className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {isInviting ? 'Sending...' : 'Send Invite'}
          </button>
        </form>
        {inviteStatus && (
          <p className={`mt-2 text-sm ${inviteStatus.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
            {inviteStatus}
          </p>
        )}
      </div>

      {/* Users table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <h3 className="font-semibold text-slate-800 p-4 border-b border-slate-100">All Users</h3>
        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Joined</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-medium text-slate-800">{u.name}</td>
                  <td className="px-4 py-3 text-slate-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                      {u.role || 'user'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.banned ? <span className="text-red-600 text-xs font-bold">Banned</span> : <span className="text-green-600 text-xs">Active</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleBanToggle(u.id, u.banned)}
                      className="text-xs text-slate-500 hover:text-red-600 transition-colors"
                    >
                      {u.banned ? 'Unban' : 'Ban'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
