import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { SUBJECT_GROUPS } from '../lib/constants'
import { StarDisplay } from '../components/StarRating'

function initials(name) {
  return name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '?'
}

export default function Discovery() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeGroup, setActiveGroup] = useState(null)
  const [activeSubject, setActiveSubject] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('posts')
        .select(`
          id, title, subjects, description, tutor_id,
          user:users!posts_tutor_id_fkey (
            id, name, grade,
            tutor_profiles ( university, uni_grade, photo_url ),
            reviews ( rating )
          )
        `)
        .eq('is_active', true)
      setPosts(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const groups = SUBJECT_GROUPS.map((g) => g.group)

  function matchesFilter(post) {
    const subjects = post.subjects || []
    if (activeSubject && !subjects.includes(activeSubject)) return false
    if (activeGroup && !activeSubject) {
      const groupSubjects = SUBJECT_GROUPS.find((g) => g.group === activeGroup)?.subjects || []
      if (!subjects.some((s) => groupSubjects.includes(s))) return false
    }
    if (search) {
      const q = search.toLowerCase()
      const nameMatch = post.user?.name?.toLowerCase().includes(q)
      const titleMatch = post.title?.toLowerCase().includes(q)
      const descMatch = post.description?.toLowerCase().includes(q)
      const subjectMatch = subjects.some((s) => s.toLowerCase().includes(q))
      if (!nameMatch && !titleMatch && !descMatch && !subjectMatch) return false
    }
    return true
  }

  const filtered = posts.filter(matchesFilter)

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
      <div className="discovery-top">
        <h1 className="page-title">Find a Tutor</h1>
        <div className="search-input-wrap">
          <span className="search-icon">⌕</span>
          <input
            type="text"
            placeholder="Search by name, subject, or keyword…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
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
          {filtered.map((post) => {
            const tp = post.user?.tutor_profiles?.[0]
            const reviews = post.user?.reviews || []
            const avg = avgRating(reviews)
            return (
              <Link key={post.tutor_id} to={`/tutor/${post.tutor_id}`} className="tutor-card">
                <div className="tutor-card-header">
                  {tp?.photo_url ? (
                    <img
                      src={tp.photo_url}
                      alt={post.user?.name}
                      className="avatar avatar-photo"
                      onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
                    />
                  ) : null}
                  <div
                    className="avatar"
                    style={tp?.photo_url ? { display: 'none' } : {}}
                  >
                    {initials(post.user?.name)}
                  </div>
                  <div>
                    <div className="tutor-card-name">{post.user?.name}</div>
                    <div className="tutor-card-meta">{post.user?.grade}</div>
                    {tp?.university && (
                      <div className="tutor-card-meta">{tp.university}</div>
                    )}
                  </div>
                </div>
                {post.title && (
                  <div className="tutor-card-title">{post.title}</div>
                )}
                <div className="tutor-card-subjects">
                  {(post.subjects || []).slice(0, 4).map((s) => (
                    <span key={s} className="tag">{s}</span>
                  ))}
                  {(post.subjects || []).length > 4 && (
                    <span className="tag">+{post.subjects.length - 4} more</span>
                  )}
                </div>
                <div className="tutor-card-bio">{post.description}</div>
                {avg !== null ? (
                  <StarDisplay value={avg} count={reviews.length} />
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
