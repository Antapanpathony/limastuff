/*
  Supabase schema — run this SQL in the Supabase SQL editor:

  create table users (
    id uuid primary key default gen_random_uuid(),
    email text unique not null,
    name text not null,
    role text not null default 'customer',  -- 'customer' | 'provider' | 'admin'
    is_provider boolean default false,
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
    payment_status text not null default 'unpaid',
    payment_intent_id text,
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

  -- Unified ratings table: customers rate providers, providers rate customers
  create table ratings (
    id uuid primary key default gen_random_uuid(),
    booking_id uuid references bookings(id),
    rater_id uuid references users(id),
    ratee_id uuid references users(id),
    stars integer not null check (stars between 1 and 5),
    type text not null check (type in ('provider_service', 'customer_behavior')),
    created_at timestamptz default now(),
    unique(booking_id, type)
  );

  -- Admin-created surveys sent to users
  create table surveys (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    description text default '',
    questions jsonb not null default '[]',
    -- questions: [{id, text, type: 'rating'|'text'|'choice', options?: string[]}]
    active boolean default true,
    created_at timestamptz default now()
  );

  -- One response per user per survey
  create table survey_responses (
    id uuid primary key default gen_random_uuid(),
    survey_id uuid references surveys(id),
    user_id uuid references users(id),
    answers jsonb not null default '{}',
    created_at timestamptz default now(),
    unique(survey_id, user_id)
  );

  create table addresses (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references users(id) on delete cascade,
    label text not null default 'Home',
    address text not null,
    district text not null,
    is_default boolean default false,
    created_at timestamptz default now()
  );

  create table push_subscriptions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references users(id) on delete cascade,
    endpoint text not null unique,
    subscription jsonb not null,
    created_at timestamptz default now()
  );

  create table notifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references users(id) on delete cascade,
    type text not null,
    title text not null,
    body text not null,
    read boolean default false,
    created_at timestamptz default now()
  );


  -- Atomic helper called when a job is marked completed
  create or replace function increment_provider_stats(p_user_id uuid, p_earnings numeric)
  returns void language sql as $$
    update provider_profiles
    set jobs_completed = jobs_completed + 1,
        total_earnings = total_earnings + p_earnings
    where user_id = p_user_id;
  $$;

  alter table users enable row level security;
  alter table provider_profiles enable row level security;
  alter table bookings enable row level security;
  alter table booking_items enable row level security;
  alter table ratings enable row level security;
  alter table surveys enable row level security;
  alter table survey_responses enable row level security;

  -- Migration: if you already created booking_ratings from a previous version, run:
  -- drop table if exists booking_ratings;
  -- then create the ratings table above.

  -- To promote the first admin:
  -- update users set role = 'admin' where email = 'admin@example.com';
*/

import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
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

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || 'BD_WKWl-0N2iit_2LVy-5NUruN2iYKzPFGrcMe8Y-4I8-VPAeWwFC8lDaeIcJnH88tVAcbW3Q8VTmU4MisuVA6s';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '_FvAavrWzyr_f16calS3UkguaTQ6cvUR_AT99tQmWmQ';
webpush.setVapidDetails('mailto:hello@peruserv.pe', VAPID_PUBLIC, VAPID_PRIVATE);

// ─── Row mappers ──────────────────────────────────────────────────────────────
const pushNotification = async (userId, type, title, body) => {
  try {
    await supabase.from('notifications').insert({ user_id: userId, type, title, body });
  } catch (_) {}
  try {
    const { data: subs } = await supabase
      .from('push_subscriptions').select('subscription').eq('user_id', userId);
    if (!subs?.length) return;
    const payload = JSON.stringify({ title, body, tag: type });
    await Promise.allSettled(
      subs.map(async ({ subscription }) => {
        try {
          await webpush.sendNotification(subscription, payload);
        } catch (err) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabase.from('push_subscriptions')
              .delete().eq('user_id', userId).eq('subscription->>endpoint', subscription.endpoint);
          }
        }
      })
    );
  } catch (_) {}
};

const mapUser = (u) => ({
  id: u.id, email: u.email, name: u.name,
  role: u.is_provider && u.role === 'customer' ? 'provider' : u.role,
  isProvider: u.is_provider ?? false,
  createdAt: u.created_at,
});

const mapProfile = (p) => p ? ({
  id: p.id, userId: p.user_id, bio: p.bio, category: p.category,
  hourlyRate: p.hourly_rate, rating: p.rating,
  jobsCompleted: p.jobs_completed, totalEarnings: p.total_earnings,
  createdAt: p.created_at,
}) : null;

const mapItem = (i) => ({
  id: i.id, bookingId: i.booking_id, serviceId: i.service_id,
  serviceName: i.service_name, price: Number(i.price), qty: i.qty,
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
  paymentStatus: b.payment_status,
  createdAt: b.created_at,
  updatedAt: b.updated_at,
  items: (b.booking_items || []).map(mapItem),
  customerName: b.customer?.name || 'Customer',
  // Ratings: customer→provider service quality, provider→customer behavior
  serviceRating: (b.ratings || []).find(r => r.type === 'provider_service')?.stars ?? null,
  customerRating: (b.ratings || []).find(r => r.type === 'customer_behavior')?.stars ?? null,
});

// ─── App ──────────────────────────────────────────────────────────────────────
export const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// ─── Auth middleware ──────────────────────────────────────────────────────────
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid or expired token' }); }
};

const requireProvider = (req, res, next) =>
  !req.user.isProvider
    ? res.status(403).json({ error: 'Provider access required' })
    : next();

const requireAdmin = (req, res, next) =>
  req.user.role !== 'admin'
    ? res.status(403).json({ error: 'Admin access required' })
    : next();

// ─── Auth routes ──────────────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role = 'customer', category, bio, hourlyRate } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Missing required fields' });
    const wantsProvider = role === 'provider' || role === 'both';
    if (wantsProvider && !category) return res.status(400).json({ error: 'Category is required for providers' });

    const { data: existing } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hashedPass = await bcrypt.hash(password, 10);
    const { data: user, error: userErr } = await supabase
      .from('users')
      .insert({ email, name, role: 'customer', is_provider: wantsProvider, password: hashedPass })
      .select('id, email, name, role, is_provider, created_at').single();
    if (userErr) throw userErr;

    let providerProfile = null;
    if (wantsProvider) {
      const { data: profile, error: profErr } = await supabase
        .from('provider_profiles')
        .insert({ user_id: user.id, bio: bio || '', category, hourly_rate: Number(hourlyRate) || 0 })
        .select().single();
      if (profErr) throw profErr;
      providerProfile = mapProfile(profile);
    }

    const token = jwt.sign({ userId: user.id, role: user.role, isProvider: user.is_provider }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { ...mapUser(user), providerProfile } });
  } catch (err) { res.status(500).json({ error: err.message }); }
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
    const token = jwt.sign({ userId: user.id, role: user.role, isProvider: user.is_provider ?? false }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { ...mapUser(user), providerProfile: mapProfile(profile) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/admin-login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const adminUser = process.env.ADMIN_USER || 'admin';
    const adminPass = process.env.ADMIN_PASSWORD || '123456';

    if (username === adminUser && password === adminPass) {
      const token = jwt.sign({ userId: 'admin', role: 'admin' }, JWT_SECRET, { expiresIn: '30d' });
      return res.json({ token, user: { id: 'admin', name: 'Administrator', role: 'admin' } });
    }
    res.status(401).json({ error: 'Invalid admin credentials' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/auth/me', auth, async (req, res) => {
  try {
    const { data: user } = await supabase
      .from('users').select('id, email, name, role, is_provider, created_at')
      .eq('id', req.user.userId).maybeSingle();
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { data: profile } = await supabase.from('provider_profiles').select('*').eq('user_id', user.id).maybeSingle();
    res.json({ ...mapUser(user), providerProfile: mapProfile(profile) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Booking routes ───────────────────────────────────────────────────────────
app.post('/api/bookings', auth, async (req, res) => {
  try {
    const { cart, district, address, datetime, lang } = req.body;
    if (!cart?.length) return res.status(400).json({ error: 'Cart is empty' });

    const subtotal = cart.reduce((s, i) => s + i.svc.price * i.qty, 0);
    const tax = subtotal * 0.18;
    const fee = 2;

    const providerIds = [...new Set(cart.map(i => i.svc.providerId).filter(Boolean))];
    const preAssignedProvider = providerIds.length === 1 ? providerIds[0] : null;

    const { data: booking, error: bookErr } = await supabase
      .from('bookings')
      .insert({
        code: crypto.randomBytes(4).toString('hex').toUpperCase(),
        customer_id: req.user.userId,
        provider_id: preAssignedProvider,
        service_category: cart[0]?.svc?.cat || 'general',
        status: preAssignedProvider ? 'accepted' : 'pending',
        payment_status: 'unpaid',
        scheduled_date: datetime || null,
        address: address || '',
        district: district || '',
        subtotal, tax, fee, total: subtotal + tax + fee,
      })
      .select().single();
    if (bookErr) throw bookErr;

    const { data: items, error: itemErr } = await supabase
      .from('booking_items')
      .insert(cart.map(i => ({
        booking_id: booking.id,
        service_id: i.svc.id,
        service_name: i.svc.name[lang] || i.svc.name.es,
        price: i.svc.price,
        qty: i.qty,
      })))
      .select();
    if (itemErr) throw itemErr;

    await pushNotification(req.user.userId, 'booking_created',
      lang === 'es' ? '¡Reserva confirmada! 🎉' : 'Booking confirmed! 🎉',
      lang === 'es'
        ? `Tu reserva #${booking.code} fue recibida. Te avisaremos cuando un maestro la acepte.`
        : `Your booking #${booking.code} was received. We'll notify you when a provider accepts it.`
    );

    res.json(mapBooking({ ...booking, booking_items: items }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/bookings', auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, booking_items(*), ratings(stars, type)')
      .eq('customer_id', req.user.userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data.map(mapBooking));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Customer rates the provider's service
app.post('/api/bookings/:id/rate', auth, async (req, res) => {
  try {
    const { stars } = req.body;
    if (!Number.isInteger(stars) || stars < 1 || stars > 5)
      return res.status(400).json({ error: 'Stars must be an integer 1–5' });

    const { data: booking } = await supabase
      .from('bookings').select('id, status, provider_id, customer_id')
      .eq('id', req.params.id).eq('customer_id', req.user.userId).maybeSingle();
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.status !== 'completed') return res.status(400).json({ error: 'Booking is not completed yet' });

    const { data: existing } = await supabase
      .from('ratings').select('id')
      .eq('booking_id', booking.id).eq('type', 'provider_service').maybeSingle();
    if (existing) return res.status(400).json({ error: 'Already rated' });

    const { error } = await supabase.from('ratings').insert({
      booking_id: booking.id,
      rater_id: req.user.userId,
      ratee_id: booking.provider_id,
      stars,
      type: 'provider_service',
    });
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

const mapService = (s) => ({
  id: s.id,
  providerId: s.provider_id,
  providerName: s.provider?.name || null,
  category: s.category,
  cat: s.category,
  name: { es: s.name_es, en: s.name_en },
  desc: { es: s.desc_es || '', en: s.desc_en || '' },
  price: Number(s.price),
  dur: s.duration || '',
  active: s.active,
});

// ─── Services (public) ───────────────────────────────────────────────────────
app.get('/api/services', async (req, res) => {
  try {
    const { category } = req.query;
    let query = supabase
      .from('services')
      .select('*, provider:users!provider_id(name)')
      .eq('active', true)
      .order('created_at', { ascending: false });
    if (category) query = query.eq('category', category);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data.map(mapService));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Provider service listings ────────────────────────────────────────────────
app.get('/api/provider/services', auth, requireProvider, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('services').select('*')
      .eq('provider_id', req.user.userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data.map(mapService));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/provider/services', auth, requireProvider, async (req, res) => {
  try {
    const { nameEs, nameEn, descEs, descEn, price, duration, category } = req.body;
    if (!nameEs || !nameEn || !price) return res.status(400).json({ error: 'Name and price are required' });
    const { data: profile } = await supabase
      .from('provider_profiles').select('category').eq('user_id', req.user.userId).maybeSingle();
    const cat = category || profile?.category || 'general';
    const { data, error } = await supabase
      .from('services')
      .insert({ provider_id: req.user.userId, category: cat, name_es: nameEs, name_en: nameEn, desc_es: descEs || '', desc_en: descEn || '', price: Number(price), duration: duration || '' })
      .select().single();
    if (error) throw error;
    res.json(mapService(data));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/provider/services/:id', auth, requireProvider, async (req, res) => {
  try {
    const { nameEs, nameEn, descEs, descEn, price, duration, active } = req.body;
    const update = {};
    if (nameEs !== undefined) update.name_es = nameEs;
    if (nameEn !== undefined) update.name_en = nameEn;
    if (descEs !== undefined) update.desc_es = descEs;
    if (descEn !== undefined) update.desc_en = descEn;
    if (price !== undefined) update.price = Number(price);
    if (duration !== undefined) update.duration = duration;
    if (active !== undefined) update.active = active;
    const { data, error } = await supabase
      .from('services').update(update)
      .eq('id', req.params.id).eq('provider_id', req.user.userId)
      .select().single();
    if (error) throw error;
    res.json(mapService(data));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/provider/services/:id', auth, requireProvider, async (req, res) => {
  try {
    const { error } = await supabase
      .from('services').delete()
      .eq('id', req.params.id).eq('provider_id', req.user.userId);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
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
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/provider/jobs', auth, requireProvider, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, booking_items(*), ratings(stars, type), customer:users!customer_id(name)')
      .eq('provider_id', req.user.userId)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    res.json(data.map(mapBooking));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/provider/jobs/:id/accept', auth, requireProvider, async (req, res) => {
  try {
    const { data: existing } = await supabase
      .from('bookings').select('id, status').eq('id', req.params.id).maybeSingle();
    if (!existing) return res.status(404).json({ error: 'Booking not found' });
    if (existing.status !== 'pending') return res.status(400).json({ error: 'Job is no longer available' });

    const { data, error } = await supabase
      .from('bookings')
      .update({ provider_id: req.user.userId, status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select('*, booking_items(*)').single();
    if (error) throw error;

    if (data.customer_id) {
      await pushNotification(data.customer_id, 'booking_accepted',
        '¡Maestro en camino! 🔧',
        `Tu reserva #${data.code} fue aceptada. El maestro está listo para atenderte.`
      );
    }

    res.json(mapBooking(data));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/provider/jobs/:id/status', auth, requireProvider, async (req, res) => {
  try {
    const { status } = req.body;
    const { data: booking } = await supabase
      .from('bookings').select('id, status, total')
      .eq('id', req.params.id).eq('provider_id', req.user.userId).maybeSingle();
    if (!booking) return res.status(404).json({ error: 'Job not found' });

    const transitions = { accepted: ['in_progress'], in_progress: ['completed'] };
    if (!transitions[booking.status]?.includes(status))
      return res.status(400).json({ error: `Cannot transition from ${booking.status} to ${status}` });

    const { data, error } = await supabase
      .from('bookings')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select('*, booking_items(*), ratings(stars, type)').single();
    if (error) throw error;

    if (status === 'completed') {
      await supabase.rpc('increment_provider_stats', {
        p_user_id: req.user.userId,
        p_earnings: Number(booking.total),
      });
      if (data.customer_id) {
        await pushNotification(data.customer_id, 'booking_completed',
          '¡Servicio completado! ⭐',
          `Tu reserva #${data.code} fue completada. ¿Cómo estuvo el servicio?`
        );
      }
    } else if (status === 'in_progress') {
      if (data.customer_id) {
        await pushNotification(data.customer_id, 'booking_started',
          '¡El maestro ha llegado! 🏠',
          `Tu reserva #${data.code} está en progreso.`
        );
      }
    }
    res.json(mapBooking(data));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Provider rates the customer's behavior
app.post('/api/provider/jobs/:id/rate-customer', auth, requireProvider, async (req, res) => {
  try {
    const { stars } = req.body;
    if (!Number.isInteger(stars) || stars < 1 || stars > 5)
      return res.status(400).json({ error: 'Stars must be an integer 1–5' });

    const { data: booking } = await supabase
      .from('bookings').select('id, status, customer_id')
      .eq('id', req.params.id).eq('provider_id', req.user.userId).maybeSingle();
    if (!booking) return res.status(404).json({ error: 'Job not found' });
    if (booking.status !== 'completed') return res.status(400).json({ error: 'Job is not completed yet' });

    const { data: existing } = await supabase
      .from('ratings').select('id')
      .eq('booking_id', booking.id).eq('type', 'customer_behavior').maybeSingle();
    if (existing) return res.status(400).json({ error: 'You have already rated this customer for this job' });

    const { error } = await supabase.from('ratings').insert({
      booking_id: booking.id,
      rater_id: req.user.userId,
      ratee_id: booking.customer_id,
      stars,
      type: 'customer_behavior',
    });
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
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
      .gte('updated_at', startOfMonth)
      .order('updated_at', { ascending: false })
      .limit(50);
    if (error) throw error;

    res.json({
      totalEarnings: Number(profile.total_earnings),
      thisMonthEarnings: completedJobs.reduce((s, b) => s + Number(b.total), 0),
      jobsCompleted: profile.jobs_completed,
      rating: Number(profile.rating),
      category: profile.category,
      recentJobs: completedJobs.slice(0, 10).map(mapBooking),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Profile update ───────────────────────────────────────────────────────────
app.patch('/api/profile/me', auth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
    const { data, error } = await supabase
      .from('users').update({ name: name.trim() }).eq('id', req.user.userId)
      .select('id, email, name, role, is_provider, created_at').single();
    if (error) throw error;
    res.json(mapUser(data));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Become provider ──────────────────────────────────────────────────────────
app.post('/api/profile/become-provider', auth, async (req, res) => {
  try {
    if (req.user.isProvider) return res.status(400).json({ error: 'Already a provider' });
    const { category, bio, hourlyRate } = req.body;
    if (!category) return res.status(400).json({ error: 'Category is required' });

    await supabase.from('users').update({ is_provider: true }).eq('id', req.user.userId);

    const { data: existing } = await supabase
      .from('provider_profiles').select('id').eq('user_id', req.user.userId).maybeSingle();

    const profileData = { bio: bio || '', category, hourly_rate: Number(hourlyRate) || 0 };
    const { data: profile, error: profErr } = existing
      ? await supabase.from('provider_profiles').update(profileData).eq('user_id', req.user.userId).select().single()
      : await supabase.from('provider_profiles').insert({ user_id: req.user.userId, ...profileData }).select().single();
    if (profErr) throw profErr;

    const token = jwt.sign({ userId: req.user.userId, role: req.user.role, isProvider: true }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, providerProfile: mapProfile(profile) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Addresses ────────────────────────────────────────────────────────────────
app.get('/api/profile/addresses', auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('addresses').select('*').eq('user_id', req.user.userId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    res.json((data || []).map(a => ({
      id: a.id, label: a.label, address: a.address,
      district: a.district, isDefault: a.is_default,
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/profile/addresses', auth, async (req, res) => {
  try {
    const { label, address, district } = req.body;
    if (!address?.trim() || !district?.trim()) return res.status(400).json({ error: 'Address and district are required' });
    const { data, error } = await supabase
      .from('addresses')
      .insert({ user_id: req.user.userId, label: label?.trim() || 'Home', address: address.trim(), district: district.trim() })
      .select().single();
    if (error) throw error;
    res.json({ id: data.id, label: data.label, address: data.address, district: data.district, isDefault: data.is_default });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/profile/addresses/:id', auth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('addresses').delete()
      .eq('id', req.params.id).eq('user_id', req.user.userId);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Push subscriptions ───────────────────────────────────────────────────────
app.get('/api/push/vapid-public-key', (_, res) => res.json({ key: VAPID_PUBLIC }));

app.post('/api/push/subscribe', auth, async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription?.endpoint) return res.status(400).json({ error: 'Invalid subscription' });
    await supabase.from('push_subscriptions').upsert(
      { user_id: req.user.userId, subscription, endpoint: subscription.endpoint },
      { onConflict: 'endpoint' }
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/push/subscribe', auth, async (req, res) => {
  try {
    const { endpoint } = req.body;
    await supabase.from('push_subscriptions').delete()
      .eq('user_id', req.user.userId).eq('endpoint', endpoint);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Notifications ────────────────────────────────────────────────────────────
app.get('/api/notifications', auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notifications').select('*').eq('user_id', req.user.userId)
      .order('created_at', { ascending: false }).limit(50);
    if (error) throw error;
    res.json((data || []).map(n => ({
      id: n.id, type: n.type, title: n.title, body: n.body,
      read: n.read, createdAt: n.created_at,
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/notifications/read-all', auth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('notifications').update({ read: true })
      .eq('user_id', req.user.userId).eq('read', false);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/notifications/:id/read', auth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('notifications').update({ read: true })
      .eq('id', req.params.id).eq('user_id', req.user.userId);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});


// ─── Profile ratings ──────────────────────────────────────────────────────────
app.get('/api/profile/ratings', auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('ratings')
      .select('stars, type, created_at, booking:bookings(code)')
      .eq('ratee_id', req.user.userId)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const avg = (arr) => arr.length ? arr.reduce((s, r) => s + r.stars, 0) / arr.length : 0;
    const fmt = (arr) => arr.slice(0, 8).map(r => ({
      stars: r.stars,
      bookingCode: r.booking?.code,
      createdAt: r.created_at,
    }));

    const asCustomer = (data || []).filter(r => r.type === 'customer_behavior');
    const asProvider = (data || []).filter(r => r.type === 'provider_service');

    res.json({
      asCustomer: { average: avg(asCustomer), count: asCustomer.length, recent: fmt(asCustomer) },
      asProvider: { average: avg(asProvider), count: asProvider.length, recent: fmt(asProvider) },
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Survey routes ────────────────────────────────────────────────────────────
app.get('/api/surveys/pending', auth, async (req, res) => {
  try {
    const { data: responded } = await supabase
      .from('survey_responses').select('survey_id').eq('user_id', req.user.userId);
    const respondedIds = (responded || []).map(r => r.survey_id);

    let query = supabase.from('surveys').select('*').eq('active', true).order('created_at', { ascending: false });
    if (respondedIds.length > 0) query = query.not('id', 'in', `(${respondedIds.join(',')})`);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/surveys/:id/respond', auth, async (req, res) => {
  try {
    const { answers } = req.body;
    const { error } = await supabase
      .from('survey_responses')
      .insert({ survey_id: req.params.id, user_id: req.user.userId, answers });
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Admin routes ─────────────────────────────────────────────────────────────
app.get('/api/admin/users', auth, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users').select('id, email, name, role, is_provider, created_at').order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data.map(mapUser));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/admin/users/:id', auth, requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['customer', 'provider', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
    const update = role === 'provider'
      ? { role: 'customer', is_provider: true }
      : role === 'customer'
        ? { role: 'customer', is_provider: false }
        : { role: 'admin' };
    const { data, error } = await supabase
      .from('users').update(update).eq('id', req.params.id)
      .select('id, email, name, role, is_provider, created_at').single();
    if (error) throw error;
    res.json(mapUser(data));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/surveys', auth, requireAdmin, async (req, res) => {
  try {
    const { data: surveys, error } = await supabase
      .from('surveys').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    const { data: counts } = await supabase.from('survey_responses').select('survey_id');
    const countMap = {};
    (counts || []).forEach(r => { countMap[r.survey_id] = (countMap[r.survey_id] || 0) + 1; });
    res.json(surveys.map(s => ({ ...s, responseCount: countMap[s.id] || 0 })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/surveys', auth, requireAdmin, async (req, res) => {
  try {
    const { title, description, questions } = req.body;
    if (!title || !questions?.length) return res.status(400).json({ error: 'Title and at least one question are required' });
    const { data, error } = await supabase
      .from('surveys').insert({ title, description: description || '', questions }).select().single();
    if (error) throw error;
    res.json({ ...data, responseCount: 0 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/surveys/:id/results', auth, requireAdmin, async (req, res) => {
  try {
    const { data: survey, error: surveyErr } = await supabase
      .from('surveys').select('*').eq('id', req.params.id).single();
    if (surveyErr || !survey) return res.status(404).json({ error: 'Survey not found' });

    const { data: responses, error: respErr } = await supabase
      .from('survey_responses')
      .select('answers, created_at, user:users(name, email)')
      .eq('survey_id', req.params.id)
      .order('created_at', { ascending: false });
    if (respErr) throw respErr;

    // Aggregate per question
    const aggregated = {};
    for (const q of survey.questions) {
      aggregated[q.id] = { question: q, answers: [] };
    }
    for (const resp of (responses || [])) {
      for (const [qId, answer] of Object.entries(resp.answers || {})) {
        if (aggregated[qId]) aggregated[qId].answers.push(answer);
      }
    }

    res.json({ survey, responseCount: (responses || []).length, aggregated: Object.values(aggregated) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/admin/surveys/:id', auth, requireAdmin, async (req, res) => {
  try {
    const { active } = req.body;
    const { data, error } = await supabase
      .from('surveys').update({ active }).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/ratings', auth, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase.from('ratings').select('stars, type');
    if (error) throw error;

    const aggregate = (arr) => {
      const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      arr.forEach(r => counts[r.stars]++);
      const total = arr.length;
      return { counts, total, average: total ? arr.reduce((s, r) => s + r.stars, 0) / total : 0 };
    };

    res.json({
      providerService: aggregate((data || []).filter(r => r.type === 'provider_service')),
      customerBehavior: aggregate((data || []).filter(r => r.type === 'customer_behavior')),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
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
  } catch (err) { res.status(500).json({ error: err.message }); }
});
