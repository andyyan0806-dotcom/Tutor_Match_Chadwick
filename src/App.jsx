import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Register from './pages/Register'
import TutorProfileSetup from './pages/TutorProfileSetup'
import Discovery from './pages/Discovery'
import TutorProfile from './pages/TutorProfile'
import Messages from './pages/Messages'
import Conversation from './pages/Conversation'

function ProtectedRoute({ children }) {
  const { session } = useAuth()
  if (session === undefined) return <div className="loading">Loading…</div>
  if (!session) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const { session } = useAuth()

  return (
    <>
      {session && <Navbar />}
      <div className="page-container">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/setup-profile" element={<ProtectedRoute><TutorProfileSetup /></ProtectedRoute>} />
          <Route path="/discovery" element={<ProtectedRoute><Discovery /></ProtectedRoute>} />
          <Route path="/tutor/:id" element={<ProtectedRoute><TutorProfile /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>}>
            <Route path=":userId" element={<Conversation />} />
          </Route>
          <Route path="*" element={<Navigate to={session ? '/discovery' : '/login'} replace />} />
        </Routes>
      </div>
    </>
  )
}
