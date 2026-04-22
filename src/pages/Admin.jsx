import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

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

  useEffect(() => {
    if (!profile || profile.email !== ADMIN_EMAIL) return

    async function load() {
      const [{ data: matchData }, { data: extData }] = await Promise.all([
        supabase
          .from('matches')
          .select('*, student:users!student_id(name, email), tutor:users!tutor_id(name, email)')
          .order('created_at', { ascending: false }),
        supabase
          .from('extension_requests')
          .select('*, requester:users!requested_by(name), match:matches(status)')
          .order('created_at', { ascending: false }),
      ])
      setMatches(matchData || [])
      setExtensions(extData || [])
      setLoading(false)
    }

    load()
  }, [profile])

  if (!profile) return <div className="loading">Loading…</div>
  if (profile.email !== ADMIN_EMAIL) return <Navigate to="/discovery" replace />
  if (loading) return <div className="loading">Loading…</div>

  async function markPaid(matchId) {
    const { data } = await supabase
      .from('matches')
      .update({ status: 'paid' })
      .eq('id', matchId)
      .select()
      .single()
    if (data) setMatches((prev) => prev.map((m) => m.id === matchId ? { ...m, status: 'paid' } : m))
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
                      {m.status === 'active' && (
                        <button className="btn btn-primary btn-sm" onClick={() => markPaid(m.id)}>
                          Mark Paid
                        </button>
                      )}
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
                </tr>
              </thead>
              <tbody>
                {extensions.map((e) => (
                  <tr key={e.id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                    <td style={tdStyle}>{e.requester?.name || '—'}</td>
                    <td style={tdStyle}>{e.match ? <StatusBadge status={e.match.status} /> : '—'}</td>
                    <td style={tdStyle}>{e.reason || <span style={{ color: 'var(--gray-400)' }}>No reason given</span>}</td>
                    <td style={tdStyle}>{new Date(e.created_at).toLocaleDateString()}</td>
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
