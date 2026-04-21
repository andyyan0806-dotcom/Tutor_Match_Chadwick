import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { SUBJECT_GROUPS } from '../lib/constants'
import { StarDisplay } from '../components/StarRating'

function initials(name) {
  return name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '?'
}

export default function Discovery() {
  const [tutors, setTutors] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeGroup, setActiveGroup] = useState(null)
  const [activeSubject, setActiveSubject] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('tutor_profiles')
        .select(`
          *,
          user:users(id, name, grade),
          reviews(rating)
        `)
        .eq('is_active', true)
      setTutors(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const groups = SUBJECT_GROUPS.map((g) => g.group)

  function matchesFilter(tutor) {
    const subjects = tutor.subjects || []
    if (activeSubject && !subjects.includes(activeSubject)) return false
    if (activeGroup && !activeSubject) {
      const groupSubjects = SUBJECT_GROUPS.find((g) => g.group === activeGroup)?.subjects || []
      if (!subjects.some((s) => groupSubjects.includes(s))) return false
    }
    if (search) {
      const q = search.toLowerCase()
      const nameMatch = tutor.user?.name?.toLowerCase().includes(q)
      const bioMatch = tutor.bio?.toLowerCase().includes(q)
      const subjectMatch = subjects.some((s) => s.toLowerCase().includes(q))
      if (!nameMatch && !bioMatch && !subjectMatch) return false
    }
    return true
  }

  const filtered = tutors.filter(matchesFilter)

  function avgRating(reviews) {
    if (!reviews?.length) return null
    return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
  }

  function selectGroup(group) {
    if (activeGroup === group) { setActiveGroup(null); setActiveSubject(null) }
    else { setActiveGroup(group); setActiveSubject(null) }
  }

  const groupSubjects = activeGroup
    ? SUBJECT_GROUPS.find((g) => g.group === activeGroup)?.subjects || []
    : []

  return (
    <div className="content-wrap">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Find a Tutor</h1>
        <input
          type="text"
          placeholder="Search by name, subject, or keyword…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, maxWidth: 340 }}
        />
      </div>

      <div className="filter-bar">
        <span className="filter-label">Subject group:</span>
        <button
          className={`filter-chip ${!activeGroup ? 'active' : ''}`}
          onClick={() => { setActiveGroup(null); setActiveSubject(null) }}
        >
          All
        </button>
        {groups.map((g) => (
          <button
            key={g}
            className={`filter-chip ${activeGroup === g ? 'active' : ''}`}
            onClick={() => selectGroup(g)}
          >
            {g.split('–')[0].trim()}
          </button>
        ))}
      </div>

      {activeGroup && groupSubjects.length > 0 && (
        <div className="filter-bar" style={{ marginBottom: '1rem' }}>
          <span className="filter-label">Subject:</span>
          <button
            className={`filter-chip ${!activeSubject ? 'active' : ''}`}
            onClick={() => setActiveSubject(null)}
          >
            All in group
          </button>
          {groupSubjects.map((s) => (
            <button
              key={s}
              className={`filter-chip ${activeSubject === s ? 'active' : ''}`}
              onClick={() => setActiveSubject(activeSubject === s ? null : s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="loading">Loading tutors…</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <p style={{ fontSize: '2rem' }}>🔍</p>
          <p>No tutors found matching your filters.</p>
          <p>Try a different subject or clear the filter.</p>
        </div>
      ) : (
        <div className="tutor-grid">
          {filtered.map((tutor) => {
            const avg = avgRating(tutor.reviews)
            return (
              <Link key={tutor.user_id} to={`/tutor/${tutor.user_id}`} className="tutor-card">
                <div className="tutor-card-header">
                  <div className="avatar">{initials(tutor.user?.name)}</div>
                  <div>
                    <div className="tutor-card-name">{tutor.user?.name}</div>
                    <div className="tutor-card-meta">{tutor.user?.grade}</div>
                    {tutor.university && (
                      <div className="tutor-card-meta">{tutor.university}</div>
                    )}
                  </div>
                </div>
                <div className="tutor-card-subjects">
                  {(tutor.subjects || []).slice(0, 4).map((s) => (
                    <span key={s} className="tag">{s}</span>
                  ))}
                  {(tutor.subjects || []).length > 4 && (
                    <span className="tag">+{tutor.subjects.length - 4} more</span>
                  )}
                </div>
                <div className="tutor-card-bio">{tutor.bio}</div>
                {avg !== null ? (
                  <StarDisplay value={avg} count={tutor.reviews.length} />
                ) : (
                  <div className="rating-row">No reviews yet</div>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
