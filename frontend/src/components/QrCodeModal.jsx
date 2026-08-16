import { useEffect, useState } from 'react';
import { X, Smartphone, CheckCircle2, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import StatusBadge from './StatusBadge';

export default function QrCodeModal({ clinic, onClose, onConnected }) {
  const [qr, setQr] = useState(null);
  const [status, setStatus] = useState(clinic.sessionStatus);
  const [error, setError] = useState(null);
  const [connecting, setConnecting] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let pollId;

    async function requestConnection() {
      setConnecting(true);
      setError(null);
      try {
        const res = await api.connectClinic(clinic.id);
        if (cancelled) return;
        setStatus(res.status);
        if (res.qr) setQr(res.qr);
        if (res.status === 'CONNECTED') {
          onConnected?.();
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setConnecting(false);
      }
    }

    async function pollStatus() {
      try {
        const res = await api.getClinicStatus(clinic.id);
        if (cancelled) return;
        setStatus(res.status);
        if (res.status === 'CONNECTED') {
          setQr(null);
          onConnected?.();
        }
      } catch {
        // transient — keep polling
      }
    }

    requestConnection();
    pollId = setInterval(pollStatus, 3000);

    return () => {
      cancelled = true;
      clearInterval(pollId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinic.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-clinic-ink/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-clinic-ink">Link WhatsApp</h3>
            <p className="text-xs text-slate-500">{clinic.name}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col items-center gap-4 px-6 py-8">
          <StatusBadge status={status} />

          {status === 'CONNECTED' && (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <CheckCircle2 className="text-emerald-500" size={40} />
              <p className="text-sm font-medium text-clinic-ink">WhatsApp is linked</p>
              <p className="text-xs text-slate-500">This clinic can now send and receive messages.</p>
            </div>
          )}

          {status !== 'CONNECTED' && qr && (
            <div className="rounded-xl border border-slate-200 p-3">
              <img src={qr} alt="WhatsApp pairing QR code" className="h-56 w-56" />
            </div>
          )}

          {status !== 'CONNECTED' && !qr && connecting && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Loader2 className="animate-spin text-clinic-teal" size={32} />
              <p className="text-sm text-slate-500">Generating QR code…</p>
            </div>
          )}

          {status !== 'CONNECTED' && !qr && !connecting && !error && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Smartphone className="text-slate-300" size={32} />
              <p className="text-sm text-slate-500">Waiting for QR code from WhatsApp…</p>
            </div>
          )}

          {error && <p className="text-sm text-rose-600">{error}</p>}

          {status !== 'CONNECTED' && (
            <p className="text-center text-xs text-slate-400">
              Open WhatsApp → Linked Devices → Link a Device, then scan the code above.
            </p>
          )}
        </div>

        <div className="border-t border-slate-100 px-5 py-4">
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-clinic-ink py-2 text-sm font-medium text-white hover:bg-clinic-ink/90"
          >
            {status === 'CONNECTED' ? 'Done' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
