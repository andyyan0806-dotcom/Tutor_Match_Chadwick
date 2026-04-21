import { useState, useEffect } from 'react'
import { Link, Outlet, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

function initials(name) {
  return name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '?'
}

export default function Messages() {
  const { session } = useAuth()
  const { userId: activeId } = useParams()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session) return
    async function load() {
      const myId = session.user.id

      const { data: msgs } = await supabase
        .from('messages')
        .select('sender_id, receiver_id, content, timestamp, read_status')
        .or(`sender_id.eq.${myId},receiver_id.eq.${myId}`)
        .order('timestamp', { ascending: false })

      if (!msgs) { setLoading(false); return }

      const partnerIds = [...new Set(msgs.map((m) =>
        m.sender_id === myId ? m.receiver_id : m.sender_id
      ))]

      if (partnerIds.length === 0) { setLoading(false); return }

      const { data: users } = await supabase
        .from('users')
        .select('id, name, grade')
        .in('id', partnerIds)

      const userMap = Object.fromEntries((users || []).map((u) => [u.id, u]))

      const convMap = {}
      for (const m of msgs) {
        const partnerId = m.sender_id === myId ? m.receiver_id : m.sender_id
        if (!convMap[partnerId]) {
          convMap[partnerId] = {
            partnerId,
            partner: userMap[partnerId],
            lastMessage: m.content,
            unread: !m.read_status && m.receiver_id === myId,
          }
        }
      }
      setConversations(Object.values(convMap))
      setLoading(false)
    }

    load()

    // Keep sidebar fresh when new messages arrive
    const channel = supabase
      .channel('messages-sidebar')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        load()
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [session])

  return (
    <div className="content-wrap" style={{ paddingTop: '1.5rem' }}>
      <div className="messages-layout">
        <div className="conversations-list">
          <div style={{ padding: '.75rem 1rem', fontWeight: 700, fontSize: '.9rem', borderBottom: '1px solid var(--gray-200)', color: 'var(--gray-600)' }}>
            Conversations
          </div>
          {loading && (
            <div style={{ padding: '1rem', color: 'var(--gray-400)', fontSize: '.85rem' }}>Loading…</div>
          )}
          {!loading && conversations.length === 0 && (
            <div style={{ padding: '1.5rem 1rem', color: 'var(--gray-400)', fontSize: '.85rem', textAlign: 'center' }}>
              No conversations yet.<br />Message a tutor from their profile.
            </div>
          )}
          {conversations.map((c) => (
            <Link
              key={c.partnerId}
              to={`/messages/${c.partnerId}`}
              className={`conversation-item ${activeId === c.partnerId ? 'active' : ''}`}
            >
              <div className="avatar" style={{ width: 36, height: 36, fontSize: '.85rem' }}>
                {initials(c.partner?.name)}
              </div>
              <div className="conversation-info">
                <div className="conversation-name">{c.partner?.name || 'Unknown'}</div>
                <div className="conversation-preview">{c.lastMessage}</div>
              </div>
              {c.unread && <div className="unread-dot" />}
            </Link>
          ))}
        </div>

        {activeId ? (
          <Outlet />
        ) : (
          <div className="chat-window" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ color: 'var(--gray-400)', textAlign: 'center' }}>
              <p style={{ fontSize: '1.5rem' }}>💬</p>
              <p>Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
