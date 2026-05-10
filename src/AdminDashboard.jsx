import React, { useState, useEffect, useCallback } from "react";
import { Languages, Plus, Trash2, ToggleLeft, ToggleRight, Star, ChevronDown, ChevronUp } from "lucide-react";
import { api } from "./api";

const ROLES = ["customer", "provider", "admin"];

const ROLE_COLORS = {
  customer: "bg-gray-100 text-gray-600",
  provider: "bg-indigo-100 text-indigo-700",
  admin: "bg-rose-100 text-rose-700",
};

// ─── Question builder ─────────────────────────────────────────────────────────
function QuestionEditor({ question, onChange, onRemove }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 space-y-3">
      <div className="flex gap-2">
        <select
          value={question.type}
          onChange={(e) => onChange({ ...question, type: e.target.value, options: e.target.value === "choice" ? [""] : undefined })}
          className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-600 shrink-0"
        >
          <option value="rating">⭐ Rating</option>
          <option value="text">💬 Text</option>
          <option value="choice">☑️ Choice</option>
        </select>
        <input
          className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm"
          placeholder="Question text…"
          value={question.text}
          onChange={(e) => onChange({ ...question, text: e.target.value })}
        />
        <button onClick={onRemove} className="text-gray-300 hover:text-rose-500 transition-colors p-2">
          <Trash2 size={16} />
        </button>
      </div>
      {question.type === "choice" && (
        <div className="space-y-2 pl-2">
          {(question.options || [""]).map((opt, i) => (
            <div key={i} className="flex gap-2">
              <input
                className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                placeholder={`Option ${i + 1}`}
                value={opt}
                onChange={(e) => {
                  const opts = [...(question.options || [])];
                  opts[i] = e.target.value;
                  onChange({ ...question, options: opts });
                }}
              />
              {(question.options || []).length > 1 && (
                <button
                  onClick={() => onChange({ ...question, options: question.options.filter((_, j) => j !== i) })}
                  className="text-gray-300 hover:text-rose-500 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => onChange({ ...question, options: [...(question.options || []), ""] })}
            className="text-indigo-600 text-xs font-bold hover:underline"
          >
            + Add option
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Survey results panel ─────────────────────────────────────────────────────
function SurveyResults({ surveyId, lang, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.adminGetSurveyResults(surveyId)
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [surveyId]);

  if (loading) return <div className="pt-2"><Spinner /></div>;
  if (error) return <p className="text-xs text-rose-500 p-3">{error}</p>;
  if (!data) return null;

  return (
    <div className="mt-3 border-t border-gray-100 pt-3 space-y-4">
      <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
        {data.responseCount} {lang === "es" ? "respuestas" : "responses"}
      </p>
      {data.aggregated.map(({ question: q, answers }) => (
        <div key={q.id} className="space-y-1.5">
          <p className="text-xs font-bold text-gray-700">{q.text}</p>
          {q.type === "rating" && (
            <RatingAggregate answers={answers} lang={lang} />
          )}
          {q.type === "choice" && (
            <ChoiceAggregate answers={answers} options={q.options || []} lang={lang} />
          )}
          {q.type === "text" && (
            <TextAnswers answers={answers} lang={lang} />
          )}
        </div>
      ))}
    </div>
  );
}

function RatingAggregate({ answers, lang }) {
  if (!answers.length) return <p className="text-xs text-gray-400">{lang === "es" ? "Sin respuestas" : "No answers"}</p>;
  const avg = answers.reduce((s, a) => s + Number(a), 0) / answers.length;
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  answers.forEach(a => { if (counts[a] !== undefined) counts[a]++; });
  return (
    <div className="space-y-1">
      <p className="text-lg font-black text-amber-500">⭐ {avg.toFixed(1)} <span className="text-xs text-gray-400 font-normal">/ 5</span></p>
      {[5, 4, 3, 2, 1].map(star => {
        const pct = answers.length ? (counts[star] / answers.length) * 100 : 0;
        return (
          <div key={star} className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-gray-400 w-4">{star}★</span>
            <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
              <div className="h-2 bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[10px] text-gray-400 w-5">{counts[star]}</span>
          </div>
        );
      })}
    </div>
  );
}

function ChoiceAggregate({ answers, options, lang }) {
  if (!answers.length) return <p className="text-xs text-gray-400">{lang === "es" ? "Sin respuestas" : "No answers"}</p>;
  const counts = {};
  options.forEach(o => { counts[o] = 0; });
  answers.forEach(a => { if (counts[a] !== undefined) counts[a]++; else counts[a] = 1; });
  return (
    <div className="space-y-1">
      {Object.entries(counts).map(([opt, count]) => {
        const pct = answers.length ? (count / answers.length) * 100 : 0;
        return (
          <div key={opt} className="flex items-center gap-2">
            <span className="text-[10px] text-gray-600 w-24 truncate">{opt}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
              <div className="h-2 bg-indigo-400 rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[10px] text-gray-400 w-5">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

function TextAnswers({ answers, lang }) {
  if (!answers.length) return <p className="text-xs text-gray-400">{lang === "es" ? "Sin respuestas" : "No answers"}</p>;
  return (
    <div className="space-y-1 max-h-32 overflow-y-auto">
      {answers.map((a, i) => (
        <p key={i} className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-1.5">"{a}"</p>
      ))}
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
function UsersTab({ lang }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try { setUsers(await api.adminGetUsers()); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const changeRole = async (id, role) => {
    try {
      const updated = await api.adminUpdateUser(id, { role });
      setUsers(u => u.map(x => x.id === id ? updated : x));
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-2">
      <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
        {users.length} {lang === "es" ? "usuarios" : "users"}
      </p>
      {users.map(u => (
        <div key={u.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex justify-between items-center gap-3">
          <div className="min-w-0">
            <p className="font-bold text-gray-800 text-sm truncate">{u.name}</p>
            <p className="text-xs text-gray-400 truncate">{u.email}</p>
            <p className="text-xs text-gray-300 mt-0.5">
              {new Date(u.createdAt).toLocaleDateString(lang === "es" ? "es-PE" : "en-US")}
            </p>
          </div>
          <select
            value={u.role}
            onChange={(e) => changeRole(u.id, e.target.value)}
            className={`shrink-0 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full border-0 cursor-pointer ${ROLE_COLORS[u.role]}`}
          >
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      ))}
    </div>
  );
}

function SurveysTab({ lang }) {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", questions: [] });
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const fetchSurveys = useCallback(async () => {
    setLoading(true);
    try { setSurveys(await api.adminGetSurveys()); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSurveys(); }, [fetchSurveys]);

  const addQuestion = () => {
    setForm(f => ({
      ...f,
      questions: [...f.questions, { id: crypto.randomUUID(), type: "rating", text: "" }],
    }));
  };

  const updateQuestion = (id, q) => {
    setForm(f => ({ ...f, questions: f.questions.map(x => x.id === id ? q : x) }));
  };

  const removeQuestion = (id) => {
    setForm(f => ({ ...f, questions: f.questions.filter(x => x.id !== id) }));
  };

  const handleCreate = async () => {
    if (!form.title.trim() || !form.questions.length) return;
    setSaving(true);
    try {
      const created = await api.adminCreateSurvey(form);
      setSurveys(s => [created, ...s]);
      setForm({ title: "", description: "", questions: [] });
      setShowForm(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id, active) => {
    try {
      await api.adminUpdateSurvey(id, { active });
      setSurveys(s => s.map(x => x.id === id ? { ...x, active } : x));
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-4">
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 active:scale-95 transition-all"
        >
          <Plus size={18} />
          {lang === "es" ? "Nueva Encuesta" : "New Survey"}
        </button>
      ) : (
        <div className="bg-white rounded-2xl p-5 border border-indigo-100 shadow-sm space-y-4">
          <h3 className="font-black text-gray-800">{lang === "es" ? "Crear Encuesta" : "Create Survey"}</h3>
          <input
            className="w-full bg-gray-50 border-0 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500"
            placeholder={lang === "es" ? "Título de la encuesta" : "Survey title"}
            value={form.title}
            onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
          />
          <textarea
            rows={2}
            className="w-full bg-gray-50 border-0 rounded-xl p-3 text-sm resize-none focus:ring-2 focus:ring-indigo-500"
            placeholder={lang === "es" ? "Descripción (opcional)" : "Description (optional)"}
            value={form.description}
            onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
          />

          <div className="space-y-3">
            {form.questions.map(q => (
              <QuestionEditor
                key={q.id}
                question={q}
                onChange={(updated) => updateQuestion(q.id, updated)}
                onRemove={() => removeQuestion(q.id)}
              />
            ))}
            <button
              onClick={addQuestion}
              className="flex items-center gap-2 text-indigo-600 font-bold text-sm hover:underline"
            >
              <Plus size={16} />
              {lang === "es" ? "Añadir pregunta" : "Add question"}
            </button>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => { setShowForm(false); setForm({ title: "", description: "", questions: [] }); }}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 font-bold text-sm hover:bg-gray-50"
            >
              {lang === "es" ? "Cancelar" : "Cancel"}
            </button>
            <button
              onClick={handleCreate}
              disabled={saving || !form.title.trim() || !form.questions.length}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "…" : (lang === "es" ? "Publicar" : "Publish")}
            </button>
          </div>
        </div>
      )}

      {loading ? <Spinner /> : surveys.map(s => (
        <div key={s.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex justify-between items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-bold text-gray-800 text-sm">{s.title}</p>
              {s.description && <p className="text-xs text-gray-400 mt-0.5">{s.description}</p>}
              <div className="flex gap-3 mt-2 text-xs text-gray-400 font-bold">
                <span>{s.questions.length} {lang === "es" ? "preg." : "q."}</span>
                <button
                  onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                  className="flex items-center gap-1 text-indigo-500 hover:text-indigo-700 transition-colors"
                >
                  {s.responseCount} {lang === "es" ? "resp." : "resp."}
                  {s.responseCount > 0 && (expandedId === s.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                </button>
                <span>{new Date(s.created_at).toLocaleDateString(lang === "es" ? "es-PE" : "en-US")}</span>
              </div>
            </div>
            <button
              onClick={() => toggleActive(s.id, !s.active)}
              className={`shrink-0 transition-colors ${s.active ? "text-indigo-600" : "text-gray-300"}`}
              title={s.active ? "Deactivate" : "Activate"}
            >
              {s.active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
            </button>
          </div>
          {expandedId === s.id && (
            <SurveyResults surveyId={s.id} lang={lang} />
          )}
        </div>
      ))}
    </div>
  );
}

function RatingsTab({ lang }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.adminGetRatings()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (!data || data.total === 0) return (
    <div className="text-center py-16">
      <Star size={48} className="mx-auto text-gray-200 mb-4" />
      <p className="text-gray-400 font-bold">{lang === "es" ? "Sin calificaciones aún" : "No ratings yet"}</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-5 text-white">
        <p className="text-amber-100 text-xs font-black uppercase tracking-widest mb-1">
          {lang === "es" ? "Promedio General" : "Overall Average"}
        </p>
        <p className="text-4xl font-black">⭐ {data.average.toFixed(2)}</p>
        <p className="text-amber-100 text-sm mt-1">{data.total} {lang === "es" ? "calificaciones" : "ratings"}</p>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
        {[5, 4, 3, 2, 1].map(star => {
          const count = data.counts[star] || 0;
          const pct = data.total > 0 ? (count / data.total) * 100 : 0;
          return (
            <div key={star} className="flex items-center gap-3">
              <span className="text-xs font-black text-gray-500 w-6 text-right">{star}★</span>
              <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className="h-3 bg-amber-400 rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs font-bold text-gray-400 w-8">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────
export default function AdminDashboard({ user, nav, lang, toggleLang }) {
  const [tab, setTab] = useState("users");
  const [authed, setAuthed] = useState(() => !!localStorage.getItem('ps_admin_token'));
  const adminUser = JSON.parse(localStorage.getItem('ps_admin_user') || 'null');
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    try {
      const data = await api.adminLogin(loginForm);
      localStorage.setItem('ps_admin_token', data.token);
      localStorage.setItem('ps_admin_user', JSON.stringify(data.user));
      setAuthed(true);
    } catch (err) {
      setLoginError(err.message === 'Failed to fetch' 
        ? (lang === 'es' ? 'Error de conexión' : 'Connection error')
        : (lang === "es" ? "Credenciales incorrectas" : "Invalid credentials")
      );
    }
  };

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-xl">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">🔒</div>
            <h2 className="text-xl font-black text-gray-800">
              {lang === "es" ? "Acceso Admin" : "Admin Access"}
            </h2>
          </div>
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <input
              type="text"
              placeholder={lang === "es" ? "Usuario" : "Username"}
              value={loginForm.username}
              onChange={(e) => setLoginForm(f => ({ ...f, username: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <input
              type="password"
              placeholder={lang === "es" ? "Contraseña" : "Password"}
              value={loginForm.password}
              onChange={(e) => setLoginForm(f => ({ ...f, password: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            {loginError && <p className="text-red-500 text-xs font-bold text-center">{loginError}</p>}
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-black hover:bg-indigo-700 transition-colors"
            >
              {lang === "es" ? "Entrar" : "Login"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "users", label: lang === "es" ? "Usuarios" : "Users" },
    { id: "surveys", label: lang === "es" ? "Encuestas" : "Surveys" },
    { id: "ratings", label: lang === "es" ? "Reseñas" : "Ratings" },
  ];

  return (
    <div>
      <div className="sticky top-0 bg-white px-4 pt-4 pb-3 border-b border-gray-100 z-20">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800">
              {lang === "es" ? "Panel Admin" : "Admin Panel"}
            </h1>
            <p className="text-xs text-gray-400">
              {adminUser?.name || (lang === 'es' ? 'Administrador' : 'Administrator')}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={toggleLang}
              className="flex items-center gap-1 bg-gray-100 px-3 py-1.5 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              <Languages size={16} />
              {lang === "es" ? "EN" : "ES"}
            </button>
            <button
              onClick={() => { localStorage.removeItem('ps_admin_token'); localStorage.removeItem('ps_admin_user'); setAuthed(false); }}
              className="bg-rose-50 text-rose-600 px-3 py-1.5 rounded-full text-sm font-bold hover:bg-rose-100 transition-colors"
            >
              {lang === "es" ? "Salir" : "Exit"}
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all ${
                tab === t.id ? "bg-indigo-600 text-white shadow-sm" : "bg-gray-100 text-gray-500"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {tab === "users" && <UsersTab lang={lang} />}
        {tab === "surveys" && <SurveysTab lang={lang} />}
        {tab === "ratings" && <RatingsTab lang={lang} />}
      </div>
    </div>
  );
}
