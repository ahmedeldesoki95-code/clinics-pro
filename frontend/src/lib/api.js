const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

async function request(path, { method = 'GET', body, params } = {}) {
  let url = `${BASE_URL}${path}`;
  if (params) {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
    ).toString();
    if (query) url += `?${query}`;
  }

  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const message = data?.error || `Request failed with status ${res.status}`;
    const err = new Error(message);
    err.statusCode = res.status;
    throw err;
  }

  return data;
}

export const api = {
  // Clinics
  listClinics: () => request('/clinics'),
  getClinic: (id) => request(`/clinics/${id}`),
  createClinic: (payload) => request('/clinics', { method: 'POST', body: payload }),
  connectClinic: (id) => request(`/clinics/${id}/connect`, { method: 'POST' }),
  getClinicStatus: (id) => request(`/clinics/${id}/status`),
  disconnectClinic: (id, logout = false) => request(`/clinics/${id}/disconnect`, { method: 'POST', params: { logout } }),
  updateWorkingHours: (id, payload) => request(`/clinics/${id}/working-hours`, { method: 'PUT', body: payload }),
  getClinicAnalytics: (id, params) => request(`/clinics/${id}/analytics`, { params }),

  // Appointments
  listAppointments: (params) => request('/appointments', { params }),
  getAvailableSlots: (clinicId, daysAhead) => request('/appointments/available', { params: { clinicId, daysAhead } }),
  bookAppointment: (payload) => request('/appointments', { method: 'POST', body: payload }),
  confirmAppointment: (id) => request(`/appointments/${id}/confirm`, { method: 'PATCH' }),
  cancelAppointment: (id) => request(`/appointments/${id}/cancel`, { method: 'PATCH' }),
  rescheduleAppointment: (id, appointmentTime) =>
    request(`/appointments/${id}/reschedule`, { method: 'PATCH', body: { appointmentTime } }),

  // Waitlist
  listWaitlist: (clinicId, status) => request('/waitlist', { params: { clinicId, status } }),
  addToWaitlist: (payload) => request('/waitlist', { method: 'POST', body: payload }),
  removeFromWaitlist: (id) => request(`/waitlist/${id}/remove`, { method: 'PATCH' }),
};
