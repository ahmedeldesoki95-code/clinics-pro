import { useMemo, useState } from 'react';
import { CalendarCheck2, TrendingUp, Wallet, QrCode, RefreshCcw } from 'lucide-react';
import { usePolling } from '../hooks/usePolling';
import { api } from '../lib/api';
import StatusBadge from './StatusBadge';
import QrCodeModal from './QrCodeModal';
import { fmtCurrency } from '../lib/format';

function StatCard({ icon: Icon, label, value, sub, accent = 'text-clinic-teal' }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-clinic-ink">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
        </div>
        <div className={`rounded-xl bg-slate-50 p-2.5 ${accent}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

export default function DashboardOverview({ clinic, onClinicRefresh }) {
  const [qrModalOpen, setQrModalOpen] = useState(false);

  const today = useMemo(() => new Date(), []);
  const todayStr = today.toISOString().slice(0, 10);

  const { data: appointments, refresh: refreshAppointments } = usePolling(
    () => api.listAppointments({ clinicId: clinic.id, from: `${todayStr}T00:00:00`, to: `${todayStr}T23:59:59` }),
    { intervalMs: 15000, deps: [clinic.id] }
  );

  const { data: analytics, refresh: refreshAnalytics } = usePolling(
    () => api.getClinicAnalytics(clinic.id),
    { intervalMs: 30000, deps: [clinic.id] }
  );

  const { data: statusRes } = usePolling(() => api.getClinicStatus(clinic.id), {
    intervalMs: 5000,
    deps: [clinic.id],
  });

  const connectionStatus = statusRes?.status || clinic.sessionStatus;
  const todaysCount = appointments?.length ?? 0;
  const monthRevenue = analytics ? fmtCurrency(analytics.revenue.total, analytics.revenue.currency) : '—';
  const attendanceRate = analytics ? `${analytics.attendanceRate}%` : '—';

  function handleRefreshAll() {
    refreshAppointments();
    refreshAnalytics();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-clinic-ink">Overview</h2>
          <p className="text-sm text-slate-500">{clinic.name} · Today, {today.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}</p>
        </div>
        <button
          onClick={handleRefreshAll}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <RefreshCcw size={15} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={CalendarCheck2} label="Today's appointments" value={todaysCount} sub="Booked for today" />
        <StatCard
          icon={TrendingUp}
          label="Attendance rate"
          value={attendanceRate}
          sub={analytics ? `Cancellation ${analytics.cancellationRate}% · No-show ${analytics.noShowRate}%` : undefined}
        />
        <StatCard icon={Wallet} label="Est. revenue (30d)" value={monthRevenue} sub={analytics ? `${analytics.revenue.completedCount} completed visits` : undefined} accent="text-clinic-coral" />

        <button
          onClick={() => setQrModalOpen(true)}
          className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-clinic-teal/40"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">WhatsApp status</p>
              <div className="mt-2">
                <StatusBadge status={connectionStatus} />
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 p-2.5 text-clinic-teal">
              <QrCode size={20} />
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            {connectionStatus === 'CONNECTED' ? 'Tap to manage connection' : 'Tap to scan QR & link'}
          </p>
        </button>
      </div>

      {appointments && appointments.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="text-sm font-semibold text-clinic-ink">Today's schedule</h3>
          </div>
          <ul className="divide-y divide-slate-100">
            {appointments.slice(0, 6).map((appt) => (
              <li key={appt.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-clinic-ink">{appt.patientName}</p>
                  <p className="text-xs text-slate-400">{appt.patientPhone}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-500">
                    {new Date(appt.appointmentTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <StatusBadge status={appt.status} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {qrModalOpen && (
        <QrCodeModal
          clinic={clinic}
          onClose={() => setQrModalOpen(false)}
          onConnected={() => onClinicRefresh?.()}
        />
      )}
    </div>
  );
}
