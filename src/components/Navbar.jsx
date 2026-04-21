import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <nav className="navbar">
      <Link to="/discovery" className="navbar-brand">TutorMatch</Link>
      <div className="navbar-links">
        <Link to="/discovery">Find Tutors</Link>
        <Link to="/messages">Messages</Link>
        <Link to="/profile">My Profile</Link>
      </div>
      <div className="navbar-right">
        {profile && (
          <span className="navbar-badge">{profile.name} · {profile.grade}</span>
        )}
        <button className="btn btn-secondary btn-sm" onClick={handleSignOut}>Sign out</button>
      </div>
    </nav>
  )
}
