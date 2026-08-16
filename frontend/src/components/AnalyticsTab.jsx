import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, UserX, Wallet, Flame } from 'lucide-react';
import { usePolling } from '../hooks/usePolling';
import { api } from '../lib/api';
import { fmtCurrency } from '../lib/format';

const RANGE_OPTIONS = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
];

function MetricCard({ icon: Icon, label, value, tone = 'text-clinic-teal' }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`mb-3 inline-flex rounded-xl bg-slate-50 p-2.5 ${tone}`}>
        <Icon size={18} />
      </div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-clinic-ink">{value}</p>
    </div>
  );
}

export default function AnalyticsTab({ clinic }) {
  const [rangeDays, setRangeDays] = useState(30);

  const from = new Date(Date.now() - (rangeDays - 1) * 24 * 60 * 60 * 1000).toISOString();
  const to = new Date().toISOString();

  const { data: analytics, loading } = usePolling(() => api.getClinicAnalytics(clinic.id, { from, to }), {
    intervalMs: 60000,
    deps: [clinic.id, rangeDays],
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-clinic-ink">Analytics & reports</h2>
          <p className="text-sm text-slate-500">{clinic.name}</p>
        </div>
        <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.days}
              onClick={() => setRangeDays(opt.days)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                rangeDays === opt.days ? 'bg-clinic-teal text-white' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading && !analytics && (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400">
          Loading analytics…
        </div>
      )}

      {analytics && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard icon={TrendingUp} label="Attendance rate" value={`${analytics.attendanceRate}%`} tone="text-emerald-600" />
            <MetricCard icon={TrendingDown} label="Cancellation rate" value={`${analytics.cancellationRate}%`} tone="text-rose-600" />
            <MetricCard icon={UserX} label="No-show rate" value={`${analytics.noShowRate}%`} tone="text-slate-500" />
            <MetricCard
              icon={Wallet}
              label="Estimated revenue"
              value={fmtCurrency(analytics.revenue.total, analytics.revenue.currency)}
              tone="text-clinic-coral"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
              <h3 className="mb-4 text-sm font-semibold text-clinic-ink">Daily bookings</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.dailySummary}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F4" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      tickFormatter={(d) => d.slice(5)}
                      minTickGap={20}
                    />
                    <YAxis tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }}
                      labelFormatter={(d) => `Date: ${d}`}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="total" name="Booked" stroke="#0F4C5C" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="completed" name="Completed" stroke="#16A34A" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="cancelled" name="Cancelled" stroke="#FF6B4A" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Flame size={16} className="text-clinic-coral" />
                <h3 className="text-sm font-semibold text-clinic-ink">Peak booking hours</h3>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.peakHours} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F4" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                    <YAxis type="category" dataKey="label" width={70} tick={{ fontSize: 11, fill: '#64748B' }} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }} />
                    <Bar dataKey="count" name="Bookings" fill="#0F4C5C" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="text-sm font-semibold text-clinic-ink">Weekly summary</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-3 font-medium">Week</th>
                    <th className="px-5 py-3 font-medium">Total</th>
                    <th className="px-5 py-3 font-medium">Completed</th>
                    <th className="px-5 py-3 font-medium">Cancelled</th>
                    <th className="px-5 py-3 font-medium">No-show</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analytics.weeklySummary.map((w) => (
                    <tr key={w.week}>
                      <td className="px-5 py-3 font-medium text-clinic-ink">{w.week}</td>
                      <td className="px-5 py-3 text-slate-600">{w.total}</td>
                      <td className="px-5 py-3 text-emerald-600">{w.completed}</td>
                      <td className="px-5 py-3 text-rose-600">{w.cancelled}</td>
                      <td className="px-5 py-3 text-slate-500">{w.noShow}</td>
                    </tr>
                  ))}
                  {analytics.weeklySummary.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                        No data for this range yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
