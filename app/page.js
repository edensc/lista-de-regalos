'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

// =====================================================
// Constantes y utilidades
// =====================================================
const LIST_COLORS = {
  violet: { main: '#7c5cff', soft: '#efeaff', dark: '#5b3fe0', name: 'Violeta' },
  pink:   { main: '#ec4899', soft: '#fde7f3', dark: '#c42a7c', name: 'Rosa' },
  orange: { main: '#f97316', soft: '#ffedd9', dark: '#d4570a', name: 'Naranja' },
  amber:  { main: '#f2a900', soft: '#fff3d1', dark: '#b57d00', name: 'Ámbar' },
  green:  { main: '#10b981', soft: '#d9f7ec', dark: '#0b8a60', name: 'Verde' },
  teal:   { main: '#14b8c4', soft: '#d8f6f8', dark: '#0e8c96', name: 'Turquesa' },
  blue:   { main: '#3b82f6', soft: '#e1ecff', dark: '#2160c9', name: 'Azul' },
  red:    { main: '#ef4444', soft: '#fde4e4', dark: '#c42a2a', name: 'Rojo' },
}
const colorOf = (k) => LIST_COLORS[k] || LIST_COLORS.violet

const T = { bg: 'linear-gradient(180deg,#f3efff 0%,#fdf2f8 100%)', text: '#231f3a', muted: '#7d7a92', border: '#e8e4f7', card: '#ffffff', danger: '#e04545', ok: '#10a36b', grad: 'linear-gradient(135deg,#7c5cff 0%,#ec4899 100%)' }

const S = {
  page: { minHeight: '100vh', background: T.bg, color: T.text, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', paddingBottom: 110 },
  container: { maxWidth: 560, margin: '0 auto', padding: '0 16px' },
  header: { background: T.grad, color: '#fff', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 4px 14px rgba(124,92,255,0.25)' },
  headerInner: { maxWidth: 560, margin: '0 auto', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  h1: { fontSize: 26, margin: '20px 0 4px', fontWeight: 800 },
  h3: { fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: T.muted, margin: '26px 0 10px', fontWeight: 700 },
  small: { fontSize: 13, color: T.muted },
  card: { background: T.card, borderRadius: 16, padding: 16, boxShadow: '0 2px 12px rgba(80,60,160,0.08)' },
  input: { width: '100%', boxSizing: 'border-box', padding: '12px 14px', fontSize: 16, border: `1.5px solid ${T.border}`, borderRadius: 12, marginBottom: 8, outline: 'none', background: '#fff', color: T.text, fontFamily: 'inherit' },
  btn: (a = LIST_COLORS.violet) => ({ padding: '11px 18px', fontSize: 15, fontWeight: 700, border: 'none', borderRadius: 12, background: a.main, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', boxShadow: `0 3px 10px ${a.main}44`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }),
  btnGhost: { padding: '9px 14px', fontSize: 14, fontWeight: 600, border: `1.5px solid ${T.border}`, borderRadius: 12, background: '#fff', color: T.text, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' },
  btnDanger: { padding: '9px 14px', fontSize: 14, fontWeight: 600, border: `1.5px solid ${T.danger}`, borderRadius: 12, background: '#fff', color: T.danger, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 },
  linkBtn: { background: 'none', border: 'none', color: LIST_COLORS.violet.dark, cursor: 'pointer', fontSize: 15, fontWeight: 600, padding: 0, fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 },
  row: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  error: { background: '#fdecec', color: T.danger, padding: '10px 14px', borderRadius: 12, margin: '12px 0', fontSize: 14 },
  info: { background: '#e3f8ee', color: T.ok, padding: '10px 14px', borderRadius: 12, margin: '12px 0', fontSize: 14 },
  code: { fontFamily: 'ui-monospace, monospace', background: '#fff', border: `1.5px dashed ${T.border}`, padding: '4px 10px', borderRadius: 8, fontWeight: 800, letterSpacing: 1.5 },
}

const EMPTY_GIFT = { title: '', description: '', price_estimated: '', url: '' }
const EMPTY_LIST = { name: '', description: '', icon: 'fluent:Wrapped gift', color: 'violet' }

const fmtPrice = (p) => (p === null || p === undefined || p === '' ? null : `${Number(p).toFixed(2)} €`)
const normUrl = (u) => (/^https?:\/\//i.test(u) ? u : `https://${u}`)
const hostOf = (u) => { try { return new URL(normUrl(u)).hostname.replace(/^www\./, '') } catch (e) { return u } }

function timeAgo(ts) {
  const mins = Math.floor((Date.now() - new Date(ts).getTime()) / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins} min`
  const h = Math.floor(mins / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.floor(h / 24)
  if (d === 1) return 'ayer'
  return `hace ${d} días`
}

// Agrupa altas seguidas y quita duplicados de reservas (un evento por lista)
function groupActivity(items) {
  const out = []
  for (const a of items) {
    const last = out[out.length - 1]
    if (
      last && last.kind === a.kind && last.actor_id === a.actor_id &&
      (a.kind === 'gift_reserved' || a.kind === 'gift_released') &&
      last.gift_id === a.gift_id && last.created_at === a.created_at
    ) continue
    if (
      a.kind === 'gift_added' && last && last.kind === 'gift_added' &&
      last.actor_id === a.actor_id && last.list_id === a.list_id &&
      Math.abs(new Date(last.created_at) - new Date(a.created_at)) < 6 * 3600 * 1000
    ) {
      last.count += 1
      continue
    }
    out.push({ ...a, count: 1 })
  }
  return out
}

// =====================================================
// Iconos (SVG de línea, sin dependencias)
// =====================================================
const ICONS = {
  gift: (<><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13" /><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" /><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" /></>),
  home: (<><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" /><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></>),
  list: (<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />),
  users: (<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>),
  plus: (<path d="M5 12h14M12 5v14" />),
  x: (<path d="M18 6 6 18M6 6l12 12" />),
  link: (<><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></>),
  share: (<><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" /></>),
  trash: (<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />),
  pencil: (<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />),
  check: (<path d="M20 6 9 17l-5-5" />),
  lock: (<><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>),
  arrowLeft: (<path d="m12 19-7-7 7-7M19 12H5" />),
  chevronRight: (<path d="m9 18 6-6-6-6" />),
  logIn: (<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />),
  logOut: (<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />),
  copy: (<><rect x="8" y="8" width="14" height="14" rx="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></>),
  mail: (<><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></>),
  send: (<><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></>),
  message: (<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />),
  cake: (<><path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" /><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1" /><path d="M2 21h20M7 8v3M12 8v3M17 8v3M7 4h.01M12 4h.01M17 4h.01" /></>),
  tree: (<path d="M12 22v-5M8 17h8l-3-4h2l-3-4h2l-4-5-4 5h2l-3 4h2z" />),
  gamepad: (<><path d="M6 12h4M8 10v4M15 13h.01M18 11h.01" /><rect x="2" y="6" width="20" height="12" rx="4" /></>),
  book: (<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />),
  music: (<><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>),
  wrench: (<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />),
  film: (<><rect x="2" y="2" width="20" height="20" rx="2.18" /><path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5" /></>),
  shirt: (<path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />),
  wine: (<path d="M8 22h8M7 10h10M12 15v7M12 15a5 5 0 0 0 5-5c0-2-.5-4-2-8H9c-1.5 4-2 6-2 8a5 5 0 0 0 5 5z" />),
  dice: (<><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01" /></>),
  star: (<path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />),
  heart: (<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />),
  camera: (<><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z" /><circle cx="12" cy="13" r="3" /></>),
  smile: (<><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" /></>),
}
const LIST_ICON_KEYS = ['gift', 'cake', 'tree', 'gamepad', 'book', 'music', 'wrench', 'home', 'film', 'shirt', 'wine', 'dice', 'star', 'heart', 'camera', 'smile']

// Imágenes 3D de Fluent Emoji (Microsoft, licencia MIT) servidas desde jsDelivr.
// Se guardan como "fluent:Nombre". La lista blanca evita cargar URLs arbitrarias.
// Si una imagen no carga, se oculta en los selectores y se sustituye por un icono donde ya se usaba.
const FLUENT_BASE = 'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets'
const fluentUrl = (name) => `${FLUENT_BASE}/${encodeURIComponent(name)}/3D/${name.toLowerCase().replace(/ /g, '_')}_3d.png`

const FLUENT_ANIMALS = ['Fox', 'Panda', 'Lion', 'Tiger face', 'Cat face', 'Dog face', 'Frog', 'Octopus', 'Unicorn', 'Penguin', 'Koala', 'Owl', 'Rabbit face', 'Bear', 'Monkey face', 'Hamster', 'Pig face', 'Whale', 'Dolphin', 'Butterfly', 'Turtle', 'Elephant', 'Giraffe', 'Hedgehog', 'Sloth', 'Otter', 'Llama', 'Flamingo', 'Dragon face']

const LIST_THEMES = [
  { label: 'Regalos y fiestas', items: ['Wrapped gift', 'Birthday cake', 'Balloon', 'Party popper', 'Confetti ball', 'Ribbon'] },
  { label: 'Navidad', items: ['Christmas tree', 'Snowman', 'Snowflake', 'Glowing star', 'Bell', 'Candy'] },
  { label: 'Juegos', items: ['Video game', 'Joystick', 'Game die', 'Puzzle piece', 'Teddy bear', 'Chess pawn'] },
  { label: 'Libros y música', items: ['Books', 'Open book', 'Notebook', 'Musical note', 'Guitar', 'Headphone', 'Microphone'] },
  { label: 'Hogar y herramientas', items: ['House', 'Couch and lamp', 'Potted plant', 'Wrench', 'Hammer', 'Toolbox', 'Gear'] },
  { label: 'Cine y tecnología', items: ['Clapper board', 'Movie camera', 'Popcorn', 'Camera', 'Laptop', 'Mobile phone'] },
  { label: 'Ropa y accesorios', items: ['T-shirt', 'Jeans', 'Running shoe', 'Backpack', 'Eyeglasses', 'Gem stone'] },
  { label: 'Comida y bebida', items: ['Wine glass', 'Hot beverage', 'Pizza', 'Cookie', 'Doughnut', 'Beer mug'] },
  { label: 'Viajes y deporte', items: ['Airplane', 'Luggage', 'Camping', 'Beach with umbrella', 'Soccer ball', 'Bicycle'] },
]
const FLUENT_ALL = [...FLUENT_ANIMALS, ...LIST_THEMES.flatMap((t) => t.items)]
const isArt = (n) => typeof n === 'string' && n.startsWith('fluent:') && FLUENT_ALL.includes(n.slice(7))

// Avatares: animales (Fluent) o DiceBear (API gratuita para uso no comercial), "estilo:semilla".
// Solo estilos con licencia libre; la lista blanca evita cargar URLs arbitrarias.
const AVATAR_STYLES = [
  { key: 'bottts', label: 'Robots' },
  { key: 'fun-emoji', label: 'Caritas' },
  { key: 'thumbs', label: 'Formas' },
]
function parseAvatar(v) {
  if (!v || typeof v !== 'string') return null
  const i = v.indexOf(':')
  if (i < 1) return null
  const kind = v.slice(0, i)
  const rest = v.slice(i + 1)
  if (!rest) return null
  if (kind === 'fluent') return FLUENT_ANIMALS.includes(rest) ? { kind: 'fluent', name: rest } : null
  if (AVATAR_STYLES.some((s) => s.key === kind)) return { kind: 'dicebear', style: kind, seed: rest }
  return null
}
function avatarUrl(v, colorKey) {
  const a = parseAvatar(v)
  if (!a) return null
  if (a.kind === 'fluent') return fluentUrl(a.name)
  const bg = colorOf(colorKey).soft.slice(1)
  return `https://api.dicebear.com/9.x/${a.style}/svg?seed=${encodeURIComponent(a.seed)}&backgroundColor=${bg}`
}

function Icon({ name, size = 20, color = 'currentColor', stroke = 2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      {ICONS[name] || ICONS.gift}
    </svg>
  )
}

// =====================================================
// Componentes reutilizables
// =====================================================
function Avatar({ profile, size = 36, ring }) {
  const [failed, setFailed] = useState(false)
  const c = colorOf(profile?.avatar_color)
  const initial = (profile?.full_name || '?').trim().charAt(0).toUpperCase()
  const url = avatarUrl(profile?.avatar, profile?.avatar_color)
  const pad = parseAvatar(profile?.avatar)?.kind === 'fluent' ? size * 0.12 : 0
  useEffect(() => { setFailed(false) }, [url])
  const showImg = !!url && !failed
  return (
    <span style={{
      width: size, height: size, borderRadius: '50%', background: showImg ? c.soft : c.main, color: '#fff',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden',
      fontSize: size * 0.45, fontWeight: 800, boxShadow: ring ? '0 0 0 2px #fff' : 'none',
    }}>
      {showImg ? (
        <img src={url} alt="" width={size} height={size} loading="lazy" onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%', display: 'block', padding: pad, boxSizing: 'border-box', objectFit: 'contain' }} />
      ) : initial}
    </span>
  )
}

// Botones de pestañas (temas de listas, tipos de avatar)
function TabChips({ tabs, value, onChange, accent }) {
  return (
    <div style={{ ...S.row, marginBottom: 10 }}>
      {tabs.map((t) => {
        const on = value === t.key
        return (
          <button key={t.key} type="button" onClick={() => onChange(t.key)} style={{
            padding: '6px 12px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
            border: `1.5px solid ${on ? accent.main : T.border}`, background: on ? accent.soft : '#fff', color: on ? accent.dark : T.muted,
          }}>{t.label}</button>
        )
      })}
    </div>
  )
}

// Opción de una galería de imágenes: si la imagen no carga, la opción desaparece
function ArtButton({ src, on, accent, round, bg, onPick }) {
  const [failed, setFailed] = useState(false)
  if (failed) return null
  return (
    <button type="button" onClick={onPick} style={{
      padding: 6, cursor: 'pointer', background: bg || '#fff', borderRadius: round ? '50%' : 14, lineHeight: 0,
      border: `3px solid ${on ? accent.main : T.border}`,
    }}>
      <img src={src} alt="" loading="lazy" onError={() => setFailed(true)}
        style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'contain', display: 'block' }} />
    </button>
  )
}

// Imagen de una lista: ilustración 3D si es "fluent:…", o icono de línea
function ListIcon({ name, size = 20 }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => { setFailed(false) }, [name])
  if (isArt(name) && !failed) {
    return (
      <img src={fluentUrl(name.slice(7))} alt="" width={size} height={size} loading="lazy" onError={() => setFailed(true)}
        style={{ width: size, height: size, objectFit: 'contain', display: 'block', flexShrink: 0 }} />
    )
  }
  return <Icon name={name} size={size} />
}

// Galería para elegir avatar: animales (3D), robots, caritas y formas
function AvatarPicker({ value, color, onChange }) {
  const current = parseAvatar(value)
  const [tab, setTab] = useState(current?.kind === 'dicebear' ? current.style : 'animals')
  const [batch, setBatch] = useState(1)
  const accent = colorOf(color)
  const tabs = [{ key: 'animals', label: 'Animales' }, ...AVATAR_STYLES]
  const seeds = Array.from({ length: 8 }, (_, i) => `b${batch}-${i + 1}`)
  return (
    <div>
      <TabChips tabs={tabs} value={tab} onChange={setTab} accent={accent} />
      {tab === 'animals' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {FLUENT_ANIMALS.map((name) => (
            <ArtButton key={name} src={fluentUrl(name)} on={value === `fluent:${name}`} accent={accent} round bg={accent.soft}
              onPick={() => onChange(`fluent:${name}`)} />
          ))}
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {seeds.map((seed) => {
              const v = `${tab}:${seed}`
              const on = value === v
              return (
                <button key={seed} type="button" onClick={() => onChange(v)} style={{
                  padding: 0, borderRadius: '50%', cursor: 'pointer', background: 'none', lineHeight: 0,
                  border: `3px solid ${on ? accent.main : 'transparent'}`,
                }}>
                  <img src={avatarUrl(v, color)} alt="" loading="lazy" style={{ width: '100%', borderRadius: '50%', display: 'block' }} />
                </button>
              )
            })}
          </div>
          <button type="button" style={{ ...S.btnGhost, marginTop: 10 }} onClick={() => setBatch(batch + 1)}>
            <Icon name="dice" size={15} /> Más opciones
          </button>
        </>
      )}
    </div>
  )
}

// Galería de imágenes para una lista, por temas (o iconos sencillos de línea)
function ListArtPicker({ value, accent, onChange }) {
  const [tab, setTab] = useState(() => {
    if (isArt(value)) {
      const i = LIST_THEMES.findIndex((t) => t.items.includes(value.slice(7)))
      return i >= 0 ? i : 0
    }
    return value && ICONS[value] ? 'icons' : 0
  })
  const tabs = [...LIST_THEMES.map((t, i) => ({ key: i, label: t.label })), { key: 'icons', label: 'Sencillos' }]
  return (
    <div>
      <TabChips tabs={tabs} value={tab} onChange={setTab} accent={accent} />
      {tab === 'icons' ? (
        <IconPicker options={LIST_ICON_KEYS} value={value} accent={accent} onChange={onChange} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
          {LIST_THEMES[tab].items.map((name) => (
            <ArtButton key={name} src={fluentUrl(name)} on={value === `fluent:${name}`} accent={accent} bg={accent.soft}
              onPick={() => onChange(`fluent:${name}`)} />
          ))}
        </div>
      )}
    </div>
  )
}

function AvatarStack({ profiles, size = 24, max = 4 }) {
  if (!profiles.length) return null
  const shown = profiles.slice(0, max)
  const extra = profiles.length - shown.length
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
      {shown.map((p, i) => (
        <span key={p.id || i} style={{ marginLeft: i ? -size * 0.3 : 0 }}><Avatar profile={p} size={size} ring /></span>
      ))}
      {extra > 0 && <span style={{ marginLeft: 6, fontSize: 12, color: T.muted, fontWeight: 700 }}>+{extra}</span>}
    </span>
  )
}

function IconBadge({ icon, color, size = 48 }) {
  return (
    <span style={{ width: size, height: size, borderRadius: size * 0.3, background: color.soft, color: color.dark, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <ListIcon name={icon} size={isArt(icon) ? size * 0.72 : size * 0.5} />
    </span>
  )
}

function Meta({ icon, children }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: T.muted, fontWeight: 600 }}>
      {icon && <Icon name={icon} size={14} />}{children}
    </span>
  )
}

function Segmented({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', background: '#f3f0ff', borderRadius: 12, padding: 4 }}>
      {options.map(([key, label, icon]) => {
        const on = value === key
        return (
          <button key={key} type="button" onClick={() => onChange(key)} style={{
            flex: 1, border: 'none', borderRadius: 9, padding: '9px 6px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 14,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            background: on ? '#fff' : 'transparent', color: on ? LIST_COLORS.violet.dark : T.muted,
            boxShadow: on ? '0 1px 6px rgba(80,60,160,0.15)' : 'none',
          }}>
            {icon && <Icon name={icon} size={16} />}{label}
          </button>
        )
      })}
    </div>
  )
}

function IconPicker({ options, value, onChange, accent }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {options.map((k) => {
        const on = value === k
        return (
          <button key={k} type="button" onClick={() => onChange(k)} title={k}
            style={{
              width: 42, height: 42, borderRadius: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              border: `2px solid ${on ? accent.main : T.border}`, background: on ? accent.soft : '#fff', color: on ? accent.dark : T.muted,
            }}>
            <Icon name={k} size={20} />
          </button>
        )
      })}
    </div>
  )
}

function ColorPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {Object.entries(LIST_COLORS).map(([key, c]) => (
        <button key={key} type="button" onClick={() => onChange(key)} title={c.name}
          style={{
            width: 32, height: 32, borderRadius: '50%', background: c.main, cursor: 'pointer',
            border: value === key ? `3px solid ${T.text}` : '3px solid #fff', boxShadow: '0 0 0 1px ' + T.border,
          }} />
      ))}
    </div>
  )
}

function ListPicker({ lists, selected, onChange, label }) {
  const toggle = (id) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])
  if (lists.length === 0) return null
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ ...S.small, marginBottom: 6, fontWeight: 700 }}>{label}</div>
      <div style={S.row}>
        {lists.map((l) => {
          const c = colorOf(l.color)
          const on = selected.includes(l.id)
          return (
            <label key={l.id} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999, cursor: 'pointer',
              border: `1.5px solid ${on ? c.main : T.border}`, background: on ? c.soft : '#fff', color: on ? c.dark : T.text, fontSize: 14, fontWeight: 600,
            }}>
              <input type="checkbox" checked={on} onChange={() => toggle(l.id)} style={{ margin: 0 }} />
              <ListIcon name={l.icon} size={16} /> {l.name}
            </label>
          )
        })}
      </div>
    </div>
  )
}

// Campos de un regalo (se usan al crear, desde el inicio, dentro de una lista y al editar)
function GiftFields({ form, setForm, more = true, titlePlaceholder = 'Título' }) {
  return (
    <>
      <input style={{ ...S.input, marginBottom: more ? 8 : 0 }} placeholder={titlePlaceholder} value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })} />
      {more && (
        <>
          <input style={S.input} placeholder="Descripción (opcional)" value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div style={{ display: 'flex', gap: 8 }}>
            <input style={S.input} type="number" step="0.01" min="0" inputMode="decimal" placeholder="Precio (€)" value={form.price_estimated}
              onChange={(e) => setForm({ ...form, price_estimated: e.target.value })} />
            <input style={S.input} placeholder="Enlace (URL)" value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })} />
          </div>
        </>
      )}
    </>
  )
}

// Campos de una lista (se usan al crear y al editar)
function ListFields({ value, onChange, more = true, namePlaceholder = 'Nombre de la lista' }) {
  const c = colorOf(value.color)
  return (
    <>
      <input style={{ ...S.input, marginBottom: more ? 8 : 0 }} placeholder={namePlaceholder} value={value.name}
        onChange={(e) => onChange({ ...value, name: e.target.value })} />
      {more && (
        <>
          <textarea style={{ ...S.input, minHeight: 64, resize: 'vertical' }}
            placeholder="Descripción o leyenda (opcional). Ej: VJ = videojuego, H = herramienta"
            value={value.description} onChange={(e) => onChange({ ...value, description: e.target.value })} />
          <div style={{ ...S.small, fontWeight: 700, marginBottom: 6 }}>Imagen</div>
          <ListArtPicker value={value.icon} accent={c} onChange={(icon) => onChange({ ...value, icon })} />
          <div style={{ ...S.small, fontWeight: 700, margin: '12px 0 6px' }}>Color</div>
          <ColorPicker value={value.color} onChange={(color) => onChange({ ...value, color })} />
        </>
      )}
    </>
  )
}

function ListCard({ list, onClick, children }) {
  const c = colorOf(list.color)
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left', cursor: 'pointer',
      background: '#fff', border: 'none', borderRadius: 16, padding: 14, marginBottom: 10, fontFamily: 'inherit',
      boxShadow: '0 2px 12px rgba(80,60,160,0.08)', borderLeft: `6px solid ${c.main}`,
    }}>
      <IconBadge icon={list.icon} color={c} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 17, fontWeight: 800, color: T.text }}>{list.name}</span>
        {list.description && (
          <span style={{ display: 'block', fontSize: 13, color: T.muted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {list.description}
          </span>
        )}
        <span style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px 12px', marginTop: 8 }}>{children}</span>
      </span>
      <Icon name="chevronRight" color={c.main} size={22} />
    </button>
  )
}

function Tile({ gradient, icon, big, label, sub, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: gradient, color: '#fff', border: 'none', borderRadius: 20, padding: 16, textAlign: 'left',
      cursor: 'pointer', minHeight: 124, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      fontFamily: 'inherit', boxShadow: '0 6px 16px rgba(60,40,140,0.18)',
    }}>
      <Icon name={icon} size={26} />
      <span>
        <span style={{ display: 'block', fontSize: 30, fontWeight: 800, lineHeight: 1 }}>{big}</span>
        <span style={{ display: 'block', fontSize: 14, fontWeight: 700, marginTop: 4 }}>{label}</span>
        <span style={{ display: 'block', fontSize: 12, opacity: 0.9, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</span>
      </span>
    </button>
  )
}

// Compartir una lista: menú nativo del móvil, WhatsApp, Telegram, correo, copiar
function ShareBox({ list, accent, flash }) {
  const url = typeof window !== 'undefined' ? `${window.location.origin}/?join=${list.invite_code}` : ''
  const short = `Te invito a mi lista «${list.name}» en Gestor de Regalos (código ${list.invite_code}).`
  const text = `${short} Entra aquí: ${url}`
  const canNative = typeof navigator !== 'undefined' && !!navigator.share
  const copy = (value, msg) => { try { navigator.clipboard?.writeText(value) } catch (e) {} flash(msg, 'info') }
  const nativeShare = async () => { try { await navigator.share({ title: 'Gestor de Regalos', text: short, url }) } catch (e) {} }
  const links = [
    ['WhatsApp', 'message', `https://wa.me/?text=${encodeURIComponent(text)}`],
    ['Telegram', 'send', `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(short)}`],
    ['Correo', 'mail', `mailto:?subject=${encodeURIComponent('Te invito a mi lista de regalos')}&body=${encodeURIComponent(text)}`],
  ]
  return (
    <div style={{ ...S.card, marginTop: 14, background: accent.soft, boxShadow: 'none' }}>
      <div style={{ ...S.small, fontWeight: 700, color: accent.dark, marginBottom: 8 }}>Compartir esta lista</div>
      <div style={{ ...S.row, marginBottom: 10 }}>
        <span style={S.code}>{list.invite_code}</span>
        <button style={S.btnGhost} onClick={() => copy(list.invite_code, 'Código copiado')}><Icon name="copy" size={15} /> Código</button>
        <button style={S.btnGhost} onClick={() => copy(url, 'Enlace copiado')}><Icon name="link" size={15} /> Enlace</button>
      </div>
      <div style={S.row}>
        {canNative && <button style={S.btn(accent)} onClick={nativeShare}><Icon name="share" size={16} /> Compartir</button>}
        {links.map(([label, icon, href]) => (
          <a key={label} href={href} target={label === 'Correo' ? undefined : '_blank'} rel="noopener noreferrer" style={S.btnGhost}>
            <Icon name={icon} size={15} /> {label}
          </a>
        ))}
      </div>
    </div>
  )
}

// =====================================================
// Aplicación
// =====================================================
export default function Home() {
  // Auth
  const [user, setUser] = useState(null)
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [authMode, setAuthMode] = useState('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [hasPending, setHasPending] = useState(false)

  // Perfil
  const [myProfile, setMyProfile] = useState(null)
  const [profileDraft, setProfileDraft] = useState({ full_name: '', avatar: '', avatar_color: 'violet' })

  // Mensajes
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  // Navegación
  const [view, setView] = useState('home') // home | lists | profile
  const [listsTab, setListsTab] = useState('mine') // mine | joined
  const [currentListId, setCurrentListId] = useState(null)

  // Datos
  const [lists, setLists] = useState([])
  const [reservedMap, setReservedMap] = useState({}) // gift_id -> reserved_by (solo listas ajenas)
  const [profilesMap, setProfilesMap] = useState({})
  const [catalog, setCatalog] = useState([]) // mis regalos (id, título, listas)
  const [activity, setActivity] = useState([])

  // Formularios: inicio y pestaña "Mías"
  const [quickMode, setQuickMode] = useState('gift') // gift | list | join
  const [form, setForm] = useState(EMPTY_GIFT)
  const [giftListIds, setGiftListIds] = useState([])
  const [inlineListName, setInlineListName] = useState('')
  const [newList, setNewList] = useState(EMPTY_LIST)
  const [joinCode, setJoinCode] = useState('')
  const [defaultsReady, setDefaultsReady] = useState(false)
  const [showAdd, setShowAdd] = useState('') // '' | gift | list  (pestaña Mías)

  // Dentro de una lista
  const [gifts, setGifts] = useState([])
  const [reservations, setReservations] = useState({})
  const [loadingGifts, setLoadingGifts] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [detailForm, setDetailForm] = useState(EMPTY_GIFT)
  const [alsoIn, setAlsoIn] = useState([])
  const [existingId, setExistingId] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(EMPTY_GIFT)
  const [editListIds, setEditListIds] = useState([])
  const [editingList, setEditingList] = useState(false)
  const [listDraft, setListDraft] = useState(EMPTY_LIST)

  const flash = (msg, type = 'error') => {
    if (type === 'error') { setError(msg); setInfo('') } else { setInfo(msg); setError('') }
    setTimeout(() => { setError(''); setInfo('') }, 4500)
  }

  const rememberProfiles = (profs) => {
    setProfilesMap((prev) => {
      const m = { ...prev }
      ;(profs || []).forEach((p) => { m[p.id] = p })
      return m
    })
  }
  const nameOf = (id) => profilesMap[id]?.full_name

  const myLists = lists.filter((l) => l.owner_id === user?.id)
  const sharedLists = lists.filter((l) => l.owner_id !== user?.id)
  const currentList = lists.find((l) => l.id === currentListId) || null
  const isOwner = !!currentList && currentList.owner_id === user?.id
  const listName = (id) => lists.find((l) => l.id === id)?.name || 'Lista'
  const accent = colorOf(currentList?.color)

  // Datos derivados de una lista
  const statsOf = (l) => {
    const ids = (l.list_gifts || []).map((x) => x.gift_id)
    return {
      total: ids.length,
      left: ids.filter((id) => !reservedMap[id]).length,
      mine: ids.filter((id) => reservedMap[id] === user?.id).length,
    }
  }
  const peopleOf = (l, includeOwner) => {
    const ids = [...(includeOwner ? [l.owner_id] : []), ...(l.list_members || []).map((m) => m.user_id)]
    return [...new Set(ids)].map((id) => profilesMap[id] || { id })
  }

  // ---------- Sesión y perfil ----------
  const ensureProfile = useCallback(async (u) => {
    if (!u) return
    const { data } = await supabase.from('profiles')
      .select('id, full_name, avatar, avatar_color').eq('id', u.id).maybeSingle()
    if (data) {
      setMyProfile(data)
      setProfilesMap((prev) => ({ ...prev, [data.id]: data }))
    } else {
      const name = u.user_metadata?.full_name || u.email?.split('@')[0] || 'Usuario'
      await supabase.from('profiles').upsert({ id: u.id, full_name: name })
      const created = { id: u.id, full_name: name, avatar: null, avatar_color: null }
      setMyProfile(created)
      setProfilesMap((prev) => ({ ...prev, [u.id]: created }))
    }
  }, [])

  useEffect(() => {
    try {
      const code = new URLSearchParams(window.location.search).get('join')
      if (code) {
        localStorage.setItem('pendingJoin', code)
        window.history.replaceState({}, '', window.location.pathname)
      }
      setHasPending(!!localStorage.getItem('pendingJoin'))
    } catch (e) {}

    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null
      setUser(u)
      setLoadingAuth(false)
      if (u) ensureProfile(u)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) ensureProfile(u)
    })
    return () => sub.subscription.unsubscribe()
  }, [ensureProfile])

  async function handleAuth(e) {
    e.preventDefault()
    setError('')
    if (authMode === 'signup') {
      if (!fullName.trim()) return flash('Escribe tu nombre')
      const { data, error } = await supabase.auth.signUp({
        email, password, options: { data: { full_name: fullName.trim() } },
      })
      if (error) return flash(error.message)
      if (data.user && data.session) {
        await supabase.from('profiles').upsert({ id: data.user.id, full_name: fullName.trim() })
      } else {
        flash('Cuenta creada. Revisa tu email para confirmar y luego inicia sesión.', 'info')
        setAuthMode('login')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return flash(error.message)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setLists([]); setCurrentListId(null); setGifts([]); setMyProfile(null); setCatalog([]); setActivity([])
    setView('home'); setDefaultsReady(false); setGiftListIds([])
  }

  function openProfile() {
    setProfileDraft({
      full_name: myProfile?.full_name || '',
      avatar: myProfile?.avatar || '',
      avatar_color: myProfile?.avatar_color || 'violet',
    })
    setView('profile')
  }

  async function saveProfile(e) {
    e.preventDefault()
    if (!profileDraft.full_name.trim()) return flash('Escribe tu nombre')
    const payload = {
      full_name: profileDraft.full_name.trim(),
      avatar: profileDraft.avatar || null,
      avatar_color: profileDraft.avatar_color || null,
    }
    const { error } = await supabase.from('profiles').update(payload).eq('id', user.id)
    if (error) return flash(error.message)
    const updated = { id: user.id, ...payload }
    setMyProfile(updated)
    rememberProfiles([updated])
    setView('home')
    flash('Perfil actualizado', 'info')
  }

  // ---------- Carga de datos ----------
  const loadLists = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('lists').select('*, list_gifts(gift_id), list_members(user_id)').order('created_at')
    if (error) return flash(error.message)
    const rows = data || []
    setLists(rows)

    // Reservas de las listas ajenas (el dueño de un regalo nunca las recibe)
    const shared = rows.filter((l) => l.owner_id !== user.id)
    const giftIds = [...new Set(shared.flatMap((l) => (l.list_gifts || []).map((x) => x.gift_id)))]
    const rmap = {}
    if (giftIds.length > 0) {
      const { data: rs } = await supabase.from('reservations').select('gift_id, reserved_by').in('gift_id', giftIds)
      ;(rs || []).forEach((r) => { rmap[r.gift_id] = r.reserved_by })
    }
    setReservedMap(rmap)

    const people = [...new Set(rows.flatMap((l) => [l.owner_id, ...(l.list_members || []).map((m) => m.user_id)]))]
    if (people.length > 0) {
      const { data: profs } = await supabase.from('profiles')
        .select('id, full_name, avatar, avatar_color').in('id', people)
      rememberProfiles(profs)
    }
  }, [user])

  const loadCatalog = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('gifts').select('id, title, list_gifts(list_id)').eq('user_id', user.id).order('title')
    if (error) return flash(error.message)
    setCatalog(data || [])
  }, [user])

  const loadActivity = useCallback(async () => {
    if (!user) return
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
    const { data, error } = await supabase
      .from('activity').select('*').gte('created_at', since)
      .order('created_at', { ascending: false }).limit(80)
    if (error) return // la actividad es secundaria: no molestamos con errores
    const rows = data || []
    setActivity(rows)
    const actors = [...new Set(rows.map((r) => r.actor_id).filter(Boolean))]
    if (actors.length > 0) {
      const { data: profs } = await supabase.from('profiles')
        .select('id, full_name, avatar, avatar_color').in('id', actors)
      rememberProfiles(profs)
    }
  }, [user])

  const loadListGifts = useCallback(async (listId) => {
    if (!listId) return
    setLoadingGifts(true)
    const { data: lg, error } = await supabase.from('list_gifts').select('gift_id').eq('list_id', listId)
    if (error) { setLoadingGifts(false); return flash(error.message) }
    const ids = (lg || []).map((x) => x.gift_id)

    if (ids.length === 0) {
      setGifts([]); setReservations({})
    } else {
      const { data: gs, error: e2 } = await supabase
        .from('gifts').select('*, list_gifts(list_id)').in('id', ids).order('created_at')
      if (e2) { setLoadingGifts(false); return flash(e2.message) }
      const { data: rs } = await supabase.from('reservations').select('gift_id, reserved_by').in('gift_id', ids)
      const map = {}
      ;(rs || []).forEach((r) => { map[r.gift_id] = r.reserved_by })
      setGifts(gs || [])
      setReservations(map)

      const who = [...new Set(Object.values(map))]
      if (who.length > 0) {
        const { data: profs } = await supabase.from('profiles')
          .select('id, full_name, avatar, avatar_color').in('id', who)
        rememberProfiles(profs)
      }
    }
    setLoadingGifts(false)
  }, [])

  // Recarga todo tras un cambio
  async function refresh() {
    await Promise.all([loadLists(), loadCatalog(), loadActivity()])
    if (currentListId) await loadListGifts(currentListId)
  }

  // ---------- Navegación ----------
  const goHome = () => { setView('home'); setCurrentListId(null) }
  const goLists = (tab) => { if (tab) setListsTab(tab); setView('lists'); setCurrentListId(null) }
  const openList = (id, tab) => { if (tab) setListsTab(tab); setView('lists'); setCurrentListId(id) }

  async function joinByCode(code) {
    const { data, error } = await supabase.rpc('join_list', { p_code: code })
    if (error) return flash(error.message.includes('Código') ? 'Código de invitación no válido' : error.message)
    await Promise.all([loadLists(), loadActivity()])
    openList(data, 'joined')
    flash('Te has unido a la lista', 'info')
  }

  // Carga inicial (y unión pendiente desde un enlace de invitación)
  useEffect(() => {
    if (!user) return
    Promise.all([loadLists(), loadCatalog(), loadActivity()]).then(() => {
      try {
        const pending = localStorage.getItem('pendingJoin')
        if (pending) {
          localStorage.removeItem('pendingJoin')
          setHasPending(false)
          joinByCode(pending)
        }
      } catch (e) {}
    })
  }, [user, loadLists, loadCatalog, loadActivity])

  // Lista marcada por defecto al añadir un regalo (la última usada)
  useEffect(() => {
    if (defaultsReady || !user) return
    const mine = lists.filter((l) => l.owner_id === user.id)
    if (mine.length === 0) return
    let last = null
    try { last = localStorage.getItem('lastListId') } catch (e) {}
    setGiftListIds([(mine.find((l) => l.id === last) || mine[0]).id])
    setDefaultsReady(true)
  }, [lists, user, defaultsReady])

  // Al abrir o cerrar una lista se reinician los formularios de dentro
  useEffect(() => {
    setExpandedId(null); setEditingId(null); setEditingList(false)
    setDetailForm(EMPTY_GIFT); setAlsoIn([]); setExistingId('')
    if (currentListId && user) {
      loadListGifts(currentListId)
      try { localStorage.setItem('lastListId', currentListId) } catch (e) {}
    } else {
      setGifts([]); setReservations({})
    }
  }, [currentListId, user, loadListGifts])

  // ---------- Listas ----------
  async function insertList(f) {
    const { data, error } = await supabase.from('lists')
      .insert({
        name: f.name.trim(),
        description: f.description.trim() || null,
        icon: f.icon,
        color: f.color,
        owner_id: user.id,
      })
      .select('id').single()
    if (error) { flash(error.message); return null }
    return data.id
  }

  async function submitList(e) {
    e.preventDefault()
    if (!newList.name.trim()) return flash('La lista necesita un nombre')
    const id = await insertList(newList)
    if (!id) return
    setNewList(EMPTY_LIST); setShowAdd('')
    await loadLists()
    openList(id, 'mine')
  }

  async function saveList(e) {
    e.preventDefault()
    if (!listDraft.name.trim()) return flash('La lista necesita un nombre')
    const { error } = await supabase.from('lists')
      .update({
        name: listDraft.name.trim(),
        description: listDraft.description.trim() || null,
        icon: listDraft.icon,
        color: listDraft.color,
      })
      .eq('id', currentListId).eq('owner_id', user.id)
    if (error) return flash(error.message)
    setEditingList(false)
    loadLists()
  }

  async function submitJoin(e) {
    e.preventDefault()
    if (!joinCode.trim()) return
    await joinByCode(joinCode.trim())
    setJoinCode('')
  }

  async function deleteList() {
    if (!currentList || !isOwner) return
    if (!window.confirm(`¿Borrar la lista "${currentList.name}"? Los regalos que estén también en otras listas se conservan; los que solo estaban aquí desaparecerán de tu vista.`)) return
    const { error } = await supabase.from('lists').delete().eq('id', currentList.id)
    if (error) return flash(error.message)
    setCurrentListId(null)
    refresh()
  }

  async function leaveList() {
    if (!currentList || isOwner) return
    if (!window.confirm(`¿Salir de la lista "${currentList.name}"?`)) return
    const { error } = await supabase.from('list_members').delete().eq('list_id', currentList.id).eq('user_id', user.id)
    if (error) return flash(error.message)
    setCurrentListId(null)
    refresh()
  }

  // ---------- Regalos ----------
  async function createGift(f, targets) {
    const { data: created, error } = await supabase.from('gifts').insert({
      user_id: user.id,
      title: f.title.trim(),
      description: f.description.trim() || null,
      url: f.url.trim() || null,
      price_estimated: f.price_estimated === '' ? null : Number(f.price_estimated),
    }).select('id').single()
    if (error) { flash(error.message); return false }
    const { error: e2 } = await supabase.from('list_gifts')
      .insert(targets.map((list_id) => ({ list_id, gift_id: created.id })))
    if (e2) { flash(`Regalo creado, pero no se pudo añadir a la lista: ${e2.message}`); return false }
    return true
  }

  // Desde el inicio o desde "Mis listas": exige al menos una lista (existente o nueva)
  async function submitGift(e) {
    e.preventDefault()
    if (!form.title.trim()) return flash('El título es obligatorio')
    const targets = [...giftListIds]
    if (inlineListName.trim()) {
      const id = await insertList({ ...EMPTY_LIST, name: inlineListName })
      if (!id) return
      targets.push(id)
    }
    if (targets.length === 0) return flash('Elige una lista o crea una nueva para este regalo')
    const ok = await createGift(form, targets)
    if (!ok) { refresh(); return }
    try { localStorage.setItem('lastListId', targets[0]) } catch (er) {}
    setForm(EMPTY_GIFT); setInlineListName(''); setGiftListIds([targets[0]]); setShowAdd('')
    flash('Regalo añadido', 'info')
    refresh()
  }

  // Desde dentro de una lista (siempre queda en esta lista, y opcionalmente en otras)
  async function submitDetailGift(e) {
    e.preventDefault()
    if (!detailForm.title.trim()) return flash('El título es obligatorio')
    const ok = await createGift(detailForm, [currentListId, ...alsoIn])
    if (!ok) { refresh(); return }
    setDetailForm(EMPTY_GIFT); setAlsoIn([])
    refresh()
  }

  async function addExisting(e) {
    e.preventDefault()
    if (!existingId) return
    const { error } = await supabase.from('list_gifts').insert({ list_id: currentListId, gift_id: existingId })
    if (error) return flash(error.message)
    setExistingId('')
    refresh()
  }

  function startEdit(g) {
    setEditingId(g.id)
    setEditForm({
      title: g.title || '', description: g.description || '',
      price_estimated: g.price_estimated ?? '', url: g.url || '',
    })
    setEditListIds((g.list_gifts || []).map((x) => x.list_id))
  }

  async function saveEdit(g) {
    if (!editForm.title.trim()) return flash('El título es obligatorio')
    if (editListIds.length === 0) return flash('El regalo debe estar al menos en una lista')
    const { error } = await supabase.from('gifts').update({
      title: editForm.title.trim(),
      description: editForm.description.trim() || null,
      url: editForm.url.trim() || null,
      price_estimated: editForm.price_estimated === '' ? null : Number(editForm.price_estimated),
    }).eq('id', g.id).eq('user_id', user.id)
    if (error) return flash(error.message)

    const current = (g.list_gifts || []).map((x) => x.list_id)
    const toAdd = editListIds.filter((id) => !current.includes(id))
    const toRemove = current.filter((id) => !editListIds.includes(id))
    if (toAdd.length > 0) {
      const { error: e3 } = await supabase.from('list_gifts').insert(toAdd.map((list_id) => ({ list_id, gift_id: g.id })))
      if (e3) return flash(e3.message)
    }
    if (toRemove.length > 0) {
      const { error: e2 } = await supabase.from('list_gifts').delete().eq('gift_id', g.id).in('list_id', toRemove)
      if (e2) return flash(e2.message)
    }
    setEditingId(null)
    refresh()
  }

  async function removeFromList(g) {
    if ((g.list_gifts || []).length <= 1) {
      return flash('Esta es su única lista. Si ya no lo quieres, elimínalo del todo.')
    }
    if (!window.confirm(`¿Quitar "${g.title}" de esta lista? Seguirá en tus otras listas.`)) return
    const { error } = await supabase.from('list_gifts').delete().eq('list_id', currentListId).eq('gift_id', g.id)
    if (error) return flash(error.message)
    refresh()
  }

  async function deleteGift(g) {
    if (!window.confirm(`¿Eliminar "${g.title}" definitivamente? Desaparecerá de todas tus listas.`)) return
    const { error } = await supabase.from('gifts').delete().eq('id', g.id).eq('user_id', user.id)
    if (error) return flash(error.message)
    refresh()
  }

  async function reserve(g) {
    const { error } = await supabase.from('reservations').insert({ gift_id: g.id, reserved_by: user.id })
    if (error) flash(error.code === '23505' ? 'Otra persona acaba de reservar este regalo' : error.message)
    refresh()
  }

  async function release(g) {
    const { error } = await supabase.from('reservations').delete().eq('gift_id', g.id).eq('reserved_by', user.id)
    if (error) return flash(error.message)
    refresh()
  }

  // =====================================================
  // Render
  // =====================================================
  if (loadingAuth) {
    return <div style={{ ...S.page, display: 'grid', placeItems: 'center' }}>Cargando…</div>
  }

  const messages = (
    <>
      {error && <div style={S.error}>{error}</div>}
      {info && <div style={S.info}>{info}</div>}
    </>
  )

  // --- Login / registro ---
  if (!user) {
    return (
      <div style={S.page}>
        <div style={{ ...S.container, paddingTop: 56, maxWidth: 420 }}>
          <div style={{ textAlign: 'center' }}>
            <span style={{ width: 84, height: 84, borderRadius: 26, background: T.grad, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(124,92,255,0.35)' }}>
              <Icon name="gift" size={44} />
            </span>
          </div>
          <h1 style={{ ...S.h1, textAlign: 'center' }}>Gestor de Regalos</h1>
          <p style={{ ...S.small, textAlign: 'center', marginTop: 0 }}>Listas de deseos para compartir con tu gente</p>
          {hasPending && <div style={S.info}>Te han invitado a una lista. Inicia sesión o crea una cuenta para abrirla.</div>}
          <form onSubmit={handleAuth} style={{ ...S.card, marginTop: 22 }}>
            {authMode === 'signup' && (
              <input style={S.input} placeholder="Nombre completo" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            )}
            <input style={S.input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input style={S.input} type="password" placeholder="Contraseña" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button type="submit" style={{ ...S.btn(), width: '100%' }}>
              {authMode === 'login' ? 'Entrar' : 'Registrarme'}
            </button>
            <button type="button" onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
              style={{ ...S.btnGhost, width: '100%', marginTop: 8, justifyContent: 'center' }}>
              {authMode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
            </button>
          </form>
          {messages}
        </div>
      </div>
    )
  }

  // --- Estructura común: cabecera, contenido y barra inferior ---
  const shell = (content) => (
    <div style={S.page}>
      <div style={S.header}>
        <div style={S.headerInner}>
          <button onClick={goHome} title="Ir al inicio" style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: 18, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 8, padding: 0 }}>
            <Icon name="gift" size={22} /> Gestor de Regalos
          </button>
          <div style={S.row}>
            <button onClick={openProfile} title="Mi perfil" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
              <Avatar profile={myProfile} size={34} ring />
            </button>
            <button onClick={handleLogout} title="Salir" style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 10, padding: '7px 10px', cursor: 'pointer', display: 'inline-flex' }}>
              <Icon name="logOut" size={18} />
            </button>
          </div>
        </div>
      </div>
      <div style={S.container}>{content}</div>
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, background: '#fff', borderTop: `1px solid ${T.border}`,
        display: 'flex', justifyContent: 'space-around', padding: '8px 0 calc(8px + env(safe-area-inset-bottom))', zIndex: 20,
      }}>
        {[['home', 'home', 'Inicio', goHome], ['lists', 'list', 'Listas', () => goLists()]].map(([key, icon, label, fn]) => {
          const on = view === key
          return (
            <button key={key} onClick={fn} style={{
              background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 3, color: on ? LIST_COLORS.violet.dark : T.muted, fontWeight: on ? 800 : 600, fontSize: 12, minWidth: 100,
            }}>
              <Icon name={icon} size={24} stroke={on ? 2.4 : 2} />
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )

  // --- Perfil ---
  if (view === 'profile') {
    const pc = colorOf(profileDraft.avatar_color)
    return shell(
      <>
        {messages}
        <div style={{ marginTop: 14 }}>
          <button style={S.linkBtn} onClick={goHome}><Icon name="arrowLeft" size={16} /> Volver</button>
        </div>
        <h1 style={S.h1}>Mi perfil</h1>
        <form onSubmit={saveProfile} style={{ ...S.card, marginTop: 12 }}>
          <div style={{ textAlign: 'center', marginBottom: 14 }}>
            <Avatar profile={profileDraft} size={84} />
          </div>
          <div style={{ ...S.small, fontWeight: 700, marginBottom: 6 }}>Nombre</div>
          <input style={S.input} value={profileDraft.full_name} onChange={(e) => setProfileDraft({ ...profileDraft, full_name: e.target.value })} />
          <div style={{ ...S.small, fontWeight: 700, margin: '8px 0 6px' }}>Avatar</div>
          <AvatarPicker value={profileDraft.avatar} color={profileDraft.avatar_color}
            onChange={(v) => setProfileDraft({ ...profileDraft, avatar: v })} />
          <div style={{ ...S.small, fontWeight: 700, margin: '14px 0 6px' }}>Color de fondo</div>
          <ColorPicker value={profileDraft.avatar_color} onChange={(c) => setProfileDraft({ ...profileDraft, avatar_color: c })} />
          <div style={{ ...S.row, marginTop: 18 }}>
            <button type="submit" style={S.btn(pc)}>Guardar</button>
            {profileDraft.avatar && (
              <button type="button" style={S.btnGhost} onClick={() => setProfileDraft({ ...profileDraft, avatar: '' })}>Usar mi inicial</button>
            )}
          </div>
        </form>
        <p style={{ ...S.small, textAlign: 'center', marginTop: 12 }}>
          Créditos: animales y objetos 3D de Fluent Emoji (© Microsoft, licencia MIT). Robots, caritas y formas generados con DiceBear: Bottts (Pablo Stanley), Fun Emoji (Davis Uche, CC BY 4.0) y Thumbs (DiceBear, CC0).
        </p>
      </>
    )
  }

  // --- Formularios compartidos por Inicio y "Mis listas" ---
  const giftAdder = (
    <form onSubmit={submitGift}>
      <GiftFields form={form} setForm={setForm} more={!!form.title.trim()} titlePlaceholder="¿Qué regalo quieres añadir?" />
      {form.title.trim() && (
        <>
          <ListPicker lists={myLists} selected={giftListIds} onChange={setGiftListIds}
            label={myLists.length ? 'Añadir a estas listas:' : ''} />
          <input style={S.input} value={inlineListName} onChange={(e) => setInlineListName(e.target.value)}
            placeholder={myLists.length ? 'O crea una lista nueva (nombre)…' : 'Crea tu primera lista (ej. Navidad)'} />
          {inlineListName.trim() && giftListIds.length > 0 && (
            <p style={{ ...S.small, margin: '0 0 10px' }}>Se añadirá a las listas marcadas y a la nueva.</p>
          )}
          <button type="submit" style={{ ...S.btn(), width: '100%' }}><Icon name="plus" size={18} /> Añadir regalo</button>
        </>
      )}
    </form>
  )

  const listCreator = (
    <form onSubmit={submitList}>
      <ListFields value={newList} onChange={setNewList} more={!!newList.name.trim()} namePlaceholder="Nombre de la lista (ej. Navidad)" />
      {newList.name.trim() && (
        <button type="submit" style={{ ...S.btn(colorOf(newList.color)), width: '100%', marginTop: 14 }}>
          <Icon name="plus" size={18} /> Crear lista
        </button>
      )}
    </form>
  )

  const joinForm = (
    <form onSubmit={submitJoin}>
      <p style={{ ...S.small, margin: '0 0 8px' }}>Pega el código que te han pasado (o abre el enlace de invitación).</p>
      <div style={{ ...S.row, flexWrap: 'nowrap' }}>
        <input style={{ ...S.input, marginBottom: 0 }} placeholder="Código de la lista" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} />
        <button type="submit" style={S.btn(LIST_COLORS.blue)}>Unirme</button>
      </div>
    </form>
  )

  // =========== DENTRO DE UNA LISTA ===========
  if (currentListId) {
    if (!currentList) {
      return shell(
        <>
          {messages}
          <p style={S.small}>Cargando lista…</p>
          <button style={S.linkBtn} onClick={() => goLists()}><Icon name="arrowLeft" size={16} /> Atrás</button>
        </>
      )
    }

    const inList = new Set(gifts.map((g) => g.id))
    const availableExisting = catalog.filter((c) => !inList.has(c.id))
    const otherOwnLists = myLists.filter((l) => l.id !== currentListId)
    const draftAccent = colorOf(listDraft.color)
    const ownerProfile = profilesMap[currentList.owner_id]
    const total = gifts.length
    const left = gifts.filter((g) => !reservations[g.id]).length
    const mineCount = gifts.filter((g) => reservations[g.id] === user.id).length

    const renderGift = (g) => {
      const reservedBy = reservations[g.id]
      const mine = reservedBy === user.id
      const other = !!reservedBy && !mine
      const done = mine || other
      const expanded = expandedId === g.id
      const editing = editingId === g.id
      return (
        <div key={g.id} style={{ ...S.card, padding: 14, marginBottom: 10, borderLeft: `6px solid ${done ? '#cfcbe0' : accent.main}`, opacity: other ? 0.8 : 1 }}>
          {editing ? (
            <>
              <GiftFields form={editForm} setForm={setEditForm} />
              <ListPicker lists={myLists} selected={editListIds} onChange={setEditListIds} label="Aparece en estas listas:" />
              <div style={S.row}>
                <button style={S.btn(accent)} onClick={() => saveEdit(g)}>Guardar</button>
                <button style={S.btnGhost} onClick={() => setEditingId(null)}>Cancelar</button>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                <button
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', color: T.text, fontSize: 17, fontWeight: 700, textAlign: 'left', textDecoration: done ? 'line-through' : 'none' }}
                  onClick={() => setExpandedId(expanded ? null : g.id)}
                >
                  {g.title}
                </button>
                {fmtPrice(g.price_estimated) && (
                  <span style={{ background: accent.soft, color: accent.dark, fontWeight: 700, fontSize: 13, padding: '3px 10px', borderRadius: 999, whiteSpace: 'nowrap' }}>
                    {fmtPrice(g.price_estimated)}
                  </span>
                )}
              </div>

              {g.url && (
                <a href={normUrl(g.url)} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 6, color: accent.dark, fontWeight: 600, fontSize: 14, textDecoration: 'none', wordBreak: 'break-all' }}>
                  <Icon name="link" size={14} /> {hostOf(g.url)}
                </a>
              )}

              {!isOwner && (
                <div style={{ ...S.row, marginTop: 10 }}>
                  {mine ? (
                    <>
                      <span style={{ color: T.ok, fontWeight: 700, fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="check" size={16} /> Reservado por ti</span>
                      <button style={S.btnGhost} onClick={() => release(g)}>Liberar</button>
                    </>
                  ) : other ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: T.muted, fontWeight: 700, fontSize: 14 }}>
                      <Avatar profile={profilesMap[reservedBy]} size={22} /> Reservado por {nameOf(reservedBy) || 'otra persona'}
                    </span>
                  ) : (
                    <button style={S.btn(accent)} onClick={() => reserve(g)}><Icon name="gift" size={16} /> Reservar</button>
                  )}
                </div>
              )}

              {expanded && (
                <div style={{ marginTop: 10 }}>
                  {g.description && <p style={{ margin: '0 0 6px', fontSize: 15 }}>{g.description}</p>}
                  {!g.description && !isOwner && <p style={S.small}>Sin más detalles.</p>}
                  {isOwner && (
                    <>
                      <div>
                        {(g.list_gifts || []).map((x) => {
                          const l = lists.find((y) => y.id === x.list_id)
                          const lc = colorOf(l?.color)
                          return (
                            <span key={x.list_id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: lc.soft, color: lc.dark, marginRight: 6, marginTop: 4 }}>
                              <ListIcon name={l?.icon} size={14} /> {listName(x.list_id)}
                            </span>
                          )
                        })}
                      </div>
                      <div style={{ ...S.row, marginTop: 12 }}>
                        <button style={S.btnGhost} onClick={() => startEdit(g)}><Icon name="pencil" size={15} /> Editar</button>
                        <button style={S.btnGhost} onClick={() => removeFromList(g)}>Quitar de esta lista</button>
                        <button style={S.btnDanger} onClick={() => deleteGift(g)}><Icon name="trash" size={15} /> Eliminar</button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )
    }

    return shell(
      <>
        {messages}
        <div style={{ marginTop: 14 }}>
          <button style={{ ...S.linkBtn, color: accent.dark }} onClick={() => goLists()}><Icon name="arrowLeft" size={16} /> Listas</button>
        </div>

        {editingList ? (
          <form onSubmit={saveList} style={{ ...S.card, marginTop: 14, borderTop: `6px solid ${draftAccent.main}` }}>
            <ListFields value={listDraft} onChange={setListDraft} />
            <div style={{ ...S.row, marginTop: 16 }}>
              <button type="submit" style={S.btn(draftAccent)}>Guardar</button>
              <button type="button" style={S.btnGhost} onClick={() => setEditingList(false)}>Cancelar</button>
            </div>
          </form>
        ) : (
          <div style={{ marginTop: 12, borderRadius: 20, padding: 18, background: `linear-gradient(135deg, ${accent.main} 0%, ${accent.dark} 100%)`, color: '#fff', boxShadow: `0 8px 22px ${accent.main}55` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ width: 58, height: 58, borderRadius: 18, background: 'rgba(255,255,255,0.22)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ListIcon name={currentList.icon} size={isArt(currentList.icon) ? 44 : 30} />
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.15 }}>{currentList.name}</div>
                {!isOwner && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 14, opacity: 0.95 }}>
                    <Avatar profile={ownerProfile} size={20} ring /> Lista de {nameOf(currentList.owner_id) || '…'}
                  </div>
                )}
              </div>
            </div>
            {currentList.description && (
              <p style={{ margin: '14px 0 0', fontSize: 14, whiteSpace: 'pre-wrap', background: 'rgba(255,255,255,0.18)', padding: '10px 12px', borderRadius: 12 }}>
                {currentList.description}
              </p>
            )}
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px 14px', marginTop: 14, fontSize: 13, fontWeight: 600 }}>
              <span>{total} {total === 1 ? 'regalo' : 'regalos'}</span>
              {!isOwner && <span>{left} sin reservar</span>}
              {!isOwner && mineCount > 0 && <span>Has reservado {mineCount}</span>}
              <AvatarStack profiles={peopleOf(currentList, !isOwner)} size={24} />
            </div>
            {isOwner && (
              <button
                style={{ marginTop: 12, background: 'rgba(255,255,255,0.22)', border: 'none', color: '#fff', borderRadius: 10, padding: '7px 12px', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                onClick={() => { setListDraft({ name: currentList.name, description: currentList.description || '', icon: currentList.icon || 'gift', color: currentList.color || 'violet' }); setEditingList(true) }}
              >
                <Icon name="pencil" size={14} /> Editar lista
              </button>
            )}
          </div>
        )}

        {isOwner && <ShareBox list={currentList} accent={accent} flash={flash} />}

        {isOwner && (
          <form onSubmit={submitDetailGift} style={{ ...S.card, marginTop: 14 }}>
            <GiftFields form={detailForm} setForm={setDetailForm} more={!!detailForm.title.trim()} titlePlaceholder="Añadir regalo (título)" />
            {detailForm.title.trim() && (
              <>
                <ListPicker lists={otherOwnLists} selected={alsoIn} onChange={setAlsoIn} label="Añadir también a:" />
                <button type="submit" style={S.btn(accent)}><Icon name="plus" size={18} /> Añadir a «{currentList.name}»</button>
              </>
            )}
          </form>
        )}

        {isOwner && availableExisting.length > 0 && (
          <form onSubmit={addExisting} style={{ ...S.row, flexWrap: 'nowrap', marginTop: 12 }}>
            <select style={{ ...S.input, marginBottom: 0 }} value={existingId} onChange={(e) => setExistingId(e.target.value)}>
              <option value="">Añadir un regalo que ya tengo…</option>
              {availableExisting.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
            <button type="submit" style={S.btnGhost} disabled={!existingId}>Añadir</button>
          </form>
        )}

        <h3 style={{ ...S.h3, color: accent.dark }}>Regalos</h3>
        {loadingGifts ? (
          <p style={S.small}>Cargando…</p>
        ) : gifts.length === 0 ? (
          <div style={{ ...S.card, textAlign: 'center', padding: 28 }}>
            <span style={{ color: accent.main, display: 'inline-flex' }}><ListIcon name={currentList.icon} size={isArt(currentList.icon) ? 56 : 38} /></span>
            <p style={{ ...S.small, margin: '8px 0 0' }}>{isOwner ? 'Esta lista está vacía. Añade el primer regalo arriba.' : 'Esta lista aún no tiene regalos.'}</p>
          </div>
        ) : (
          gifts.map(renderGift)
        )}

        {isOwner && gifts.length > 0 && (
          <p style={{ ...S.small, marginTop: 14, textAlign: 'center' }}>Las reservas no se muestran al dueño de la lista: la sorpresa está a salvo.</p>
        )}

        <div style={{ marginTop: 28 }}>
          {isOwner ? (
            <button style={S.btnDanger} onClick={deleteList}><Icon name="trash" size={15} /> Borrar esta lista</button>
          ) : (
            <button style={S.btnGhost} onClick={leaveList}>Salir de esta lista</button>
          )}
        </div>
      </>
    )
  }

  // =========== LISTAS ===========
  if (view === 'lists') {
    return shell(
      <>
        {messages}
        <h1 style={S.h1}>Listas</h1>
        <div style={{ marginTop: 12 }}>
          <Segmented options={[['mine', 'Mías', 'list'], ['joined', 'Unidas', 'users']]} value={listsTab} onChange={setListsTab} />
        </div>

        {listsTab === 'mine' && (
          <>
            <div style={{ ...S.row, marginTop: 14 }}>
              <button style={showAdd === 'gift' ? S.btn() : S.btnGhost} onClick={() => setShowAdd(showAdd === 'gift' ? '' : 'gift')}>
                <Icon name="gift" size={16} /> Nuevo regalo
              </button>
              <button style={showAdd === 'list' ? S.btn() : S.btnGhost} onClick={() => setShowAdd(showAdd === 'list' ? '' : 'list')}>
                <Icon name="plus" size={16} /> Nueva lista
              </button>
            </div>
            {showAdd === 'gift' && <div style={{ ...S.card, marginTop: 12 }}>{giftAdder}</div>}
            {showAdd === 'list' && <div style={{ ...S.card, marginTop: 12 }}>{listCreator}</div>}

            <h3 style={S.h3}>Tus listas</h3>
            {myLists.length === 0 ? (
              <p style={S.small}>Aún no tienes listas. Crea la primera con «Nueva lista».</p>
            ) : (
              myLists.map((l) => {
                const n = (l.list_gifts || []).length
                const people = peopleOf(l, false)
                return (
                  <ListCard key={l.id} list={l} onClick={() => openList(l.id, 'mine')}>
                    <Meta icon="gift">{n} {n === 1 ? 'regalo' : 'regalos'}</Meta>
                    {people.length > 0 ? <AvatarStack profiles={people} size={22} /> : <Meta icon="lock">Sin compartir</Meta>}
                  </ListCard>
                )
              })
            )}
          </>
        )}

        {listsTab === 'joined' && (
          <>
            <h3 style={S.h3}>Listas de otras personas</h3>
            {sharedLists.length === 0 ? (
              <div style={{ ...S.card, textAlign: 'center', padding: 24 }}>
                <p style={{ ...S.small, margin: '0 0 12px' }}>Cuando alguien te pase un código o enlace, su lista aparecerá aquí.</p>
                <button style={S.btn(LIST_COLORS.blue)} onClick={() => { setQuickMode('join'); goHome() }}>
                  <Icon name="logIn" size={16} /> Unirme con un código
                </button>
              </div>
            ) : (
              sharedLists.map((l) => {
                const st = statsOf(l)
                return (
                  <ListCard key={l.id} list={l} onClick={() => openList(l.id, 'joined')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Avatar profile={profilesMap[l.owner_id]} size={20} />
                      <span style={{ fontSize: 13, color: T.muted, fontWeight: 600 }}>{nameOf(l.owner_id) || '…'}</span>
                    </span>
                    <AvatarStack profiles={peopleOf(l, false).filter((p) => p.id !== l.owner_id)} size={20} />
                    <Meta icon="gift">{st.total} {st.total === 1 ? 'regalo' : 'regalos'}</Meta>
                    <Meta icon="list">{st.left} sin reservar</Meta>
                    {st.mine > 0 && <Meta icon="check">Has reservado {st.mine}</Meta>}
                  </ListCard>
                )
              })
            )}
          </>
        )}
      </>
    )
  }

  // =========== INICIO ===========
  const totalLeft = sharedLists.reduce((s, l) => s + statsOf(l).left, 0)
  const grouped = groupActivity(activity)
  const actorName = (id) => (id === user.id ? null : nameOf(id) || 'Alguien')

  const describe = (a) => {
    const me = a.actor_id === user.id
    const who = me ? 'Tú' : actorName(a.actor_id)
    const lname = listName(a.list_id)
    const t = a.gift_title ? `«${a.gift_title}»` : 'un regalo'
    if (a.kind === 'gift_added') {
      if (a.count > 1) return `${who} ${me ? 'añadiste' : 'añadió'} ${a.count} regalos a ${lname}`
      return `${who} ${me ? 'añadiste' : 'añadió'} ${t} a ${lname}`
    }
    if (a.kind === 'gift_reserved') return `${who} ${me ? 'reservaste' : 'reservó'} ${t} · ${lname}`
    if (a.kind === 'gift_released') return `${who} ${me ? 'liberaste' : 'liberó'} ${t} · ${lname}`
    return `${who} ${me ? 'te uniste' : 'se unió'} a ${lname}`
  }
  const activityIcon = { gift_added: 'gift', gift_reserved: 'check', gift_released: 'x', member_joined: 'users' }

  return shell(
    <>
      {messages}
      <h1 style={S.h1}>Hola, {(myProfile?.full_name || '').split(' ')[0] || 'bienvenido'}</h1>
      <p style={{ ...S.small, marginTop: 0 }}>¿Qué quieres hacer hoy?</p>

      <div style={{ ...S.card, marginTop: 14 }}>
        <Segmented
          options={[['gift', 'Regalo', 'gift'], ['list', 'Lista', 'list'], ['join', 'Unirme', 'logIn']]}
          value={quickMode} onChange={setQuickMode} />
        <div style={{ marginTop: 12 }}>
          {quickMode === 'gift' && giftAdder}
          {quickMode === 'list' && listCreator}
          {quickMode === 'join' && joinForm}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
        <Tile gradient="linear-gradient(135deg,#7c5cff,#a855f7)" icon="list" big={myLists.length} label="Mis listas"
          sub={myLists.length ? myLists.slice(-2).map((l) => l.name).join(' · ') : 'Crea la primera'} onClick={() => goLists('mine')} />
        <Tile gradient="linear-gradient(135deg,#10b981,#14b8c4)" icon="users" big={sharedLists.length} label="Unidas"
          sub={sharedLists.length ? `${totalLeft} regalos sin reservar` : 'Aún ninguna'} onClick={() => goLists('joined')} />
      </div>

      <h3 style={S.h3}>Actividad · últimos 30 días</h3>
      <div style={{ ...S.card, padding: 6 }}>
        {grouped.length === 0 ? (
          <p style={{ ...S.small, margin: 12 }}>Aquí verás lo que ocurre en las listas que compartes con otras personas.</p>
        ) : (
          grouped.slice(0, 20).map((a) => {
            const l = lists.find((x) => x.id === a.list_id)
            return (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 10px', borderBottom: `1px solid ${T.border}` }}>
                <IconBadge icon={activityIcon[a.kind]} color={colorOf(l?.color)} size={34} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>{describe(a)}</span>
                  <span style={{ display: 'block', fontSize: 12, color: T.muted }}>{timeAgo(a.created_at)}</span>
                </span>
              </div>
            )
          })
        )}
      </div>
      <p style={{ ...S.small, textAlign: 'center', marginTop: 12 }}>No ves quién reserva tus regalos: la sorpresa está a salvo.</p>
    </>
  )
}
