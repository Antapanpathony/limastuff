/*
  Seed script — inserts one default provider user + service per category.
  Run with: npm run seed

  Requires the same env vars as the server (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).
  Safe to run multiple times — skips existing emails.
*/

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DEFAULT_PASSWORD = 'password123';

const PROVIDERS = [
  {
    name: 'María García',
    email: 'maria.garcia@lima.pe',
    category: 'cleaning',
    bio: 'Especialista en limpieza de hogares y oficinas con 5 años de experiencia.',
    hourlyRate: 40,
    service: {
      nameEs: 'Limpieza de hogar completa',
      nameEn: 'Complete home cleaning',
      descEs: 'Limpieza general del hogar incluyendo pisos, baños y cocina.',
      descEn: 'General home cleaning including floors, bathrooms and kitchen.',
      price: 120,
      duration: '3h',
    },
  },
  {
    name: 'Carlos Rodríguez',
    email: 'carlos.rodriguez@lima.pe',
    category: 'plumbing',
    bio: 'Gasfitero certificado con experiencia en instalaciones y reparaciones.',
    hourlyRate: 50,
    service: {
      nameEs: 'Instalación y reparación de cañerías',
      nameEn: 'Pipe installation and repair',
      descEs: 'Instalación, reparación y mantenimiento de tuberías y grifos.',
      descEn: 'Installation, repair and maintenance of pipes and taps.',
      price: 80,
      duration: '2h',
    },
  },
  {
    name: 'Luis Fernández',
    email: 'luis.fernandez@lima.pe',
    category: 'electrician',
    bio: 'Electricista con certificación técnica y 8 años en el rubro.',
    hourlyRate: 55,
    service: {
      nameEs: 'Instalación eléctrica residencial',
      nameEn: 'Residential electrical installation',
      descEs: 'Instalación de tomacorrientes, interruptores y tableros eléctricos.',
      descEn: 'Installation of outlets, switches and electrical panels.',
      price: 70,
      duration: '1.5h',
    },
  },
  {
    name: 'José Martínez',
    email: 'jose.martinez@lima.pe',
    category: 'cerrajeria',
    bio: 'Cerrajero profesional disponible para emergencias las 24 horas.',
    hourlyRate: 45,
    service: {
      nameEs: 'Apertura de puertas sin llave',
      nameEn: 'Lockout door opening',
      descEs: 'Apertura de puertas residenciales y comerciales sin daños.',
      descEn: 'Residential and commercial door opening without damage.',
      price: 50,
      duration: '30min',
    },
  },
  {
    name: 'Ana Torres',
    email: 'ana.torres@lima.pe',
    category: 'painting',
    bio: 'Pintora de interiores con acabados de alta calidad y colores a pedido.',
    hourlyRate: 35,
    service: {
      nameEs: 'Pintura de habitación completa',
      nameEn: 'Full room painting',
      descEs: 'Pintura completa de habitación con dos manos y preparación de superficie.',
      descEn: 'Full room painting with two coats and surface preparation.',
      price: 250,
      duration: '6h',
    },
  },
  {
    name: 'Roberto Sánchez',
    email: 'roberto.sanchez@lima.pe',
    category: 'moving',
    bio: 'Servicio de mudanzas local con camión propio y personal capacitado.',
    hourlyRate: 60,
    service: {
      nameEs: 'Mudanza local en Lima',
      nameEn: 'Local moving in Lima',
      descEs: 'Mudanza dentro de Lima con carga, transporte y descarga incluidos.',
      descEn: 'Moving within Lima including loading, transport and unloading.',
      price: 200,
      duration: '4h',
    },
  },
  {
    name: 'Carmen López',
    email: 'carmen.lopez@lima.pe',
    category: 'beauty',
    bio: 'Estilista profesional que ofrece servicios de belleza a domicilio.',
    hourlyRate: 45,
    service: {
      nameEs: 'Corte y peinado a domicilio',
      nameEn: 'Home haircut and styling',
      descEs: 'Corte de cabello y peinado profesional en la comodidad de tu hogar.',
      descEn: 'Professional haircut and styling in the comfort of your home.',
      price: 60,
      duration: '1h',
    },
  },
];

async function seed() {
  console.log('Seeding default providers...\n');
  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  let created = 0;
  let skipped = 0;

  for (const p of PROVIDERS) {
    const { data: existing } = await supabase
      .from('users').select('id').eq('email', p.email).maybeSingle();

    if (existing) {
      console.log(`  SKIP  ${p.email} (already exists)`);
      skipped++;
      continue;
    }

    const { data: user, error: userErr } = await supabase
      .from('users')
      .insert({ email: p.email, name: p.name, role: 'customer', is_provider: true, password: hashedPassword })
      .select('id').single();
    if (userErr) { console.error(`  ERROR creating user ${p.email}:`, userErr.message); continue; }

    const { error: profErr } = await supabase
      .from('provider_profiles')
      .insert({ user_id: user.id, bio: p.bio, category: p.category, hourly_rate: p.hourlyRate });
    if (profErr) { console.error(`  ERROR creating profile for ${p.email}:`, profErr.message); continue; }

    const { error: svcErr } = await supabase
      .from('services')
      .insert({
        provider_id: user.id,
        category: p.category,
        name_es: p.service.nameEs,
        name_en: p.service.nameEn,
        desc_es: p.service.descEs,
        desc_en: p.service.descEn,
        price: p.service.price,
        duration: p.service.duration,
        active: true,
      });
    if (svcErr) { console.error(`  ERROR creating service for ${p.email}:`, svcErr.message); continue; }

    console.log(`  OK    ${p.email} — ${p.category}`);
    created++;
  }

  console.log(`\nDone. Created: ${created}, Skipped: ${skipped}`);
  console.log(`Default password for all new accounts: ${DEFAULT_PASSWORD}`);
}

seed().catch(err => { console.error(err); process.exit(1); });
