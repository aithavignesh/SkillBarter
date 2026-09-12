import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import {
  Shield,
  Users,
  AlertTriangle,
  Repeat,
  CheckCircle,
  XCircle,
  Clock,
  Search
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>('USERS');
  const [loading, setLoading] = useState<boolean>(true);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [s, u, r, e] = await Promise.all([
        api.getAdminStats(),
        api.getAdminUsers(),
        api.getAdminReports(),
        api.getAdminExchanges(),
      ]);
      setStats(s);
      setUsers(u);
      setReports(r);
      setExchanges(e);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleToggleUser = async (userId: number) => {
    try {
      await api.toggleAdminUserActive(userId);
      await loadAdminData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleResolveReport = async (reportId: number, status: 'RESOLVED' | 'DISMISSED') => {
    try {
      await api.resolveAdminReport(reportId, status, 'Resolved by community moderator');
      await loadAdminData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (!currentUser?.is_admin) {
    return (
      <div className="max-w-md mx-auto py-20 text-center text-xs text-rose-600">
        Access Denied: Administrative privileges required.
      </div>
    );
  }

  const tabs = [
    { id: 'USERS', label: 'User Directory', count: users.length },
    { id: 'REPORTS', label: 'Safety Reports Queue', count: reports.filter(r => r.status === 'PENDING').length },
    { id: 'EXCHANGES', label: 'Exchange Audit Log', count: exchanges.length },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <span className="text-xs font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1">
          <Shield className="w-4 h-4" /> Platform Moderation & Safety
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5">
          Admin Dashboard
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Monitor platform metrics, resolve safety flags, and moderate community users
        </p>
      </div>

      {/* Admin Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-white">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Members</span>
          <p className="text-2xl font-black text-slate-900 font-mono mt-1">{stats?.total_users || 0}</p>
          <span className="text-[10px] text-emerald-600 font-semibold">{stats?.active_users || 0} active</span>
        </Card>

        <Card className="p-4 bg-white">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Exchanges</span>
          <p className="text-2xl font-black text-slate-900 font-mono mt-1">{stats?.total_exchanges || 0}</p>
          <span className="text-[10px] text-emerald-600 font-semibold">{stats?.completed_exchanges || 0} completed</span>
        </Card>

        <Card className="p-4 bg-white">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Pending Reports</span>
          <p className="text-2xl font-black text-rose-600 font-mono mt-1">{stats?.pending_reports || 0}</p>
          <span className="text-[10px] text-slate-400">Needs review</span>
        </Card>

        <Card className="p-4 bg-white">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Avg Trust Score</span>
          <p className="text-2xl font-black text-emerald-600 font-mono mt-1">{stats?.average_trust_score || 94}</p>
          <span className="text-[10px] text-slate-400">Platform-wide</span>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab Content */}
      {loading ? (
        <div className="text-center py-20 text-xs text-slate-400">Loading admin data...</div>
      ) : activeTab === 'USERS' ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                <tr>
                  <th className="px-6 py-3">User</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Trust Score</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3.5 font-bold text-slate-900 flex items-center gap-2">
                      <span>{u.full_name}</span>
                      {u.is_admin && <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold">Admin</span>}
                    </td>
                    <td className="px-6 py-3.5 text-slate-600">{u.email}</td>
                    <td className="px-6 py-3.5 font-mono font-bold text-emerald-700">★ {Math.round(u.trust_score)}</td>
                    <td className="px-6 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${u.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {u.is_active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      {!u.is_admin && (
                        <Button
                          size="sm"
                          variant={u.is_active ? 'outline' : 'primary'}
                          onClick={() => handleToggleUser(u.id)}
                        >
                          {u.is_active ? 'Deactivate' : 'Reactivate'}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : activeTab === 'REPORTS' ? (
        reports.length === 0 ? (
          <Card className="p-12 text-center text-xs text-slate-400">
            No safety reports on record. Neighborhood behavior is healthy!
          </Card>
        ) : (
          <div className="space-y-4">
            {reports.map((r) => (
              <Card key={r.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <Badge variant={r.status === 'PENDING' ? 'rose' : 'emerald'} size="sm">
                      {r.status}
                    </Badge>
                    <span className="font-bold text-slate-900">{r.category}</span>
                    <span className="text-slate-400">• Reported by {r.reporter_name}</span>
                  </div>
                  <p className="text-slate-700 italic">"{r.details}"</p>
                  <p className="text-[10px] text-slate-400">Against user: {r.reported_name}</p>
                </div>

                {r.status === 'PENDING' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => handleResolveReport(r.id, 'DISMISSED')}>
                      Dismiss
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => handleResolveReport(r.id, 'RESOLVED')}>
                      Resolve & Penalize
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                <tr>
                  <th className="px-6 py-3">Exchange ID</th>
                  <th className="px-6 py-3">Requester</th>
                  <th className="px-6 py-3">Receiver</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {exchanges.map((ex) => (
                  <tr key={ex.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3.5 font-mono text-slate-500">#{ex.id}</td>
                    <td className="px-6 py-3.5 font-bold text-slate-900">{ex.requester_name}</td>
                    <td className="px-6 py-3.5 font-bold text-slate-900">{ex.receiver_name}</td>
                    <td className="px-6 py-3.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {ex.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-slate-600 truncate max-w-xs">{ex.proposal_message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
