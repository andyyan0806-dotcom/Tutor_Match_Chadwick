import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import SubjectPicker from '../components/SubjectPicker'
import { StarDisplay } from '../components/StarRating'

function initials(name) {
  return name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '?'
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function Profile() {
  const { session, profile } = useAuth()
  const isTutor = profile?.role === 'tutor'

  // Tutor listing fields
  const [title, setTitle] = useState('')
  const [subjects, setSubjects] = useState([])
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)

  // Tutor profile identity fields
  const [photoUrl, setPhotoUrl] = useState('')
  const [university, setUniversity] = useState('')
  const [uniGrade, setUniGrade] = useState('')
  const [ibScores, setIbScores] = useState('')

  // Student reviews
  const [myReviews, setMyReviews] = useState([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [photoError, setPhotoError] = useState(false)

  useEffect(() => {
    if (!session) return

    if (isTutor) {
      Promise.all([
        supabase.from('tutor_profiles').select('*').eq('user_id', session.user.id).single(),
        supabase.from('posts').select('*').eq('tutor_id', session.user.id).maybeSingle(),
      ]).then(([{ data: tp }, { data: post }]) => {
        if (tp) {
          setPhotoUrl(tp.photo_url || '')
          setUniversity(tp.university || '')
          setUniGrade(tp.uni_grade || '')
          setIbScores(tp.ib_scores || '')
        }
        if (post) {
          setTitle(post.title || '')
          setSubjects(post.subjects || [])
          setDescription(post.description || '')
          setIsActive(post.is_active ?? true)
        }
        setLoading(false)
      })
    } else {
      supabase
        .from('reviews')
        .select('*, tutor:users!reviews_tutor_id_fkey(name)')
        .eq('student_id', session.user.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          setMyReviews(data || [])
          setLoading(false)
        })
    }
  }, [session, isTutor])

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    if (subjects.length === 0) { setError('Please select at least one subject.'); return }
    if (!title.trim()) { setError('Please add a listing title.'); return }
    if (!description.trim()) { setError('Please write a session description.'); return }
    setSaving(true)

    const [{ error: profileErr }, { error: postErr }] = await Promise.all([
      supabase.from('tutor_profiles').upsert({
        user_id: session.user.id,
        photo_url: photoUrl.trim() || null,
        university: university.trim() || null,
        uni_grade: uniGrade.trim() || null,
        ib_scores: ibScores.trim() || null,
      }, { onConflict: 'user_id' }),
      supabase.from('posts').upsert({
        tutor_id: session.user.id,
        title: title.trim(),
        subjects,
        description: description.trim(),
        is_active: isActive,
      }, { onConflict: 'tutor_id' }),
    ])

    if (profileErr || postErr) { setError((profileErr || postErr).message); setSaving(false); return }
    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 2500)
  }

  if (!profile || loading) return <div className="loading">Loading…</div>

  const currentPhoto = photoUrl && !photoError ? photoUrl : null

  return (
    <div className="content-wrap">
      <div className="profile-page-header">
        {currentPhoto ? (
          <img
            src={currentPhoto}
            alt={profile.name}
            className="avatar avatar-xl avatar-photo"
            onError={() => setPhotoError(true)}
          />
        ) : (
          <div className="avatar avatar-xl">{initials(profile.name)}</div>
        )}
        <div>
          <div className="profile-page-name">{profile.name}</div>
          <div className="profile-page-meta">{profile.grade}</div>
          <span className={`role-badge role-badge--${profile.role}`}>
            {profile.role === 'tutor' ? 'Tutor' : 'Student'}
          </span>
        </div>
      </div>

      {isTutor ? (
        <div className="setup-card" style={{ marginTop: '1.5rem' }}>
          <h2>My Listing</h2>
          <p>This is how students find you. Keep it accurate and clear.</p>

          {error && <div className="error-msg">{error}</div>}
          {saved && <div className="success-msg">Saved successfully.</div>}

          <form onSubmit={handleSave}>
            <h3 className="section-heading">Listing</h3>

            <div className="form-group">
              <label>Listing title <span style={{ color: 'var(--red)' }}>*</span></label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. IB Mathematics & Physics Tutoring"
              />
            </div>

            <div className="form-group">
              <label>Subjects <span style={{ color: 'var(--red)' }}>*</span></label>
              <SubjectPicker selected={subjects} onChange={setSubjects} />
            </div>

            <div className="form-group">
              <label>Session description / teaching approach <span style={{ color: 'var(--red)' }}>*</span></label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your tutoring style, what sessions look like, and how you help students…"
                rows={4}
              />
            </div>

            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
              <input
                type="checkbox"
                id="active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                style={{ width: 'auto' }}
              />
              <label htmlFor="active" style={{ margin: 0, cursor: 'pointer' }}>
                Listing is active (visible to students)
              </label>
            </div>

            <hr className="divider" />
            <h3 className="section-heading">Profile (optional)</h3>

            <div className="form-group">
              <label>Profile photo URL</label>
              <input
                type="url"
                value={photoUrl}
                onChange={(e) => { setPhotoUrl(e.target.value); setPhotoError(false) }}
                placeholder="https://…"
              />
            </div>

            <div className="form-group">
              <label>University attending or planning to attend</label>
              <input
                type="text"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                placeholder="e.g. Seoul National University"
              />
            </div>

            <div className="form-group">
              <label>University year / grade</label>
              <input
                type="text"
                value={uniGrade}
                onChange={(e) => setUniGrade(e.target.value)}
                placeholder="e.g. 2nd year, Freshman"
              />
            </div>

            <div className="form-group">
              <label>Academic grades or IB predicted scores</label>
              <input
                type="text"
                value={ibScores}
                onChange={(e) => setIbScores(e.target.value)}
                placeholder="e.g. Predicted 42/45, Maths AA HL: 7"
              />
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </form>
        </div>
      ) : (
        <div className="setup-card" style={{ marginTop: '1.5rem' }}>
          <h2>My Reviews</h2>
          <p>Reviews you've submitted for tutors.</p>
          {myReviews.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem 0' }}>
              <p>You haven't reviewed any tutors yet.</p>
            </div>
          ) : (
            myReviews.map((rev) => (
              <div key={rev.id} className="review-item">
                <div className="review-header">
                  <span className="stars" style={{ color: 'var(--yellow)', fontSize: '.9rem' }}>
                    {'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}
                  </span>
                  <span className="review-author">{rev.tutor?.name}</span>
                  <span className="review-date">{formatDate(rev.created_at)}</span>
                </div>
                {rev.comment && <div className="review-comment">{rev.comment}</div>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
