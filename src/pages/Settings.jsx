import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Settings() {
  const { session, profile, setProfile } = useAuth()
  const navigate = useNavigate()
  const isTutor = profile?.role === 'tutor'

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwMsg, setPwMsg] = useState('')
  const [pwError, setPwError] = useState('')

  const [emailNotif, setEmailNotif] = useState(profile?.email_notifications ?? true)
  const [notifLoading, setNotifLoading] = useState(false)

  const [showDeletePost, setShowDeletePost] = useState(false)
  const [deletingPost, setDeletingPost] = useState(false)
  const [postDeleted, setPostDeleted] = useState(false)

  const [showDeleteAccount, setShowDeleteAccount] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)

  async function handleChangePassword(e) {
    e.preventDefault()
    setPwError('')
    setPwMsg('')
    if (newPassword.length < 6) { setPwError('Password must be at least 6 characters.'); return }
    if (newPassword !== confirmPassword) { setPwError('Passwords do not match.'); return }
    setPwLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      setPwError(error.message)
    } else {
      setPwMsg('Password updated successfully.')
      setNewPassword('')
      setConfirmPassword('')
    }
    setPwLoading(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  async function toggleEmailNotif() {
    const next = !emailNotif
    setNotifLoading(true)
    const { error } = await supabase
      .from('users')
      .update({ email_notifications: next })
      .eq('id', session.user.id)
    if (!error) {
      setEmailNotif(next)
      setProfile({ ...profile, email_notifications: next })
    }
    setNotifLoading(false)
  }

  async function handleDeletePost() {
    setDeletingPost(true)
    await supabase.from('posts').delete().eq('tutor_id', session.user.id)
    setDeletingPost(false)
    setShowDeletePost(false)
    setPostDeleted(true)
  }

  async function handleDeleteAccount() {
    setDeletingAccount(true)
    await supabase.rpc('delete_own_account')
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="content-wrap" style={{ maxWidth: 600 }}>
      <h1 className="page-title">Settings</h1>

      {/* Change Password */}
      <div className="setup-card" style={{ marginBottom: '1.5rem' }}>
        <h2>Change Password</h2>
        {pwError && <div className="error-msg">{pwError}</div>}
        {pwMsg && <div className="success-msg">{pwMsg}</div>}
        <form onSubmit={handleChangePassword}>
          <div className="form-group">
            <label htmlFor="new-pw">New password</label>
            <input
              id="new-pw"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 6 characters"
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirm-pw">Confirm new password</label>
            <input
              id="confirm-pw"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={pwLoading}>
            {pwLoading ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>

      {/* Notifications */}
      <div className="setup-card" style={{ marginBottom: '1.5rem' }}>
        <h2>Notifications</h2>
        <p style={{ color: 'var(--gray)', fontSize: '.9rem', marginBottom: '1rem' }}>
          Get an email when you receive a new message.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 500 }}>Email notifications</span>
          <button
            className={`btn btn-sm ${emailNotif ? 'btn-primary' : 'btn-secondary'}`}
            onClick={toggleEmailNotif}
            disabled={notifLoading}
            style={{ minWidth: 90 }}
          >
            {notifLoading ? '…' : emailNotif ? 'Enabled' : 'Disabled'}
          </button>
        </div>
      </div>

      {/* Tutor: delete listing */}
      {isTutor && (
        <div className="setup-card" style={{ marginBottom: '1.5rem' }}>
          <h2>Listing</h2>
          <p style={{ color: 'var(--gray)', fontSize: '.9rem', marginBottom: '1rem' }}>
            Remove your tutor listing from the Discovery page.
          </p>
          {postDeleted ? (
            <div className="success-msg">Listing deleted.</div>
          ) : !showDeletePost ? (
            <button className="btn btn-danger" onClick={() => setShowDeletePost(true)}>
              Delete listing
            </button>
          ) : (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '1rem' }}>
              <p style={{ marginBottom: '.75rem', fontWeight: 500 }}>Are you sure? This cannot be undone.</p>
              <div style={{ display: 'flex', gap: '.75rem' }}>
                <button className="btn btn-danger btn-sm" onClick={handleDeletePost} disabled={deletingPost}>
                  {deletingPost ? 'Deleting…' : 'Yes, delete'}
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowDeletePost(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Account */}
      <div className="setup-card">
        <h2>Account</h2>

        <div style={{ marginBottom: '1.25rem' }}>
          <p style={{ color: 'var(--gray)', fontSize: '.9rem', marginBottom: '.5rem' }}>
            Sign out of TutorMatch on this device.
          </p>
          <button className="btn btn-secondary" onClick={handleSignOut}>
            Log out
          </button>
        </div>

        <hr className="divider" />

        <div>
          <p style={{ color: 'var(--gray)', fontSize: '.9rem', marginBottom: '.5rem' }}>
            Permanently delete your account and all your data. This cannot be undone.
          </p>
          {!showDeleteAccount ? (
            <button className="btn btn-danger" onClick={() => setShowDeleteAccount(true)}>
              Delete account
            </button>
          ) : (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '1rem' }}>
              <p style={{ marginBottom: '.75rem', fontWeight: 500 }}>
                Are you sure? Your profile, messages, and all data will be permanently deleted.
              </p>
              <div style={{ display: 'flex', gap: '.75rem' }}>
                <button className="btn btn-danger btn-sm" onClick={handleDeleteAccount} disabled={deletingAccount}>
                  {deletingAccount ? 'Deleting…' : 'Yes, delete my account'}
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowDeleteAccount(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
