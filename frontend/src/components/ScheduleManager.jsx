import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Check, X, CalendarClock, CalendarDays, Calendar } from 'lucide-react';
import { addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, format } from 'date-fns';
import { usePolling } from '../hooks/usePolling';
import { api } from '../lib/api';
import StatusBadge from './StatusBadge';
import { fmtTime } from '../lib/format';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function ScheduleManager({ clinic }) {
  const [view, setView] = useState('day'); // 'day' | 'week'
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [rescheduleValue, setRescheduleValue] = useState('');
  const [actionError, setActionError] = useState(null);

  const rangeStart = view === 'day' ? anchorDate : startOfWeek(anchorDate, { weekStartsOn: 0 });
  const rangeEnd = view === 'day' ? anchorDate : endOfWeek(anchorDate, { weekStartsOn: 0 });

  const fromISO = new Date(rangeStart.setHours(0, 0, 0, 0)).toISOString();
  const toISO = new Date(new Date(rangeEnd).setHours(23, 59, 59, 999)).toISOString();

  const { data: appointments, refresh } = usePolling(
    () => api.listAppointments({ clinicId: clinic.id, from: fromISO, to: toISO }),
    { intervalMs: 10000, deps: [clinic.id, view, anchorDate.toDateString()] }
  );

  const days = useMemo(() => {
    if (view === 'day') return [anchorDate];
    return eachDayOfInterval({ start: startOfWeek(anchorDate, { weekStartsOn: 0 }), end: endOfWeek(anchorDate, { weekStartsOn: 0 }) });
  }, [view, anchorDate]);

  const apptsByDay = useMemo(() => {
    const map = new Map();
    for (const day of days) map.set(day.toDateString(), []);
    (appointments || []).forEach((appt) => {
      const key = new Date(appt.appointmentTime).toDateString();
      if (map.has(key)) map.get(key).push(appt);
      else map.set(key, [appt]);
    });
    for (const list of map.values()) {
      list.sort((a, b) => new Date(a.appointmentTime) - new Date(b.appointmentTime));
    }
    return map;
  }, [appointments, days]);

  function shift(amount) {
    setAnchorDate((prev) => addDays(prev, view === 'day' ? amount : amount * 7));
  }

  async function handleConfirm(id) {
    setActionError(null);
    try {
      await api.confirmAppointment(id);
      refresh();
    } catch (err) {
      setActionError(err.message);
    }
  }

  async function handleCancel(id) {
    setActionError(null);
    try {
      await api.cancelAppointment(id);
      refresh();
    } catch (err) {
      setActionError(err.message);
    }
  }

  function openReschedule(appt) {
    setRescheduleTarget(appt);
    setRescheduleValue(format(new Date(appt.appointmentTime), "yyyy-MM-dd'T'HH:mm"));
  }

  async function submitReschedule() {
    if (!rescheduleTarget || !rescheduleValue) return;
    setActionError(null);
    try {
      await api.rescheduleAppointment(rescheduleTarget.id, new Date(rescheduleValue).toISOString());
      setRescheduleTarget(null);
      refresh();
    } catch (err) {
      setActionError(err.message);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-clinic-ink">Schedule</h2>
          <p className="text-sm text-slate-500">{clinic.name}</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
            <button
              onClick={() => setView('day')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${view === 'day' ? 'bg-clinic-teal text-white' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <Calendar size={14} /> Day
            </button>
            <button
              onClick={() => setView('week')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${view === 'week' ? 'bg-clinic-teal text-white' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <CalendarDays size={14} /> Week
            </button>
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-1 py-1">
            <button onClick={() => shift(-1)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-50" aria-label="Previous">
              <ChevronLeft size={16} />
            </button>
            <span className="min-w-[7rem] text-center text-sm font-medium text-clinic-ink">
              {view === 'day' ? format(anchorDate, 'EEE d MMM') : `${format(rangeStart, 'd MMM')} – ${format(rangeEnd, 'd MMM')}`}
            </span>
            <button onClick={() => shift(1)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-50" aria-label="Next">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {actionError && (
        <div className="rounded-lg bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{actionError}</div>
      )}

      <div className={`grid gap-4 ${view === 'week' ? 'grid-cols-1 lg:grid-cols-7' : 'grid-cols-1'}`}>
        {days.map((day) => {
          const list = apptsByDay.get(day.toDateString()) || [];
          const isToday = isSameDay(day, new Date());
          return (
            <div key={day.toISOString()} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className={`flex items-center justify-between rounded-t-2xl border-b border-slate-100 px-4 py-3 ${isToday ? 'bg-clinic-teal/5' : ''}`}>
                <div>
                  <p className="text-sm font-semibold text-clinic-ink">{format(day, 'EEEE')}</p>
                  <p className="text-xs text-slate-400">{format(day, 'd MMM yyyy')}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">{list.length}</span>
              </div>

              <ul className="max-h-[28rem] divide-y divide-slate-100 overflow-y-auto">
                {list.length === 0 && (
                  <li className="flex flex-col items-center gap-2 px-4 py-10 text-center text-slate-400">
                    <CalendarClock size={22} />
                    <span className="text-xs">No appointments</span>
                  </li>
                )}
                {list.map((appt) => (
                  <li key={appt.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-clinic-ink">{fmtTime(appt.appointmentTime)} · {appt.patientName}</p>
                        <p className="text-xs text-slate-400">{appt.patientPhone}</p>
                      </div>
                      <StatusBadge status={appt.status} />
                    </div>

                    {(appt.status === 'PENDING' || appt.status === 'CONFIRMED') && (
                      <div className="mt-2 flex items-center gap-2">
                        {appt.status === 'PENDING' && (
                          <button
                            onClick={() => handleConfirm(appt.id)}
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                          >
                            <Check size={12} /> Confirm
                          </button>
                        )}
                        <button
                          onClick={() => openReschedule(appt)}
                          className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                        >
                          <CalendarClock size={12} /> Reschedule
                        </button>
                        <button
                          onClick={() => handleCancel(appt.id)}
                          className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
                        >
                          <X size={12} /> Cancel
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {rescheduleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-clinic-ink/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-sm font-semibold text-clinic-ink">Reschedule appointment</h3>
            <p className="mt-1 text-xs text-slate-500">{rescheduleTarget.patientName} · {rescheduleTarget.patientPhone}</p>

            <label className="mt-4 block text-xs font-medium text-slate-500">New date & time</label>
            <input
              type="datetime-local"
              value={rescheduleValue}
              onChange={(e) => setRescheduleValue(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-clinic-teal focus:outline-none focus:ring-1 focus:ring-clinic-teal"
            />

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setRescheduleTarget(null)}
                className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={submitReschedule}
                className="flex-1 rounded-lg bg-clinic-teal py-2 text-sm font-medium text-white hover:bg-clinic-teal/90"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
