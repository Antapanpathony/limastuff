const getToken = () => localStorage.getItem('ps_token');

const request = async (path, options = {}) => {
  const token = getToken();
  try {
    const res = await fetch(`/api${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...options,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error('Cannot connect to server. Make sure the backend is running.');
    }
    throw err;
  }
};

const body = (data) => ({ body: JSON.stringify(data) });

export const api = {
  // Auth
  register: (data) => request('/auth/register', { method: 'POST', ...body(data) }),
  login: (data) => request('/auth/login', { method: 'POST', ...body(data) }),
  me: () => request('/auth/me'),

  // Customer bookings
  createBooking: (data) => request('/bookings', { method: 'POST', ...body(data) }),
  getBookings: () => request('/bookings'),

  // Provider
  getAvailableJobs: () => request('/provider/available'),
  getMyJobs: () => request('/provider/jobs'),
  acceptJob: (id) => request(`/provider/jobs/${id}/accept`, { method: 'PUT' }),
  updateJobStatus: (id, status) => request(`/provider/jobs/${id}/status`, { method: 'PUT', ...body({ status }) }),
  getEarnings: () => request('/provider/earnings'),
};
