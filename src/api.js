const getToken = (path = "") => {
  if (path.startsWith('/admin')) {
    return localStorage.getItem('ps_admin_token') || localStorage.getItem('ps_token');
  }
  return localStorage.getItem('ps_token');
};

const request = async (path, options = {}) => {
  const token = getToken(path);
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
    return res.json();
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
  adminLogin: (data) => request('/auth/admin-login', { method: 'POST', ...body(data) }),
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
  rateCustomer: (id, stars) => request(`/provider/jobs/${id}/rate-customer`, { method: 'POST', ...body({ stars }) }),
  getEarnings: () => request('/provider/earnings'),

  // Services
  getServices: (category) => request(`/services${category ? `?category=${encodeURIComponent(category)}` : ''}`),
  getMyListings: () => request('/provider/services'),
  createListing: (data) => request('/provider/services', { method: 'POST', ...body(data) }),
  updateListing: (id, data) => request(`/provider/services/${id}`, { method: 'PATCH', ...body(data) }),
  deleteListing: (id) => request(`/provider/services/${id}`, { method: 'DELETE' }),

  // Profile
  updateMe: (data) => request('/profile/me', { method: 'PATCH', ...body(data) }),
  becomeProvider: (data) => request('/profile/become-provider', { method: 'POST', ...body(data) }),
  getAddresses: () => request('/profile/addresses'),
  addAddress: (data) => request('/profile/addresses', { method: 'POST', ...body(data) }),
  deleteAddress: (id) => request(`/profile/addresses/${id}`, { method: 'DELETE' }),

  // Push subscriptions
  getVapidPublicKey: () => request('/push/vapid-public-key'),
  subscribePush: (subscription) => request('/push/subscribe', { method: 'POST', ...body({ subscription }) }),
  unsubscribePush: (endpoint) => request('/push/subscribe', { method: 'DELETE', ...body({ endpoint }) }),

  // Notifications
  getNotifications: () => request('/notifications'),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => request('/notifications/read-all', { method: 'PATCH' }),


  // Ratings (own profile)
  getMyRatings: () => request('/profile/ratings'),

  // Surveys
  getPendingSurveys: () => request('/surveys/pending'),
  respondToSurvey: (id, answers) => request(`/surveys/${id}/respond`, { method: 'POST', ...body({ answers }) }),

  // Admin
  adminGetUsers: () => request('/admin/users'),
  adminUpdateUser: (id, data) => request(`/admin/users/${id}`, { method: 'PATCH', ...body(data) }),
  adminGetSurveys: () => request('/admin/surveys'),
  adminCreateSurvey: (data) => request('/admin/surveys', { method: 'POST', ...body(data) }),
  adminUpdateSurvey: (id, data) => request(`/admin/surveys/${id}`, { method: 'PATCH', ...body(data) }),
  adminGetSurveyResults: (id) => request(`/admin/surveys/${id}/results`),
  adminGetRatings: () => request('/admin/ratings'),
};
