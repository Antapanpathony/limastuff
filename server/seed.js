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

const DEFAULT_CUSTOMER = {
  name: 'Demo Customer',
  email: 'customer@demo.pe',
  category: 'general',
  bio: 'Cuenta demo con servicios de ejemplo en múltiples categorías.',
  hourlyRate: 40,
  services: [
    {
      nameEs: 'Limpieza de hogar',
      nameEn: 'Home cleaning',
      descEs: 'Servicio de limpieza general del hogar.',
      descEn: 'General home cleaning service.',
      price: 100,
      duration: '2h',
      category: 'cleaning',
    },
    {
      nameEs: 'Instalación eléctrica básica',
      nameEn: 'Basic electrical installation',
      descEs: 'Instalación de tomacorrientes e interruptores.',
      descEn: 'Outlet and switch installation.',
      price: 60,
      duration: '1h',
      category: 'electrician',
    },
    {
      nameEs: 'Gasfitería general',
      nameEn: 'General plumbing',
      descEs: 'Reparación y mantenimiento de tuberías y grifos.',
      descEn: 'Pipe and tap repair and maintenance.',
      price: 70,
      duration: '1.5h',
      category: 'plumbing',
    },
  ],
};

const PROVIDERS = [
  {
    name: 'María García',
    email: 'maria.garcia@lima.pe',
    category: 'cleaning',
    bio: 'Especialista en limpieza de hogares y oficinas con 5 años de experiencia.',
    hourlyRate: 40,
    services: [
      {
        nameEs: 'Limpieza de hogar completa',
        nameEn: 'Complete home cleaning',
        descEs: 'Limpieza general del hogar incluyendo pisos, baños y cocina.',
        descEn: 'General home cleaning including floors, bathrooms and kitchen.',
        price: 120,
        duration: '3h',
      },
      {
        nameEs: 'Limpieza de ventanas',
        nameEn: 'Window cleaning',
        descEs: 'Limpieza interior y exterior de ventanas y vidrios.',
        descEn: 'Interior and exterior window and glass cleaning.',
        price: 60,
        duration: '1.5h',
      },
      {
        nameEs: 'Limpieza post-obra',
        nameEn: 'Post-construction cleaning',
        descEs: 'Limpieza profunda tras remodelaciones o construcción.',
        descEn: 'Deep cleaning after renovation or construction work.',
        price: 200,
        duration: '5h',
      },
    ],
  },
  {
    name: 'Carlos Rodríguez',
    email: 'carlos.rodriguez@lima.pe',
    category: 'plumbing',
    bio: 'Gasfitero certificado con experiencia en instalaciones y reparaciones.',
    hourlyRate: 50,
    services: [
      {
        nameEs: 'Instalación y reparación de cañerías',
        nameEn: 'Pipe installation and repair',
        descEs: 'Instalación, reparación y mantenimiento de tuberías y grifos.',
        descEn: 'Installation, repair and maintenance of pipes and taps.',
        price: 80,
        duration: '2h',
      },
      {
        nameEs: 'Destape de desagüe',
        nameEn: 'Drain unclogging',
        descEs: 'Destape de tuberías y desagües obstruidos.',
        descEn: 'Unclogging of blocked pipes and drains.',
        price: 50,
        duration: '1h',
      },
      {
        nameEs: 'Instalación de calentador de agua',
        nameEn: 'Water heater installation',
        descEs: 'Instalación y conexión de termas y calentadores de agua.',
        descEn: 'Installation and connection of water heaters and boilers.',
        price: 150,
        duration: '3h',
      },
    ],
  },
  {
    name: 'Luis Fernández',
    email: 'luis.fernandez@lima.pe',
    category: 'electrician',
    bio: 'Electricista con certificación técnica y 8 años en el rubro.',
    hourlyRate: 55,
    services: [
      {
        nameEs: 'Instalación eléctrica residencial',
        nameEn: 'Residential electrical installation',
        descEs: 'Instalación de tomacorrientes, interruptores y tableros eléctricos.',
        descEn: 'Installation of outlets, switches and electrical panels.',
        price: 70,
        duration: '1.5h',
      },
      {
        nameEs: 'Revisión y diagnóstico eléctrico',
        nameEn: 'Electrical inspection and diagnosis',
        descEs: 'Revisión completa del sistema eléctrico del hogar.',
        descEn: 'Full inspection of the home electrical system.',
        price: 50,
        duration: '1h',
      },
      {
        nameEs: 'Instalación de luminarias y focos',
        nameEn: 'Light fixture installation',
        descEs: 'Instalación de lámparas, spots y luminarias LED.',
        descEn: 'Installation of lamps, spotlights and LED fixtures.',
        price: 40,
        duration: '45min',
      },
    ],
  },
  {
    name: 'José Martínez',
    email: 'jose.martinez@lima.pe',
    category: 'cerrajeria',
    bio: 'Cerrajero profesional disponible para emergencias las 24 horas.',
    hourlyRate: 45,
    services: [
      {
        nameEs: 'Apertura de puertas sin llave',
        nameEn: 'Lockout door opening',
        descEs: 'Apertura de puertas residenciales y comerciales sin daños.',
        descEn: 'Residential and commercial door opening without damage.',
        price: 50,
        duration: '30min',
      },
      {
        nameEs: 'Cambio de chapa y cerradura',
        nameEn: 'Lock replacement',
        descEs: 'Cambio e instalación de cerraduras de seguridad.',
        descEn: 'Replacement and installation of security locks.',
        price: 80,
        duration: '1h',
      },
      {
        nameEs: 'Duplicado de llaves',
        nameEn: 'Key duplication',
        descEs: 'Copia de llaves de todo tipo, incluyendo llaves de seguridad.',
        descEn: 'Duplication of all types of keys, including security keys.',
        price: 20,
        duration: '15min',
      },
    ],
  },
  {
    name: 'Ana Torres',
    email: 'ana.torres@lima.pe',
    category: 'painting',
    bio: 'Pintora de interiores con acabados de alta calidad y colores a pedido.',
    hourlyRate: 35,
    services: [
      {
        nameEs: 'Pintura de habitación completa',
        nameEn: 'Full room painting',
        descEs: 'Pintura completa de habitación con dos manos y preparación de superficie.',
        descEn: 'Full room painting with two coats and surface preparation.',
        price: 250,
        duration: '6h',
      },
      {
        nameEs: 'Pintura de fachada exterior',
        nameEn: 'Exterior facade painting',
        descEs: 'Pintura y retoque de fachadas exteriores resistente a la intemperie.',
        descEn: 'Weather-resistant painting and touch-up of exterior facades.',
        price: 400,
        duration: '8h',
      },
      {
        nameEs: 'Empapelado de paredes',
        nameEn: 'Wallpaper installation',
        descEs: 'Instalación de papel tapiz y vinílicos decorativos.',
        descEn: 'Installation of wallpaper and decorative vinyl.',
        price: 180,
        duration: '4h',
      },
    ],
  },
  {
    name: 'Roberto Sánchez',
    email: 'roberto.sanchez@lima.pe',
    category: 'moving',
    bio: 'Servicio de mudanzas local con camión propio y personal capacitado.',
    hourlyRate: 60,
    services: [
      {
        nameEs: 'Mudanza local en Lima',
        nameEn: 'Local moving in Lima',
        descEs: 'Mudanza dentro de Lima con carga, transporte y descarga incluidos.',
        descEn: 'Moving within Lima including loading, transport and unloading.',
        price: 200,
        duration: '4h',
      },
      {
        nameEs: 'Transporte de muebles',
        nameEn: 'Furniture transport',
        descEs: 'Traslado seguro de muebles y electrodomésticos grandes.',
        descEn: 'Safe transport of furniture and large appliances.',
        price: 120,
        duration: '2h',
      },
      {
        nameEs: 'Embalaje profesional',
        nameEn: 'Professional packing',
        descEs: 'Embalaje y etiquetado profesional de todos tus objetos.',
        descEn: 'Professional packing and labeling of all your belongings.',
        price: 80,
        duration: '2h',
      },
    ],
  },
  {
    name: 'Carmen López',
    email: 'carmen.lopez@lima.pe',
    category: 'beauty',
    bio: 'Estilista profesional que ofrece servicios de belleza a domicilio.',
    hourlyRate: 45,
    services: [
      {
        nameEs: 'Corte y peinado a domicilio',
        nameEn: 'Home haircut and styling',
        descEs: 'Corte de cabello y peinado profesional en la comodidad de tu hogar.',
        descEn: 'Professional haircut and styling in the comfort of your home.',
        price: 60,
        duration: '1h',
      },
      {
        nameEs: 'Manicure y pedicure',
        nameEn: 'Manicure and pedicure',
        descEs: 'Cuidado completo de uñas de manos y pies con esmaltado.',
        descEn: 'Complete nail care for hands and feet with polish.',
        price: 50,
        duration: '1.5h',
      },
      {
        nameEs: 'Maquillaje profesional',
        nameEn: 'Professional makeup',
        descEs: 'Maquillaje para eventos, bodas y ocasiones especiales.',
        descEn: 'Makeup for events, weddings and special occasions.',
        price: 80,
        duration: '1h',
      },
    ],
  },
];

async function seed() {
  console.log('Seeding default data...\n');
  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  let created = 0;
  let skipped = 0;

  // Seed default customer account (also seeded as a provider with demo services)
  const { data: existingCustomer } = await supabase
    .from('users').select('id').eq('email', DEFAULT_CUSTOMER.email).maybeSingle();
  if (existingCustomer) {
    console.log(`  SKIP  ${DEFAULT_CUSTOMER.email} (already exists)`);
    skipped++;
  } else {
    const { data: custUser, error: custErr } = await supabase
      .from('users')
      .insert({ email: DEFAULT_CUSTOMER.email, name: DEFAULT_CUSTOMER.name, role: 'customer', is_provider: true, password: hashedPassword })
      .select('id').single();
    if (custErr) {
      console.error(`  ERROR creating customer ${DEFAULT_CUSTOMER.email}:`, custErr.message);
    } else {
      const { error: profErr } = await supabase
        .from('provider_profiles')
        .insert({ user_id: custUser.id, bio: DEFAULT_CUSTOMER.bio, category: DEFAULT_CUSTOMER.category, hourly_rate: DEFAULT_CUSTOMER.hourlyRate });
      if (profErr) {
        console.error(`  ERROR creating profile for ${DEFAULT_CUSTOMER.email}:`, profErr.message);
      } else {
        const svcRows = DEFAULT_CUSTOMER.services.map(s => ({
          provider_id: custUser.id,
          category: s.category,
          name_es: s.nameEs,
          name_en: s.nameEn,
          desc_es: s.descEs,
          desc_en: s.descEn,
          price: s.price,
          duration: s.duration,
          active: true,
        }));
        const { error: svcErr } = await supabase.from('services').insert(svcRows);
        if (svcErr) {
          console.error(`  ERROR creating services for ${DEFAULT_CUSTOMER.email}:`, svcErr.message);
        } else {
          console.log(`  OK    ${DEFAULT_CUSTOMER.email} — customer + provider (${DEFAULT_CUSTOMER.services.length} services)`);
          created++;
        }
      }
    }
  }

  // Seed providers
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

    const serviceRows = p.services.map(s => ({
      provider_id: user.id,
      category: p.category,
      name_es: s.nameEs,
      name_en: s.nameEn,
      desc_es: s.descEs,
      desc_en: s.descEn,
      price: s.price,
      duration: s.duration,
      active: true,
    }));
    const { error: svcErr } = await supabase.from('services').insert(serviceRows);
    if (svcErr) { console.error(`  ERROR creating services for ${p.email}:`, svcErr.message); continue; }

    console.log(`  OK    ${p.email} — ${p.category} (${p.services.length} services)`);
    created++;
  }

  console.log(`\nDone. Created: ${created}, Skipped: ${skipped}`);
  console.log(`Default password for all accounts: ${DEFAULT_PASSWORD}`);
  console.log(`\nDemo accounts:`);
  console.log(`  Customer: ${DEFAULT_CUSTOMER.email} / ${DEFAULT_PASSWORD}`);
  PROVIDERS.forEach(p => console.log(`  Provider: ${p.email} / ${DEFAULT_PASSWORD} (${p.category})`));
}

seed().catch(err => { console.error(err); process.exit(1); });
