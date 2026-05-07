import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';
import crypto from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '../data');
mkdirSync(dataDir, { recursive: true });

const adapter = new JSONFile(join(dataDir, 'db.json'));
const db = new Low(adapter, {
  users: [],
  provider_profiles: [],
  bookings: [],
  booking_items: [],
});
await db.read();
db.data ??= { users: [], provider_profiles: [], bookings: [], booking_items: [] };

const JWT_SECRET = process.env.JWT_SECRET || 'peruserv-dev-secret-2024';
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:4173'] }));
app.use(express.json());

// ─── Auth middleware ──────────────────────────────────────────────────────────
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const requireProvider = (req, res, next) => {
  if (req.user.role !== 'provider') return res.status(403).json({ error: 'Provider access required' });
  next();
};

// ─── Auth routes ──────────────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role = 'customer', category, bio, hourlyRate } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Missing required fields' });
    if (db.data.users.find(u => u.email === email)) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    if (role === 'provider' && !category) {
      return res.status(400).json({ error: 'Category is required for providers' });
    }

    const hashedPass = await bcrypt.hash(password, 10);
    const user = {
      id: crypto.randomUUID(),
      email,
      name,
      role,
      password: hashedPass,
      createdAt: new Date().toISOString(),
    };
    db.data.users.push(user);

    let providerProfile = null;
    if (role === 'provider' && category) {
      providerProfile = {
        id: crypto.randomUUID(),
        userId: user.id,
        bio: bio || '',
        category,
        hourlyRate: Number(hourlyRate) || 0,
        rating: 5.0,
        jobsCompleted: 0,
        totalEarnings: 0,
        createdAt: new Date().toISOString(),
      };
      db.data.provider_profiles.push(providerProfile);
    }

    await db.write();
    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    const { password: _, ...safeUser } = user;
    res.json({ token, user: { ...safeUser, providerProfile } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

    const user = db.data.users.find(u => u.email === email);
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    const { password: _, ...safeUser } = user;
    const providerProfile = db.data.provider_profiles.find(p => p.userId === user.id) || null;
    res.json({ token, user: { ...safeUser, providerProfile } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', auth, (req, res) => {
  const user = db.data.users.find(u => u.id === req.user.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { password: _, ...safeUser } = user;
  const providerProfile = db.data.provider_profiles.find(p => p.userId === user.id) || null;
  res.json({ ...safeUser, providerProfile });
});

// ─── Customer booking routes ──────────────────────────────────────────────────
app.post('/api/bookings', auth, async (req, res) => {
  try {
    const { cart, district, address, datetime, lang } = req.body;
    if (!cart || !cart.length) return res.status(400).json({ error: 'Cart is empty' });

    const subtotal = cart.reduce((s, i) => s + i.svc.price * i.qty, 0);
    const tax = subtotal * 0.18;
    const fee = 2;
    const total = subtotal + tax + fee;

    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    const serviceCategory = cart[0]?.svc?.cat || 'general';

    const booking = {
      id: crypto.randomUUID(),
      code,
      customerId: req.user.userId,
      providerId: null,
      serviceCategory,
      status: 'pending',
      scheduledDate: datetime || null,
      address: address || '',
      district: district || '',
      subtotal,
      tax,
      fee,
      total,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.data.bookings.push(booking);

    const items = cart.map(i => ({
      id: crypto.randomUUID(),
      bookingId: booking.id,
      serviceId: i.svc.id,
      serviceName: i.svc.name[lang] || i.svc.name.es,
      price: i.svc.price,
      qty: i.qty,
    }));
    db.data.booking_items.push(...items);
    await db.write();

    res.json({ ...booking, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/bookings', auth, (req, res) => {
  const bookings = db.data.bookings
    .filter(b => b.customerId === req.user.userId)
    .map(b => ({ ...b, items: db.data.booking_items.filter(i => i.bookingId === b.id) }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(bookings);
});

// ─── Provider routes ──────────────────────────────────────────────────────────
app.get('/api/provider/available', auth, requireProvider, (req, res) => {
  const profile = db.data.provider_profiles.find(p => p.userId === req.user.userId);
  if (!profile) return res.status(404).json({ error: 'Provider profile not found' });

  const available = db.data.bookings
    .filter(b => b.status === 'pending' && b.serviceCategory === profile.category)
    .map(b => ({ ...b, items: db.data.booking_items.filter(i => i.bookingId === b.id) }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(available);
});

app.get('/api/provider/jobs', auth, requireProvider, (req, res) => {
  const jobs = db.data.bookings
    .filter(b => b.providerId === req.user.userId)
    .map(b => {
      const customer = db.data.users.find(u => u.id === b.customerId);
      return {
        ...b,
        items: db.data.booking_items.filter(i => i.bookingId === b.id),
        customerName: customer?.name || 'Customer',
      };
    })
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  res.json(jobs);
});

app.put('/api/provider/jobs/:id/accept', auth, requireProvider, async (req, res) => {
  const booking = db.data.bookings.find(b => b.id === req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.status !== 'pending') return res.status(400).json({ error: 'Job is no longer available' });

  booking.providerId = req.user.userId;
  booking.status = 'accepted';
  booking.updatedAt = new Date().toISOString();
  await db.write();
  res.json(booking);
});

app.put('/api/provider/jobs/:id/status', auth, requireProvider, async (req, res) => {
  const { status } = req.body;
  const booking = db.data.bookings.find(b => b.id === req.params.id && b.providerId === req.user.userId);
  if (!booking) return res.status(404).json({ error: 'Job not found' });

  const transitions = { accepted: ['in_progress'], in_progress: ['completed'] };
  if (!transitions[booking.status]?.includes(status)) {
    return res.status(400).json({ error: `Cannot change from ${booking.status} to ${status}` });
  }

  booking.status = status;
  booking.updatedAt = new Date().toISOString();

  if (status === 'completed') {
    const profile = db.data.provider_profiles.find(p => p.userId === req.user.userId);
    if (profile) {
      profile.jobsCompleted += 1;
      profile.totalEarnings += booking.total;
    }
  }

  await db.write();
  res.json(booking);
});

app.get('/api/provider/earnings', auth, requireProvider, (req, res) => {
  const profile = db.data.provider_profiles.find(p => p.userId === req.user.userId);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const completedJobs = db.data.bookings.filter(
    b => b.providerId === req.user.userId && b.status === 'completed'
  );
  const thisMonthEarnings = completedJobs
    .filter(b => b.updatedAt >= startOfMonth)
    .reduce((s, b) => s + b.total, 0);

  res.json({
    totalEarnings: profile.totalEarnings,
    thisMonthEarnings,
    jobsCompleted: profile.jobsCompleted,
    rating: profile.rating,
    category: profile.category,
    recentJobs: completedJobs
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 10)
      .map(b => ({ ...b, items: db.data.booking_items.filter(i => i.bookingId === b.id) })),
  });
});

// ─── Gemini chat proxy ────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  if (!GEMINI_KEY) return res.status(503).json({ error: 'Gemini API key not configured' });
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req.body) }
    );
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`PeruServ API running on http://localhost:${PORT}`);
});
