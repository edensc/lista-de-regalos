'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

// ---------- Estilos (sencillos, al estilo Ta-da List) ----------
const C = { link: '#1a4fd6', text: '#1d1d1f', muted: '#7b7b85', border: '#e3e3e8', bg: '#ffffff', soft: '#f6f6f9', danger: '#d23b3b', ok: '#2a8f5b', accent: '#1a4fd6' }
const S = {
  page: { minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', paddingBottom: 60 },
  container: { maxWidth: 560, margin: '0 auto', padding: '0 16px' },
  top: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: `1px solid ${C.border}` },
  h1: { fontSize: 26, margin: '18px 0 4px', fontWeight: 800 },
  h3: { fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: C.muted, margin: '26px 0 6px', borderBottom: `1px solid ${C.border}`, paddingBottom: 4 },
  listLink: { display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '9px 0', cursor: 'pointer', fontSize: 19, fontWeight: 700, color: C.link, fontFamily: 'inherit' },
  small: { fontSize: 13, fontWeight: 500, color: C.muted },
  input: { width: '100%', boxSizing: 'border-box', padding: '11px 12px', fontSize: 16, border: `1px solid ${C.border}`, borderRadius: 8, marginBottom: 8, outline: 'none', background: '#fff', color: C.text, fontFamily: 'inherit' },
  btn: { padding: '10px 16px', fontSize: 15, fontWeight: 600, border: 'none', borderRadius: 8, background: C.accent, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' },
  btnGhost: { padding: '8px 12px', fontSize: 14, fontWeight: 600, border: `1px solid ${C.border}`, borderRadius: 8, background: '#fff', color: C.text, cursor: 'pointer', fontFamily: 'inherit' },
  btnDanger: { padding: '8px 12px', fontSize: 14, fontWeight: 600, border: `1px solid ${C.danger}`, borderRadius: 8, background: '#fff', color: C.danger, cursor: 'pointer', fontFamily: 'inherit' },
  linkBtn: { background: 'none', border: 'none', color: C.link, cursor: 'pointer', fontSize: 15, padding: 0, fontFamily: 'inherit' },
  row: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  error: { background: '#fdecec', color: C.danger, padding: '10px 12px', borderRadius: 8, margin: '12px 0', fontSize: 14 },
  info: { background: '#e9f8f1', color: C.ok, padding: '10px 12px', borderRadius: 8, margin: '12px 0', fontSize: 14 },
  code: { fontFamily: 'ui-monospace, monospace', background: C.soft, padding: '4px 10px', borderRadius: 6, fontWeight: 700, letterSpacing: 1 },
  gift: { borderBottom: `1px solid ${C.border}`, padding: '11px 0' },
  tag: { display: 'inline-block', fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: C.soft, color: C.muted, marginRight: 6, marginTop: 6 },
  chip: (on) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999, border: `1px solid ${on ? C.accent : C.border}`, background: on ? '#eaf0ff' : '#fff', color: on ? C.accent : C.text, fontSize: 14, fontWeight: 600, cursor: 'pointer' }),
}

const fmtPrice = (p) => (p === null || p === undefined || p === '' ? null : `${Number(p).toFixed(2)} €`)

// Selector de listas donde aparece un regalo
function ListPicker({ lists, selected, onChange, label }) {
  const toggle = (id) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])
  if (lists.length === 0) return null
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ ...S.small, marginBottom: 6, fontWeight: 600 }}>{label}</div>
      <div style={S.row}>
        {lists.map((l) => (
          <label key={l.id} style={S.chip(selected.includes(l.id))}>
            <input type="checkbox" checked={selected.includes(l.id)} onChange={() => toggle(l.id)} style={{ margin: 0 }} />
            {l.name}
          </label>
        ))}
      </div>
    </div>
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

  // Mensajes
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  // Listas
  const [lists, setLists] = useState([])            // todas las visibles (mias y compartidas)
  const [leftCount, setLeftCount] = useState({})    // regalos sin reservar en listas ajenas
  const [profilesMap, setProfilesMap] = useState({})
  const [newListName, setNewListName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [currentListId, setCurrentListId] = useState(null)

  // Dentro de una lista
  const [gifts, setGifts] = useState([])
  const [reservations, setReservations] = useState({}) // gift_id -> reserved_by
  const [catalog, setCatalog] = useState([])           // todos mis regalos
  const [loadingGifts, setLoadingGifts] = useState(false)
  const [expandedId, setExpandedId] = useState(null)

  // Formulario
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

  const myLists = lists.filter((l) => l.owner_id === user?.id)
  const sharedLists = lists.filter((l) => l.owner_id !== user?.id)
  const currentList = lists.find((l) => l.id === currentListId) || null
  const isOwner = !!currentList && currentList.owner_id === user?.id
  const listName = (id) => lists.find((l) => l.id === id)?.name || 'Lista'

  // ---------- Sesión ----------
  const ensureProfile = useCallback(async (u) => {
    if (!u) return
    const { data } = await supabase.from('profiles').select('id').eq('id', u.id).maybeSingle()
    if (!data) {
      const name = u.user_metadata?.full_name || u.email?.split('@')[0] || 'Usuario'
      await supabase.from('profiles').upsert({ id: u.id, full_name: name })
    }
  }, [])

  useEffect(() => {
    // Enlace de invitación: ?join=CODIGO
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
    setLists([]); setCurrentListId(null); setGifts([])
  }

  // ---------- Listas ----------
  const loadLists = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('lists').select('*, list_gifts(gift_id)').order('created_at')
    if (error) return flash(error.message)
    const rows = data || []
    setLists(rows)

    // Cuántos regalos quedan sin reservar en las listas ajenas
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

    // Nombres de los dueños de listas compartidas
    const ownerIds = [...new Set(shared.map((l) => l.owner_id))]
    if (ownerIds.length > 0) {
      const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', ownerIds)
      setProfilesMap((prev) => {
        const m = { ...prev }
        ;(profs || []).forEach((p) => { m[p.id] = p.full_name })
        return m
      })
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
      .from('lists').insert({ name: newListName.trim(), owner_id: user.id }).select('id').single()
    if (error) return flash(error.message)
    setNewListName('')
    await loadLists()
    setCurrentListId(data.id)
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
      // El dueño no recibe reservas: lo impide la base de datos
      const { data: rs } = await supabase.from('reservations').select('gift_id, reserved_by').in('gift_id', ids)
      const map = {}
      ;(rs || []).forEach((r) => { map[r.gift_id] = r.reserved_by })
      setGifts(gs || [])
      setReservations(map)

      const missing = [...new Set(Object.values(map))]
      if (missing.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', missing)
        setProfilesMap((prev) => {
          const m = { ...prev }
          ;(profs || []).forEach((p) => { m[p.id] = p.full_name })
          return m
        })
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
    setExpandedId(null); setEditingId(null); setForm(emptyForm); setAlsoIn([]); setExistingId('')
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
        <div style={{ ...S.container, paddingTop: 48, maxWidth: 420 }}>
          <div style={{ textAlign: 'center', fontSize: 48 }}>🎁</div>
          <h1 style={{ ...S.h1, textAlign: 'center' }}>Gestor de Regalos</h1>
          <p style={{ ...S.small, textAlign: 'center', marginTop: 0 }}>Listas de deseos para compartir con tu gente</p>
          {hasPending && (
            <div style={S.info}>Te han invitado a una lista. Inicia sesión o crea una cuenta para abrirla.</div>
          )}
          <form onSubmit={handleAuth} style={{ marginTop: 20 }}>
            {authMode === 'signup' && (
              <input style={S.input} placeholder="Nombre completo" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            )}
            <input style={S.input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input style={S.input} type="password" placeholder="Contraseña" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button type="submit" style={{ ...S.btn, width: '100%' }}>
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
    <div style={S.top}>
      <strong style={{ fontSize: 17 }}>🎁 Gestor de Regalos</strong>
      <button onClick={handleLogout} style={S.linkBtn}>Salir</button>
    </div>
  )

  // --- Pantalla principal: mis listas ---
  if (!currentListId) {
    return (
      <div style={S.page}>
        <div style={S.container}>
          {topBar}
          <Messages />
          <h1 style={S.h1}>
            Mis listas{' '}
          </h1>

          <form onSubmit={createList} style={{ ...S.row, flexWrap: 'nowrap', marginTop: 10 }}>
            <input style={{ ...S.input, marginBottom: 0 }} placeholder="Nombre de una lista nueva (ej. Navidad)" value={newListName} onChange={(e) => setNewListName(e.target.value)} />
            <button type="submit" style={S.btn}>Crear</button>
          </form>

          <h3 style={S.h3}>Mis listas</h3>
          {myLists.length === 0 ? (
            <p style={S.small}>Aún no tienes listas. Crea la primera arriba.</p>
          ) : (
            myLists.map((l) => (
              <button key={l.id} style={S.listLink} onClick={() => setCurrentListId(l.id)}>
                {l.name}{' '}
                <span style={S.small}>— {(l.list_gifts || []).length} {(l.list_gifts || []).length === 1 ? 'regalo' : 'regalos'}</span>
              </button>
            ))
          )}

          <h3 style={S.h3}>Listas compartidas conmigo</h3>
          {sharedLists.length === 0 ? (
            <p style={S.small}>Cuando alguien te pase un código o enlace, su lista aparecerá aquí.</p>
          ) : (
            sharedLists.map((l) => (
              <button key={l.id} style={S.listLink} onClick={() => setCurrentListId(l.id)}>
                {l.name}{' '}
                <span style={S.small}>
                  — de {profilesMap[l.owner_id] || '…'} · {leftCount[l.id] ?? 0} sin reservar
                </span>
              </button>
            ))
          )}

          <form onSubmit={handleJoin} style={{ ...S.row, flexWrap: 'nowrap', marginTop: 16 }}>
            <input style={{ ...S.input, marginBottom: 0 }} placeholder="Código de una lista" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} />
            <button type="submit" style={S.btnGhost}>Unirme</button>
          </form>
        </div>
      </div>
    )
  }

  // --- Dentro de una lista ---
  if (!currentList) {
    return (
      <div style={S.page}>
        <div style={S.container}>
          {topBar}
          <Messages />
          <p style={S.small}>Cargando lista…</p>
          <button style={S.linkBtn} onClick={() => setCurrentListId(null)}>← Mis listas</button>
        </div>
      </div>
    )
  }

  const inList = new Set(gifts.map((g) => g.id))
  const availableExisting = catalog.filter((c) => !inList.has(c.id))
  const otherOwnLists = myLists.filter((l) => l.id !== currentListId)

  return (
    <div style={S.page}>
      <div style={S.container}>
        {topBar}
        <Messages />
        <div style={{ marginTop: 14 }}>
          <button style={S.linkBtn} onClick={() => { setCurrentListId(null); loadLists() }}>← Mis listas</button>
        </div>
        <h1 style={S.h1}>{currentList.name}</h1>
        {!isOwner && <p style={{ ...S.small, marginTop: 0 }}>Lista de {profilesMap[currentList.owner_id] || '…'}</p>}

        {isOwner && (
          <div style={{ ...S.row, margin: '8px 0 4px' }}>
            <span style={S.small}>Código para compartir:</span>
            <span style={S.code}>{currentList.invite_code}</span>
            <button style={S.btnGhost} onClick={() => { navigator.clipboard?.writeText(currentList.invite_code); flash('Código copiado', 'info') }}>Copiar código</button>
            <button style={S.btnGhost} onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/?join=${currentList.invite_code}`); flash('Enlace copiado', 'info') }}>Copiar enlace</button>
          </div>
        )}

        {isOwner && (
          <form onSubmit={addGift} style={{ marginTop: 18 }}>
            <input style={S.input} placeholder="➕ Añadir regalo (título)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            {form.title.trim() && (
              <>
                <input style={S.input} placeholder="Descripción (opcional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={S.input} type="number" step="0.01" min="0" inputMode="decimal" placeholder="Precio (€)" value={form.price_estimated} onChange={(e) => setForm({ ...form, price_estimated: e.target.value })} />
                  <input style={S.input} type="url" placeholder="Enlace (URL)" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
                </div>
                <ListPicker lists={otherOwnLists} selected={alsoIn} onChange={setAlsoIn} label="Añadir también a:" />
                <button type="submit" style={S.btn}>Añadir a «{currentList.name}»</button>
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

        <h3 style={S.h3}>Regalos</h3>
        {loadingGifts ? (
          <p style={S.small}>Cargando…</p>
        ) : gifts.length === 0 ? (
          <p style={S.small}>{isOwner ? 'Esta lista está vacía. Añade el primer regalo arriba.' : 'Esta lista aún no tiene regalos.'}</p>
        ) : (
          gifts.map((g) => {
            const reservedBy = reservations[g.id]
            const mine = reservedBy === user.id
            const expanded = expandedId === g.id
            const editing = editingId === g.id
            const reservedByOther = !!reservedBy && !mine
            return (
              <div key={g.id} style={S.gift}>
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
                      <button style={S.btn} onClick={() => saveEdit(g)}>Guardar</button>
                      <button style={S.btnGhost} onClick={() => setEditingId(null)}>Cancelar</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                      <button
                        style={{ ...S.linkBtn, color: C.text, fontSize: 17, fontWeight: 600, textAlign: 'left', textDecoration: reservedByOther || mine ? 'line-through' : 'none', opacity: reservedByOther || mine ? 0.55 : 1 }}
                        onClick={() => setExpandedId(expanded ? null : g.id)}
                      >
                        {g.title}
                      </button>
                      <span style={{ ...S.small, whiteSpace: 'nowrap' }}>{fmtPrice(g.price_estimated)}</span>
                    </div>

                    {!isOwner && (
                      <div style={{ ...S.row, marginTop: 6 }}>
                        {mine ? (
                          <>
                            <span style={{ color: C.ok, fontWeight: 600, fontSize: 14 }}>✅ Reservado por ti</span>
                            <button style={S.btnGhost} onClick={() => release(g)}>Liberar</button>
                          </>
                        ) : reservedByOther ? (
                          <span style={{ ...S.small, fontWeight: 600 }}>🔒 Reservado por {profilesMap[reservedBy] || 'otra persona'}</span>
                        ) : (
                          <button style={S.btn} onClick={() => reserve(g)}>Reservar</button>
                        )}
                      </div>
                    )}

                    {expanded && (
                      <div style={{ marginTop: 8 }}>
                        {g.description && <p style={{ margin: '0 0 6px', fontSize: 15 }}>{g.description}</p>}
                        {g.url && (
                          <a href={g.url} target="_blank" rel="noopener noreferrer" style={{ color: C.link, fontSize: 14, wordBreak: 'break-all' }}>🔗 Ver enlace</a>
                        )}
                        {!g.description && !g.url && <p style={S.small}>Sin más detalles.</p>}
                        {isOwner && (
                          <>
                            <div>
                              {(g.list_gifts || []).map((x) => <span key={x.list_id} style={S.tag}>{listName(x.list_id)}</span>)}
                            </div>
                            <div style={{ ...S.row, marginTop: 10 }}>
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
          <p style={{ ...S.small, marginTop: 14 }}>Las reservas no se muestran al dueño de la lista: la sorpresa está a salvo 😉</p>
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