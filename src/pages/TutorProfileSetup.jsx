import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import SubjectPicker from '../components/SubjectPicker'

export default function TutorProfileSetup() {
  const { session, profile } = useAuth()

  // Listing fields (saved to posts)
  const [title, setTitle] = useState('')
  const [subjects, setSubjects] = useState([])
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)

  // Profile identity fields (saved to tutor_profiles)
  const [photoUrl, setPhotoUrl] = useState('')
  const [university, setUniversity] = useState('')
  const [uniGrade, setUniGrade] = useState('')
  const [ibScores, setIbScores] = useState('')

  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!session) return
    Promise.all([
      supabase.from('tutor_profiles').select('*').eq('user_id', session.user.id).maybeSingle(),
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
    })
  }, [session])

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    if (subjects.length === 0) { setError('Please select at least one subject.'); return }
    if (!title.trim()) { setError('Please add a listing title.'); return }
    if (!description.trim()) { setError('Please write a session description.'); return }
    setLoading(true)

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

    if (profileErr || postErr) {
      setError((profileErr || postErr).message)
      setLoading(false)
      return
    }
    setSaved(true)
    setLoading(false)
    setTimeout(() => setSaved(false), 2500)
  }

  if (profile?.role !== 'tutor') {
    return (
      <div className="content-wrap">
        <p>This page is for tutors only.</p>
      </div>
    )
  }

  return (
    <div className="content-wrap">
      <div className="setup-card">
        <h2>My Tutor Listing</h2>
        <p>This is how students will find you. Keep it accurate and clear.</p>

        {error && <div className="error-msg">{error}</div>}
        {saved && (
          <div className="success-msg">Listing saved successfully.</div>
        )}

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
              onChange={(e) => setPhotoUrl(e.target.value)}
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

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Saving…' : 'Save listing'}
          </button>
        </form>
      </div>
    </div>
  )
}
