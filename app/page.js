'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

// ---------- Paletas ----------
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
const LIST_EMOJIS = ['🎁', '🎄', '🎂', '🎮', '📚', '🎵', '🧸', '🛠️', '🏠', '🎬', '👕', '🍷', '🎲', '🎨', '🌟', '🐾']
const AVATAR_EMOJIS = ['😀', '😎', '🥳', '🦊', '🐼', '🦁', '🐙', '🦄', '🐱', '🐶', '🌻', '🚀', '🎸', '🍕', '👾', '🦋']

const T = { bg: 'linear-gradient(180deg,#f3efff 0%,#fdf2f8 100%)', text: '#231f3a', muted: '#7d7a92', border: '#e8e4f7', card: '#ffffff', danger: '#e04545', ok: '#10a36b', grad: 'linear-gradient(135deg,#7c5cff 0%,#ec4899 100%)' }

const S = {
  page: { minHeight: '100vh', background: T.bg, color: T.text, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', paddingBottom: 60 },
  container: { maxWidth: 560, margin: '0 auto', padding: '0 16px' },
  header: { background: T.grad, color: '#fff', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 4px 14px rgba(124,92,255,0.25)' },
  headerInner: { maxWidth: 560, margin: '0 auto', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  h1: { fontSize: 26, margin: '20px 0 4px', fontWeight: 800 },
  h3: { fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: T.muted, margin: '26px 0 10px', fontWeight: 700 },
  small: { fontSize: 13, color: T.muted },
  card: { background: T.card, borderRadius: 16, padding: 16, boxShadow: '0 2px 12px rgba(80,60,160,0.08)' },
  input: { width: '100%', boxSizing: 'border-box', padding: '12px 14px', fontSize: 16, border: `1.5px solid ${T.border}`, borderRadius: 12, marginBottom: 8, outline: 'none', background: '#fff', color: T.text, fontFamily: 'inherit' },
  btn: (a = LIST_COLORS.violet) => ({ padding: '11px 18px', fontSize: 15, fontWeight: 700, border: 'none', borderRadius: 12, background: a.main, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', boxShadow: `0 3px 10px ${a.main}44` }),
  btnGhost: { padding: '9px 14px', fontSize: 14, fontWeight: 600, border: `1.5px solid ${T.border}`, borderRadius: 12, background: '#fff', color: T.text, cursor: 'pointer', fontFamily: 'inherit' },
  btnDanger: { padding: '9px 14px', fontSize: 14, fontWeight: 600, border: `1.5px solid ${T.danger}`, borderRadius: 12, background: '#fff', color: T.danger, cursor: 'pointer', fontFamily: 'inherit' },
  linkBtn: { background: 'none', border: 'none', color: LIST_COLORS.violet.dark, cursor: 'pointer', fontSize: 15, fontWeight: 600, padding: 0, fontFamily: 'inherit' },
  row: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  error: { background: '#fdecec', color: T.danger, padding: '10px 14px', borderRadius: 12, margin: '12px 0', fontSize: 14 },
  info: { background: '#e3f8ee', color: T.ok, padding: '10px 14px', borderRadius: 12, margin: '12px 0', fontSize: 14 },
  code: { fontFamily: 'ui-monospace, monospace', background: '#fff', border: `1.5px dashed ${T.border}`, padding: '4px 10px', borderRadius: 8, fontWeight: 800, letterSpacing: 1.5 },
}

const fmtPrice = (p) => (p === null || p === undefined || p === '' ? null : `${Number(p).toFixed(2)} €`)

// ---------- Componentes pequeños ----------
function Avatar({ profile, size = 36, ring }) {
  const c = colorOf(profile?.avatar_color)
  const initial = (profile?.full_name || '?').trim().charAt(0).toUpperCase()
  return (
    <span style={{
      width: size, height: size, borderRadius: '50%', background: c.main, color: '#fff',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      fontSize: profile?.avatar_emoji ? size * 0.55 : size * 0.45, fontWeight: 800,
      boxShadow: ring ? '0 0 0 2px #fff' : 'none',
    }}>
      {profile?.avatar_emoji || initial}
    </span>
  )
}

function EmojiPicker({ options, value, onChange, accent }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {options.map((e) => (
        <button key={e} type="button" onClick={() => onChange(e)}
          style={{
            width: 40, height: 40, fontSize: 21, borderRadius: 12, cursor: 'pointer',
            border: `2px solid ${value === e ? accent.main : T.border}`,
            background: value === e ? accent.soft : '#fff',
          }}>
          {e}
        </button>
      ))}
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
            border: value === key ? `3px solid ${T.text}` : '3px solid #fff',
            boxShadow: '0 0 0 1px ' + T.border,
          }} />
      ))}
    </div>
  )
}

// Selector de listas donde aparece un regalo
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
              {l.emoji || '🎁'} {l.name}
            </label>
          )
        })}
      </div>
    </div>
  )
}

function ListRow({ list, subtitle, onClick, ownerProfile }) {
  const c = colorOf(list.color)
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left', cursor: 'pointer',
      background: '#fff', border: 'none', borderRadius: 16, padding: 12, marginBottom: 10, fontFamily: 'inherit',
      boxShadow: '0 2px 12px rgba(80,60,160,0.08)', borderLeft: `6px solid ${c.main}`,
    }}>
      <span style={{ width: 48, height: 48, borderRadius: 14, background: c.soft, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>
        {list.emoji || '🎁'}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 17, fontWeight: 800, color: T.text }}>{list.name}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: T.muted, marginTop: 2 }}>
          {ownerProfile && <Avatar profile={ownerProfile} size={18} />}
          {subtitle}
        </span>
      </span>
      <span style={{ color: c.main, fontSize: 22, fontWeight: 800 }}>›</span>
    </button>
  )
}

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
  const [showProfile, setShowProfile] = useState(false)
  const [profileDraft, setProfileDraft] = useState({ full_name: '', avatar_emoji: '', avatar_color: 'violet' })

  // Mensajes
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  // Listas
  const [lists, setLists] = useState([])
  const [leftCount, setLeftCount] = useState({})
  const [profilesMap, setProfilesMap] = useState({}) // id -> perfil completo
  const [newListName, setNewListName] = useState('')
  const [newListDesc, setNewListDesc] = useState('')
  const [newListEmoji, setNewListEmoji] = useState('🎁')
  const [newListColor, setNewListColor] = useState('violet')
  const [editingList, setEditingList] = useState(false)
  const [listDraft, setListDraft] = useState({ name: '', description: '', emoji: '🎁', color: 'violet' })
  const [joinCode, setJoinCode] = useState('')
  const [currentListId, setCurrentListId] = useState(null)

  // Dentro de una lista
  const [gifts, setGifts] = useState([])
  const [reservations, setReservations] = useState({})
  const [catalog, setCatalog] = useState([])
  const [loadingGifts, setLoadingGifts] = useState(false)
  const [expandedId, setExpandedId] = useState(null)

  // Formulario de regalos
  const emptyForm = { title: '', description: '', price_estimated: '', url: '' }
  const [form, setForm] = useState(emptyForm)
  const [alsoIn, setAlsoIn] = useState([])
  const [existingId, setExistingId] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [editListIds, setEditListIds] = useState([])

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

  // ---------- Sesión y perfil ----------
  const ensureProfile = useCallback(async (u) => {
    if (!u) return
    const { data } = await supabase.from('profiles')
      .select('id, full_name, avatar_emoji, avatar_color').eq('id', u.id).maybeSingle()
    if (data) {
      setMyProfile(data)
      setProfilesMap((prev) => ({ ...prev, [data.id]: data }))
    } else {
      const name = u.user_metadata?.full_name || u.email?.split('@')[0] || 'Usuario'
      await supabase.from('profiles').upsert({ id: u.id, full_name: name })
      const created = { id: u.id, full_name: name, avatar_emoji: null, avatar_color: null }
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
    setLists([]); setCurrentListId(null); setGifts([]); setMyProfile(null); setShowProfile(false)
  }

  function openProfile() {
    setProfileDraft({
      full_name: myProfile?.full_name || '',
      avatar_emoji: myProfile?.avatar_emoji || '',
      avatar_color: myProfile?.avatar_color || 'violet',
    })
    setShowProfile(true)
  }

  async function saveProfile(e) {
    e.preventDefault()
    if (!profileDraft.full_name.trim()) return flash('Escribe tu nombre')
    const payload = {
      full_name: profileDraft.full_name.trim(),
      avatar_emoji: profileDraft.avatar_emoji || null,
      avatar_color: profileDraft.avatar_color || null,
    }
    const { error } = await supabase.from('profiles').update(payload).eq('id', user.id)
    if (error) return flash(error.message)
    const updated = { id: user.id, ...payload }
    setMyProfile(updated)
    rememberProfiles([updated])
    setShowProfile(false)
    flash('Perfil actualizado', 'info')
  }

  // ---------- Listas ----------
  const loadLists = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('lists').select('*, list_gifts(gift_id)').order('created_at')
    if (error) return flash(error.message)
    const rows = data || []
    setLists(rows)

    const shared = rows.filter((l) => l.owner_id !== user.id)
    const giftIds = [...new Set(shared.flatMap((l) => (l.list_gifts || []).map((x) => x.gift_id)))]
    let reserved = new Set()
    if (giftIds.length > 0) {
      const { data: rs } = await supabase.from('reservations').select('gift_id').in('gift_id', giftIds)
      reserved = new Set((rs || []).map((r) => r.gift_id))
    }
    const counts = {}
    shared.forEach((l) => {
      counts[l.id] = (l.list_gifts || []).filter((x) => !reserved.has(x.gift_id)).length
    })
    setLeftCount(counts)

    const ownerIds = [...new Set(shared.map((l) => l.owner_id))]
    if (ownerIds.length > 0) {
      const { data: profs } = await supabase.from('profiles')
        .select('id, full_name, avatar_emoji, avatar_color').in('id', ownerIds)
      rememberProfiles(profs)
    }
  }, [user])

  async function joinByCode(code) {
    const { data, error } = await supabase.rpc('join_list', { p_code: code })
    if (error) return flash(error.message.includes('Código') ? 'Código de invitación no válido' : error.message)
    await loadLists()
    setCurrentListId(data)
    flash('Te has unido a la lista', 'info')
  }

  useEffect(() => {
    if (!user) return
    loadLists().then(() => {
      try {
        const pending = localStorage.getItem('pendingJoin')
        if (pending) {
          localStorage.removeItem('pendingJoin')
          setHasPending(false)
          joinByCode(pending)
        }
      } catch (e) {}
    })
  }, [user, loadLists])

  async function createList(e) {
    e.preventDefault()
    if (!newListName.trim()) return
    const { data, error } = await supabase
      .from('lists')
      .insert({
        name: newListName.trim(),
        description: newListDesc.trim() || null,
        emoji: newListEmoji,
        color: newListColor,
        owner_id: user.id,
      })
      .select('id').single()
    if (error) return flash(error.message)
    setNewListName(''); setNewListDesc(''); setNewListEmoji('🎁'); setNewListColor('violet')
    await loadLists()
    setCurrentListId(data.id)
  }

  async function saveList(e) {
    e.preventDefault()
    if (!listDraft.name.trim()) return flash('La lista necesita un nombre')
    const { error } = await supabase.from('lists')
      .update({
        name: listDraft.name.trim(),
        description: listDraft.description.trim() || null,
        emoji: listDraft.emoji,
        color: listDraft.color,
      })
      .eq('id', currentListId).eq('owner_id', user.id)
    if (error) return flash(error.message)
    setEditingList(false)
    loadLists()
  }

  async function handleJoin(e) {
    e.preventDefault()
    if (!joinCode.trim()) return
    await joinByCode(joinCode.trim())
    setJoinCode('')
  }

  async function deleteList() {
    if (!currentList || !isOwner) return
    if (!window.confirm(`¿Borrar la lista "${currentList.name}"? Los regalos siguen en tus otras listas, pero esta dejará de verse para quienes la tienen.`)) return
    const { error } = await supabase.from('lists').delete().eq('id', currentList.id)
    if (error) return flash(error.message)
    setCurrentListId(null)
    loadLists()
  }

  async function leaveList() {
    if (!currentList || isOwner) return
    if (!window.confirm(`¿Salir de la lista "${currentList.name}"?`)) return
    const { error } = await supabase.from('list_members').delete().eq('list_id', currentList.id).eq('user_id', user.id)
    if (error) return flash(error.message)
    setCurrentListId(null)
    loadLists()
  }

  // ---------- Regalos de una lista ----------
  const loadListGifts = useCallback(async (listId, owner) => {
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
          .select('id, full_name, avatar_emoji, avatar_color').in('id', who)
        rememberProfiles(profs)
      }
    }

    if (owner) {
      const { data: cat } = await supabase
        .from('gifts').select('id, title, list_gifts(list_id)').eq('user_id', user.id).order('title')
      setCatalog(cat || [])
    }
    setLoadingGifts(false)
  }, [user])

  useEffect(() => {
    setExpandedId(null); setEditingId(null); setEditingList(false); setForm(emptyForm); setAlsoIn([]); setExistingId('')
    if (currentListId && user) {
      const l = lists.find((x) => x.id === currentListId)
      loadListGifts(currentListId, l ? l.owner_id === user.id : false)
    } else {
      setGifts([])
    }
  }, [currentListId, user])

  async function addGift(e) {
    e.preventDefault()
    if (!form.title.trim()) return flash('El título es obligatorio')
    const { data: created, error } = await supabase.from('gifts').insert({
      user_id: user.id,
      title: form.title.trim(),
      description: form.description.trim() || null,
      url: form.url.trim() || null,
      price_estimated: form.price_estimated === '' ? null : Number(form.price_estimated),
    }).select('id').single()
    if (error) return flash(error.message)
    const targets = [currentListId, ...alsoIn]
    const { error: e2 } = await supabase.from('list_gifts')
      .insert(targets.map((list_id) => ({ list_id, gift_id: created.id })))
    if (e2) flash(`Regalo creado, pero no se pudo añadir a la lista: ${e2.message}`)
    setForm(emptyForm); setAlsoIn([])
    await loadListGifts(currentListId, true)
    loadLists()
  }

  async function addExisting(e) {
    e.preventDefault()
    if (!existingId) return
    const { error } = await supabase.from('list_gifts').insert({ list_id: currentListId, gift_id: existingId })
    if (error) return flash(error.message)
    setExistingId('')
    await loadListGifts(currentListId, true)
    loadLists()
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
    if (toRemove.length > 0) {
      const { error: e2 } = await supabase.from('list_gifts').delete().eq('gift_id', g.id).in('list_id', toRemove)
      if (e2) return flash(e2.message)
    }
    if (toAdd.length > 0) {
      const { error: e3 } = await supabase.from('list_gifts').insert(toAdd.map((list_id) => ({ list_id, gift_id: g.id })))
      if (e3) return flash(e3.message)
    }
    setEditingId(null)
    await loadListGifts(currentListId, true)
    loadLists()
  }

  async function removeFromList(g) {
    if (!window.confirm(`¿Quitar "${g.title}" de esta lista? Seguirá en tus otras listas.`)) return
    const { error } = await supabase.from('list_gifts').delete().eq('list_id', currentListId).eq('gift_id', g.id)
    if (error) return flash(error.message)
    await loadListGifts(currentListId, true)
    loadLists()
  }

  async function deleteGift(g) {
    if (!window.confirm(`¿Eliminar "${g.title}" definitivamente? Desaparecerá de todas tus listas.`)) return
    const { error } = await supabase.from('gifts').delete().eq('id', g.id).eq('user_id', user.id)
    if (error) return flash(error.message)
    await loadListGifts(currentListId, true)
    loadLists()
  }

  async function reserve(g) {
    const { error } = await supabase.from('reservations').insert({ gift_id: g.id, reserved_by: user.id })
    if (error) {
      if (error.code === '23505') flash('Otra persona acaba de reservar este regalo')
      else flash(error.message)
    }
    loadListGifts(currentListId, false)
    loadLists()
  }

  async function release(g) {
    const { error } = await supabase.from('reservations').delete().eq('gift_id', g.id).eq('reserved_by', user.id)
    if (error) return flash(error.message)
    loadListGifts(currentListId, false)
    loadLists()
  }

  // ---------- Render ----------
  if (loadingAuth) {
    return <div style={{ ...S.page, display: 'grid', placeItems: 'center' }}>Cargando…</div>
  }

  const Messages = () => (
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
            <span style={{ width: 84, height: 84, borderRadius: 26, background: T.grad, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, boxShadow: '0 8px 24px rgba(124,92,255,0.35)' }}>🎁</span>
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
              style={{ ...S.btnGhost, width: '100%', marginTop: 8 }}>
              {authMode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
            </button>
          </form>
          <Messages />
        </div>
      </div>
    )
  }

  const topBar = (
    <div style={S.header}>
      <div style={S.headerInner}>
        <strong style={{ fontSize: 18 }}>🎁 Gestor de Regalos</strong>
        <div style={S.row}>
          <button onClick={openProfile} title="Mi perfil" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 8, color: '#fff', fontFamily: 'inherit', fontWeight: 700, fontSize: 14 }}>
            <Avatar profile={myProfile} size={34} ring />
          </button>
          <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 10, padding: '7px 12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Salir</button>
        </div>
      </div>
    </div>
  )

  // --- Perfil ---
  if (showProfile) {
    const pc = colorOf(profileDraft.avatar_color)
    return (
      <div style={S.page}>
        {topBar}
        <div style={S.container}>
          <Messages />
          <div style={{ marginTop: 14 }}>
            <button style={S.linkBtn} onClick={() => setShowProfile(false)}>← Volver</button>
          </div>
          <h1 style={S.h1}>Mi perfil</h1>
          <form onSubmit={saveProfile} style={{ ...S.card, marginTop: 12 }}>
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <Avatar profile={profileDraft} size={84} />
            </div>
            <div style={{ ...S.small, fontWeight: 700, marginBottom: 6 }}>Nombre</div>
            <input style={S.input} value={profileDraft.full_name} onChange={(e) => setProfileDraft({ ...profileDraft, full_name: e.target.value })} />
            <div style={{ ...S.small, fontWeight: 700, margin: '8px 0 6px' }}>Avatar</div>
            <EmojiPicker options={AVATAR_EMOJIS} value={profileDraft.avatar_emoji} accent={pc}
              onChange={(e) => setProfileDraft({ ...profileDraft, avatar_emoji: e })} />
            <div style={{ ...S.small, fontWeight: 700, margin: '14px 0 6px' }}>Color</div>
            <ColorPicker value={profileDraft.avatar_color} onChange={(c) => setProfileDraft({ ...profileDraft, avatar_color: c })} />
            <div style={{ ...S.row, marginTop: 18 }}>
              <button type="submit" style={S.btn(pc)}>Guardar</button>
              {profileDraft.avatar_emoji && (
                <button type="button" style={S.btnGhost} onClick={() => setProfileDraft({ ...profileDraft, avatar_emoji: '' })}>Usar mi inicial</button>
              )}
            </div>
          </form>
        </div>
      </div>
    )
  }

  // --- Pantalla principal ---
  if (!currentListId) {
    const nc = colorOf(newListColor)
    return (
      <div style={S.page}>
        {topBar}
        <div style={S.container}>
          <Messages />
          <h1 style={S.h1}>Hola, {(myProfile?.full_name || '').split(' ')[0] || 'bienvenido'} 👋</h1>
          <p style={{ ...S.small, marginTop: 0 }}>Tus listas de deseos</p>

          <form onSubmit={createList} style={{ ...S.card, marginTop: 14 }}>
            <div style={{ ...S.row, flexWrap: 'nowrap' }}>
              <input style={{ ...S.input, marginBottom: 0 }} placeholder="✨ Nueva lista (ej. Navidad)" value={newListName} onChange={(e) => setNewListName(e.target.value)} />
              <button type="submit" style={S.btn(nc)}>Crear</button>
            </div>
            {newListName.trim() && (
              <div style={{ marginTop: 10 }}>
                <textarea
                  style={{ ...S.input, minHeight: 64, resize: 'vertical' }}
                  placeholder="Descripción o leyenda (opcional). Ej: VJ = videojuego, H = herramienta"
                  value={newListDesc} onChange={(e) => setNewListDesc(e.target.value)}
                />
                <div style={{ ...S.small, fontWeight: 700, marginBottom: 6 }}>Icono</div>
                <EmojiPicker options={LIST_EMOJIS} value={newListEmoji} onChange={setNewListEmoji} accent={nc} />
                <div style={{ ...S.small, fontWeight: 700, margin: '12px 0 6px' }}>Color</div>
                <ColorPicker value={newListColor} onChange={setNewListColor} />
              </div>
            )}
          </form>

          <h3 style={S.h3}>Mis listas</h3>
          {myLists.length === 0 ? (
            <p style={S.small}>Aún no tienes listas. Crea la primera arriba.</p>
          ) : (
            myLists.map((l) => {
              const n = (l.list_gifts || []).length
              return <ListRow key={l.id} list={l} subtitle={`${n} ${n === 1 ? 'regalo' : 'regalos'}`} onClick={() => setCurrentListId(l.id)} />
            })
          )}

          <h3 style={S.h3}>Compartidas conmigo</h3>
          {sharedLists.length === 0 ? (
            <p style={S.small}>Cuando alguien te pase un código o enlace, su lista aparecerá aquí.</p>
          ) : (
            sharedLists.map((l) => (
              <ListRow key={l.id} list={l} ownerProfile={profilesMap[l.owner_id]}
                subtitle={`de ${nameOf(l.owner_id) || '…'} · ${leftCount[l.id] ?? 0} sin reservar`}
                onClick={() => setCurrentListId(l.id)} />
            ))
          )}

          <form onSubmit={handleJoin} style={{ ...S.card, marginTop: 18 }}>
            <div style={{ ...S.small, fontWeight: 700, marginBottom: 8 }}>¿Tienes un código?</div>
            <div style={{ ...S.row, flexWrap: 'nowrap' }}>
              <input style={{ ...S.input, marginBottom: 0 }} placeholder="Código de una lista" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} />
              <button type="submit" style={S.btnGhost}>Unirme</button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // --- Cargando lista ---
  if (!currentList) {
    return (
      <div style={S.page}>
        {topBar}
        <div style={S.container}>
          <Messages />
          <p style={S.small}>Cargando lista…</p>
          <button style={S.linkBtn} onClick={() => setCurrentListId(null)}>← Mis listas</button>
        </div>
      </div>
    )
  }

  // --- Dentro de una lista ---
  const inList = new Set(gifts.map((g) => g.id))
  const availableExisting = catalog.filter((c) => !inList.has(c.id))
  const otherOwnLists = myLists.filter((l) => l.id !== currentListId)
  const draftAccent = colorOf(listDraft.color)
  const ownerProfile = profilesMap[currentList.owner_id]

  return (
    <div style={S.page}>
      {topBar}
      <div style={S.container}>
        <Messages />
        <div style={{ marginTop: 14 }}>
          <button style={{ ...S.linkBtn, color: accent.dark }} onClick={() => { setCurrentListId(null); loadLists() }}>← Mis listas</button>
        </div>

        {editingList ? (
          <form onSubmit={saveList} style={{ ...S.card, marginTop: 14, borderTop: `6px solid ${draftAccent.main}` }}>
            <input style={S.input} placeholder="Nombre de la lista" value={listDraft.name} onChange={(e) => setListDraft({ ...listDraft, name: e.target.value })} />
            <textarea style={{ ...S.input, minHeight: 80, resize: 'vertical' }} placeholder="Descripción o leyenda (opcional)"
              value={listDraft.description} onChange={(e) => setListDraft({ ...listDraft, description: e.target.value })} />
            <div style={{ ...S.small, fontWeight: 700, marginBottom: 6 }}>Icono</div>
            <EmojiPicker options={LIST_EMOJIS} value={listDraft.emoji} accent={draftAccent} onChange={(e) => setListDraft({ ...listDraft, emoji: e })} />
            <div style={{ ...S.small, fontWeight: 700, margin: '12px 0 6px' }}>Color</div>
            <ColorPicker value={listDraft.color} onChange={(c) => setListDraft({ ...listDraft, color: c })} />
            <div style={{ ...S.row, marginTop: 16 }}>
              <button type="submit" style={S.btn(draftAccent)}>Guardar</button>
              <button type="button" style={S.btnGhost} onClick={() => setEditingList(false)}>Cancelar</button>
            </div>
          </form>
        ) : (
          <div style={{ marginTop: 12, borderRadius: 20, padding: 18, background: `linear-gradient(135deg, ${accent.main} 0%, ${accent.dark} 100%)`, color: '#fff', boxShadow: `0 8px 22px ${accent.main}55` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ width: 58, height: 58, borderRadius: 18, background: 'rgba(255,255,255,0.22)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, flexShrink: 0 }}>
                {currentList.emoji || '🎁'}
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
            {isOwner && (
              <button
                style={{ marginTop: 12, background: 'rgba(255,255,255,0.22)', border: 'none', color: '#fff', borderRadius: 10, padding: '7px 12px', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
                onClick={() => { setListDraft({ name: currentList.name, description: currentList.description || '', emoji: currentList.emoji || '🎁', color: currentList.color || 'violet' }); setEditingList(true) }}
              >
                ✏️ Editar lista
              </button>
            )}
          </div>
        )}

        {isOwner && (
          <div style={{ ...S.card, marginTop: 14, background: accent.soft, boxShadow: 'none' }}>
            <div style={{ ...S.small, fontWeight: 700, color: accent.dark, marginBottom: 8 }}>Compartir esta lista</div>
            <div style={S.row}>
              <span style={S.code}>{currentList.invite_code}</span>
              <button style={S.btnGhost} onClick={() => { navigator.clipboard?.writeText(currentList.invite_code); flash('Código copiado', 'info') }}>Copiar código</button>
              <button style={S.btnGhost} onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/?join=${currentList.invite_code}`); flash('Enlace copiado', 'info') }}>Copiar enlace</button>
            </div>
          </div>
        )}

        {isOwner && (
          <form onSubmit={addGift} style={{ ...S.card, marginTop: 14 }}>
            <input style={{ ...S.input, marginBottom: form.title.trim() ? 8 : 0 }} placeholder="➕ Añadir regalo (título)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            {form.title.trim() && (
              <>
                <input style={S.input} placeholder="Descripción (opcional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={S.input} type="number" step="0.01" min="0" inputMode="decimal" placeholder="Precio (€)" value={form.price_estimated} onChange={(e) => setForm({ ...form, price_estimated: e.target.value })} />
                  <input style={S.input} type="url" placeholder="Enlace (URL)" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
                </div>
                <ListPicker lists={otherOwnLists} selected={alsoIn} onChange={setAlsoIn} label="Añadir también a:" />
                <button type="submit" style={S.btn(accent)}>Añadir a «{currentList.name}»</button>
              </>
            )}
          </form>
        )}

        {isOwner && availableExisting.length > 0 && (
          <form onSubmit={addExisting} style={{ ...S.row, flexWrap: 'nowrap', marginTop: 12 }}>
            <select style={{ ...S.input, marginBottom: 0 }} value={existingId} onChange={(e) => setExistingId(e.target.value)}>
              <option value="">Añadir un regalo que ya tengo en otra lista…</option>
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
            <div style={{ fontSize: 38 }}>{currentList.emoji || '🎁'}</div>
            <p style={{ ...S.small, margin: '8px 0 0' }}>{isOwner ? 'Esta lista está vacía. Añade el primer regalo arriba.' : 'Esta lista aún no tiene regalos.'}</p>
          </div>
        ) : (
          gifts.map((g) => {
            const reservedBy = reservations[g.id]
            const mine = reservedBy === user.id
            const reservedByOther = !!reservedBy && !mine
            const expanded = expandedId === g.id
            const editing = editingId === g.id
            const done = reservedByOther || mine
            return (
              <div key={g.id} style={{ ...S.card, padding: 14, marginBottom: 10, borderLeft: `6px solid ${done ? '#cfcbe0' : accent.main}`, opacity: done && !mine ? 0.8 : 1 }}>
                {editing ? (
                  <>
                    <input style={S.input} placeholder="Título" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
                    <input style={S.input} placeholder="Descripción" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input style={S.input} type="number" step="0.01" min="0" placeholder="Precio" value={editForm.price_estimated} onChange={(e) => setEditForm({ ...editForm, price_estimated: e.target.value })} />
                      <input style={S.input} placeholder="URL" value={editForm.url} onChange={(e) => setEditForm({ ...editForm, url: e.target.value })} />
                    </div>
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

                    {!isOwner && (
                      <div style={{ ...S.row, marginTop: 10 }}>
                        {mine ? (
                          <>
                            <span style={{ color: T.ok, fontWeight: 700, fontSize: 14 }}>✅ Reservado por ti</span>
                            <button style={S.btnGhost} onClick={() => release(g)}>Liberar</button>
                          </>
                        ) : reservedByOther ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: T.muted, fontWeight: 700, fontSize: 14 }}>
                            <Avatar profile={profilesMap[reservedBy]} size={22} /> Reservado por {nameOf(reservedBy) || 'otra persona'}
                          </span>
                        ) : (
                          <button style={S.btn(accent)} onClick={() => reserve(g)}>🎀 Reservar</button>
                        )}
                      </div>
                    )}

                    {expanded && (
                      <div style={{ marginTop: 10 }}>
                        {g.description && <p style={{ margin: '0 0 6px', fontSize: 15 }}>{g.description}</p>}
                        {g.url && (
                          <a href={g.url} target="_blank" rel="noopener noreferrer" style={{ color: accent.dark, fontWeight: 600, fontSize: 14, wordBreak: 'break-all' }}>🔗 Ver enlace</a>
                        )}
                        {!g.description && !g.url && <p style={S.small}>Sin más detalles.</p>}
                        {isOwner && (
                          <>
                            <div style={{ marginTop: 8 }}>
                              {(g.list_gifts || []).map((x) => {
                                const l = lists.find((y) => y.id === x.list_id)
                                const lc = colorOf(l?.color)
                                return (
                                  <span key={x.list_id} style={{ display: 'inline-block', fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: lc.soft, color: lc.dark, marginRight: 6, marginTop: 4 }}>
                                    {l?.emoji || '🎁'} {listName(x.list_id)}
                                  </span>
                                )
                              })}
                            </div>
                            <div style={{ ...S.row, marginTop: 12 }}>
                              <button style={S.btnGhost} onClick={() => startEdit(g)}>✏️ Editar</button>
                              <button style={S.btnGhost} onClick={() => removeFromList(g)}>Quitar de esta lista</button>
                              <button style={S.btnDanger} onClick={() => deleteGift(g)}>🗑️ Eliminar</button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })
        )}

        {isOwner && gifts.length > 0 && (
          <p style={{ ...S.small, marginTop: 14, textAlign: 'center' }}>Las reservas no se muestran al dueño de la lista: la sorpresa está a salvo 😉</p>
        )}

        <div style={{ marginTop: 28 }}>
          {isOwner ? (
            <button style={S.btnDanger} onClick={deleteList}>🗑️ Borrar esta lista</button>
          ) : (
            <button style={S.btnGhost} onClick={leaveList}>Salir de esta lista</button>
          )}
        </div>
      </div>
    </div>
  )
}