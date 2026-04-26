import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { gradeFromCohort } from '../lib/constants'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session?.user) { setProfile(null); return }
    supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (!data) { setProfile(null); return }
        const grade = data.cohort_year ? gradeFromCohort(data.cohort_year) : (data.grade || '')
        setProfile({ ...data, grade })
      })
  }, [session])

  return (
    <AuthContext.Provider value={{ session, profile, setProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
