import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import SubjectPicker from '../components/SubjectPicker'

export default function TutorProfileSetup() {
  const { session, profile } = useAuth()
  const navigate = useNavigate()

  const [subjects, setSubjects] = useState([])
  const [bio, setBio] = useState('')
  const [university, setUniversity] = useState('')
  const [uniGrade, setUniGrade] = useState('')
  const [ibScores, setIbScores] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!session) return
    supabase
      .from('tutor_profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setSubjects(data.subjects || [])
          setBio(data.bio || '')
          setUniversity(data.university || '')
          setUniGrade(data.uni_grade || '')
          setIbScores(data.ib_scores || '')
          setIsActive(data.is_active ?? true)
        }
      })
  }, [session])

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    if (subjects.length === 0) { setError('Please select at least one subject.'); return }
    if (!bio.trim()) { setError('Please write a session description.'); return }
    setLoading(true)

    const { error: err } = await supabase
      .from('tutor_profiles')
      .upsert({
        user_id: session.user.id,
        subjects,
        bio,
        university,
        uni_grade: uniGrade,
        ib_scores: ibScores,
        is_active: isActive,
      }, { onConflict: 'user_id' })

    if (err) { setError(err.message); setLoading(false); return }
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
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', borderRadius: 8, padding: '.7rem 1rem', marginBottom: '1rem', fontSize: '.875rem' }}>
            Listing saved successfully.
          </div>
        )}

        <form onSubmit={handleSave}>
          <div className="form-group">
            <label>Subjects I tutor <span style={{ color: 'var(--red)' }}>*</span></label>
            <SubjectPicker selected={subjects} onChange={setSubjects} />
          </div>

          <hr className="divider" />

          <div className="form-group">
            <label>Session description / teaching approach <span style={{ color: 'var(--red)' }}>*</span></label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Describe your tutoring style, what sessions look like, and how you help students…"
              rows={4}
            />
          </div>

          <div className="form-group">
            <label>University (optional)</label>
            <input
              type="text"
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
              placeholder="e.g. Seoul National University"
            />
          </div>

          <div className="form-group">
            <label>University year / grade (optional)</label>
            <input
              type="text"
              value={uniGrade}
              onChange={(e) => setUniGrade(e.target.value)}
              placeholder="e.g. 2nd year, Freshman"
            />
          </div>

          <div className="form-group">
            <label>Academic grades or IB predicted scores (optional)</label>
            <input
              type="text"
              value={ibScores}
              onChange={(e) => setIbScores(e.target.value)}
              placeholder="e.g. Predicted 42/45, Maths AA HL: 7"
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

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Saving…' : 'Save listing'}
          </button>
        </form>
      </div>
    </div>
  )
}
