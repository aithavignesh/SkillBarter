import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { Modal } from '../components/ui/Modal';
import { Shield, Users, AlertTriangle, Repeat, CheckCircle, XCircle, Clock } from 'lucide-react';

type ModerationAction =
  | { type: 'user'; userId: number; isActive: boolean; userName: string }
  | { type: 'report'; reportId: number; status: 'RESOLVED' | 'DISMISSED'; category: string };

export const AdminDashboardPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>('USERS');
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState('');
  const [pendingAction, setPendingAction] = useState<ModerationAction | null>(null);
  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      setLoadError('');
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
      setLoadError(err instanceof Error ? err.message : 'Unable to load moderation data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleToggleUser = (userId: number) => {
    const target = users.find((user) => Number(user.id) === Number(userId));
    if (!target) return;
    setActionError('');
    setPendingAction({ type: 'user', userId, isActive: Boolean(target.is_active), userName: target.full_name || 'this learner' });
  };

  const handleResolveReport = (reportId: number, status: 'RESOLVED' | 'DISMISSED', category: string) => {
    setActionError('');
    setPendingAction({ type: 'report', reportId, status, category });
  };

  const confirmModerationAction = async () => {
    if (!pendingAction || actionLoading) return;
    try {
      setActionLoading(true);
      setActionError('');
      if (pendingAction.type === 'user') {
        await api.toggleAdminUserActive(pendingAction.userId);
      } else {
        await api.resolveAdminReport(
          pendingAction.reportId,
          pendingAction.status,
          pendingAction.status === 'RESOLVED' ? 'Resolved by community moderator' : 'Dismissed by community moderator',
        );
      }
      await loadAdminData();
      setPendingAction(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to complete this moderation action.');
    } finally {
      setActionLoading(false);
    }
  };

  if (!currentUser?.is_admin) {
    return (
      <div className="mx-auto max-w-md py-20 text-center text-xs text-rose-600">
        Access Denied: Administrative privileges required.
      </div>
    );
  }

  const tabs = [
    { id: 'USERS', label: 'User Directory', count: users.length },
    { id: 'REPORTS', label: 'Safety Reports Queue', count: reports.filter(r => r.status === 'PENDING').length },
    { id: 'EXCHANGES', label: 'Exchange Audit Log', count: exchanges.length },
  ];

  const activeRate = stats?.total_users ? Math.round((stats.active_users / stats.total_users) * 100) : 0;
  const completionRate = stats?.total_exchanges ? Math.round((stats.completed_exchanges / stats.total_exchanges) * 100) : 0;
  const trustScore = Math.max(0, Math.min(100, Number(stats?.average_trust_score ?? 0)));

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700">
          <Shield className="h-4 w-4" /> Platform moderation & safety
        </span>
        <div className="mt-2 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">Admin Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">Track student activation, learning exchanges, trust signals, and safety so we can see where the learning journey needs improvement.</p>
          </div>
          <span className="w-fit rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 shadow-sm">
            Live platform view
          </span>
        </div>
      </div>

      {loadError && (
        <div className="flex flex-col gap-3 border border-[#f1c8ca] bg-[#fff7f7] px-4 py-3 sm:flex-row sm:items-center sm:justify-between" role="alert">
          <p className="break-words text-xs leading-5 text-[#8f1a20]">Moderation data couldn’t be loaded. {loadError}</p>
          <Button size="sm" variant="outline" onClick={() => void loadAdminData()} loading={loading}>Try again</Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: 'Learners', value: stats?.total_users || 0, sub: `${stats?.active_users || 0} active`, icon: Users, tone: 'emerald' },
          { label: 'Learning exchanges', value: stats?.total_exchanges || 0, sub: `${stats?.completed_exchanges || 0} completed`, icon: Repeat, tone: 'slate' },
          { label: 'Safety reports', value: stats?.pending_reports || 0, sub: 'Needs review', icon: AlertTriangle, tone: 'rose' },
          { label: 'Avg trust score', value: stats?.average_trust_score ?? 0, sub: 'Platform-wide', icon: Shield, tone: 'emerald' },
        ].map(({ label, value, sub, icon: Icon, tone }) => (
          <Card key={label} className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</span>
              <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${tone === 'rose' ? 'bg-rose-50 text-rose-600' : tone === 'emerald' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                <Icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-4 text-3xl font-black tracking-tight text-slate-950">{value}</p>
            <p className={`mt-1 text-[10px] font-semibold ${tone === 'rose' ? 'text-rose-600' : 'text-slate-400'}`}>{sub}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">Platform chart</p>
              <h2 className="mt-1 text-lg font-black text-slate-950">Student activation overview</h2>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-500">Current platform signals</div>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Active learners</span>
                <span className="text-sm font-black text-emerald-700">{activeRate}%</span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${activeRate}%` }} />
              </div>
              <p className="mt-2 text-[10px] text-slate-400">{stats?.active_users || 0} of {stats?.total_users || 0} learners currently active</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Learning completion</span>
                <span className="text-sm font-black text-slate-800">{completionRate}%</span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-slate-900 transition-all" style={{ width: `${completionRate}%` }} />
              </div>
              <p className="mt-2 text-[10px] text-slate-400">{stats?.completed_exchanges || 0} of {stats?.total_exchanges || 0} learning exchanges completed</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-950 p-4 text-white">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <p className="mt-3 text-2xl font-black">{stats?.completed_exchanges || 0}</p>
              <p className="mt-1 text-[10px] text-slate-400">Completed</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <Clock className="h-4 w-4 text-slate-500" />
              <p className="mt-3 text-2xl font-black text-slate-950">{stats?.total_exchanges - (stats?.completed_exchanges || 0) || 0}</p>
              <p className="mt-1 text-[10px] text-slate-400">In progress</p>
            </div>
            <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4">
              <XCircle className="h-4 w-4 text-rose-500" />
              <p className="mt-3 text-2xl font-black text-rose-700">{stats?.pending_reports || 0}</p>
              <p className="mt-1 text-[10px] text-rose-500">Reports pending</p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Trust signal</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">Learner trust</h2>
          <div className="mt-7 flex items-center justify-center">
            <div className="relative flex h-40 w-40 items-center justify-center rounded-full" style={{ background: `conic-gradient(#10b981 0 ${trustScore}%, #e2e8f0 ${trustScore}% 100%)` }}>
              <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full bg-white shadow-inner">
                <span className="text-4xl font-black text-slate-950">{stats?.average_trust_score ?? 0}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">score</span>
              </div>
            </div>
          </div>
          <div className="mt-6 rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-600">Pending safety reports</span>
              <span className="font-black text-rose-600">{stats?.pending_reports || 0}</span>
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-rose-500" style={{ width: `${Math.min((stats?.pending_reports ?? 0) * 10, 100)}%` }} />
            </div>
          </div>
        </Card>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400">Loading admin data...</div>
      ) : activeTab === 'USERS' ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <tr><th className="px-6 py-3">User</th><th className="px-6 py-3">Email</th><th className="px-6 py-3">Trust Score</th><th className="px-6 py-3">Status</th><th className="px-6 py-3 text-right">Action</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="transition-colors hover:bg-slate-50/80">
                    <td className="flex items-center gap-2 px-6 py-3.5 font-bold text-slate-900"><span>{u.full_name}</span>{u.is_admin && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">Admin</span>}</td>
                    <td className="px-6 py-3.5 text-slate-600">{u.email}</td>
                    <td className="px-6 py-3.5 font-mono font-bold text-emerald-700">★ {Math.round(u.trust_score)}</td>
                    <td className="px-6 py-3.5"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${u.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{u.is_active ? 'Active' : 'Deactivated'}</span></td>
                    <td className="px-6 py-3.5 text-right">{!u.is_admin && <Button size="sm" variant={u.is_active ? 'outline' : 'primary'} onClick={() => handleToggleUser(u.id)}>{u.is_active ? 'Deactivate' : 'Reactivate'}</Button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : activeTab === 'REPORTS' ? (
        reports.length === 0 ? (
          <Card className="p-12 text-center text-xs text-slate-400">No safety reports on record. Keep reviewing reports as the student community grows.</Card>
        ) : (
          <div className="space-y-4">
            {reports.map((r) => (
              <Card key={r.id} className="flex min-w-0 flex-col justify-between gap-4 p-5 md:flex-row md:items-center">
              <div className="min-w-0 space-y-1 text-xs"><div className="flex flex-wrap items-center gap-2"><Badge variant={r.status === 'PENDING' ? 'rose' : 'emerald'} size="sm">{r.status}</Badge><span className="break-words font-bold text-slate-900">{r.category}</span><span className="break-words text-slate-400">• Reported by {r.reporter_name}</span></div><p className="break-words text-slate-700 italic">"{r.details}"</p><p className="break-words text-[10px] text-slate-400">Against user: {r.reported_name}{r.reported_exchange_id ? ` • Exchange #${r.reported_exchange_id}` : ""}</p></div>
              {r.status === 'PENDING' && <div className="flex shrink-0 flex-wrap items-center gap-2"><Button size="sm" variant="outline" onClick={() => handleResolveReport(r.id, 'DISMISSED', r.category)}>Dismiss</Button><Button size="sm" variant="danger" onClick={() => handleResolveReport(r.id, 'RESOLVED', r.category)}>Resolve & Penalize</Button></div>}
              </Card>
            ))}
          </div>
        )
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500"><tr><th className="px-6 py-3">Exchange ID</th><th className="px-6 py-3">Requester</th><th className="px-6 py-3">Receiver</th><th className="px-6 py-3">Status</th><th className="px-6 py-3">Message</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {exchanges.map((ex) => <tr key={ex.id} className="transition-colors hover:bg-slate-50/80"><td className="px-6 py-3.5 font-mono text-slate-500">#{ex.id}</td><td className="px-6 py-3.5 font-bold text-slate-900">{ex.requester_name}</td><td className="px-6 py-3.5 font-bold text-slate-900">{ex.receiver_name}</td><td className="px-6 py-3.5"><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">{ex.status}</span></td><td className="max-w-xs truncate px-6 py-3.5 text-slate-600">{ex.proposal_message}</td></tr>)}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <Modal
        isOpen={Boolean(pendingAction)}
        onClose={() => { if (!actionLoading) { setPendingAction(null); setActionError(''); } }}
        title={pendingAction?.type === 'user'
          ? `${pendingAction.isActive ? 'Deactivate' : 'Reactivate'} learner account?`
          : pendingAction?.status === 'RESOLVED' ? 'Resolve this safety report?' : 'Dismiss this safety report?'}
        subtitle={pendingAction?.type === 'user'
          ? `${pendingAction.userName}'s account status will be updated.`
          : pendingAction ? `${pendingAction.category} report. This action will be recorded for the moderation team.` : undefined}
        maxWidth="sm"
        closeDisabled={actionLoading}
      >
        {pendingAction && (
          <div className="space-y-4">
            <div className={`border p-3 ${pendingAction.type === 'report' && pendingAction.status === 'RESOLVED' || pendingAction.type === 'user' && pendingAction.isActive ? 'border-[#ead0d1] bg-[#fff8f8]' : 'border-[#e1e4e8] bg-[#f7f8f7]'}`}>
              <p className="text-xs font-semibold text-[#17233b]">
                {pendingAction.type === 'report' && pendingAction.status === 'RESOLVED'
                  ? 'Resolve and penalize'
                  : pendingAction.type === 'report'
                    ? 'Dismiss report'
                    : pendingAction.isActive ? 'Deactivate account' : 'Reactivate account'}
              </p>
              <p className="mt-1 break-words text-xs leading-5 text-[#4d5b72]">
                {pendingAction.type === 'report'
                  ? pendingAction.status === 'RESOLVED'
                    ? 'The report will be marked resolved and the reported account will be penalized.'
                    : 'The report will be marked dismissed. No penalty will be applied.'
                  : pendingAction.isActive
                    ? 'The learner account will be deactivated and will no longer be active on the platform.'
                    : 'The learner account will be reactivated.'}
              </p>
            </div>
            {actionError && <p role="alert" className="break-words border border-red-200 bg-red-50 p-3 text-xs text-red-800">{actionError}</p>}
            <div className="flex flex-col-reverse gap-2 border-t border-[#e1e4e8] pt-4 sm:flex-row sm:justify-end">
              <Button type="button" size="sm" className="w-full sm:w-auto" variant="outline" onClick={() => setPendingAction(null)} disabled={actionLoading}>Cancel</Button>
              <Button
                type="button"
                size="sm"
                className="w-full sm:w-auto"
                variant={pendingAction.type === 'report' && pendingAction.status === 'RESOLVED' || pendingAction.type === 'user' && pendingAction.isActive ? 'danger' : 'primary'}
                onClick={() => void confirmModerationAction()}
                loading={actionLoading}
              >
                {pendingAction.type === 'report'
                  ? pendingAction.status === 'RESOLVED' ? 'Resolve & Penalize' : 'Dismiss report'
                  : pendingAction.isActive ? 'Deactivate account' : 'Reactivate account'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
