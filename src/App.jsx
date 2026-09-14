import { useEffect, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db } from './firebase';

const sections = {
  gyms: {
    label: 'Palestre',
    singular: 'palestra',
    fields: [
      { name: 'name', label: 'Nome palestra', required: true },
      { name: 'address', label: 'Citta e indirizzo', required: true },
      { name: 'distance', label: 'Distanza' },
      { name: 'open', label: 'Aperta', type: 'checkbox', default: true },
      { name: 'hours', label: 'Orari' },
      { name: 'members', label: 'Iscritti', type: 'number' },
    ],
    title: (item) => item.name,
    summary: (item) => item.address,
  },
  courses: {
    label: 'Corsi',
    singular: 'corso',
    fields: [
      { name: 'name', label: 'Nome corso', required: true },
      { name: 'coach', label: 'Trainer' },
      { name: 'schedule', label: 'Giorni e orario' },
      { name: 'duration', label: 'Durata' },
      { name: 'spots', label: 'Posti disponibili', type: 'number' },
      { name: 'max_spots', label: 'Posti totali', type: 'number' },
      { name: 'price', label: 'Prezzo' },
      { name: 'tag', label: 'Etichetta' },
      { name: 'tag_color', label: 'Colore etichetta', type: 'color' },
      { name: 'description', label: 'Descrizione', type: 'textarea' },
      { name: 'enrolled', label: 'Iscritti', type: 'number' },
    ],
    title: (item) => item.name,
    summary: (item) => `${item.coach || 'Trainer da assegnare'}${item.schedule ? ` - ${item.schedule}` : ''}`,
  },
  scheda_days: {
    label: 'Giorni scheda',
    singular: 'giorno scheda',
    fields: [
      { name: 'day', label: 'Nome giorno', required: true },
      { name: 'sort_order', label: 'Ordine', type: 'number' },
    ],
    title: (item) => item.day,
    summary: (item) => `Ordine ${item.sort_order || 0}`,
  },
  exercises: {
    label: 'Esercizi',
    singular: 'esercizio',
    fields: [
      { name: 'scheda_day_id', label: 'ID giorno scheda', required: true },
      { name: 'name', label: 'Nome esercizio', required: true },
      { name: 'sets', label: 'Serie e ripetizioni' },
      { name: 'weight', label: 'Carico' },
      { name: 'muscle', label: 'Muscolo' },
      { name: 'gif_url', label: 'URL GIF' },
      { name: 'sort_order', label: 'Ordine', type: 'number' },
    ],
    title: (item) => item.name,
    summary: (item) => `${item.muscle || ''} - giorno ${item.scheda_day_id || ''}`,
  },
  occupancy: {
    label: 'Affluenza',
    singular: 'rilevazione affluenza',
    fields: [
      { name: 'gym_id', label: 'ID palestra', required: true },
      { name: 'hour', label: 'Ora', type: 'number', required: true },
      { name: 'percentage', label: 'Percentuale', type: 'number', required: true },
    ],
    title: (item) => `${item.hour}:00 - ${item.percentage}%`,
    summary: (item) => `Palestra ${item.gym_id}`,
  },
  promos: {
    label: 'Promo',
    singular: 'promo',
    fields: [
      { name: 'title', label: 'Titolo', required: true },
      { name: 'image_url', label: 'URL immagine' },
      { name: 'short_description', label: 'Descrizione breve' },
      { name: 'description', label: 'Descrizione', type: 'textarea' },
      { name: 'expires_at', label: 'Scadenza', type: 'date' },
      { name: 'active', label: 'Attiva', type: 'checkbox', default: true },
    ],
    title: (item) => item.title,
    summary: (item) => item.short_description,
  },
  events: {
    label: 'Eventi',
    singular: 'evento',
    fields: [
      { name: 'title', label: 'Titolo', required: true },
      { name: 'date', label: 'Data', type: 'date', required: true },
      { name: 'location', label: 'Luogo' },
      { name: 'short_description', label: 'Descrizione breve' },
      { name: 'description', label: 'Descrizione', type: 'textarea' },
    ],
    title: (item) => item.title,
    summary: (item) => `${item.date || ''}${item.location ? ` - ${item.location}` : ''}`,
  },
  notifications: {
    label: 'Notifiche',
    singular: 'notifica',
    fields: [
      { name: 'type', label: 'Tipo', required: true },
      { name: 'title', label: 'Titolo', required: true },
      { name: 'body', label: 'Testo', type: 'textarea', required: true },
    ],
    title: (item) => item.title,
    summary: (item) => item.body,
  },
};

function initialForm(section) {
  return Object.fromEntries(sections[section].fields.map((field) => [field.name, field.default ?? (field.type === 'checkbox' ? false : '')]));
}

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const submit = async (event) => {
    event.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      setError('Accesso non riuscito. Verifica email, password e ruolo del profilo.');
    }
  };
  return <main className="login"><div><span className="eyebrow">GREEN THEORY</span><h1>Portale palestra</h1><p>Gestisci i contenuti che i clienti vedono nell'app.</p><form onSubmit={submit}><input type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} required /><input type="password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} required /><button>Accedi</button>{error && <small>{error}</small>}</form></div></main>;
}

function valueForInput(value, field) {
  if (value == null) return field.type === 'checkbox' ? false : '';
  return value;
}

function Editor({ section, editing, onSaved, onCancel }) {
  const definition = sections[section];
  const [form, setForm] = useState(() => editing || initialForm(section));
  const [error, setError] = useState('');
  useEffect(() => setForm(editing || initialForm(section)), [editing, section]);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const submit = async (event) => {
    event.preventDefault();
    try {
      const id = editing?.id || `${section}-${Date.now()}`;
      const data = Object.fromEntries(definition.fields.map((field) => {
        let value = form[field.name];
        if (field.type === 'number') value = value === '' || value == null ? 0 : Number(value);
        if (field.type === 'checkbox') value = Boolean(value);
        return [field.name, value];
      }));
      await setDoc(doc(db, section, id), { ...data, updated_at: serverTimestamp(), ...(editing ? {} : { created_at: serverTimestamp() }) }, { merge: true });
      onSaved();
    } catch (saveError) {
      setError(saveError.code === 'permission-denied' ? 'Permesso negato: il profilo deve avere role = gym_owner.' : saveError.message);
    }
  };

  return <form className="editor" onSubmit={submit}><div className="editor-heading"><h2>{editing ? 'Modifica' : 'Nuovo'} {definition.singular}</h2>{editing && <button type="button" className="ghost" onClick={onCancel}>Annulla</button>}</div>{definition.fields.map((field) => <label key={field.name}>{field.label}{field.type === 'textarea' ? <textarea value={valueForInput(form[field.name], field)} onChange={(event) => update(field.name, event.target.value)} required={field.required} /> : <input type={field.type || 'text'} checked={field.type === 'checkbox' ? valueForInput(form[field.name], field) : undefined} value={field.type === 'checkbox' ? undefined : valueForInput(form[field.name], field)} onChange={(event) => update(field.name, field.type === 'checkbox' ? event.target.checked : event.target.value)} required={field.required} />}</label>)}<button type="submit">{editing ? 'Salva modifiche' : 'Pubblica su Firebase'}</button>{error && <small className="form-error">{error}</small>}</form>;
}

function Dashboard({ user }) {
  const [section, setSection] = useState('gyms');
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const definition = sections[section];
  const load = async () => { const result = await getDocs(collection(db, section)); setItems(result.docs.map((item) => ({ id: item.id, ...item.data() }))); };
  useEffect(() => { setEditing(null); load(); }, [section]);
  const remove = async (id) => { await deleteDoc(doc(db, section, id)); load(); };
  const saved = () => { setEditing(null); load(); };
  return <main className="dashboard"><header><div><span className="eyebrow">GREEN THEORY / PORTALE</span><h1>Contenuti pubblicati</h1></div><button className="ghost" onClick={() => signOut(auth)}>Esci</button></header><nav>{Object.entries(sections).map(([key, value]) => <button className={section === key ? 'active' : ''} onClick={() => setSection(key)} key={key}>{value.label}</button>)}</nav><section className="workspace"><Editor section={section} editing={editing} onSaved={saved} onCancel={() => setEditing(null)} /><div className="records"><h2>{definition.label} presenti</h2>{items.length === 0 && <p className="muted">Nessun contenuto ancora.</p>}{items.map((item) => <article key={item.id}><div><strong>{definition.title(item)}</strong><p>{definition.summary(item)}</p><small>ID: {item.id}</small></div><div className="record-actions"><button className="ghost" onClick={() => setEditing(item)}>Modifica</button><button className="delete" onClick={() => remove(item.id)}>Elimina</button></div></article>)}</div></section><footer>Accesso: {user.email} | ruolo gestito da Firestore</footer></main>;
}

export default function App() { const [user, setUser] = useState(undefined); useEffect(() => onAuthStateChanged(auth, setUser), []); if (user === undefined) return null; return user ? <Dashboard user={user} /> : <Login />; }
