const STYLES = {
  // Appointment statuses
  PENDING: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  CONFIRMED: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  CANCELLED: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  COMPLETED: 'bg-clinic-teal/10 text-clinic-teal ring-clinic-teal/20',
  NO_SHOW: 'bg-slate-100 text-slate-600 ring-slate-500/20',

  // Waitlist statuses
  WAITING: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  NOTIFIED: 'bg-clinic-coral/10 text-clinic-coral ring-clinic-coral/20',
  CLAIMED: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  EXPIRED: 'bg-slate-100 text-slate-500 ring-slate-400/20',

  // WhatsApp connection statuses
  DISCONNECTED: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  CONNECTING: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  QR_PENDING: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  CONNECTED: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  LOGGED_OUT: 'bg-rose-50 text-rose-700 ring-rose-600/20',
};

const LABELS = {
  NO_SHOW: 'No-show',
  QR_PENDING: 'Scan QR',
  LOGGED_OUT: 'Logged out',
};

export default function StatusBadge({ status, className = '' }) {
  const style = STYLES[status] || 'bg-slate-100 text-slate-600 ring-slate-500/20';
  const label = LABELS[status] || (status ? status.charAt(0) + status.slice(1).toLowerCase() : 'Unknown');

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${style} ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
}
