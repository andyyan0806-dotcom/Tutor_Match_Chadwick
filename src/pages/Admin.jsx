import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { GRADE_LEVELS, cohortFromGrade, gradeFromCohort } from '../lib/constants'

const ADMIN_EMAIL = 'andyyan0806@gmail.com'

const thStyle = { textAlign: 'left', padding: '8px 12px', color: 'var(--gray-400)', fontWeight: 500, whiteSpace: 'nowrap' }
const tdStyle = { padding: '8px 12px', fontSize: '.875rem' }

function StatusBadge({ status }) {
  const palette = { pending: '#f59e0b', active: '#22c55e', expired: '#94a3b8', paid: '#3b82f6' }
  const color = palette[status] || '#94a3b8'
  return (
    <span style={{
      padding: '2px 10px', borderRadius: 20, fontSize: '.73rem', fontWeight: 700,
      background: color + '20', color,
    }}>
      {status}
    </span>
  )
}

export default function Admin() {
  const { profile } = useAuth()
  const [matches, setMatches] = useState([])
  const [extensions, setExtensions] = useState([])
  const [loading, setLoading] = useState(true)
  const [monthInputs, setMonthInputs] = useState({}) // matchId → month count
  const [users, setUsers] = useState([])
  const [gradeEdits, setGradeEdits] = useState({})
  const [promoCodes, setPromoCodes] = useState([])
  const [newCode, setNewCode] = useState('')
  const [newDays, setNewDays] = useState(30)

  useEffect(() => {
    if (!profile || profile.email !== ADMIN_EMAIL) return

    async function load() {
      const [{ data: matchData }, { data: extData }, { data: userData }, { data: promoData }] = await Promise.all([
        supabase
          .from('matches')
          .select('*, student:users!student_id(name, email), tutor:users!tutor_id(name, email)')
          .order('created_at', { ascending: false }),
        supabase
          .from('extension_requests')
          .select('*, requester:users!requested_by(name), match:matches(status)')
          .order('created_at', { ascending: false }),
        supabase
          .from('users')
          .select('id, name, email, grade, cohort_year, role')
          .order('created_at', { ascending: false }),
        supabase
          .from('promo_codes')
          .select('*, used_by_user:users!used_by(name)')
          .order('created_at', { ascending: false }),
      ])
      setMatches(matchData || [])
      setExtensions(extData || [])
      setUsers(userData || [])
      setPromoCodes(promoData || [])
      setLoading(false)
    }

    load()
  }, [profile])

  if (!profile) return <div className="loading">Loading…</div>
  if (profile.email !== ADMIN_EMAIL) return <Navigate to="/discovery" replace />
  if (loading) return <div className="loading">Loading…</div>

  async function markPaid(matchId) {
    const months = parseInt(monthInputs[matchId] ?? 1, 10) || 1
    const { data } = await supabase
      .from('matches')
      .update({ status: 'paid', paid_months: months })
      .eq('id', matchId)
      .select()
      .single()
    if (data) setMatches((prev) => prev.map((m) => m.id === matchId ? { ...m, status: 'paid', paid_months: months } : m))
  }

  async function deleteMatch(matchId) {
    await supabase.from('matches').delete().eq('id', matchId)
    setMatches((prev) => prev.filter((m) => m.id !== matchId))
  }

  async function acceptExtension(extId, matchId) {
    const newExpiry = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
    await Promise.all([
      supabase
        .from('matches')
        .update({ status: 'pending', expires_at: newExpiry })
        .eq('id', matchId),
      supabase
        .from('extension_requests')
        .delete()
        .eq('id', extId),
    ])
    setExtensions((prev) => prev.filter((e) => e.id !== extId))
    setMatches((prev) => prev.map((m) =>
      m.id === matchId ? { ...m, status: 'pending', expires_at: newExpiry } : m
    ))
  }

  async function rejectExtension(extId) {
    await supabase.from('extension_requests').delete().eq('id', extId)
    setExtensions((prev) => prev.filter((e) => e.id !== extId))
  }

  async function saveGrade(userId) {
    const grade = gradeEdits[userId]
    if (!grade) return
    await supabase
      .from('users')
      .update({ cohort_year: cohortFromGrade(grade), grade })
      .eq('id', userId)
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, grade, cohort_year: cohortFromGrade(grade) } : u))
    setGradeEdits((prev) => { const next = { ...prev }; delete next[userId]; return next })
  }

  async function createPromoCode() {
    if (!newCode.trim() || !newDays) return
    const { data, error } = await supabase
      .from('promo_codes')
      .insert({ code: newCode.trim().toUpperCase(), days: parseInt(newDays, 10) })
      .select()
      .single()
    if (!error && data) {
      setPromoCodes((prev) => [data, ...prev])
      setNewCode('')
      setNewDays(30)
    }
  }

  async function deletePromoCode(id) {
    await supabase.from('promo_codes').delete().eq('id', id)
    setPromoCodes((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <div className="content-wrap" style={{ paddingTop: '2rem' }}>
      <h1 className="page-title">Admin Dashboard</h1>

      <section style={{ marginBottom: '3rem' }}>
        <h2 className="section-title">Matches ({matches.length})</h2>
        {matches.length === 0 ? (
          <p style={{ color: 'var(--gray-400)' }}>No matches yet.</p>
        ) : (
          <div style={{ background: 'white', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', border: '1px solid var(--gray-100)', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--gray-100)' }}>
                  <th style={thStyle}>Student</th>
                  <th style={thStyle}>Tutor</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Created</th>
                  <th style={thStyle}>Expires</th>
                  <th style={thStyle}>Months Paid</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((m) => (
                  <tr key={m.id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600 }}>{m.student?.name || '—'}</div>
                      <div style={{ color: 'var(--gray-400)', fontSize: '.75rem' }}>{m.student?.email}</div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600 }}>{m.tutor?.name || '—'}</div>
                      <div style={{ color: 'var(--gray-400)', fontSize: '.75rem' }}>{m.tutor?.email}</div>
                    </td>
                    <td style={tdStyle}><StatusBadge status={m.status} /></td>
                    <td style={tdStyle}>{new Date(m.created_at).toLocaleDateString()}</td>
                    <td style={tdStyle}>{new Date(m.expires_at).toLocaleDateString()}</td>
                    <td style={tdStyle}>
                      {m.status === 'paid'
                        ? <span style={{ fontWeight: 700 }}>{m.paid_months}개월</span>
                        : '—'}
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: '.4rem', alignItems: 'center' }}>
                        {m.status === 'active' && (
                          <>
                            <input
                              type="number"
                              min={1}
                              value={monthInputs[m.id] ?? 1}
                              onChange={(e) => setMonthInputs((prev) => ({ ...prev, [m.id]: e.target.value }))}
                              style={{ width: 52, padding: '4px 6px', fontSize: '.8rem', textAlign: 'center' }}
                            />
                            <span style={{ fontSize: '.75rem', color: 'var(--gray-400)' }}>개월</span>
                            <button className="btn btn-primary btn-sm" onClick={() => markPaid(m.id)}>
                              Paid
                            </button>
                          </>
                        )}
                        <button className="btn btn-danger btn-sm" onClick={() => deleteMatch(m.id)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={{ marginBottom: '3rem' }}>
        <h2 className="section-title">Users ({users.length})</h2>
        <div style={{ background: 'white', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', border: '1px solid var(--gray-100)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--gray-100)' }}>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Role</th>
                <th style={thStyle}>Current Grade</th>
                <th style={thStyle}>Set Grade</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const displayGrade = u.cohort_year ? gradeFromCohort(u.cohort_year) : (u.grade || '')
                const hasGrade = !!displayGrade
                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--gray-100)', background: hasGrade ? 'transparent' : '#fffbeb' }}>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{u.name}</td>
                    <td style={{ ...tdStyle, color: 'var(--gray-400)', fontSize: '.8rem' }}>{u.email}</td>
                    <td style={tdStyle}><StatusBadge status={u.role} /></td>
                    <td style={tdStyle}>{displayGrade || <span style={{ color: 'var(--yellow)', fontWeight: 600 }}>Missing</span>}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: '.4rem', alignItems: 'center' }}>
                        <select
                          value={gradeEdits[u.id] ?? ''}
                          onChange={(e) => setGradeEdits((prev) => ({ ...prev, [u.id]: e.target.value }))}
                          style={{ padding: '4px 6px', fontSize: '.8rem', width: 140 }}
                        >
                          <option value="">Select…</option>
                          {GRADE_LEVELS.map((g) => <option key={g} value={g}>{g}</option>)}
                        </select>
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={!gradeEdits[u.id]}
                          onClick={() => saveGrade(u.id)}
                        >
                          Save
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ marginBottom: '3rem' }}>
        <h2 className="section-title">Promo Codes</h2>
        <div style={{ display: 'flex', gap: '.75rem', alignItems: 'flex-end', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '.75rem', fontWeight: 600, color: 'var(--gray-500)', marginBottom: '.3rem', textTransform: 'uppercase', letterSpacing: '.04em' }}>Code</label>
            <input
              type="text"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.toUpperCase())}
              placeholder="e.g. STUNION30"
              style={{ width: 180, padding: '.45rem .75rem', fontSize: '.875rem', letterSpacing: '.05em' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '.75rem', fontWeight: 600, color: 'var(--gray-500)', marginBottom: '.3rem', textTransform: 'uppercase', letterSpacing: '.04em' }}>Days</label>
            <input
              type="number"
              min={1}
              value={newDays}
              onChange={(e) => setNewDays(e.target.value)}
              style={{ width: 80, padding: '.45rem .75rem', fontSize: '.875rem' }}
            />
          </div>
          <button className="btn btn-primary btn-sm" onClick={createPromoCode} disabled={!newCode.trim() || !newDays}>
            Create Code
          </button>
        </div>

        {promoCodes.length === 0 ? (
          <p style={{ color: 'var(--gray-400)' }}>No promo codes yet.</p>
        ) : (
          <div style={{ background: 'white', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', border: '1px solid var(--gray-100)', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--gray-100)' }}>
                  <th style={thStyle}>Code</th>
                  <th style={thStyle}>Days</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Used By</th>
                  <th style={thStyle}>Used At</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {promoCodes.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                    <td style={{ ...tdStyle, fontWeight: 700, letterSpacing: '.05em' }}>{p.code}</td>
                    <td style={tdStyle}>{p.days}일</td>
                    <td style={tdStyle}>
                      {p.used_by
                        ? <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: '.73rem', fontWeight: 700, background: '#94a3b820', color: '#94a3b8' }}>Used</span>
                        : <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: '.73rem', fontWeight: 700, background: '#22c55e20', color: '#22c55e' }}>Active</span>}
                    </td>
                    <td style={tdStyle}>{p.used_by_user?.name || '—'}</td>
                    <td style={tdStyle}>{p.used_at ? new Date(p.used_at).toLocaleDateString() : '—'}</td>
                    <td style={tdStyle}>
                      <button className="btn btn-danger btn-sm" onClick={() => deletePromoCode(p.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="section-title">Extension Requests ({extensions.length})</h2>
        {extensions.length === 0 ? (
          <p style={{ color: 'var(--gray-400)' }}>No extension requests.</p>
        ) : (
          <div style={{ background: 'white', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', border: '1px solid var(--gray-100)', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--gray-100)' }}>
                  <th style={thStyle}>Requested By</th>
                  <th style={thStyle}>Match Status</th>
                  <th style={thStyle}>Reason</th>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {extensions.map((e) => (
                  <tr key={e.id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                    <td style={tdStyle}>{e.requester?.name || '—'}</td>
                    <td style={tdStyle}>{e.match ? <StatusBadge status={e.match.status} /> : '—'}</td>
                    <td style={tdStyle}>{e.reason || <span style={{ color: 'var(--gray-400)' }}>No reason given</span>}</td>
                    <td style={tdStyle}>{new Date(e.created_at).toLocaleDateString()}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: '.4rem' }}>
                        <button className="btn btn-primary btn-sm" onClick={() => acceptExtension(e.id, e.match_id)}>
                          Accept
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => rejectExtension(e.id)}>
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
