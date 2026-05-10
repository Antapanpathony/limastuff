import React, { useState, useEffect, useCallback } from "react";
import { ChevronLeft, Languages } from "lucide-react";
import { api } from "./api";

const CATEGORY_ICONS = {
  cleaning: "✨", plumbing: "🔧", electrician: "⚡",
  beauty: "✂️", painting: "🎨", moving: "🚛", general: "🔨",
};

function StatusBadge({ status, lang }) {
  const styles = {
    pending: "bg-amber-100 text-amber-700",
    accepted: "bg-blue-100 text-blue-700",
    in_progress: "bg-purple-100 text-purple-700",
    completed: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-red-100 text-red-700",
  };
  const labels = {
    es: { pending: "Pendiente", accepted: "Aceptado", in_progress: "En Progreso", completed: "Completado", cancelled: "Cancelado" },
    en: { pending: "Pending", accepted: "Accepted", in_progress: "In Progress", completed: "Completed", cancelled: "Cancelled" },
  };
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${styles[status] || "bg-gray-100 text-gray-600"}`}>
      {labels[lang][status] || status}
    </span>
  );
}

function formatDate(dateStr, lang) {
  if (!dateStr) return lang === "es" ? "Sin fecha" : "No date";
  try {
    return new Date(dateStr).toLocaleString(lang === "es" ? "es-PE" : "en-US", {
      month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch { return dateStr; }
}

function RateCustomerModal({ job, lang, onClose }) {
  const [selected, setSelected] = useState(0);
  const [hover, setHover] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const submitted = React.useRef(false);

  const handleSubmit = async () => {
    if (!selected || submitted.current) return;
    submitted.current = true;
    setSubmitting(true);
    try {
      await api.rateCustomer(job.id, selected);
      onClose(true, selected);
    } catch {
      submitted.current = false;
      setSubmitting(false);
      onClose(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center">
        <div className="text-4xl mb-3">👤</div>
        <h3 className="text-xl font-black text-gray-800 mb-1">
          {lang === "es" ? `¿Cómo fue ${job.customerName}?` : `How was ${job.customerName}?`}
        </h3>
        <p className="text-gray-400 text-sm mb-6">
          {lang === "es" ? "Califica a este cliente" : "Rate this customer"}
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
        <button onClick={() => onClose(false)} className="text-gray-400 text-sm font-bold hover:text-gray-600">
          {lang === "es" ? "Omitir" : "Skip"}
        </button>
      </div>
    </div>
  );
}

const EMPTY_LISTING = { nameEs: "", nameEn: "", descEs: "", descEn: "", price: "", dur: "" };

export default function ProviderDashboard({ user, nav, lang, toggleLang, notify }) {
  const [tab, setTab] = useState("available");
  const [available, setAvailable] = useState([]);
  const [myJobs, setMyJobs] = useState([]);
  const [earnings, setEarnings] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ratingJob, setRatingJob] = useState(null);
  const [showNewListing, setShowNewListing] = useState(false);
  const [newListing, setNewListing] = useState(EMPTY_LISTING);
  const [savingListing, setSavingListing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_LISTING);
  const fetched = React.useRef({ available: false, jobs: false, earnings: false, listings: false });
  const [ratedJobIds, setRatedJobIds] = useState(() => new Set());

  const t = (es, en) => (lang === "es" ? es : en);

  const fetchTab = useCallback(async (t) => {
    setLoading(true);
    try {
      if (t === "available") {
        setAvailable(await api.getAvailableJobs());
        fetched.current.available = true;
      } else if (t === "active") {
        setMyJobs(await api.getMyJobs());
        fetched.current.jobs = true;
      } else if (t === "earnings") {
        setEarnings(await api.getEarnings());
        fetched.current.earnings = true;
      } else if (t === "listings") {
        setListings(await api.getMyListings());
        fetched.current.listings = true;
      }
    } catch (err) {
      notify(err.message);
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => { fetchTab("available"); }, [fetchTab]);

  const switchTab = (next) => {
    setTab(next);
    const alreadyFetched =
      (next === "available" && fetched.current.available) ||
      (next === "active" && fetched.current.jobs) ||
      (next === "earnings" && fetched.current.earnings) ||
      (next === "listings" && fetched.current.listings);
    if (!alreadyFetched) fetchTab(next);
  };

  const handleCreateListing = async (e) => {
    e.preventDefault();
    if (!newListing.nameEs || !newListing.nameEn || !newListing.price) return;
    setSavingListing(true);
    try {
      const created = await api.createListing({
        nameEs: newListing.nameEs, nameEn: newListing.nameEn,
        descEs: newListing.descEs, descEn: newListing.descEn,
        price: newListing.price, duration: newListing.dur,
      });
      setListings(p => [created, ...p]);
      setNewListing(EMPTY_LISTING);
      setShowNewListing(false);
    } catch (err) { notify(err.message); }
    finally { setSavingListing(false); }
  };

  const handleSaveEdit = async (id) => {
    setSavingListing(true);
    try {
      const updated = await api.updateListing(id, {
        nameEs: editForm.nameEs, nameEn: editForm.nameEn,
        descEs: editForm.descEs, descEn: editForm.descEn,
        price: editForm.price, duration: editForm.dur,
      });
      setListings(p => p.map(l => l.id === id ? updated : l));
      setEditingId(null);
    } catch (err) { notify(err.message); }
    finally { setSavingListing(false); }
  };

  const handleToggleActive = async (listing) => {
    try {
      const updated = await api.updateListing(listing.id, { active: !listing.active });
      setListings(p => p.map(l => l.id === listing.id ? updated : l));
    } catch (err) { notify(err.message); }
  };

  const handleDeleteListing = async (id) => {
    try {
      await api.deleteListing(id);
      setListings(p => p.filter(l => l.id !== id));
    } catch (err) { notify(err.message); }
  };

  const handleAccept = async (jobId) => {
    try {
      await api.acceptJob(jobId);
      notify(t("Trabajo aceptado ✓", "Job accepted ✓"));
      fetched.current.available = false;
      fetched.current.jobs = false;
      fetchTab("available");
    } catch (err) { notify(err.message); }
  };

  const handleStatusUpdate = async (jobId, newStatus) => {
    setMyJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: newStatus } : j));
    
    if (newStatus === "completed") {
      notify(t("¡Trabajo completado! 🎉", "Job completed! 🎉"));
      const job = myJobs.find(j => j.id === jobId);
      if (job) setRatingJob(job);
    } else {
      notify(t("Trabajo iniciado ✓", "Job started ✓"));
    }

    try {
      await api.updateJobStatus(jobId, newStatus);
      fetched.current.earnings = false;
    } catch (err) {
      setMyJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: newStatus === "completed" ? "in_progress" : "accepted" } : j));
      if (newStatus === "completed") setRatingJob(null);
      notify(err.message);
    }
  };

  const handleRatingClose = (submitted, stars) => {
    const jobId = ratingJob?.id;
    setRatingJob(null);
    if (submitted && jobId) {
      setRatedJobIds(prev => new Set([...prev, jobId]));
      setMyJobs(prev => prev.map(j => j.id === jobId ? { ...j, customerRating: stars } : j));
    }
  };

  const activeJobs = myJobs.filter(j => j.status !== "completed");
  const completedJobs = myJobs.filter(j => j.status === "completed");

  const tabs = [
    { id: "available", label: t("Disponibles", "Available"), count: available.length },
    { id: "active", label: t("Activos", "Active"), count: activeJobs.length },
    { id: "listings", label: t("Servicios", "Listings"), count: listings.filter(l => l.active).length },
    { id: "earnings", label: t("Ganancias", "Earnings") },
  ];

  return (
    <div>
      {ratingJob && (
        <RateCustomerModal job={ratingJob} lang={lang} onClose={handleRatingClose} />
      )}

      <div className="sticky top-0 bg-white px-4 pt-4 pb-3 border-b border-gray-100 z-20">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800">
              {t("Panel del Maestro", "Provider Dashboard")}
            </h1>
            <p className="text-xs text-gray-400">
              {CATEGORY_ICONS[user?.providerProfile?.category] || "🔨"} {user.name}
            </p>
          </div>
          <button
            onClick={toggleLang}
            className="flex items-center gap-1 bg-gray-100 px-3 py-1.5 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            <Languages size={16} />
            {lang === "es" ? "EN" : "ES"}
          </button>
        </div>

        <div className="flex gap-2">
          {tabs.map(tabItem => (
            <button
              key={tabItem.id}
              onClick={() => switchTab(tabItem.id)}
              className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all ${
                tab === tabItem.id ? "bg-indigo-600 text-white shadow-sm" : "bg-gray-100 text-gray-500"
              }`}
            >
              {tabItem.label}
              {tabItem.count > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] ${
                  tab === tabItem.id ? "bg-white text-indigo-600" : "bg-indigo-600 text-white"
                }`}>
                  {tabItem.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {tab === "available" && (
              <div className="space-y-4">
                {available.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="text-5xl mb-4 opacity-20">📋</div>
                    <p className="text-gray-500 font-bold">{t("No hay trabajos disponibles", "No jobs available")}</p>
                    <p className="text-gray-400 text-sm mt-1">{t("Los nuevos trabajos aparecerán aquí", "New jobs will appear here")}</p>
                    <button onClick={() => { fetched.current.available = false; fetchTab("available"); }} className="mt-4 bg-indigo-50 text-indigo-600 px-5 py-2 rounded-xl font-bold text-sm">
                      {t("Actualizar", "Refresh")}
                    </button>
                  </div>
                ) : available.map(job => (
                  <div key={job.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xl">{CATEGORY_ICONS[job.serviceCategory] || "🔨"}</span>
                          <p className="text-[10px] font-black text-indigo-600 tracking-widest">#{job.code}</p>
                        </div>
                        <p className="text-xs text-gray-500 font-bold">{job.district}{job.address ? ` — ${job.address}` : ""}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatDate(job.scheduledDate, lang)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-indigo-600 font-black text-xl">S/ {job.total.toFixed(2)}</p>
                        <p className="text-[10px] text-gray-400">{t("incluye IGV", "includes tax")}</p>
                      </div>
                    </div>
                    <div className="border-t border-gray-50 pt-3 mb-4 space-y-1">
                      {job.items.map((item, i) => (
                        <p key={i} className="text-sm text-gray-600">
                          <span className="font-bold">{item.qty}x</span> {item.serviceName}
                        </p>
                      ))}
                    </div>
                    <button
                      onClick={() => handleAccept(job.id)}
                      className="w-full bg-indigo-600 text-white py-3 rounded-xl font-black text-sm hover:bg-indigo-700 active:scale-95 transition-all"
                    >
                      {t("Aceptar Trabajo", "Accept Job")}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {tab === "active" && (
              <div className="space-y-4">
                {activeJobs.length === 0 && completedJobs.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="text-5xl mb-4 opacity-20">💼</div>
                    <p className="text-gray-500 font-bold">{t("No tienes trabajos activos", "No active jobs")}</p>
                    <p className="text-gray-400 text-sm mt-1">{t("Acepta trabajos de la pestaña Disponibles", "Accept jobs from the Available tab")}</p>
                  </div>
                ) : (
                  <>
                    {activeJobs.map(job => (
                      <div key={job.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="text-[10px] font-black text-indigo-600 tracking-widest">#{job.code}</p>
                            <p className="text-sm font-bold text-gray-800 mt-1">{job.customerName}</p>
                            <p className="text-xs text-gray-500">{job.district}{job.address ? ` — ${job.address}` : ""}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{formatDate(job.scheduledDate, lang)}</p>
                          </div>
                          <StatusBadge status={job.status} lang={lang} />
                        </div>
                        <div className="border-t border-gray-50 pt-3 mb-4 space-y-1">
                          {job.items.map((item, i) => (
                            <p key={i} className="text-sm text-gray-600">
                              <span className="font-bold">{item.qty}x</span> {item.serviceName}
                            </p>
                          ))}
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-black text-gray-800 text-lg">S/ {job.total.toFixed(2)}</span>
                          {job.status === "accepted" && (
                            <button
                              onClick={() => handleStatusUpdate(job.id, "in_progress")}
                              className="bg-purple-600 text-white px-5 py-2.5 rounded-xl font-black text-sm hover:bg-purple-700 active:scale-95 transition-all"
                            >
                              {t("Iniciar Trabajo", "Start Job")}
                            </button>
                          )}
                          {job.status === "in_progress" && (
                            <button
                              onClick={() => handleStatusUpdate(job.id, "completed")}
                              className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-black text-sm hover:bg-emerald-700 active:scale-95 transition-all"
                            >
                              {t("Marcar Completado", "Mark Complete")}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    {completedJobs.length > 0 && (
                      <div className="mt-6">
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
                          {t("Completados", "Completed")}
                        </p>
                        {completedJobs.map(job => (
                          <div key={job.id} className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 mb-3">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-[10px] font-black text-emerald-600 tracking-widest">#{job.code}</p>
                                <p className="text-xs text-gray-600 mt-0.5">{job.customerName} · {job.district}</p>
                                <p className="text-xs text-gray-400">{formatDate(job.updatedAt, lang)}</p>
                              </div>
                              <div className="text-right">
                                <span className="font-black text-emerald-700 text-lg block">+S/ {job.total.toFixed(2)}</span>
                                {job.serviceRating && (
                                  <span className="text-amber-400 text-xs">{"★".repeat(job.serviceRating)}</span>
                                )}
                              </div>
                            </div>
                            {job.customerRating === null && !ratedJobIds.has(job.id) && (
                              <button
                                onClick={() => setRatingJob(job)}
                                className="mt-3 w-full text-xs font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 py-2 rounded-lg transition-colors"
                              >
                                {t("Calificar cliente", "Rate customer")} ★
                              </button>
                            )}
                            {job.customerRating !== null && (
                              <p className="mt-2 text-xs text-center text-gray-400">
                                {t("Cliente calificado", "Customer rated")}: {"★".repeat(job.customerRating)}{"☆".repeat(5 - job.customerRating)}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {tab === "listings" && (
              <div className="space-y-4">
                <button
                  onClick={() => { setShowNewListing(v => !v); setNewListing(EMPTY_LISTING); }}
                  className="w-full bg-indigo-600 text-white py-3 rounded-xl font-black text-sm hover:bg-indigo-700 active:scale-95 transition-all"
                >
                  {showNewListing ? t("Cancelar", "Cancel") : `+ ${t("Nuevo servicio", "New listing")}`}
                </button>

                {showNewListing && (
                  <form onSubmit={handleCreateListing} className="bg-indigo-50 rounded-2xl p-5 space-y-3 border border-indigo-100">
                    <p className="text-xs font-black text-indigo-600 uppercase tracking-widest">{t("Nuevo servicio", "New listing")}</p>
                    {[
                      { key: "nameEs", label: t("Nombre (ES)", "Name (ES)") },
                      { key: "nameEn", label: t("Nombre (EN)", "Name (EN)") },
                      { key: "descEs", label: t("Descripción (ES)", "Description (ES)") },
                      { key: "descEn", label: t("Descripción (EN)", "Description (EN)") },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">{label}</label>
                        <input
                          className="w-full bg-white rounded-xl p-3 text-sm border-0 focus:ring-2 focus:ring-indigo-500"
                          value={newListing[key]}
                          onChange={e => setNewListing(p => ({ ...p, [key]: e.target.value }))}
                        />
                      </div>
                    ))}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">{t("Precio (S/)", "Price (S/)")}</label>
                        <input type="number" min="0" step="0.5"
                          className="w-full bg-white rounded-xl p-3 text-sm border-0 focus:ring-2 focus:ring-indigo-500"
                          value={newListing.price}
                          onChange={e => setNewListing(p => ({ ...p, price: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">{t("Duración", "Duration")}</label>
                        <input placeholder="e.g. 2h"
                          className="w-full bg-white rounded-xl p-3 text-sm border-0 focus:ring-2 focus:ring-indigo-500"
                          value={newListing.dur}
                          onChange={e => setNewListing(p => ({ ...p, dur: e.target.value }))}
                        />
                      </div>
                    </div>
                    <button disabled={savingListing || !newListing.nameEs || !newListing.nameEn || !newListing.price}
                      className="w-full bg-indigo-600 text-white py-3 rounded-xl font-black text-sm disabled:opacity-40"
                    >
                      {savingListing ? "…" : t("Publicar", "Publish")}
                    </button>
                  </form>
                )}

                {listings.length === 0 && !showNewListing && (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-4 opacity-20">🛠</div>
                    <p className="text-gray-500 font-bold">{t("Aún no tienes servicios", "No listings yet")}</p>
                    <p className="text-gray-400 text-sm mt-1">{t("Crea tu primer servicio para que los clientes puedan encontrarte", "Create your first listing so customers can find you")}</p>
                  </div>
                )}

                {listings.map(listing => (
                  <div key={listing.id} className={`bg-white rounded-2xl p-5 border shadow-sm ${listing.active ? "border-gray-100" : "border-dashed border-gray-200 opacity-60"}`}>
                    {editingId === listing.id ? (
                      <div className="space-y-3">
                        {[
                          { key: "nameEs", label: "ES" }, { key: "nameEn", label: "EN" },
                          { key: "descEs", label: `Desc ES` }, { key: "descEn", label: `Desc EN` },
                        ].map(({ key, label }) => (
                          <div key={key}>
                            <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">{label}</label>
                            <input className="w-full bg-gray-50 rounded-xl p-3 text-sm border-0"
                              value={editForm[key]}
                              onChange={e => setEditForm(p => ({ ...p, [key]: e.target.value }))}
                            />
                          </div>
                        ))}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">{t("Precio", "Price")}</label>
                            <input type="number" min="0" step="0.5" className="w-full bg-gray-50 rounded-xl p-3 text-sm border-0"
                              value={editForm.price} onChange={e => setEditForm(p => ({ ...p, price: e.target.value }))} />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">{t("Duración", "Duration")}</label>
                            <input className="w-full bg-gray-50 rounded-xl p-3 text-sm border-0"
                              value={editForm.dur} onChange={e => setEditForm(p => ({ ...p, dur: e.target.value }))} />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleSaveEdit(listing.id)} disabled={savingListing}
                            className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl font-black text-sm disabled:opacity-40">
                            {savingListing ? "…" : t("Guardar", "Save")}
                          </button>
                          <button onClick={() => setEditingId(null)} className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-xl font-black text-sm">
                            {t("Cancelar", "Cancel")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="font-bold text-gray-800 text-base flex-1 pr-2">{listing.name[lang]}</h3>
                          <span className="text-indigo-600 font-black">S/ {listing.price}</span>
                        </div>
                        {listing.desc[lang] && <p className="text-gray-400 text-xs mb-3">{listing.desc[lang]}</p>}
                        {listing.dur && <p className="text-gray-400 text-xs mb-3">⏱ {listing.dur}</p>}
                        <div className="flex gap-2 mt-3">
                          <button onClick={() => { setEditingId(listing.id); setEditForm({ nameEs: listing.name.es, nameEn: listing.name.en, descEs: listing.desc.es, descEn: listing.desc.en, price: listing.price, dur: listing.dur }); }}
                            className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-xl font-bold text-xs">
                            ✏️ {t("Editar", "Edit")}
                          </button>
                          <button onClick={() => handleToggleActive(listing)}
                            className={`flex-1 py-2 rounded-xl font-bold text-xs ${listing.active ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}>
                            {listing.active ? t("Pausar", "Pause") : t("Activar", "Activate")}
                          </button>
                          <button onClick={() => handleDeleteListing(listing.id)}
                            className="px-3 py-2 rounded-xl bg-red-50 text-red-500 font-bold text-xs">
                            🗑
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {tab === "earnings" && earnings && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-5 rounded-2xl text-white col-span-2">
                    <p className="text-indigo-200 text-xs font-black uppercase tracking-widest mb-1">
                      {t("Total Ganado", "Total Earned")}
                    </p>
                    <p className="text-4xl font-black">S/ {earnings.totalEarnings.toFixed(2)}</p>
                    <p className="text-indigo-200 text-sm mt-1">{earnings.jobsCompleted} {t("trabajos", "jobs")}</p>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{t("Este Mes", "This Month")}</p>
                    <p className="text-2xl font-black text-emerald-600">S/ {earnings.thisMonthEarnings.toFixed(2)}</p>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{t("Calificación", "Rating")}</p>
                    <p className="text-2xl font-black text-amber-500">⭐ {earnings.rating.toFixed(1)}</p>
                  </div>
                </div>

                {earnings.recentJobs.length > 0 && (
                  <div>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 mt-2">
                      {t("Historial Reciente", "Recent History")}
                    </p>
                    <div className="space-y-2">
                      {earnings.recentJobs.map(job => (
                        <div key={job.id} className="bg-white rounded-xl p-4 border border-gray-100 flex justify-between items-center">
                          <div>
                            <p className="text-[10px] font-black text-indigo-600 tracking-widest">#{job.code}</p>
                            <p className="text-xs text-gray-600 mt-0.5">
                              {job.items.map(i => i.serviceName).join(", ")}
                            </p>
                            <p className="text-xs text-gray-400">{formatDate(job.updatedAt, lang)}</p>
                          </div>
                          <span className="font-black text-emerald-600">+S/ {job.total.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {earnings.recentJobs.length === 0 && (
                  <div className="text-center py-8">
                    <div className="text-5xl mb-3 opacity-20">💰</div>
                    <p className="text-gray-400 font-bold">{t("Aún no tienes ganancias", "No earnings yet")}</p>
                    <p className="text-gray-300 text-sm mt-1">{t("Completa trabajos para ver tus ganancias", "Complete jobs to see your earnings")}</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
