'use client';

import { useEffect, useState, useCallback } from 'react';

interface User {
  id: string;
  email: string;
  name: string | null;
  plan: string | null;
  assistant_status: string | null;
  created_at: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const limit = 20;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('search', search);
    const res = await fetch(`/api/admin/users?${params}`);
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users);
      setTotal(data.total);
    }
    setLoading(false);
  }, [page, search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const totalPages = Math.ceil(total / limit);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const handleAction = async (userId: string, action: string, payload?: any) => {
    setActionLoading(true);
    try {
      // These would call specific admin action endpoints
      const res = await fetch(`/api/admin/users/${userId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload ?? {}),
      });
      if (res.ok) {
        await fetchUsers();
        setSelectedUser(null);
      } else {
        alert(`Action failed: ${(await res.json()).error ?? 'Unknown error'}`);
      }
    } catch {
      alert('Action failed');
    }
    setActionLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 lg:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">User Management</h1>
          <a href="/admin" className="text-sm text-blue-400 hover:text-blue-300 underline">
            ← Dashboard
          </a>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            placeholder="Search by email or name..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
          <button type="submit" className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm font-medium">
            Search
          </button>
        </form>

        {/* Table */}
        <div className="overflow-x-auto bg-slate-900 border border-slate-800 rounded-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Plan</th>
                <th className="text-left p-3">Assistant</th>
                <th className="text-left p-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-6 text-center text-slate-500">Loading...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-slate-500">No users found</td></tr>
              ) : users.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => setSelectedUser(u)}
                  className="border-b border-slate-800/50 hover:bg-slate-800/30 cursor-pointer"
                >
                  <td className="p-3 font-mono text-xs">{u.email}</td>
                  <td className="p-3">{u.name ?? '—'}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800">
                      {u.plan ?? 'free'}
                    </span>
                  </td>
                  <td className="p-3">
                    {u.assistant_status ? (
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        u.assistant_status === 'running' ? 'bg-green-900/50 text-green-400' :
                        u.assistant_status === 'suspended' ? 'bg-yellow-900/50 text-yellow-400' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {u.assistant_status}
                      </span>
                    ) : (
                      <span className="text-slate-500">none</span>
                    )}
                  </td>
                  <td className="p-3 text-slate-400">{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">{total} users total</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1 bg-slate-800 rounded disabled:opacity-40"
              >
                Prev
              </button>
              <span className="px-3 py-1 text-slate-400">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1 bg-slate-800 rounded disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* User Detail Modal */}
        {selectedUser && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-lg space-y-4">
              <div className="flex justify-between items-start">
                <h2 className="text-xl font-bold">User Details</h2>
                <button onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-white text-lg">✕</button>
              </div>

              <div className="space-y-2 text-sm">
                <div><span className="text-slate-400">Email:</span> <span className="font-mono">{selectedUser.email}</span></div>
                <div><span className="text-slate-400">Name:</span> {selectedUser.name ?? '—'}</div>
                <div><span className="text-slate-400">Plan:</span> {selectedUser.plan ?? 'free'}</div>
                <div><span className="text-slate-400">Assistant:</span> {selectedUser.assistant_status ?? 'none'}</div>
                <div><span className="text-slate-400">Joined:</span> {new Date(selectedUser.created_at).toLocaleString()}</div>
              </div>

              <div className="border-t border-slate-800 pt-4 space-y-2">
                <h3 className="text-sm font-semibold text-slate-400">Actions</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={actionLoading}
                    onClick={() => handleAction(selectedUser.id, 'change-plan', { plan: selectedUser.plan === 'pro' ? 'free' : 'pro' })}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-xs font-medium disabled:opacity-50"
                  >
                    {selectedUser.plan === 'pro' ? 'Downgrade to Free' : 'Upgrade to Pro'}
                  </button>
                  {selectedUser.assistant_status === 'running' && (
                    <button
                      disabled={actionLoading}
                      onClick={() => handleAction(selectedUser.id, 'suspend-assistant')}
                      className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 rounded text-xs font-medium disabled:opacity-50"
                    >
                      Suspend Assistant
                    </button>
                  )}
                  {selectedUser.assistant_status && selectedUser.assistant_status !== 'destroyed' && (
                    <button
                      disabled={actionLoading}
                      onClick={() => {
                        if (confirm('Destroy this assistant? This cannot be undone.')) {
                          handleAction(selectedUser.id, 'destroy-assistant');
                        }
                      }}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-500 rounded text-xs font-medium disabled:opacity-50"
                    >
                      Destroy Assistant
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
