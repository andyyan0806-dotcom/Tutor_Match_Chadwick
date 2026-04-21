import { Fragment, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { GRADE_LEVELS } from '../lib/constants'

const STEPS = ['Grade', 'Role', 'Details']

export default function Register() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [grade, setGrade] = useState('')
  const [role, setRole] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function next() { setError(''); setStep((s) => s + 1) }
  function back() { setError(''); setStep((s) => s - 1) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: signUpErr } = await supabase.auth.signUp({ email, password })
    if (signUpErr) { setError(signUpErr.message); setLoading(false); return }
    if (!data.session) { setError('Please disable email confirmation in Supabase Auth settings.'); setLoading(false); return }

    const userId = data.user.id
    const { error: insertErr } = await supabase.from('users').insert({
      id: userId,
      name,
      email,
      grade,
      role,
    })
    if (insertErr) { setError(insertErr.message); setLoading(false); return }

    if (role === 'tutor') {
      await supabase.from('tutor_profiles').insert({ user_id: userId })
      navigate('/setup-profile')
    } else {
      navigate('/discovery')
    }
  }

  function stepDotClass(i) {
    if (i < step) return 'done'
    if (i === step) return 'active'
    return 'pending'
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <h1>Create Account</h1>
          <p>Join TutorMatch at Chadwick</p>
        </div>

        <div className="steps">
          {STEPS.map((label, i) => (
            <Fragment key={label}>
              <div className={`step-dot ${stepDotClass(i)}`}>
                {i < step ? '✓' : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`step-line ${i < step ? 'done' : ''}`} />
              )}
            </Fragment>
          ))}
        </div>

        {error && <div className="error-msg">{error}</div>}

        {step === 0 && (
          <div>
            <div className="form-group">
              <label>What grade are you in?</label>
              <select value={grade} onChange={(e) => setGrade(e.target.value)}>
                <option value="">Select grade…</option>
                {GRADE_LEVELS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <button className="btn btn-primary btn-full" disabled={!grade} onClick={next}>
              Continue
            </button>
          </div>
        )}

        {step === 1 && (
          <div>
            <div className="form-group">
              <label>I want to…</label>
            </div>
            <div className="role-cards">
              <div
                className={`role-card ${role === 'tutor' ? 'selected' : ''}`}
                onClick={() => setRole('tutor')}
              >
                <div className="role-icon">🎓</div>
                <div className="role-title">Offer Tutoring</div>
                <div className="role-desc">Share your knowledge with peers</div>
              </div>
              <div
                className={`role-card ${role === 'student' ? 'selected' : ''}`}
                onClick={() => setRole('student')}
              >
                <div className="role-icon">📚</div>
                <div className="role-title">Find a Tutor</div>
                <div className="role-desc">Get help with your subjects</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '.75rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={back}>Back</button>
              <button className="btn btn-primary" style={{ flex: 2 }} disabled={!role} onClick={next}>
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                required
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@chadwick.edu"
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                minLength={8}
                required
              />
            </div>
            <div style={{ display: 'flex', gap: '.75rem' }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={back}>Back</button>
              <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={loading}>
                {loading ? 'Creating account…' : 'Create account'}
              </button>
            </div>
          </form>
        )}

        <div className="link-text">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  )
}
