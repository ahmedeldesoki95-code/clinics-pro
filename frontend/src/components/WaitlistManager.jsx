import { useState } from 'react';
import { UserPlus, Trash2, Clock, ListChecks } from 'lucide-react';
import { usePolling } from '../hooks/usePolling';
import { api } from '../lib/api';
import StatusBadge from './StatusBadge';
import { fmtDate, fmtDateTime } from '../lib/format';

const STATUS_FILTERS = ['ALL', 'WAITING', 'NOTIFIED', 'CLAIMED', 'EXPIRED', 'CANCELLED'];

export default function WaitlistManager({ clinic }) {
  const [filter, setFilter] = useState('ALL');
  const [form, setForm] = useState({ patientName: '', patientPhone: '', desiredDate: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const { data: entries, refresh } = usePolling(
    () => api.listWaitlist(clinic.id, filter === 'ALL' ? undefined : filter),
    { intervalMs: 8000, deps: [clinic.id, filter] }
  );

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);

    if (!form.patientName.trim() || !form.patientPhone.trim() || !form.desiredDate) {
      setFormError('Please fill in patient name, phone, and desired date.');
      return;
    }

    setSubmitting(true);
    try {
      await api.addToWaitlist({
        clinicId: clinic.id,
        patientName: form.patientName.trim(),
        patientPhone: form.patientPhone.trim(),
        desiredDate: new Date(form.desiredDate).toISOString(),
      });
      setForm({ patientName: '', patientPhone: '', desiredDate: '' });
      refresh();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(id) {
    try {
      await api.removeFromWaitlist(id);
      refresh();
    } catch {
      // surfaced via next poll if it persists
    }
  }

  const activeCount = (entries || []).filter((e) => e.status === 'WAITING' || e.status === 'NOTIFIED').length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-clinic-ink">Waitlist</h2>
        <p className="text-sm text-slate-500">{clinic.name} · {activeCount} active</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-1">
          <div className="mb-4 flex items-center gap-2 text-clinic-ink">
            <UserPlus size={18} />
            <h3 className="text-sm font-semibold">Add to waitlist</h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-500">Patient name</label>
              <input
                value={form.patientName}
                onChange={(e) => setForm({ ...form, patientName: e.target.value })}
                placeholder="e.g. Ahmed Mostafa"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-clinic-teal focus:outline-none focus:ring-1 focus:ring-clinic-teal"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500">WhatsApp number</label>
              <input
                value={form.patientPhone}
                onChange={(e) => setForm({ ...form, patientPhone: e.target.value })}
                placeholder="e.g. 201012345678"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-clinic-teal focus:outline-none focus:ring-1 focus:ring-clinic-teal"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500">Desired date</label>
              <input
                type="date"
                value={form.desiredDate}
                onChange={(e) => setForm({ ...form, desiredDate: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-clinic-teal focus:outline-none focus:ring-1 focus:ring-clinic-teal"
              />
            </div>

            {formError && <p className="text-xs text-rose-600">{formError}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-clinic-teal py-2 text-sm font-medium text-white hover:bg-clinic-teal/90 disabled:opacity-60"
            >
              {submitting ? 'Adding…' : 'Add to waitlist'}
            </button>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-slate-400">
            When a slot opens on this date, the longest-waiting patient is notified automatically on WhatsApp
            and has 15 minutes to reply "1" to claim it.
          </p>
        </form>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2 text-clinic-ink">
              <ListChecks size={16} />
              <h3 className="text-sm font-semibold">Waitlist entries</h3>
            </div>
            <div className="flex flex-wrap gap-1">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                    filter === s ? 'bg-clinic-teal text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <ul className="divide-y divide-slate-100">
            {(!entries || entries.length === 0) && (
              <li className="flex flex-col items-center gap-2 px-5 py-14 text-center text-slate-400">
                <Clock size={24} />
                <span className="text-sm">No waitlist entries yet</span>
              </li>
            )}

            {(entries || []).map((entry) => (
              <li key={entry.id} className="flex items-start justify-between gap-3 px-5 py-4">
                <div>
                  <p className="text-sm font-medium text-clinic-ink">{entry.patientName}</p>
                  <p className="text-xs text-slate-400">{entry.patientPhone}</p>
                  <p className="mt-1 text-xs text-slate-500">Wants: {fmtDate(entry.desiredDate)}</p>
                  {entry.status === 'NOTIFIED' && entry.expiresAt && (
                    <p className="mt-1 text-xs font-medium text-clinic-coral">
                      Claim window ends {fmtDateTime(entry.expiresAt)}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusBadge status={entry.status} />
                  {(entry.status === 'WAITING' || entry.status === 'NOTIFIED') && (
                    <button
                      onClick={() => handleRemove(entry.id)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700"
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
