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
    if (!res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      throw new Error(`Request failed (${res.status})`);
    }
    const data = await res.json();
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
  rateBooking: (id, stars) => request(`/bookings/${id}/rate`, { method: 'POST', ...body({ stars }) }),

  // Provider
  getAvailableJobs: () => request('/provider/available'),
  getMyJobs: () => request('/provider/jobs'),
  acceptJob: (id) => request(`/provider/jobs/${id}/accept`, { method: 'PUT' }),
  updateJobStatus: (id, status) => request(`/provider/jobs/${id}/status`, { method: 'PUT', ...body({ status }) }),
  getEarnings: () => request('/provider/earnings'),

  // Surveys
  getPendingSurveys: () => request('/surveys/pending'),
  respondToSurvey: (id, answers) => request(`/surveys/${id}/respond`, { method: 'POST', ...body({ answers }) }),

  // Admin
  adminGetUsers: () => request('/admin/users'),
  adminUpdateUser: (id, data) => request(`/admin/users/${id}`, { method: 'PATCH', ...body(data) }),
  adminGetSurveys: () => request('/admin/surveys'),
  adminCreateSurvey: (data) => request('/admin/surveys', { method: 'POST', ...body(data) }),
  adminUpdateSurvey: (id, data) => request(`/admin/surveys/${id}`, { method: 'PATCH', ...body(data) }),
  adminGetRatings: () => request('/admin/ratings'),
};
