import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, EyeOff, Flag, Loader2, RotateCcw, Shield, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { API_BASE, ENDPOINTS } from '../api/client';
import { MyUserContext } from '../context/MyUserProvider';
import { auth } from '../firebase/firebaseApp';

const STATUS_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'reviewed', label: 'Reviewed' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'dismissed', label: 'Dismissed' },
];

const STATUS_STYLES = {
  open: 'border-red-400/30 bg-red-400/10 text-red-200',
  reviewed: 'border-blue-400/30 bg-blue-400/10 text-blue-200',
  resolved: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  dismissed: 'border-gray-400/20 bg-white/5 text-gray-300',
};

const CONTENT_ACTION_LABELS = {
  hidden: 'Content hidden',
  restored: 'Content restored',
  target_missing: 'Target missing',
};

const ADMIN_EMAIL = 'ludusgen@gmail.com';

function isLudusgenAdmin(user) {
  return typeof user?.email === 'string' && user.email.trim().toLowerCase() === ADMIN_EMAIL;
}

function formatReportDate(value) {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function sourceLabel(type) {
  if (type === 'forum_post') return 'Forum post';
  if (type === 'forum_comment') return 'Forum comment';
  if (type === 'marketplace_asset') return 'Marketplace';
  return 'Report';
}

function StatTile({ label, value, tone = 'text-white' }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-gray-500">{label}</p>
      <p className={`mt-2 text-2xl font-black ${tone}`}>{value}</p>
    </div>
  );
}

export default function LudusGenAdmin() {
  const { user, authLoading } = useContext(MyUserContext);
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState('');
  const [moderatingId, setModeratingId] = useState('');
  const [error, setError] = useState('');
  const canAccess = isLudusgenAdmin(user);

  const loadReports = useCallback(async () => {
    if (!canAccess) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${API_BASE}${ENDPOINTS.ADMIN_REPORTS}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load reports');
      setReports(data.reports || []);
    } catch (err) {
      setError(err.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [canAccess]);

  useEffect(() => {
    if (!authLoading) loadReports();
  }, [authLoading, loadReports]);

  const filteredReports = useMemo(() => {
    if (statusFilter === 'all') return reports;
    return reports.filter((report) => report.status === statusFilter);
  }, [reports, statusFilter]);

  const stats = useMemo(() => ({
    total: reports.length,
    open: reports.filter((report) => report.status === 'open').length,
    reviewed: reports.filter((report) => report.status === 'reviewed').length,
    resolved: reports.filter((report) => report.status === 'resolved').length,
  }), [reports]);

  const updateStatus = async (reportId, status) => {
    setUpdatingId(reportId);
    try {
      const token = await auth.currentUser?.getIdToken(true);
      const res = await fetch(`${API_BASE}${ENDPOINTS.ADMIN_REPORT(reportId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to update report');
      setReports((prev) => prev.map((report) => (report.id === reportId ? data.report : report)));
      toast.success('Report status updated');
    } catch (err) {
      toast.error(err.message || 'Failed to update report');
    } finally {
      setUpdatingId('');
    }
  };

  const performContentAction = async (report, action) => {
    if (!report?.id || moderatingId) return;
    const actionLabel = action === 'hide_content' ? 'hide this content' : 'restore this content';
    if (!window.confirm(`Are you sure you want to ${actionLabel}?`)) return;

    setModeratingId(report.id);
    try {
      const token = await auth.currentUser?.getIdToken(true);
      const res = await fetch(`${API_BASE}${ENDPOINTS.ADMIN_REPORT_ACTION(report.id)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to update content');
      setReports((prev) => prev.map((item) => (item.id === report.id ? data.report : item)));
      toast.success(action === 'hide_content' ? 'Content hidden' : 'Content restored');
    } catch (err) {
      toast.error(err.message || 'Failed to update content');
    } finally {
      setModeratingId('');
    }
  };

  const openReportTarget = (report) => {
    if (report.sourceType === 'marketplace_asset' && report.targetId) {
      navigate('/marketplace', {
        state: { openMarketplaceAssetId: report.targetId },
      });
      return;
    }
    if (report.targetPath) navigate(report.targetPath);
  };

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#05030a] text-white">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </main>
    );
  }

  if (!canAccess) {
    return (
      <main className="min-h-screen bg-[#05030a] px-6 py-32 text-white">
        <div className="mx-auto max-w-2xl rounded-3xl border border-red-400/20 bg-red-400/10 p-8">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-red-400/20 bg-red-400/10 text-red-200">
            <Shield className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-black tracking-tight">Admin access required</h1>
          <p className="mt-3 text-sm font-bold leading-relaxed text-red-100/70">
            The /admin report view is only available for the LudusGen admin account.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#05030a] px-4 pb-20 pt-28 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-5 rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-primary">
              <Flag className="h-3.5 w-3.5" />
              Reports
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Admin reports</h1>
            <p className="mt-2 max-w-2xl text-sm font-bold leading-relaxed text-gray-400">
              Marketplace and forum reports arrive here for moderation review.
            </p>
          </div>
          <button
            type="button"
            onClick={loadReports}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-5 text-xs font-black uppercase tracking-[0.18em] text-gray-300 transition hover:border-primary/40 hover:text-white"
          >
            Refresh
          </button>
        </header>

        <section className="grid gap-3 sm:grid-cols-4">
          <StatTile label="Total" value={stats.total} />
          <StatTile label="Open" value={stats.open} tone="text-red-200" />
          <StatTile label="Reviewed" value={stats.reviewed} tone="text-blue-200" />
          <StatTile label="Resolved" value={stats.resolved} tone="text-emerald-200" />
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-4 flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setStatusFilter(option.id)}
                className={`rounded-2xl px-4 py-2 text-xs font-black uppercase tracking-[0.18em] transition ${
                  statusFilter === option.id
                    ? 'bg-primary text-white'
                    : 'border border-white/10 bg-white/[0.03] text-gray-500 hover:text-white'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex min-h-80 items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="flex min-h-80 flex-col items-center justify-center gap-3 text-center">
              <AlertTriangle className="h-9 w-9 text-red-300" />
              <p className="text-sm font-bold text-red-100">{error}</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="flex min-h-80 flex-col items-center justify-center gap-3 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-300" />
              <p className="text-sm font-bold text-gray-400">No reports in this view.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReports.map((report) => (
                <article key={report.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-gray-300">
                          {sourceLabel(report.sourceType)}
                        </span>
                        <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${STATUS_STYLES[report.status] || STATUS_STYLES.open}`}>
                          {report.status || 'open'}
                        </span>
                        <span className="text-xs font-bold text-gray-600">{formatReportDate(report.createdAt)}</span>
                      </div>

                      <h2 className="truncate text-lg font-black text-white">{report.targetTitle || report.targetId}</h2>
                      <p className="mt-2 text-sm font-bold text-red-100/80">{report.reason}</p>
                      {report.details && <p className="mt-2 text-sm leading-relaxed text-gray-400">{report.details}</p>}
                      {report.contentAction && (
                        <p className="mt-3 inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">
                          {CONTENT_ACTION_LABELS[report.contentAction] || report.contentAction}
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-gray-500">
                        <span>Reporter: {report.reporterEmail || report.reporterId || 'unknown'}</span>
                        {report.targetOwnerId && <span>Owner: {report.targetOwnerId}</span>}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2 lg:w-72 lg:justify-end">
                      {(report.targetPath || (report.sourceType === 'marketplace_asset' && report.targetId)) && (
                        <button
                          type="button"
                          onClick={() => openReportTarget(report)}
                          className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs font-black text-gray-300 transition hover:text-white"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Open
                        </button>
                      )}
                      {report.contentAction === 'hidden' ? (
                        <button
                          type="button"
                          disabled={moderatingId === report.id}
                          onClick={() => performContentAction(report, 'restore_content')}
                          className="inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-200 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          {moderatingId === report.id ? '...' : 'Restore Content'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={moderatingId === report.id || report.contentAction === 'target_missing'}
                          onClick={() => performContentAction(report, 'hide_content')}
                          className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-400/20 bg-red-400/10 px-3 text-[10px] font-black uppercase tracking-[0.14em] text-red-200 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <EyeOff className="h-3.5 w-3.5" />
                          {moderatingId === report.id ? '...' : 'Hide Content'}
                        </button>
                      )}
                      {['reviewed', 'resolved', 'dismissed'].map((status) => (
                        <button
                          key={status}
                          type="button"
                          disabled={updatingId === report.id || report.status === status}
                          onClick={() => updateStatus(report.id, status)}
                          className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-[10px] font-black uppercase tracking-[0.14em] text-gray-400 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {updatingId === report.id ? '...' : status}
                        </button>
                      ))}
                      {report.status !== 'open' && (
                        <button
                          type="button"
                          disabled={updatingId === report.id}
                          onClick={() => updateStatus(report.id, 'open')}
                          className="h-10 rounded-xl border border-red-400/20 bg-red-400/10 px-3 text-[10px] font-black uppercase tracking-[0.14em] text-red-200 transition hover:text-white disabled:opacity-40"
                        >
                          <XCircle className="mr-1 inline h-3.5 w-3.5" />
                          Reopen
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
