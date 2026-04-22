import { Link, NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const linkClass = ({ isActive }) => isActive ? 'active' : ''

  return (
    <nav className="navbar">
      <Link to="/discovery" className="navbar-brand">Stunion</Link>
      <div className="navbar-links">
        <NavLink to="/discovery" className={linkClass}>Find Tutors</NavLink>
        <NavLink to="/messages" className={linkClass}>Messages</NavLink>
        <NavLink to="/profile" className={linkClass}>My Profile</NavLink>
        <NavLink to="/settings" className={linkClass}>Settings</NavLink>
        {profile?.email === 'andyyan0806@gmail.com' && (
          <NavLink to="/admin" className={linkClass}>Admin</NavLink>
        )}
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
