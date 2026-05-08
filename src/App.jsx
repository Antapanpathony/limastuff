import React, { useState, useEffect, useRef } from "react";
import {
  Home,
  Calendar,
  User,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Bell,
  MapPin,
  Plus,
  Minus,
  CheckCircle,
  LogOut,
  Send,
  X,
  Languages,
  Briefcase,
  ShieldCheck,
  Star,
  Trash2,
} from "lucide-react";
import { api } from "./api";
import ProviderDashboard from "./ProviderDashboard";
import AdminDashboard from "./AdminDashboard";

// ─── Constants ─────────────────────────────────────────────────────────────
const DISTRICTS = [
  "Miraflores",
  "San Isidro",
  "Barranco",
  "Surco",
  "La Molina",
  "San Borja",
  "Magdalena",
  "Jesús María",
  "Lince",
];

const CATEGORIES = [
  { slug: "cleaning", name: { es: "Limpieza", en: "Cleaning" }, icon: "✨" },
  { slug: "plumbing", name: { es: "Gasfitería", en: "Plumbing" }, icon: "🔧" },
  { slug: "electrician", name: { es: "Electricista", en: "Electrician" }, icon: "⚡" },
  { slug: "beauty", name: { es: "Belleza", en: "Beauty" }, icon: "✂️" },
  { slug: "painting", name: { es: "Pintura", en: "Painting" }, icon: "🎨" },
  { slug: "moving", name: { es: "Mudanza", en: "Moving" }, icon: "🚛" },
];

const SERVICES = [];

const DICT = {
  es: {
    app_name: "PeruServ",
    location: "Ubicación actual",
    banner_badge: "NUEVO EN LIMA",
    banner_title: "Tu casa, como nueva.",
    banner_sub: "20% dscto. en tu primera limpieza profunda.",
    banner_btn: "Reservar ahora",
    pop_services: "Servicios Populares",
    ai_cta_title: "¿Dudas con tu reparación?",
    ai_cta_sub: "Consulta al Maestro IA",
    ai_cta_btn: "Chatear",
    nav_home: "Inicio",
    nav_bookings: "Reservas",
    nav_jobs: "Trabajos",
    nav_profile: "Perfil",
    view_cart: "Ver carrito",
    add_btn: "+ Agregar",
    summary: "Resumen de Reserva",
    selected_svcs: "Servicios seleccionados",
    address_title: "Dirección del servicio",
    district_label: "Distrito",
    address_placeholder: "Ej: Av. Larco 345, Dpto 201",
    datetime_title: "Fecha y Hora",
    payment_detail: "Detalle de Pago",
    subtotal: "Subtotal",
    tax: "IGV (18%)",
    fee: "Tarifa",
    total: "Total",
    confirm_btn: "Confirmar Reserva",
    processing: "Procesando...",
    payment_soon_title: "Pago en línea",
    payment_soon_body: "El pago en línea estará disponible próximamente. Por ahora, acuerda el pago directamente con el maestro al finalizar el servicio.",
    empty_cart: "Tu carrito está vacío",
    explore: "Explorar servicios",
    my_bookings: "Mis Reservas",
    no_bookings: "No tienes reservas aún",
    login_required: "Inicia sesión para continuar",
    login_btn: "Iniciar sesión",
    welcome: "Bienvenido",
    login_sub: "Inicia sesión en PeruServ",
    email: "Email",
    password: "Contraseña",
    no_account: "¿No tienes cuenta?",
    register: "Regístrate",
    create_account: "Crear cuenta",
    full_name: "Nombre completo",
    have_account: "¿Ya tienes cuenta?",
    logout: "Cerrar sesión",
    settings: "Configuración",
    virtual_master: "Maestro Virtual",
    ai_sub: "Potenciado por Gemini IA",
    ai_intro: "¡Hola jefe/a! Soy el Maestro Virtual ✨. ¿En qué le ayudo hoy?",
    ai_thinking: "El maestro está pensando...",
    toast_added: "agregado al carrito",
    toast_confirmed: "¡Reserva confirmada! 🎉",
    status_pending: "Pendiente",
    status_accepted: "Aceptado",
    status_in_progress: "En Progreso",
    status_confirmed: "Confirmada",
    status_completed: "Completado",
    status_cancelled: "Cancelado",
    need_services: "Necesito servicios",
    offer_services: "Ofrezco servicios",
    specialty: "Especialidad",
    bio: "Descripción breve",
    bio_placeholder: "Ej: Gasfitero con 10 años de experiencia en Lima",
    provider_badge: "Modo Maestro",
    setting_account: "Información de Cuenta",
    setting_addresses: "Direcciones Guardadas",
    setting_notifications: "Notificaciones",
    setting_language: "Idioma",
    acct_title: "Información de Cuenta",
    acct_name: "Nombre completo",
    acct_email: "Email",
    acct_email_note: "El email no se puede cambiar",
    acct_save: "Guardar cambios",
    acct_saving: "Guardando...",
    acct_saved: "¡Cambios guardados!",
    addr_title: "Direcciones Guardadas",
    addr_empty: "No tienes direcciones guardadas",
    addr_add: "Agregar dirección",
    addr_label: "Etiqueta (ej: Casa, Trabajo)",
    addr_address: "Dirección",
    addr_district: "Distrito",
    addr_save: "Guardar",
    addr_cancel: "Cancelar",
    addr_delete: "Eliminar",
    notif_title: "Notificaciones",
    notif_empty: "Sin notificaciones aún",
    notif_mark_all: "Marcar todo como leído",
  },
  en: {
    app_name: "PeruServ",
    location: "Current Location",
    banner_badge: "NEW IN LIMA",
    banner_title: "Your home, like new.",
    banner_sub: "20% off on your first deep cleaning.",
    banner_btn: "Book Now",
    pop_services: "Popular Services",
    ai_cta_title: "Repairs questions?",
    ai_cta_sub: "Ask the AI Master",
    ai_cta_btn: "Chat",
    nav_home: "Home",
    nav_bookings: "Bookings",
    nav_jobs: "Jobs",
    nav_profile: "Profile",
    view_cart: "View Cart",
    add_btn: "+ Add",
    summary: "Booking Summary",
    selected_svcs: "Selected Services",
    address_title: "Service Address",
    district_label: "District",
    address_placeholder: "Ex: Larco Ave 345, Apt 201",
    datetime_title: "Date & Time",
    payment_detail: "Payment Details",
    subtotal: "Subtotal",
    tax: "Tax (18%)",
    fee: "Service Fee",
    total: "Total",
    confirm_btn: "Confirm Booking",
    processing: "Processing...",
    payment_soon_title: "Online Payment",
    payment_soon_body: "Online payment is coming soon. For now, arrange payment directly with your provider when the service is complete.",
    empty_cart: "Your cart is empty",
    explore: "Explore services",
    my_bookings: "My Bookings",
    no_bookings: "You have no bookings yet",
    login_required: "Please log in to continue",
    login_btn: "Log In",
    welcome: "Welcome",
    login_sub: "Sign in to PeruServ",
    email: "Email",
    password: "Password",
    no_account: "Don't have an account?",
    register: "Sign Up",
    create_account: "Create Account",
    full_name: "Full Name",
    have_account: "Already have an account?",
    logout: "Log Out",
    settings: "Settings",
    virtual_master: "Virtual Master",
    ai_sub: "Powered by Gemini AI",
    ai_intro: "Hello boss! I'm the Virtual Master ✨. How can I help you today?",
    ai_thinking: "The master is thinking...",
    toast_added: "added to cart",
    toast_confirmed: "Booking confirmed! 🎉",
    status_pending: "Pending",
    status_accepted: "Accepted",
    status_in_progress: "In Progress",
    status_confirmed: "Confirmed",
    status_completed: "Completed",
    status_cancelled: "Cancelled",
    need_services: "I need services",
    offer_services: "I offer services",
    specialty: "Specialty",
    bio: "Short description",
    bio_placeholder: "Ex: Plumber with 10 years of experience in Lima",
    provider_badge: "Provider Mode",
    setting_account: "Account Info",
    setting_addresses: "Saved Addresses",
    setting_notifications: "Notifications",
    setting_language: "Language",
    acct_title: "Account Info",
    acct_name: "Full name",
    acct_email: "Email",
    acct_email_note: "Email cannot be changed",
    acct_save: "Save changes",
    acct_saving: "Saving...",
    acct_saved: "Changes saved!",
    addr_title: "Saved Addresses",
    addr_empty: "No saved addresses yet",
    addr_add: "Add address",
    addr_label: "Label (e.g. Home, Work)",
    addr_address: "Address",
    addr_district: "District",
    addr_save: "Save",
    addr_cancel: "Cancel",
    addr_delete: "Delete",
    notif_title: "Notifications",
    notif_empty: "No notifications yet",
    notif_mark_all: "Mark all as read",
  },
};

const ls = {
  get: (k) => {
    try {
      return JSON.parse(localStorage.getItem(k));
    } catch {
      return null;
    }
  },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
  del: (k) => localStorage.removeItem(k),
};

// ─── Page context builder for AI ───────────────────────────────────────────
function getPageContext({ page, catSlug, cart, lang }) {
  switch (page) {
    case "home":
      return `The user is on the PeruServ Home page.
Available service categories: ${CATEGORIES.map(c => `${c.icon} ${c.name[lang]} (${c.slug})`).join(", ")}.
Featured services:
${SERVICES.map(s => `- ${s.name[lang]}: ${s.desc[lang]} Price: S/${s.price}. Duration: ${s.dur}. Rating: ${s.stars}★ (${s.reviews} reviews).`).join("\n")}`;

    case "category": {
      const cat = CATEGORIES.find(c => c.slug === catSlug);
      const svcs = SERVICES.filter(s => s.cat === catSlug);
      return `The user is browsing the ${cat?.name[lang] || catSlug} category.
Services shown on screen:
${svcs.map(s => `- ${s.name[lang]}: ${s.desc[lang]} Price: S/${s.price}. Duration: ${s.dur}. Rating: ${s.stars}★ (${s.reviews} reviews).`).join("\n")}`;
    }

    case "checkout": {
      if (!cart.length) return "The user is on the checkout page with an empty cart.";
      const subtotal = cart.reduce((s, i) => s + i.svc.price * i.qty, 0);
      const tax = subtotal * 0.18;
      const total = subtotal + tax + 2;
      return `The user is reviewing their booking before confirming.
Items in cart:
${cart.map(i => `- ${i.qty}x ${i.svc.name[lang]}: ${i.svc.desc[lang]} @ S/${i.svc.price} each.`).join("\n")}
Subtotal: S/${subtotal.toFixed(2)}, Tax (18%): S/${tax.toFixed(2)}, Fee: S/2.00, Total: S/${total.toFixed(2)}.`;
    }

    case "bookings":
      return "The user is on their Bookings page, viewing their service booking history.";

    case "profile":
      return "The user is on their Profile page, viewing their account details and ratings.";

    case "provider-dashboard":
      return "The user is a service provider viewing their job dashboard, active jobs, and earnings.";

    default:
      return "The user is on PeruServ, a home services app for Lima, Peru.";
  }
}

// ─── App Component ─────────────────────────────────────────────────────────
export default function App() {
  const [lang, setLang] = useState(() => ls.get("ps_lang") || "es");
  const [page, setPage] = useState(() =>
    window.location.pathname === '/admin' ? 'admin' : 'home'
  );
  const [catSlug, setCatSlug] = useState(null);
  const [user, setUser] = useState(() => ls.get("ps_user"));
  const [cart, setCart] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [toast, setToast] = useState(null);
  const [pendingSurveys, setPendingSurveys] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const t = (key) => DICT[lang][key] || key;

  useEffect(() => { ls.set("ps_lang", lang); }, [lang]);

  useEffect(() => {
    if (!user) { setPendingSurveys([]); setUnreadCount(0); return; }
    api.getPendingSurveys().then(setPendingSurveys).catch(() => {});
    api.getNotifications().then(ns => setUnreadCount(ns.filter(n => !n.read).length)).catch(() => {});
  }, [user]);

  // Sync browser back/forward with /admin URL
  useEffect(() => {
    const onPop = () => setPage(window.location.pathname === '/admin' ? 'admin' : 'home');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const nav = (p, opts = {}) => {
    setPage(p);
    if (opts.cat) setCatSlug(opts.cat);
    window.scrollTo(0, 0);
    const url = p === 'admin' ? '/admin' : '/';
    if (window.location.pathname !== url) history.pushState({}, '', url);
  };

  const toggleLang = () => setLang((l) => (l === "es" ? "en" : "es"));

  const handleLogin = (userData) => {
    ls.set("ps_user", userData);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem("ps_token");
    ls.del("ps_user");
    setUser(null);
    setCart([]);
    nav("home");
  };

  const addToCart = (svc) => {
    setCart((p) => {
      const ex = p.find((i) => i.svc.id === svc.id);
      return ex
        ? p.map((i) => (i.svc.id === svc.id ? { ...i, qty: i.qty + 1 } : i))
        : [...p, { svc, qty: 1 }];
    });
    notify(`"${svc.name[lang]}" ${t("toast_added")} ✓`);
  };

  const setQty = (id, qty) => {
    if (qty < 1) {
      setCart((p) => p.filter((i) => i.svc.id !== id));
      return;
    }
    setCart((p) => p.map((i) => (i.svc.id === id ? { ...i, qty } : i)));
  };

  const cartTotal = cart.reduce((s, i) => s + i.svc.price * i.qty, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const isAuthPage = ["login", "register"].includes(page);
  const isProvider = user?.role === "provider";

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 relative shadow-2xl overflow-x-hidden font-sans pb-20">
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-full text-sm z-50 shadow-lg animate-bounce">
          {toast}
        </div>
      )}

      <main className={isAuthPage ? "pb-0" : ""}>
        {page === "home" && (
          <HomePage
            nav={nav}
            setShowChat={setShowChat}
            t={t}
            lang={lang}
            toggleLang={toggleLang}
            user={user}
            unreadCount={unreadCount}
          />
        )}
        {page === "category" && (
          <CategoryPage
            slug={catSlug}
            nav={nav}
            addToCart={addToCart}
            t={t}
            lang={lang}
            toggleLang={toggleLang}
          />
        )}
        {page === "checkout" && (
          <CheckoutPage
            cart={cart}
            user={user}
            nav={nav}
            clearCart={() => setCart([])}
            setQty={setQty}
            notify={notify}
            t={t}
            lang={lang}
            toggleLang={toggleLang}
          />
        )}
        {page === "bookings" && (
          <BookingsPage
            nav={nav}
            user={user}
            t={t}
            lang={lang}
            toggleLang={toggleLang}
          />
        )}
        {page === "provider-dashboard" && (
          <ProviderDashboard
            user={user}
            nav={nav}
            lang={lang}
            toggleLang={toggleLang}
            notify={notify}
          />
        )}
        {page === "admin" && (
          <AdminDashboard
            user={user}
            nav={nav}
            lang={lang}
            toggleLang={toggleLang}
          />
        )}
        {page === "profile" && (
          <ProfilePage
            user={user}
            logout={handleLogout}
            nav={nav}
            notify={notify}
            t={t}
            lang={lang}
            toggleLang={toggleLang}
          />
        )}
        {page === "account-info" && (
          <AccountInfoPage
            user={user}
            setUser={(u) => { ls.set("ps_user", u); setUser(u); }}
            nav={nav}
            notify={notify}
            t={t}
            lang={lang}
            toggleLang={toggleLang}
          />
        )}
        {page === "saved-addresses" && (
          <SavedAddressesPage
            nav={nav}
            notify={notify}
            t={t}
            lang={lang}
            toggleLang={toggleLang}
          />
        )}
        {page === "notifications" && (
          <NotificationsPage
            nav={nav}
            notify={notify}
            t={t}
            lang={lang}
            toggleLang={toggleLang}
            setUnreadCount={setUnreadCount}
          />
        )}
        {page === "login" && (
          <LoginPage login={handleLogin} nav={nav} t={t} lang={lang} />
        )}
        {page === "register" && (
          <RegisterPage login={handleLogin} nav={nav} t={t} lang={lang} />
        )}
      </main>

      {cartCount > 0 && page !== "checkout" && !isAuthPage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-30">
          <button
            onClick={() => (user ? nav("checkout") : nav("login"))}
            className="w-full bg-indigo-600 text-white rounded-xl p-4 flex justify-between items-center shadow-xl hover:bg-indigo-700 active:scale-95 transition-all font-bold"
          >
            <span className="bg-white text-indigo-600 w-6 h-6 rounded-full flex items-center justify-center text-xs">
              {cartCount}
            </span>
            <span>{t("view_cart")}</span>
            <span>S/ {cartTotal.toFixed(2)}</span>
          </button>
        </div>
      )}

      {!isAuthPage && (
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 py-2 px-6 flex justify-between items-center z-40">
          <NavBtn
            icon={<Home size={22} />}
            label={t("nav_home")}
            active={page === "home"}
            onClick={() => nav("home")}
          />
          <NavBtn
            icon={isProvider ? <Briefcase size={22} /> : <Calendar size={22} />}
            label={isProvider ? t("nav_jobs") : t("nav_bookings")}
            active={page === "bookings" || page === "provider-dashboard"}
            onClick={() => {
              if (!user) { nav("login"); return; }
              nav(isProvider ? "provider-dashboard" : "bookings");
            }}
          />
          {user?.role === "admin" && (
            <NavBtn
              icon={<ShieldCheck size={22} />}
              label={lang === "es" ? "Admin" : "Admin"}
              active={page === "admin"}
              onClick={() => nav("admin")}
            />
          )}
          <NavBtn
            icon={<User size={22} />}
            label={t("nav_profile")}
            active={page === "profile"}
            onClick={() => (user ? nav("profile") : nav("login"))}
          />
        </nav>
      )}

      {pendingSurveys.length > 0 && user && (
        <SurveyModal
          survey={pendingSurveys[0]}
          lang={lang}
          onClose={(submitted) => {
            if (submitted) api.respondToSurvey(pendingSurveys[0].id, submitted).catch(() => {});
            setPendingSurveys(s => s.slice(1));
          }}
        />
      )}

      {!showChat && !isAuthPage && (
        <button
          onClick={() => setShowChat(true)}
          className="fixed bottom-36 right-4 bg-indigo-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-2xl z-40 animate-pulse"
        >
          <MessageCircle size={28} />
        </button>
      )}

      {showChat && (
        <ChatModal
          onClose={() => setShowChat(false)}
          t={t}
          lang={lang}
          pageContext={getPageContext({ page, catSlug, cart, lang })}
        />
      )}
    </div>
  );
}

function NavBtn({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-colors ${
        active ? "text-indigo-600 font-bold" : "text-gray-400"
      }`}
    >
      {icon}
      <span className="text-[10px] uppercase tracking-tighter">{label}</span>
    </button>
  );
}

// ─── Pages ──────────────────────────────────────────────────────────────────
function Header({ title, nav, back, toggleLang, lang, badge }) {
  return (
    <div className="sticky top-0 bg-white px-4 py-4 border-b border-gray-100 flex justify-between items-center z-20">
      <div className="flex items-center gap-3">
        {back && (
          <button
            onClick={() => nav(back)}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ChevronLeft size={24} />
          </button>
        )}
        <div>
          <h1 className="text-xl font-bold text-gray-800">{title}</h1>
          {badge && (
            <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={toggleLang}
        className="flex items-center gap-1 bg-gray-100 px-3 py-1.5 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors"
      >
        <Languages size={16} />
        {lang === "es" ? "EN" : "ES"}
      </button>
    </div>
  );
}

function HomePage({ nav, setShowChat, t, lang, toggleLang, user, unreadCount }) {
  return (
    <>
      <div className="px-4 pt-8 pb-4 flex justify-between items-center bg-white">
        <div>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
            {t("location")}
          </p>
          <div className="flex items-center gap-1 text-gray-800 font-bold">
            <MapPin size={16} className="text-indigo-600" />
            Miraflores, Lima
          </div>
        </div>
        <div className="flex gap-2 items-center">
          {user?.role === "provider" && (
            <span className="bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
              {t("provider_badge")}
            </span>
          )}
          <button
            onClick={toggleLang}
            className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center"
          >
            <Languages size={20} />
          </button>
          <button
            onClick={() => nav("notifications")}
            className="relative w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="px-4 mb-8">
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <span className="bg-white/20 px-3 py-1 rounded-lg text-[10px] font-black tracking-widest">
              {t("banner_badge")}
            </span>
            <h2 className="text-2xl font-black mt-3 leading-tight">
              {t("banner_title")}
            </h2>
            <p className="text-indigo-100 text-sm mt-2 opacity-90">
              {t("banner_sub")}
            </p>
            <button
              onClick={() => nav("category", { cat: "cleaning" })}
              className="mt-6 bg-white text-indigo-700 px-6 py-2 rounded-xl font-bold text-sm hover:bg-gray-100 active:scale-95 transition-all"
            >
              {t("banner_btn")}
            </button>
          </div>
          <div className="absolute top-[-20%] right-[-10%] w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
        </div>
      </div>

      <div className="px-4 mb-8">
        <h3 className="text-lg font-bold mb-4 text-gray-800">{t("pop_services")}</h3>
        <div className="grid grid-cols-3 gap-4">
          {CATEGORIES.map((c) => (
            <button
              key={c.slug}
              onClick={() => nav("category", { cat: c.slug })}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-16 h-16 bg-white shadow-sm rounded-2xl flex items-center justify-center text-3xl group-active:scale-90 transition-transform border border-gray-100">
                {c.icon}
              </div>
              <span className="text-[11px] font-bold text-gray-500 text-center uppercase tracking-tighter">
                {c.name[lang]}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-4">
        <div
          onClick={() => setShowChat(true)}
          className="bg-gray-900 rounded-2xl p-4 flex items-center justify-between cursor-pointer group hover:bg-black transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white text-xl">
              ✨
            </div>
            <div>
              <h4 className="text-white font-bold text-sm">{t("ai_cta_title")}</h4>
              <p className="text-gray-400 text-[11px]">{t("ai_cta_sub")}</p>
            </div>
          </div>
          <span className="bg-white text-gray-900 px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-tighter">
            {t("ai_cta_btn")}
          </span>
        </div>
      </div>
    </>
  );
}

function CategoryPage({ slug, nav, addToCart, t, lang, toggleLang }) {
  const cat = CATEGORIES.find((c) => c.slug === slug);
  const svcs = SERVICES.filter((s) => s.cat === slug);

  return (
    <div>
      <Header
        title={`${cat?.icon} ${cat?.name[lang]}`}
        nav={nav}
        back="home"
        toggleLang={toggleLang}
        lang={lang}
      />
      <div className="p-4 space-y-4">
        {svcs.map((svc) => (
          <div key={svc.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-gray-800 text-lg leading-tight flex-1 pr-4">
                {svc.name[lang]}
              </h3>
              <span className="text-indigo-600 font-black text-xl">S/ {svc.price}</span>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed mb-4">{svc.desc[lang]}</p>
            <div className="flex justify-between items-center">
              <div className="flex gap-4 text-xs font-bold text-gray-400">
                <span className="flex items-center gap-1">⏱ {svc.dur}</span>
                <span className="flex items-center gap-1 text-amber-500">
                  ⭐ {svc.stars} ({svc.reviews})
                </span>
              </div>
              <button
                onClick={() => addToCart(svc)}
                className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-indigo-700 active:scale-95 transition-all"
              >
                {t("add_btn")}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CheckoutPage({ cart, user, nav, clearCart, setQty, notify, t, lang, toggleLang }) {
  const [district, setDistrict] = useState(DISTRICTS[0]);
  const [address, setAddress] = useState("");
  const [datetime, setDatetime] = useState("");
  const [loading, setLoading] = useState(false);

  const subtotal = cart.reduce((s, i) => s + i.svc.price * i.qty, 0);
  const tax = subtotal * 0.18;
  const fee = 2;
  const total = subtotal + tax + fee;

  const handlePay = async () => {
    if (!address.trim()) {
      notify(lang === "es" ? "Por favor ingresa tu dirección" : "Please enter your address");
      return;
    }
    setLoading(true);
    try {
      await api.createBooking({ cart, district, address, datetime, lang });
      clearCart();
      notify(t("toast_confirmed"));
      nav("bookings");
    } catch (err) {
      notify(lang === "es" ? `Error: ${err.message}` : `Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!cart.length)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-white">
        <div className="text-6xl mb-6">🛒</div>
        <h2 className="text-2xl font-bold text-gray-800">{t("empty_cart")}</h2>
        <button
          onClick={() => nav("home")}
          className="mt-6 bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg"
        >
          {t("explore")}
        </button>
      </div>
    );

  return (
    <div>
      <Header title={t("summary")} nav={nav} back="home" toggleLang={toggleLang} lang={lang} />
      <div className="p-4 space-y-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4">{t("selected_svcs")}</h3>
          {cart.map((item) => (
            <div key={item.svc.id} className="flex justify-between items-center mb-4 last:mb-0">
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-800">{item.svc.name[lang]}</p>
                <p className="text-xs text-gray-400">S/ {item.svc.price} ea</p>
              </div>
              <div className="flex items-center gap-3 bg-gray-50 rounded-full px-2 py-1">
                <button
                  onClick={() => setQty(item.svc.id, item.qty - 1)}
                  className="w-8 h-8 flex items-center justify-center text-gray-400"
                >
                  <Minus size={16} />
                </button>
                <span className="font-bold text-sm w-4 text-center">{item.qty}</span>
                <button
                  onClick={() => setQty(item.svc.id, item.qty + 1)}
                  className="w-8 h-8 flex items-center justify-center text-indigo-600"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4">{t("address_title")}</h3>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                {t("district_label")}
              </label>
              <select
                className="w-full bg-gray-50 border-0 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
              >
                {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
            <input
              type="text"
              placeholder={t("address_placeholder")}
              className="w-full bg-gray-50 border-0 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4">{t("datetime_title")}</h3>
          <input
            type="datetime-local"
            className="w-full bg-gray-50 border-0 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500"
            value={datetime}
            onChange={(e) => setDatetime(e.target.value)}
          />
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4">{t("payment_detail")}</h3>
          <div className="space-y-2 text-sm text-gray-500">
            <div className="flex justify-between">
              <span>{t("subtotal")}</span><span>S/ {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>{t("tax")}</span><span>S/ {tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>{t("fee")}</span><span>S/ {fee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-3 border-t border-gray-100 text-lg font-black text-gray-900">
              <span>{t("total")}</span><span>S/ {total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-3">💳 {t("payment_soon_title")}</h3>
          <div className="bg-gray-50 rounded-xl p-4 border border-dashed border-gray-200">
            <p className="text-gray-400 text-sm leading-relaxed">{t("payment_soon_body")}</p>
          </div>
        </div>

        <button
          onClick={handlePay}
          disabled={loading}
          className="w-full bg-indigo-600 text-white p-5 rounded-2xl font-black text-lg shadow-xl hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? t("processing") : t("confirm_btn")}
        </button>
      </div>
    </div>
  );
}

function BookingsPage({ nav, user, t, lang, toggleLang }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ratingBookingId, setRatingBookingId] = useState(null);

  const loadBookings = () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    api.getBookings()
      .then((data) => {
        setBookings(data);
        const unrated = data.find(b => b.status === "completed" && !b.serviceRating);
        if (unrated) setRatingBookingId(unrated.id);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadBookings(); }, [user]);

  const statusStyle = {
    pending: "bg-amber-100 text-amber-700",
    accepted: "bg-blue-100 text-blue-700",
    in_progress: "bg-purple-100 text-purple-700",
    confirmed: "bg-emerald-100 text-emerald-700",
    completed: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-red-100 text-red-700",
  };

  const statusKey = (s) => `status_${s}`;

  return (
    <div>
      <Header title={t("my_bookings")} nav={nav} toggleLang={toggleLang} lang={lang} />
      {ratingBookingId && (
        <RatingModal
          bookingId={ratingBookingId}
          lang={lang}
          onClose={() => {
            setRatingBookingId(null);
            loadBookings();
          }}
        />
      )}
      <div className="p-4 space-y-4">
        {!user ? (
          <div className="text-center bg-white p-12 rounded-3xl border border-dashed border-gray-200">
            <User size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-bold mb-6">{t("login_required")}</p>
            <button
              onClick={() => nav("login")}
              className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold"
            >
              {t("login_btn")}
            </button>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center p-8 bg-red-50 rounded-2xl">
            <p className="text-red-500 font-bold text-sm">{error}</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center p-12">
            <div className="text-6xl mb-4 opacity-20">📅</div>
            <p className="text-gray-400 font-bold">{t("no_bookings")}</p>
          </div>
        ) : (
          bookings.map((b) => (
            <div key={b.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-[10px] font-black text-indigo-600 tracking-widest">#{b.code}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {b.scheduledDate
                      ? new Date(b.scheduledDate).toLocaleString(lang === "es" ? "es-PE" : "en-US")
                      : new Date(b.createdAt).toLocaleDateString(lang === "es" ? "es-PE" : "en-US")}
                  </p>
                  {b.district && (
                    <p className="text-xs text-gray-400">{b.district}{b.address ? ` — ${b.address}` : ""}</p>
                  )}
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${statusStyle[b.status] || "bg-gray-100 text-gray-600"}`}>
                  {t(statusKey(b.status))}
                </span>
              </div>
              <div className="border-t border-gray-50 pt-4 space-y-2">
                {b.items?.map((s, i) => (
                  <div key={i} className="flex justify-between text-xs font-bold text-gray-700">
                    <span>{s.qty}x {s.serviceName}</span>
                    <span>S/ {(s.price * s.qty).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-4 pt-4 border-t border-gray-50 font-black text-gray-900 items-center">
                <span>Total</span>
                <div className="flex items-center gap-3">
                  {b.serviceRating && (
                    <span className="text-amber-400 text-sm font-bold">
                      {"★".repeat(b.serviceRating)}{"☆".repeat(5 - b.serviceRating)}
                    </span>
                  )}
                  <span>S/ {b.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function RatingsSummary({ lang }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMyRatings().then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const Section = ({ title, badge, info }) => (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${badge}`}>{title}</span>
        {info.count > 0 && (
          <span className="text-gray-400 text-xs">{info.count} {lang === "es" ? "reseñas" : "reviews"}</span>
        )}
      </div>
      {info.count === 0 ? (
        <p className="text-gray-300 text-sm font-bold text-center py-4">
          {lang === "es" ? "Sin reseñas aún" : "No reviews yet"}
        </p>
      ) : (
        <>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-4xl font-black text-amber-500">{info.average.toFixed(1)}</span>
            <span className="text-amber-400 text-xl">{"★".repeat(Math.round(info.average))}{"☆".repeat(5 - Math.round(info.average))}</span>
          </div>
          <div className="space-y-2">
            {info.recent.map((r, i) => (
              <div key={i} className="flex justify-between items-center text-xs">
                <span className="text-gray-400">#{r.bookingCode}</span>
                <span className="text-amber-400">{"★".repeat(r.stars)}{"☆".repeat(5 - r.stars)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <Section
        title={lang === "es" ? "Buen Cliente" : "Good Customer"}
        badge="bg-blue-100 text-blue-700"
        info={data?.asCustomer || { average: 0, count: 0, recent: [] }}
      />
      <Section
        title={lang === "es" ? "Buen Proveedor" : "Good Seller"}
        badge="bg-indigo-100 text-indigo-700"
        info={data?.asProvider || { average: 0, count: 0, recent: [] }}
      />
    </div>
  );
}

function ProfilePage({ user, logout, nav, notify, t, lang, toggleLang }) {
  const [tab, setTab] = useState("info");

  if (!user)
    return (
      <div className="text-center bg-white p-12 rounded-3xl border border-dashed border-gray-200 m-4 mt-8">
        <User size={48} className="mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500 font-bold mb-6">{t("login_required")}</p>
        <button onClick={() => nav("login")} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold">
          {t("login_btn")}
        </button>
      </div>
    );

  return (
    <div>
      <Header title={t("nav_profile")} nav={nav} toggleLang={toggleLang} lang={lang} />
      <div className="p-4 space-y-4">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center">
          <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 text-4xl mb-4 font-black">
            {user.name?.[0]?.toUpperCase()}
          </div>
          <h2 className="text-xl font-bold text-gray-800">{user.name}</h2>
          <p className="text-gray-400 text-sm">{user.email}</p>
          {user.role === "provider" && (
            <span className="mt-2 bg-indigo-100 text-indigo-700 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wide">
              {lang === "es" ? "Maestro" : "Provider"}
              {user.providerProfile?.category
                ? ` · ${CATEGORIES.find(c => c.slug === user.providerProfile.category)?.icon} ${CATEGORIES.find(c => c.slug === user.providerProfile.category)?.name[lang]}`
                : ""}
            </span>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex gap-2 bg-gray-100 p-1 rounded-2xl">
          {[
            { id: "info", label: lang === "es" ? "Perfil" : "Profile" },
            { id: "ratings", label: lang === "es" ? "Reseñas" : "Ratings" },
          ].map(tb => (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                tab === tb.id ? "bg-white shadow text-indigo-600" : "text-gray-400"
              }`}
            >
              {tb.label}
            </button>
          ))}
        </div>

        {tab === "ratings" && <RatingsSummary lang={lang} />}

        {tab === "info" && (
          <>
            {user.role === "provider" && user.providerProfile && (
              <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl p-5 text-white">
                <p className="text-indigo-200 text-xs font-black uppercase tracking-widest mb-3">
                  {lang === "es" ? "Resumen de Ganancias" : "Earnings Summary"}
                </p>
                <p className="text-3xl font-black">S/ {user.providerProfile.totalEarnings?.toFixed(2) || "0.00"}</p>
                <div className="flex gap-4 mt-2 text-sm text-indigo-200">
                  <span>{user.providerProfile.jobsCompleted || 0} {lang === "es" ? "trabajos" : "jobs"}</span>
                  <span>⭐ {user.providerProfile.rating?.toFixed(1) || "5.0"}</span>
                </div>
              </div>
            )}

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-50">
            <h3 className="font-black text-xs text-gray-400 uppercase tracking-widest">{t("settings")}</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {[
              { key: "setting_account", onClick: () => nav("account-info") },
              { key: "setting_addresses", onClick: () => nav("saved-addresses") },
              { key: "setting_notifications", onClick: () => nav("notifications") },
              { key: "setting_language", onClick: toggleLang },
            ].map(({ key, onClick }) => (
              <button
                key={key}
                onClick={onClick || undefined}
                className="w-full flex justify-between items-center p-5 text-gray-700 font-bold hover:bg-gray-50 text-sm"
              >
                <span>{t(key)}</span>
                <ChevronRight size={18} className="text-gray-300" />
              </button>
            ))}
            <button
              onClick={logout}
              className="w-full flex justify-between items-center p-5 text-rose-500 font-bold hover:bg-rose-50 text-sm"
            >
              <span>{t("logout")}</span>
              <LogOut size={18} />
            </button>
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Account Info Page ────────────────────────────────────────────────────────
function AccountInfoPage({ user, setUser, nav, notify, t, lang, toggleLang }) {
  const [name, setName] = useState(user?.name || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || name.trim() === user.name) return;
    setSaving(true);
    try {
      const updated = await api.updateMe({ name: name.trim() });
      setUser({ ...user, name: updated.name });
      notify(t("acct_saved"));
    } catch (e) {
      notify(`Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Header title={t("acct_title")} nav={nav} back="profile" toggleLang={toggleLang} lang={lang} />
      <div className="p-4 space-y-4">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-5">
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t("acct_name")}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t("acct_email")}</label>
            <input
              value={user?.email || ""}
              readOnly
              className="w-full border border-gray-100 rounded-2xl px-4 py-3 text-sm font-medium bg-gray-50 text-gray-400 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1.5 ml-1">{t("acct_email_note")}</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !name.trim() || name.trim() === user?.name}
          className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-sm shadow-lg hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-40"
        >
          {saving ? t("acct_saving") : t("acct_save")}
        </button>
      </div>
    </div>
  );
}

// ─── Saved Addresses Page ─────────────────────────────────────────────────────
function SavedAddressesPage({ nav, notify, t, lang, toggleLang }) {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ label: "", address: "", district: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getAddresses()
      .then(setAddresses)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleAdd = async () => {
    if (!form.address.trim() || !form.district.trim()) return;
    setSaving(true);
    try {
      const added = await api.addAddress(form);
      setAddresses((p) => [...p, added]);
      setForm({ label: "", address: "", district: "" });
      setShowForm(false);
    } catch (e) {
      notify(`Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteAddress(id);
      setAddresses((p) => p.filter((a) => a.id !== id));
    } catch (e) {
      notify(`Error: ${e.message}`);
    }
  };

  const LIMA_DISTRICTS = ["Miraflores","San Isidro","Barranco","Surco","La Molina","San Borja","Magdalena","Jesús María","Lince","Pueblo Libre","Breña","Rímac","San Miguel","Callao","Ate","Villa El Salvador","Villa María del Triunfo","San Juan de Miraflores","Chorrillos","Lurín"];

  return (
    <div>
      <Header title={t("addr_title")} nav={nav} back="profile" toggleLang={toggleLang} lang={lang} />
      <div className="p-4 space-y-3">
        {loading ? (
          <div className="text-center py-12 text-gray-400 text-sm font-bold">...</div>
        ) : addresses.length === 0 && !showForm ? (
          <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-10 text-center">
            <MapPin size={36} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400 font-bold text-sm">{t("addr_empty")}</p>
          </div>
        ) : (
          addresses.map((a) => (
            <div key={a.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex justify-between items-start">
              <div>
                <p className="font-black text-gray-800 text-sm">{a.label || "Home"}</p>
                <p className="text-gray-500 text-xs mt-0.5">{a.address}</p>
                <p className="text-indigo-500 text-xs font-bold mt-0.5">{a.district}</p>
              </div>
              <button
                onClick={() => handleDelete(a.id)}
                className="text-rose-400 hover:text-rose-600 p-1"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}

        {showForm ? (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-4">
            <input
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              placeholder={t("addr_label")}
              className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <input
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              placeholder={t("addr_address")}
              className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <select
              value={form.district}
              onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))}
              className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            >
              <option value="">{t("addr_district")}</option>
              {LIMA_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowForm(false); setForm({ label: "", address: "", district: "" }); }}
                className="flex-1 border border-gray-200 text-gray-500 py-3 rounded-2xl font-bold text-sm"
              >
                {t("addr_cancel")}
              </button>
              <button
                onClick={handleAdd}
                disabled={saving || !form.address.trim() || !form.district}
                className="flex-1 bg-indigo-600 text-white py-3 rounded-2xl font-bold text-sm disabled:opacity-40"
              >
                {saving ? "..." : t("addr_save")}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="w-full border-2 border-dashed border-indigo-200 text-indigo-600 font-bold text-sm py-4 rounded-2xl hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={18} /> {t("addr_add")}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Notifications Page ───────────────────────────────────────────────────────
const NOTIF_ICONS = {
  booking_created: "📋", booking_accepted: "🔧", booking_started: "🏠",
  booking_completed: "⭐", default: "🔔",
};

function timeAgo(dateStr, lang) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return lang === "es" ? "ahora" : "just now";
  if (diff < 3600) { const m = Math.floor(diff / 60); return lang === "es" ? `hace ${m}m` : `${m}m ago`; }
  if (diff < 86400) { const h = Math.floor(diff / 3600); return lang === "es" ? `hace ${h}h` : `${h}h ago`; }
  const d = Math.floor(diff / 86400);
  return lang === "es" ? `hace ${d}d` : `${d}d ago`;
}

function NotificationsPage({ nav, notify, t, lang, toggleLang, setUnreadCount }) {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getNotifications()
      .then(setNotifs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const markAllRead = async () => {
    await api.markAllNotificationsRead().catch(() => {});
    setNotifs((p) => p.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const markRead = async (id) => {
    await api.markNotificationRead(id).catch(() => {});
    setNotifs((p) => p.map((n) => n.id === id ? { ...n, read: true } : n));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const unread = notifs.filter((n) => !n.read).length;

  return (
    <div>
      <Header title={t("notif_title")} nav={nav} back="profile" toggleLang={toggleLang} lang={lang} />
      <div className="p-4 space-y-3">
        {unread > 0 && (
          <button
            onClick={markAllRead}
            className="w-full text-indigo-600 font-bold text-sm py-2 hover:underline text-right"
          >
            {t("notif_mark_all")}
          </button>
        )}
        {loading ? (
          <div className="text-center py-12 text-gray-400 text-sm font-bold">...</div>
        ) : notifs.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-10 text-center">
            <Bell size={36} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400 font-bold text-sm">{t("notif_empty")}</p>
          </div>
        ) : (
          notifs.map((n) => (
            <button
              key={n.id}
              onClick={() => !n.read && markRead(n.id)}
              className={`w-full flex gap-4 items-start p-4 rounded-2xl border text-left transition-colors ${
                n.read ? "bg-white border-gray-100" : "bg-indigo-50 border-indigo-100"
              }`}
            >
              <span className="text-2xl mt-0.5">{NOTIF_ICONS[n.type] || NOTIF_ICONS.default}</span>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <p className={`text-sm ${n.read ? "font-medium text-gray-700" : "font-black text-gray-900"}`}>
                    {n.title}
                  </p>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-1.5" />}
                </div>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{n.body}</p>
                <p className="text-[10px] text-gray-300 font-bold mt-1">{timeAgo(n.createdAt, lang)}</p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Login Page ───────────────────────────────────────────────────────────────
function LoginPage({ login, nav, t, lang }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !pass) return;
    setLoading(true);
    setError("");
    try {
      const { token, user } = await api.login({ email, password: pass });
      localStorage.setItem("ps_token", token);
      login(user);
      nav(user.role === "provider" ? "provider-dashboard" : "home");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white p-8 flex flex-col justify-center">
      <div className="text-5xl mb-6">🏠</div>
      <h2 className="text-3xl font-black text-gray-900 leading-tight mb-2">{t("welcome")}</h2>
      <p className="text-gray-400 mb-8">{t("login_sub")}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-1">{t("email")}</label>
          <input
            type="email"
            className="w-full bg-gray-50 border-0 rounded-2xl p-4 focus:ring-2 focus:ring-indigo-600"
            placeholder="juan@perez.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-1">{t("password")}</label>
          <input
            type="password"
            className="w-full bg-gray-50 border-0 rounded-2xl p-4 focus:ring-2 focus:ring-indigo-600"
            placeholder="••••••••"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
          />
        </div>
        {error && <p className="text-red-500 text-sm font-bold bg-red-50 p-3 rounded-xl">{error}</p>}
        <button
          disabled={loading}
          className="w-full bg-indigo-600 text-white p-5 rounded-2xl font-black text-lg shadow-xl shadow-indigo-200 mt-4 active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? "..." : t("login_btn")}
        </button>
      </form>

      <p className="text-center mt-8 text-sm text-gray-500">
        {t("no_account")}{" "}
        <button onClick={() => nav("register")} className="text-indigo-600 font-black">{t("register")}</button>
      </p>
    </div>
  );
}

function RegisterPage({ login, nav, t, lang }) {
  const [role, setRole] = useState("customer");
  const [form, setForm] = useState({ name: "", email: "", pass: "", category: "plumbing", bio: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const f = (key) => (val) => setForm((p) => ({ ...p, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.pass) return;
    setLoading(true);
    setError("");
    try {
      const { token, user } = await api.register({
        name: form.name,
        email: form.email,
        password: form.pass,
        role,
        category: role === "provider" ? form.category : undefined,
        bio: form.bio,
      });
      localStorage.setItem("ps_token", token);
      login(user);
      nav(role === "provider" ? "provider-dashboard" : "home");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white p-8 flex flex-col justify-center">
      <div className="text-5xl mb-4">{role === "provider" ? "🔨" : "✍️"}</div>
      <h2 className="text-3xl font-black text-gray-900 leading-tight mb-6">{t("create_account")}</h2>

      {/* Role toggle */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl mb-6">
        <button
          type="button"
          onClick={() => setRole("customer")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
            role === "customer" ? "bg-white shadow text-indigo-600" : "text-gray-400"
          }`}
        >
          🏠 {t("need_services")}
        </button>
        <button
          type="button"
          onClick={() => setRole("provider")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
            role === "provider" ? "bg-white shadow text-indigo-600" : "text-gray-400"
          }`}
        >
          🔨 {t("offer_services")}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-1">{t("full_name")}</label>
          <input
            type="text"
            className="w-full bg-gray-50 border-0 rounded-2xl p-4 focus:ring-2 focus:ring-indigo-600"
            value={form.name}
            onChange={(e) => f("name")(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-1">{t("email")}</label>
          <input
            type="email"
            className="w-full bg-gray-50 border-0 rounded-2xl p-4 focus:ring-2 focus:ring-indigo-600"
            value={form.email}
            onChange={(e) => f("email")(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-1">{t("password")}</label>
          <input
            type="password"
            className="w-full bg-gray-50 border-0 rounded-2xl p-4 focus:ring-2 focus:ring-indigo-600"
            value={form.pass}
            onChange={(e) => f("pass")(e.target.value)}
          />
        </div>

        {role === "provider" && (
          <>
            <div>
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-1">
                {t("specialty")}
              </label>
              <select
                className="w-full bg-gray-50 border-0 rounded-2xl p-4 focus:ring-2 focus:ring-indigo-600 text-sm"
                value={form.category}
                onChange={(e) => f("category")(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.icon} {c.name[lang]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-1">{t("bio")}</label>
              <textarea
                className="w-full bg-gray-50 border-0 rounded-2xl p-4 focus:ring-2 focus:ring-indigo-600 text-sm resize-none"
                rows={2}
                placeholder={t("bio_placeholder")}
                value={form.bio}
                onChange={(e) => f("bio")(e.target.value)}
              />
            </div>
          </>
        )}

        {error && <p className="text-red-500 text-sm font-bold bg-red-50 p-3 rounded-xl">{error}</p>}

        <button
          disabled={loading}
          className="w-full bg-indigo-600 text-white p-5 rounded-2xl font-black text-lg shadow-xl shadow-indigo-200 mt-4 active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? "..." : t("create_account")}
        </button>
      </form>

      <p className="text-center mt-8 text-sm text-gray-500">
        {t("have_account")}{" "}
        <button onClick={() => nav("login")} className="text-indigo-600 font-black">{t("login_btn")}</button>
      </p>
    </div>
  );
}

// ─── Rating Modal ──────────────────────────────────────────────────────────
function RatingModal({ bookingId, lang, onClose }) {
  const [selected, setSelected] = useState(0);
  const [hover, setHover] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await api.rateBooking(bookingId, selected);
    } catch {
      // silently ignore — rating is optional
    } finally {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center">
        <div className="text-4xl mb-3">🎉</div>
        <h3 className="text-xl font-black text-gray-800 mb-1">
          {lang === "es" ? "¿Cómo fue el servicio?" : "How was the service?"}
        </h3>
        <p className="text-gray-400 text-sm mb-6">
          {lang === "es" ? "Tu opinión nos ayuda a mejorar" : "Your feedback helps us improve"}
        </p>

        <div className="flex justify-center gap-2 mb-8">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setSelected(star)}
              className="text-4xl transition-transform active:scale-90"
            >
              <span className={(hover || selected) >= star ? "text-amber-400" : "text-gray-200"}>★</span>
            </button>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!selected || submitting}
          className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-40 mb-3"
        >
          {submitting ? "…" : (lang === "es" ? "Enviar" : "Submit")}
        </button>
        <button onClick={onClose} className="text-gray-400 text-sm font-bold hover:text-gray-600">
          {lang === "es" ? "Omitir" : "Skip"}
        </button>
      </div>
    </div>
  );
}

// ─── Survey Modal ──────────────────────────────────────────────────────────
function SurveyModal({ survey, lang, onClose }) {
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const setAnswer = (id, value) => setAnswers((a) => ({ ...a, [id]: value }));

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      onClose(answers);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center">
      <div className="bg-white w-full max-w-md max-h-[85vh] rounded-t-[2.5rem] sm:rounded-3xl flex flex-col shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 p-6 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-white font-black text-lg leading-tight">{survey.title}</h3>
            {survey.description && (
              <p className="text-indigo-100 text-xs mt-1 opacity-80">{survey.description}</p>
            )}
          </div>
          <button onClick={() => onClose(null)} className="w-9 h-9 bg-white/10 text-white rounded-full flex items-center justify-center">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {survey.questions.map((q) => (
            <div key={q.id}>
              <p className="font-bold text-gray-800 text-sm mb-3">{q.text}</p>
              {q.type === "rating" && (
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      onClick={() => setAnswer(q.id, s)}
                      className="text-3xl transition-transform active:scale-90"
                    >
                      <span className={answers[q.id] >= s ? "text-amber-400" : "text-gray-200"}>★</span>
                    </button>
                  ))}
                </div>
              )}
              {q.type === "text" && (
                <textarea
                  rows={3}
                  className="w-full bg-gray-50 border-0 rounded-xl p-3 text-sm resize-none focus:ring-2 focus:ring-indigo-500"
                  placeholder={lang === "es" ? "Tu respuesta…" : "Your answer…"}
                  value={answers[q.id] || ""}
                  onChange={(e) => setAnswer(q.id, e.target.value)}
                />
              )}
              {q.type === "choice" && (
                <div className="space-y-2">
                  {(q.options || []).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setAnswer(q.id, opt)}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold border-2 transition-all ${
                        answers[q.id] === opt
                          ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                          : "border-gray-100 bg-gray-50 text-gray-600"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="p-4 bg-white border-t border-gray-100 flex gap-2">
          <button
            onClick={() => onClose(null)}
            className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-500 font-bold text-sm hover:bg-gray-50"
          >
            {lang === "es" ? "Omitir" : "Skip"}
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50"
          >
            {submitting ? "…" : (lang === "es" ? "Enviar" : "Submit")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Chat Component ────────────────────────────────────────────────────────
function ChatModal({ onClose, t, lang, pageContext }) {
  const [msgs, setMsgs] = useState([{ role: "model", text: t("ai_intro") }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const SYSTEM_PROMPT = `You are the "Virtual Master" (Maestro Virtual) of PeruServ, the official home services app for Lima, Peru.

LANGUAGE: Respond ALWAYS in ${lang === "es" ? "Spanish" : "English"}.

TONE: Helpful, friendly, slightly informal (use 'jefe/a' in Spanish or 'boss' in English). Keep answers concise — 2-4 sentences unless asked to elaborate.

PRICING (Soles): Cleaning S/89-150. Plumbing S/30-180. Haircut S/45. Painting S/200-350. All prices include 18% IGV + S/2 service fee.

CURRENT PAGE CONTEXT — what the user is looking at right now:
${pageContext}

Use the page context to answer specific questions about services, prices, or bookings the user can see. If asked to summarise a service or booking, use the details above. If asked for materials, suggest Sodimac or Promart.`;

  const handleSend = async () => {
    if (!input.trim() || busy) return;
    const txt = input.trim();
    setInput("");
    setMsgs((p) => [...p, { role: "user", text: txt }]);
    setBusy(true);

    try {
      const history = msgs.map((m) => ({ role: m.role, parts: [{ text: m.text }] }));
      history.push({ role: "user", parts: [{ text: txt }] });

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: history,
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errText.slice(0, 100)}`);
      }

      const data = await res.json();
      const reply =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        (lang === "es" ? "¡Uy! No pude procesar eso." : "Oops! Couldn't process that.");
      setMsgs((p) => [...p, { role: "model", text: reply }]);
    } catch (e) {
      setMsgs((p) => [...p, { role: "model", text: `Error: ${e.message}` }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-end sm:items-center justify-center">
      <div className="bg-white w-full max-w-md h-[85vh] rounded-t-[2.5rem] sm:rounded-3xl flex flex-col shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 p-6 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white text-2xl">🤖</div>
            <div>
              <h3 className="text-white font-black text-lg leading-none">{t("virtual_master")}</h3>
              <p className="text-indigo-100 text-[10px] uppercase font-bold tracking-widest mt-1 opacity-70">{t("ai_sub")}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 bg-white/10 text-white rounded-full flex items-center justify-center">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                  m.role === "user"
                    ? "bg-indigo-600 text-white rounded-tr-none"
                    : "bg-white text-gray-800 border border-gray-100 rounded-tl-none"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-100 text-gray-400 p-4 rounded-2xl rounded-tl-none text-xs italic">
                {t("ai_thinking")}
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>

        <div className="p-4 bg-white border-t border-gray-100 flex gap-2">
          <input
            className="flex-1 bg-gray-50 border-0 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-600"
            placeholder={lang === "es" ? "Escribe aquí..." : "Type here..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            disabled={busy}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || busy}
            className="bg-indigo-600 text-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg active:scale-95 disabled:opacity-50 transition-all"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
