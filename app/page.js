'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

// ---------- Estilos ----------
const C = { primary: '#6d4cff', primaryDark: '#5538d6', bg: '#f4f3fb', card: '#ffffff', text: '#1f1b2e', muted: '#7a7690', danger: '#e5484d', ok: '#2fa36b', border: '#e4e1f2' }
const S = {
  page: { minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', paddingBottom: 40 },
  container: { maxWidth: 560, margin: '0 auto', padding: '0 14px' },
  header: { background: C.primary, color: '#fff', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 },
  card: { background: C.card, borderRadius: 16, padding: 16, marginTop: 14, boxShadow: '0 2px 10px rgba(60,40,140,0.07)' },
  h2: { margin: '0 0 10px', fontSize: 17 },
  input: { width: '100%', boxSizing: 'border-box', padding: '12px 12px', fontSize: 16, border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 8, outline: 'none', background: '#fff', color: C.text },
  btn: { padding: '11px 16px', fontSize: 15, fontWeight: 600, border: 'none', borderRadius: 10, background: C.primary, color: '#fff', cursor: 'pointer' },
  btnGhost: { padding: '9px 12px', fontSize: 14, fontWeight: 600, border: `1px solid ${C.border}`, borderRadius: 10, background: '#fff', color: C.text, cursor: 'pointer' },
  btnDanger: { padding: '9px 12px', fontSize: 14, fontWeight: 600, border: 'none', borderRadius: 10, background: C.danger, color: '#fff', cursor: 'pointer' },
  chip: (active) => ({ padding: '8px 14px', borderRadius: 999, border: `1px solid ${active ? C.primary : C.border}`, background: active ? C.primary : '#fff', color: active ? '#fff' : C.text, fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }),
  row: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  scroll: { display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 },
  muted: { color: C.muted, fontSize: 14 },
  error: { background: '#fdecec', color: C.danger, padding: '10px 12px', borderRadius: 10, marginTop: 12, fontSize: 14 },
  info: { background: '#e9f8f1', color: C.ok, padding: '10px 12px', borderRadius: 10, marginTop: 12, fontSize: 14 },
  code: { fontFamily: 'ui-monospace, monospace', background: '#efecff', color: C.primaryDark, padding: '4px 10px', borderRadius: 8, fontWeight: 700, letterSpacing: 1 },
  gift: { border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, marginTop: 10, background: '#fff' },
  tag: { display: 'inline-block', fontSize: 12, fontWeight: 600, padding: '3px 8px', borderRadius: 999, background: '#efecff', color: C.primaryDark, marginRight: 6, marginTop: 6 },
  tagPrivate: { display: 'inline-block', fontSize: 12, fontWeight: 600, padding: '3px 8px', borderRadius: 999, background: '#f1f0f5', color: C.muted, marginRight: 6, marginTop: 6 },
}

const genCode = () => Math.random().toString(36).slice(2, 8).toUpperCase()
const fmtPrice = (p) => (p === null || p === undefined || p === '' ? null : `${Number(p).toFixed(2)} €`)

// Selector de grupos donde se comparte un regalo
function GroupPicker({ groups, selected, onChange }) {
  const toggle = (id) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ ...S.muted, marginBottom: 6, fontWeight: 600 }}>Compartir en:</div>
      <div style={S.row}>
        {groups.map((g) => (
          <label key={g.id} style={{ ...S.chip(selected.includes(g.id)), display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={selected.includes(g.id)} onChange={() => toggle(g.id)} style={{ margin: 0 }} />
            {g.name}
          </label>
        ))}
      </div>
      {selected.length === 0 && (
        <div style={{ ...S.muted, marginTop: 6, fontSize: 13 }}>🔒 Sin grupos: solo tú verás este regalo.</div>
      )}
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

  // Mensajes
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  // Grupos
  const [groups, setGroups] = useState([])
  const [activeGroup, setActiveGroup] = useState(null)
  const [newGroupName, setNewGroupName] = useState('')
  const [joinCode, setJoinCode] = useState('')

  // Miembros y regalos
  const [members, setMembers] = useState([])
  const [selectedMember, setSelectedMember] = useState(null)
  const [gifts, setGifts] = useState([])
  const [loadingGifts, setLoadingGifts] = useState(false)
  const [profilesMap, setProfilesMap] = useState({})

  // Formulario nuevo regalo
  const emptyForm = { title: '', description: '', price_estimated: '', url: '' }
  const [form, setForm] = useState(emptyForm)
  const [shareIds, setShareIds] = useState([])

  // Edición
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [editShareIds, setEditShareIds] = useState([])

  const flash = (msg, type = 'error') => {
    if (type === 'error') { setError(msg); setInfo('') } else { setInfo(msg); setError('') }
    setTimeout(() => { setError(''); setInfo('') }, 4500)
  }

  const groupNameById = (id) => groups.find((g) => g.id === id)?.name || 'Grupo'

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
    setGroups([]); setActiveGroup(null); setMembers([]); setSelectedMember(null); setGifts([])
  }

  // ---------- Grupos ----------
  const loadGroups = useCallback(async (keepActiveId) => {
    if (!user) return
    const { data: memberships, error } = await supabase
      .from('group_members').select('group_id').eq('user_id', user.id)
    if (error) return flash(error.message)
    const ids = (memberships || []).map((m) => m.group_id)
    if (ids.length === 0) { setGroups([]); setActiveGroup(null); return }
    const { data: gs, error: e2 } = await supabase.from('groups').select('*').in('id', ids).order('name')
    if (e2) return flash(e2.message)
    setGroups(gs || [])
    setActiveGroup((prev) => {
      const wanted = keepActiveId ?? prev?.id
      return (gs || []).find((g) => g.id === wanted) || (gs || [])[0] || null
    })
  }, [user])

  useEffect(() => { if (user) loadGroups() }, [user, loadGroups])

  // Al cambiar de grupo activo, el grupo abierto queda marcado por defecto al añadir un regalo
  useEffect(() => {
    setShareIds(activeGroup ? [activeGroup.id] : [])
  }, [activeGroup?.id])

  async function createGroup(e) {
    e.preventDefault()
    if (!newGroupName.trim()) return
    const { data: g, error } = await supabase
      .from('groups')
      .insert({ name: newGroupName.trim(), invite_code: genCode(), created_by: user.id })
      .select().single()
    if (error) return flash(error.message)
    const { error: e2 } = await supabase.from('group_members').insert({ group_id: g.id, user_id: user.id })
    if (e2) return flash(e2.message)
    setNewGroupName('')
    flash('Grupo creado', 'info')
    loadGroups(g.id)
  }

  async function joinGroup(e) {
    e.preventDefault()
    const code = joinCode.trim().toUpperCase()
    if (!code) return
    const { data: g, error } = await supabase.from('groups').select('*').eq('invite_code', code).maybeSingle()
    if (error) return flash(error.message)
    if (!g) return flash('Código de invitación no válido')
    const { data: already } = await supabase
      .from('group_members').select('id').eq('group_id', g.id).eq('user_id', user.id).maybeSingle()
    if (already) { setJoinCode(''); loadGroups(g.id); return flash('Ya perteneces a ese grupo', 'info') }
    const { error: e2 } = await supabase.from('group_members').insert({ group_id: g.id, user_id: user.id })
    if (e2) return flash(e2.message)
    setJoinCode('')
    flash(`Te has unido a "${g.name}". Tus regalos no se comparten en él hasta que lo elijas.`, 'info')
    loadGroups(g.id)
  }

  async function deleteGroup() {
    if (!activeGroup || activeGroup.created_by !== user.id) return
    if (!window.confirm(`¿Seguro que quieres borrar el grupo "${activeGroup.name}"? Esta acción no se puede deshacer.`)) return
    const { error } = await supabase.from('groups').delete().eq('id', activeGroup.id)
    if (error) return flash(error.message)
    flash('Grupo eliminado', 'info')
    setActiveGroup(null); setMembers([]); setSelectedMember(null); setGifts([])
    loadGroups()
  }

  // ---------- Miembros ----------
  useEffect(() => {
    if (!activeGroup) { setMembers([]); setSelectedMember(null); return }
    let cancelled = false
    ;(async () => {
      const { data: gm, error } = await supabase.from('group_members').select('user_id').eq('group_id', activeGroup.id)
      if (error) return flash(error.message)
      const ids = [...new Set((gm || []).map((m) => m.user_id))]
      const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', ids)
      if (cancelled) return
      const map = {}
      ;(profs || []).forEach((p) => { map[p.id] = p.full_name })
      const list = ids.map((id) => ({ id, name: map[id] || 'Sin nombre' }))
        .sort((a, b) => (a.id === user.id ? -1 : b.id === user.id ? 1 : a.name.localeCompare(b.name)))
      setProfilesMap(map)
      setMembers(list)
      setSelectedMember((prev) => (prev && ids.includes(prev) ? prev : user.id))
    })()
    return () => { cancelled = true }
  }, [activeGroup, user])

  // ---------- Regalos ----------
  // Mi lista: todos mis regalos. Lista ajena: solo los compartidos en el grupo activo.
  const loadGifts = useCallback(async (targetUserId, groupId) => {
    if (!targetUserId) { setGifts([]); return }
    setLoadingGifts(true)
    const { data, error } = await supabase
      .from('gifts')
      .select('*, gift_groups(group_id)')
      .eq('user_id', targetUserId)
      .order('title')
    setLoadingGifts(false)
    if (error) return flash(error.message)
    let list = data || []
    if (targetUserId !== user?.id) {
      list = list.filter((g) => (g.gift_groups || []).some((x) => x.group_id === groupId))
    }
    setGifts(list)
  }, [user])

  useEffect(() => {
    if (activeGroup) loadGifts(selectedMember, activeGroup.id)
  }, [selectedMember, activeGroup, loadGifts])

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

    if (shareIds.length > 0) {
      const { error: e2 } = await supabase.from('gift_groups')
        .insert(shareIds.map((group_id) => ({ gift_id: created.id, group_id })))
      if (e2) flash(`Regalo creado, pero no se pudo compartir: ${e2.message}`)
    }

    setForm(emptyForm)
    setShareIds(activeGroup ? [activeGroup.id] : [])
    setSelectedMember(user.id)
    await loadGifts(user.id, activeGroup.id)
    flash('Regalo añadido', 'info')
  }

  function startEdit(g) {
    setEditingId(g.id)
    setEditForm({
      title: g.title || '', description: g.description || '',
      price_estimated: g.price_estimated ?? '', url: g.url || '',
    })
    setEditShareIds((g.gift_groups || []).map((x) => x.group_id))
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

    // Sincronizar los grupos donde se comparte
    const current = (g.gift_groups || []).map((x) => x.group_id)
    const toAdd = editShareIds.filter((id) => !current.includes(id))
    const toRemove = current.filter((id) => !editShareIds.includes(id))
    if (toRemove.length > 0) {
      const { error: e2 } = await supabase.from('gift_groups').delete().eq('gift_id', g.id).in('group_id', toRemove)
      if (e2) return flash(e2.message)
    }
    if (toAdd.length > 0) {
      const { error: e3 } = await supabase.from('gift_groups')
        .insert(toAdd.map((group_id) => ({ gift_id: g.id, group_id })))
      if (e3) return flash(e3.message)
    }

    setEditingId(null)
    loadGifts(selectedMember, activeGroup.id)
  }

  async function deleteGift(g) {
    if (g.user_id !== user.id) return
    if (!window.confirm(`¿Eliminar "${g.title}" de tu lista? Desaparecerá de todos los grupos.`)) return
    const { error } = await supabase.from('gifts').delete().eq('id', g.id).eq('user_id', user.id)
    if (error) return flash(error.message)
    setGifts((prev) => prev.filter((x) => x.id !== g.id))
  }

  async function toggleReserve(g) {
    const reserving = !g.is_reserved
    const { error } = await supabase.from('gifts')
      .update({ is_reserved: reserving, reserved_by: reserving ? user.id : null })
      .eq('id', g.id)
    if (error) return flash(error.message)
    loadGifts(selectedMember, activeGroup.id)
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

  // --- Pantalla de login/registro ---
  if (!user) {
    return (
      <div style={S.page}>
        <div style={{ ...S.container, paddingTop: 48 }}>
          <div style={{ textAlign: 'center', fontSize: 52 }}>🎁</div>
          <h1 style={{ textAlign: 'center', margin: '6px 0 2px' }}>Gestor de Regalos</h1>
          <p style={{ ...S.muted, textAlign: 'center', marginTop: 0 }}>Comparte listas de deseos con tu gente</p>
          <form onSubmit={handleAuth} style={S.card}>
            <h2 style={S.h2}>{authMode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</h2>
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

  const isOwnList = selectedMember === user.id
  const selectedName = isOwnList ? 'Mi lista' : `Lista de ${profilesMap[selectedMember] || '…'}`

  return (
    <div style={S.page}>
      <div style={S.header}>
        <strong style={{ fontSize: 18 }}>🎁 Gestor de Regalos</strong>
        <button onClick={handleLogout} style={{ ...S.btnGhost, background: 'rgba(255,255,255,0.18)', color: '#fff', border: 'none' }}>
          Salir
        </button>
      </div>

      <div style={S.container}>
        <Messages />

        {/* Grupos */}
        <div style={S.card}>
          <h2 style={S.h2}>Mis grupos</h2>
          {groups.length === 0 ? (
            <p style={S.muted}>Aún no estás en ningún grupo. Crea uno o únete con un código.</p>
          ) : (
            <div style={S.scroll}>
              {groups.map((g) => (
                <button key={g.id} style={S.chip(activeGroup?.id === g.id)} onClick={() => { setActiveGroup(g); setSelectedMember(null) }}>
                  {g.name}
                </button>
              ))}
            </div>
          )}

          {activeGroup && (
            <div style={{ ...S.row, marginTop: 12, justifyContent: 'space-between' }}>
              <div style={S.row}>
                <span style={S.muted}>Código de invitación:</span>
                <span style={S.code}>{activeGroup.invite_code}</span>
                <button style={S.btnGhost}
                  onClick={() => { navigator.clipboard?.writeText(activeGroup.invite_code); flash('Código copiado', 'info') }}>
                  Copiar
                </button>
              </div>
              {user.id === activeGroup.created_by && (
                <button style={S.btnDanger} onClick={deleteGroup}>🗑️ Borrar grupo</button>
              )}
            </div>
          )}

          <form onSubmit={createGroup} style={{ ...S.row, marginTop: 14, flexWrap: 'nowrap' }}>
            <input style={{ ...S.input, marginBottom: 0 }} placeholder="Nombre del nuevo grupo" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} />
            <button type="submit" style={S.btn}>Crear</button>
          </form>
          <form onSubmit={joinGroup} style={{ ...S.row, marginTop: 8, flexWrap: 'nowrap' }}>
            <input style={{ ...S.input, marginBottom: 0 }} placeholder="Código de invitación" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} />
            <button type="submit" style={S.btn}>Unirme</button>
          </form>
        </div>

        {/* Miembros */}
        {activeGroup && (
          <div style={S.card}>
            <h2 style={S.h2}>Miembros de «{activeGroup.name}»</h2>
            <div style={S.scroll}>
              {members.map((m) => (
                <button key={m.id} style={S.chip(selectedMember === m.id)} onClick={() => setSelectedMember(m.id)}>
                  {m.id === user.id ? 'Yo' : m.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Añadir regalo */}
        {activeGroup && (
          <form onSubmit={addGift} style={S.card}>
            <h2 style={S.h2}>➕ Añadir a mi lista</h2>
            <input style={S.input} placeholder="Título *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <input style={S.input} placeholder="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div style={{ display: 'flex', gap: 8 }}>
              <input style={S.input} type="number" step="0.01" min="0" inputMode="decimal" placeholder="Precio (€)" value={form.price_estimated} onChange={(e) => setForm({ ...form, price_estimated: e.target.value })} />
              <input style={S.input} type="url" placeholder="URL" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
            </div>
            <GroupPicker groups={groups} selected={shareIds} onChange={setShareIds} />
            <button type="submit" style={{ ...S.btn, width: '100%' }}>Añadir regalo</button>
          </form>
        )}

        {/* Lista de regalos */}
        {activeGroup && selectedMember && (
          <div style={S.card}>
            <h2 style={S.h2}>{isOwnList ? '🎁' : '👀'} {selectedName}</h2>
            {!isOwnList && <p style={{ ...S.muted, marginTop: 0 }}>Solo ves lo que {profilesMap[selectedMember] || 'esta persona'} ha compartido en «{activeGroup.name}».</p>}
            {loadingGifts ? (
              <p style={S.muted}>Cargando…</p>
            ) : gifts.length === 0 ? (
              <p style={S.muted}>{isOwnList ? 'Tu lista está vacía.' : 'No ha compartido nada en este grupo todavía.'}</p>
            ) : (
              gifts.map((g) => {
                const own = g.user_id === user.id
                const reservedByMe = g.is_reserved && g.reserved_by === user.id
                const editing = editingId === g.id
                const sharedIds = (g.gift_groups || []).map((x) => x.group_id)
                return (
                  <div key={g.id} style={{ ...S.gift, opacity: g.is_reserved && !own ? 0.85 : 1 }}>
                    {editing ? (
                      <>
                        <input style={S.input} placeholder="Título" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
                        <input style={S.input} placeholder="Descripción" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input style={S.input} type="number" step="0.01" min="0" placeholder="Precio" value={editForm.price_estimated} onChange={(e) => setEditForm({ ...editForm, price_estimated: e.target.value })} />
                          <input style={S.input} placeholder="URL" value={editForm.url} onChange={(e) => setEditForm({ ...editForm, url: e.target.value })} />
                        </div>
                        <GroupPicker groups={groups} selected={editShareIds} onChange={setEditShareIds} />
                        <div style={S.row}>
                          <button style={S.btn} onClick={() => saveEdit(g)}>Guardar</button>
                          <button style={S.btnGhost} onClick={() => setEditingId(null)}>Cancelar</button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                          <strong style={{ fontSize: 16 }}>{g.title}</strong>
                          {fmtPrice(g.price_estimated) && <span style={{ ...S.muted, whiteSpace: 'nowrap' }}>{fmtPrice(g.price_estimated)}</span>}
                        </div>
                        {g.description && <p style={{ margin: '6px 0 0', fontSize: 14 }}>{g.description}</p>}
                        {g.url && (
                          <a href={g.url} target="_blank" rel="noopener noreferrer" style={{ color: C.primary, fontSize: 14, wordBreak: 'break-all', display: 'inline-block', marginTop: 6 }}>
                            🔗 Ver enlace
                          </a>
                        )}
                        {own && (
                          <div>
                            {sharedIds.length === 0 ? (
                              <span style={S.tagPrivate}>🔒 Privado</span>
                            ) : (
                              sharedIds.map((gid) => (
                                <span key={gid} style={S.tag}>👥 {groupNameById(gid)}</span>
                              ))
                            )}
                          </div>
                        )}
                        <div style={{ ...S.row, marginTop: 10 }}>
                          {own ? (
                            <>
                              <button style={S.btnGhost} onClick={() => startEdit(g)}>✏️ Editar</button>
                              <button style={S.btnGhost} onClick={() => deleteGift(g)} title="Eliminar">🗑️</button>
                            </>
                          ) : g.is_reserved ? (
                            reservedByMe ? (
                              <>
                                <span style={{ color: C.ok, fontWeight: 600, fontSize: 14 }}>✅ Reservado por ti</span>
                                <button style={S.btnGhost} onClick={() => toggleReserve(g)}>Liberar</button>
                              </>
                            ) : (
                              <span style={{ color: C.muted, fontWeight: 600, fontSize: 14 }}>
                                🔒 Reservado por {profilesMap[g.reserved_by] || 'otra persona'}
                              </span>
                            )
                          ) : (
                            <button style={S.btn} onClick={() => toggleReserve(g)}>Reservar</button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )
              })
            )}
            {isOwnList && gifts.some((g) => g.is_reserved) && (
              <p style={{ ...S.muted, marginTop: 12 }}>Algunos regalos están reservados (la sorpresa se mantiene 😉).</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}