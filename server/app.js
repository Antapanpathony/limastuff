/*
  Supabase schema — run this SQL in the Supabase SQL editor:

  create table users (
    id uuid primary key default gen_random_uuid(),
    email text unique not null,
    name text not null,
    role text not null default 'customer',
    password text not null,
    created_at timestamptz default now()
  );

  create table provider_profiles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references users(id) on delete cascade unique,
    bio text default '',
    category text not null,
    hourly_rate numeric default 0,
    rating numeric default 5.0,
    jobs_completed integer default 0,
    total_earnings numeric default 0,
    created_at timestamptz default now()
  );

  create table bookings (
    id uuid primary key default gen_random_uuid(),
    code text not null,
    customer_id uuid references users(id),
    provider_id uuid references users(id),
    service_category text not null,
    status text not null default 'pending',
    scheduled_date timestamptz,
    address text default '',
    district text default '',
    subtotal numeric not null,
    tax numeric not null,
    fee numeric not null,
    total numeric not null,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );

  create table booking_items (
    id uuid primary key default gen_random_uuid(),
    booking_id uuid references bookings(id) on delete cascade,
    service_id text not null,
    service_name text not null,
    price numeric not null,
    qty integer not null
  );

  -- RLS (service role key bypasses it, but good practice to enable)
  alter table users enable row level security;
  alter table provider_profiles enable row level security;
  alter table bookings enable row level security;
  alter table booking_items enable row level security;

  -- Atomic helper called when a job is marked completed
  create or replace function increment_provider_stats(p_user_id uuid, p_earnings numeric)
  returns void language sql as $$
    update provider_profiles
    set jobs_completed = jobs_completed + 1,
        total_earnings = total_earnings + p_earnings
    where user_id = p_user_id;
  $$;
*/

import { createClient } from '@supabase/supabase-js';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const JWT_SECRET = process.env.JWT_SECRET || 'peruserv-dev-secret-2024';
const GEMINI_KEY = process.env.GEMINI_API_KEY;

// ─── Row mappers (snake_case DB → camelCase API) ──────────────────────────────
const mapUser = (u) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  role: u.role,
  createdAt: u.created_at,
});

const mapProfile = (p) => p ? ({
  id: p.id,
  userId: p.user_id,
  bio: p.bio,
  category: p.category,
  hourlyRate: p.hourly_rate,
  rating: p.rating,
  jobsCompleted: p.jobs_completed,
  totalEarnings: p.total_earnings,
  createdAt: p.created_at,
}) : null;

const mapItem = (i) => ({
  id: i.id,
  bookingId: i.booking_id,
  serviceId: i.service_id,
  serviceName: i.service_name,
  price: Number(i.price),
  qty: i.qty,
});

const mapBooking = (b) => ({
  id: b.id,
  code: b.code,
  customerId: b.customer_id,
  providerId: b.provider_id,
  serviceCategory: b.service_category,
  status: b.status,
  scheduledDate: b.scheduled_date,
  address: b.address,
  district: b.district,
  subtotal: Number(b.subtotal),
  tax: Number(b.tax),
  fee: Number(b.fee),
  total: Number(b.total),
  createdAt: b.created_at,
  updatedAt: b.updated_at,
  items: (b.booking_items || []).map(mapItem),
  customerName: b.customer?.name || 'Customer',
});

// ─── App setup ────────────────────────────────────────────────────────────────
export const app = express();
app.use(cors({ origin: true }));
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
    if (role === 'provider' && !category) return res.status(400).json({ error: 'Category is required for providers' });

    const { data: existing } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hashedPass = await bcrypt.hash(password, 10);
    const { data: user, error: userErr } = await supabase
      .from('users')
      .insert({ email, name, role, password: hashedPass })
      .select('id, email, name, role, created_at')
      .single();
    if (userErr) throw userErr;

    let providerProfile = null;
    if (role === 'provider') {
      const { data: profile, error: profErr } = await supabase
        .from('provider_profiles')
        .insert({ user_id: user.id, bio: bio || '', category, hourly_rate: Number(hourlyRate) || 0 })
        .select()
        .single();
      if (profErr) throw profErr;
      providerProfile = mapProfile(profile);
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { ...mapUser(user), providerProfile } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

    const { data: user } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    const { data: profile } = await supabase.from('provider_profiles').select('*').eq('user_id', user.id).maybeSingle();
    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { ...mapUser(user), providerProfile: mapProfile(profile) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', auth, async (req, res) => {
  try {
    const { data: user } = await supabase
      .from('users').select('id, email, name, role, created_at')
      .eq('id', req.user.userId).maybeSingle();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { data: profile } = await supabase.from('provider_profiles').select('*').eq('user_id', user.id).maybeSingle();
    res.json({ ...mapUser(user), providerProfile: mapProfile(profile) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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

    const { data: booking, error: bookErr } = await supabase
      .from('bookings')
      .insert({
        code,
        customer_id: req.user.userId,
        service_category: serviceCategory,
        status: 'pending',
        scheduled_date: datetime || null,
        address: address || '',
        district: district || '',
        subtotal,
        tax,
        fee,
        total,
      })
      .select()
      .single();
    if (bookErr) throw bookErr;

    const itemRows = cart.map(i => ({
      booking_id: booking.id,
      service_id: i.svc.id,
      service_name: i.svc.name[lang] || i.svc.name.es,
      price: i.svc.price,
      qty: i.qty,
    }));
    const { data: items, error: itemErr } = await supabase.from('booking_items').insert(itemRows).select();
    if (itemErr) throw itemErr;

    res.json({ ...mapBooking({ ...booking, booking_items: items }) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/bookings', auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, booking_items(*)')
      .eq('customer_id', req.user.userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data.map(mapBooking));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Provider routes ──────────────────────────────────────────────────────────
app.get('/api/provider/available', auth, requireProvider, async (req, res) => {
  try {
    const { data: profile } = await supabase
      .from('provider_profiles').select('category').eq('user_id', req.user.userId).maybeSingle();
    if (!profile) return res.status(404).json({ error: 'Provider profile not found' });

    const { data, error } = await supabase
      .from('bookings')
      .select('*, booking_items(*)')
      .eq('status', 'pending')
      .eq('service_category', profile.category)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data.map(mapBooking));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/provider/jobs', auth, requireProvider, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, booking_items(*), customer:users!customer_id(name)')
      .eq('provider_id', req.user.userId)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    res.json(data.map(mapBooking));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/provider/jobs/:id/accept', auth, requireProvider, async (req, res) => {
  try {
    const { data: booking } = await supabase
      .from('bookings').select('id, status').eq('id', req.params.id).maybeSingle();
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.status !== 'pending') return res.status(400).json({ error: 'Job is no longer available' });

    const { data, error } = await supabase
      .from('bookings')
      .update({ provider_id: req.user.userId, status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select('*, booking_items(*)')
      .single();
    if (error) throw error;
    res.json(mapBooking(data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/provider/jobs/:id/status', auth, requireProvider, async (req, res) => {
  try {
    const { status } = req.body;
    const { data: booking } = await supabase
      .from('bookings').select('id, status, total')
      .eq('id', req.params.id).eq('provider_id', req.user.userId).maybeSingle();
    if (!booking) return res.status(404).json({ error: 'Job not found' });

    const transitions = { accepted: ['in_progress'], in_progress: ['completed'] };
    if (!transitions[booking.status]?.includes(status)) {
      return res.status(400).json({ error: `Cannot change from ${booking.status} to ${status}` });
    }

    const { data, error } = await supabase
      .from('bookings')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select('*, booking_items(*)')
      .single();
    if (error) throw error;

    if (status === 'completed') {
      await supabase.rpc('increment_provider_stats', {
        p_user_id: req.user.userId,
        p_earnings: Number(booking.total),
      });
    }

    res.json(mapBooking(data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/provider/earnings', auth, requireProvider, async (req, res) => {
  try {
    const { data: profile } = await supabase
      .from('provider_profiles').select('*').eq('user_id', req.user.userId).maybeSingle();
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const { data: completedJobs, error } = await supabase
      .from('bookings')
      .select('*, booking_items(*)')
      .eq('provider_id', req.user.userId)
      .eq('status', 'completed')
      .order('updated_at', { ascending: false });
    if (error) throw error;

    const thisMonthEarnings = completedJobs
      .filter(b => b.updated_at >= startOfMonth)
      .reduce((s, b) => s + Number(b.total), 0);

    res.json({
      totalEarnings: Number(profile.total_earnings),
      thisMonthEarnings,
      jobsCompleted: profile.jobs_completed,
      rating: Number(profile.rating),
      category: profile.category,
      recentJobs: completedJobs.slice(0, 10).map(mapBooking),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
