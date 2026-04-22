import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import SubjectPicker from '../components/SubjectPicker'
import { GRADE_LEVELS } from '../lib/constants'

function initials(name) {
  return name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '?'
}

export default function Profile() {
  const { session, profile, setProfile } = useAuth()
  const isTutor = profile?.role === 'tutor'

  // Shared (users table)
  const [name, setName] = useState('')
  const [grade, setGrade] = useState('')

  // Student only (student_profiles table)
  const [studentPhoto, setStudentPhoto] = useState('')
  const [intendedMajor, setIntendedMajor] = useState('')
  const [intendedCollege, setIntendedCollege] = useState('')
  const [classes, setClasses] = useState([])

  // Tutor profile (tutor_profiles table)
  const [photoUrl, setPhotoUrl] = useState('')
  const [university, setUniversity] = useState('')
  const [uniGrade, setUniGrade] = useState('')
  const [ibScores, setIbScores] = useState('')

  // Tutor listing (posts table)
  const [title, setTitle] = useState('')
  const [subjects, setSubjects] = useState([])
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [photoError, setPhotoError] = useState(false)

  useEffect(() => {
    if (!profile) return
    setName(profile.name || '')
    setGrade(profile.grade || '')
  }, [profile])

  useEffect(() => {
    if (!session) return

    if (isTutor) {
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
        setLoading(false)
      })
    } else {
      supabase
        .from('student_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle()
        .then(({ data: sp }) => {
          if (sp) {
            setStudentPhoto(sp.photo_url || '')
            setIntendedMajor(sp.intended_major || '')
            setIntendedCollege(sp.intended_college || '')
            setClasses(sp.classes || [])
          }
          setLoading(false)
        })
    }
  }, [session, isTutor])

  async function handleSave(e) {
    e.preventDefault()
    setError('')

    if (isTutor) {
      if (subjects.length === 0) { setError('Please select at least one subject.'); return }
      if (!title.trim()) { setError('Please add a listing title.'); return }
      if (!description.trim()) { setError('Please write a session description.'); return }
    }

    setSaving(true)

    const saves = [
      supabase.from('users').update({ name: name.trim(), grade: grade.trim() }).eq('id', session.user.id),
    ]

    if (isTutor) {
      saves.push(
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
      )
    } else {
      saves.push(
        supabase.from('student_profiles').upsert({
          user_id: session.user.id,
          photo_url: studentPhoto.trim() || null,
          intended_major: intendedMajor.trim() || null,
          intended_college: intendedCollege.trim() || null,
          classes,
        }, { onConflict: 'user_id' }),
      )
    }

    const results = await Promise.all(saves)
    const failed = results.find((r) => r.error)
    if (failed) {
      setError(failed.error.message)
      setSaving(false)
      return
    }

    setProfile({ ...profile, name: name.trim(), grade: grade.trim() })
    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 2500)
  }

  if (!profile || loading) return <div className="loading">Loading…</div>

  const currentPhoto = isTutor
    ? (photoUrl && !photoError ? photoUrl : null)
    : (studentPhoto && !photoError ? studentPhoto : null)

  return (
    <div className="content-wrap">
      <div className="profile-page-header">
        {currentPhoto ? (
          <img
            src={currentPhoto}
            alt={name}
            className="avatar avatar-xl avatar-photo"
            onError={() => setPhotoError(true)}
          />
        ) : (
          <div className="avatar avatar-xl">{initials(name)}</div>
        )}
        <div>
          <div className="profile-page-name">{name}</div>
          <div className="profile-page-meta">{grade}</div>
          <span className={`role-badge role-badge--${profile.role}`}>
            {isTutor ? 'Tutor' : 'Student'}
          </span>
        </div>
      </div>

      <div className="setup-card" style={{ marginTop: '1.5rem' }}>
        {error && <div className="error-msg">{error}</div>}
        {saved && <div className="success-msg">Saved successfully.</div>}

        <form onSubmit={handleSave}>
          <h3 className="section-heading">Basic Info</h3>

          <div className="form-group">
            <label htmlFor="prof-name">Name</label>
            <input
              id="prof-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="prof-grade">Grade / Year</label>
            <select
              id="prof-grade"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
            >
              <option value="">Select grade…</option>
              {GRADE_LEVELS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          <hr className="divider" />

          {isTutor ? (
            <>
              <h3 className="section-heading">Profile</h3>

              <div className="form-group">
                <label htmlFor="prof-photo">Profile photo URL</label>
                <input
                  id="prof-photo"
                  type="url"
                  value={photoUrl}
                  onChange={(e) => { setPhotoUrl(e.target.value); setPhotoError(false) }}
                  placeholder="https://…"
                />
              </div>

              <div className="form-group">
                <label htmlFor="prof-university">University</label>
                <input
                  id="prof-university"
                  type="text"
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  placeholder="e.g. Seoul National University"
                />
              </div>

              <div className="form-group">
                <label htmlFor="prof-uni-grade">University year / grade</label>
                <input
                  id="prof-uni-grade"
                  type="text"
                  value={uniGrade}
                  onChange={(e) => setUniGrade(e.target.value)}
                  placeholder="e.g. 2nd year, Freshman"
                />
              </div>

              <div className="form-group">
                <label htmlFor="prof-ib">Academic grades or IB predicted scores</label>
                <input
                  id="prof-ib"
                  type="text"
                  value={ibScores}
                  onChange={(e) => setIbScores(e.target.value)}
                  placeholder="e.g. Predicted 42/45, Maths AA HL: 7"
                />
              </div>

              <hr className="divider" />
              <h3 className="section-heading">My Listing</h3>
              <p style={{ color: 'var(--gray)', fontSize: '.9rem', marginTop: '-.5rem', marginBottom: '1rem' }}>
                This is how students find you on the Discovery page.
              </p>

              <div className="form-group">
                <label htmlFor="prof-title">Listing title <span style={{ color: 'var(--red)' }}>*</span></label>
                <input
                  id="prof-title"
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
                <label htmlFor="prof-desc">Session description <span style={{ color: 'var(--red)' }}>*</span></label>
                <textarea
                  id="prof-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your tutoring style and how you help students…"
                  rows={4}
                />
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                <input
                  type="checkbox"
                  id="prof-active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  style={{ width: 'auto' }}
                />
                <label htmlFor="prof-active" style={{ margin: 0, cursor: 'pointer' }}>
                  Listing is active (visible to students)
                </label>
              </div>
            </>
          ) : (
            <>
              <h3 className="section-heading">Profile</h3>

              <div className="form-group">
                <label htmlFor="stud-photo">Profile photo URL</label>
                <input
                  id="stud-photo"
                  type="url"
                  value={studentPhoto}
                  onChange={(e) => { setStudentPhoto(e.target.value); setPhotoError(false) }}
                  placeholder="https://…"
                />
              </div>

              <div className="form-group">
                <label htmlFor="stud-major">Intended major</label>
                <input
                  id="stud-major"
                  type="text"
                  value={intendedMajor}
                  onChange={(e) => setIntendedMajor(e.target.value)}
                  placeholder="e.g. Computer Science, Pre-Medicine"
                />
              </div>

              <div className="form-group">
                <label htmlFor="stud-college">Intended college / university</label>
                <input
                  id="stud-college"
                  type="text"
                  value={intendedCollege}
                  onChange={(e) => setIntendedCollege(e.target.value)}
                  placeholder="e.g. MIT, Seoul National University"
                />
              </div>

              <hr className="divider" />
              <h3 className="section-heading">Classes</h3>
              <p style={{ color: 'var(--gray)', fontSize: '.9rem', marginTop: '-.5rem', marginBottom: '1rem' }}>
                Select the subjects you're currently taking.
              </p>
              <SubjectPicker selected={classes} onChange={setClasses} />
            </>
          )}

          <div style={{ marginTop: '1.5rem' }}>
            <button type="submit" className="btn btn-primary btn-full" disabled={saving}>
              {saving ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
