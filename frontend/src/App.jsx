import { useEffect, useState } from 'react';
import { LayoutDashboard, CalendarRange, Users, BarChart3, Building2, Plus, Stethoscope } from 'lucide-react';
import { api } from './lib/api';
import DashboardOverview from './components/DashboardOverview';
import ScheduleManager from './components/ScheduleManager';
import WaitlistManager from './components/WaitlistManager';
import AnalyticsTab from './components/AnalyticsTab';
import StatusBadge from './components/StatusBadge';

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'schedule', label: 'Schedule', icon: CalendarRange },
  { id: 'waitlist', label: 'Waitlist', icon: Users },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

export default function App() {
  const [clinics, setClinics] = useState([]);
  const [selectedClinicId, setSelectedClinicId] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [showNewClinic, setShowNewClinic] = useState(false);

  async function loadClinics() {
    try {
      const data = await api.listClinics();
      setClinics(data);
      setSelectedClinicId((current) => current || data[0]?.id || null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClinics();
  }, []);

  const selectedClinic = clinics.find((c) => c.id === selectedClinicId) || null;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-clinic-bg text-slate-400">
        Loading clinics…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-clinic-bg text-clinic-ink">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-5">
            <div className="rounded-lg bg-clinic-teal p-2 text-white">
              <Stethoscope size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-clinic-ink">Clinic Assistant</p>
              <p className="text-xs text-slate-400">Admin dashboard</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-4">
            <div className="mb-2 flex items-center justify-between px-2">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Clinics</span>
              <button
                onClick={() => setShowNewClinic(true)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-clinic-teal"
                aria-label="Add clinic"
              >
                <Plus size={14} />
              </button>
            </div>
            <ul className="space-y-1">
              {clinics.map((clinic) => (
                <li key={clinic.id}>
                  <button
                    onClick={() => setSelectedClinicId(clinic.id)}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${
                      clinic.id === selectedClinicId ? 'bg-clinic-teal/10 text-clinic-teal font-medium' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Building2 size={15} />
                    <span className="flex-1 truncate">{clinic.name}</span>
                  </button>
                </li>
              ))}
              {clinics.length === 0 && (
                <li className="px-3 py-6 text-center text-xs text-slate-400">No clinics yet. Add one to get started.</li>
              )}
            </ul>
          </div>

          {selectedClinic && (
            <nav className="border-t border-slate-100 px-3 py-4">
              <ul className="space-y-1">
                {TABS.map((tab) => (
                  <li key={tab.id}>
                    <button
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium ${
                        activeTab === tab.id ? 'bg-clinic-ink text-white' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <tab.icon size={16} />
                      {tab.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </aside>

        <main className="flex-1 overflow-y-auto">
          <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 lg:hidden">
            <p className="text-sm font-semibold">Clinic Assistant</p>
            {selectedClinic && <StatusBadge status={selectedClinic.sessionStatus} />}
          </header>

          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
            {!selectedClinic && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center">
                <Building2 className="mx-auto mb-3 text-slate-300" size={32} />
                <p className="text-sm font-medium text-clinic-ink">No clinic selected</p>
                <p className="mt-1 text-sm text-slate-400">Add a clinic to start managing appointments and WhatsApp.</p>
                <button
                  onClick={() => setShowNewClinic(true)}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-clinic-teal px-4 py-2 text-sm font-medium text-white hover:bg-clinic-teal/90"
                >
                  <Plus size={15} /> Add clinic
                </button>
              </div>
            )}

            {selectedClinic && activeTab === 'overview' && (
              <DashboardOverview clinic={selectedClinic} onClinicRefresh={loadClinics} />
            )}
            {selectedClinic && activeTab === 'schedule' && <ScheduleManager clinic={selectedClinic} />}
            {selectedClinic && activeTab === 'waitlist' && <WaitlistManager clinic={selectedClinic} />}
            {selectedClinic && activeTab === 'analytics' && <AnalyticsTab clinic={selectedClinic} />}
          </div>
        </main>
      </div>

      {showNewClinic && (
        <NewClinicModal
          onClose={() => setShowNewClinic(false)}
          onCreated={async (clinic) => {
            setShowNewClinic(false);
            await loadClinics();
            setSelectedClinicId(clinic.id);
          }}
        />
      )}
    </div>
  );
}

function NewClinicModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !phoneNumber.trim()) {
      setError('Clinic name and phone number are required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const clinic = await api.createClinic({
        name: name.trim(),
        phoneNumber: phoneNumber.trim(),
        workingHours: {
          sun: [{ start: '09:00', end: '17:00' }],
          mon: [{ start: '09:00', end: '17:00' }],
          tue: [{ start: '09:00', end: '17:00' }],
          wed: [{ start: '09:00', end: '17:00' }],
          thu: [{ start: '09:00', end: '17:00' }],
          fri: [],
          sat: [{ start: '10:00', end: '16:00' }],
        },
      });
      onCreated(clinic);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-clinic-ink/50 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <h3 className="text-sm font-semibold text-clinic-ink">Add a new clinic</h3>
        <p className="mt-1 text-xs text-slate-500">Default working hours (9am–5pm, closed Friday) are applied — edit them anytime.</p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-500">Clinic name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. STEP Dental Clinic"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-clinic-teal focus:outline-none focus:ring-1 focus:ring-clinic-teal"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">WhatsApp business number</label>
            <input
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="e.g. 201012345678"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-clinic-teal focus:outline-none focus:ring-1 focus:ring-clinic-teal"
            />
          </div>

          {error && <p className="text-xs text-rose-600">{error}</p>}
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 rounded-lg bg-clinic-teal py-2 text-sm font-medium text-white hover:bg-clinic-teal/90 disabled:opacity-60"
          >
            {submitting ? 'Creating…' : 'Create clinic'}
          </button>
        </div>
      </form>
    </div>
  );
}
