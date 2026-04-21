import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

function initials(name) {
  return name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '?'
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

export default function Conversation() {
  const { userId: partnerId } = useParams()
  const { session } = useAuth()
  const myId = session?.user?.id

  const [partner, setPartner] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (!partnerId) return
    supabase
      .from('users')
      .select('id, name, grade')
      .eq('id', partnerId)
      .single()
      .then(({ data }) => setPartner(data))
  }, [partnerId])

  useEffect(() => {
    if (!myId || !partnerId) return

    async function loadMessages() {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${myId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${myId})`
        )
        .order('timestamp', { ascending: true })
      setMessages(data || [])

      // Mark incoming messages as read
      await supabase
        .from('messages')
        .update({ read_status: true })
        .eq('receiver_id', myId)
        .eq('sender_id', partnerId)
        .eq('read_status', false)
    }

    loadMessages()

    const channel = supabase
      .channel(`conv-${myId}-${partnerId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const m = payload.new
          const relevant =
            (m.sender_id === myId && m.receiver_id === partnerId) ||
            (m.sender_id === partnerId && m.receiver_id === myId)
          if (relevant) {
            setMessages((prev) => [...prev, m])
            if (m.receiver_id === myId) {
              supabase.from('messages').update({ read_status: true }).eq('id', m.id)
            }
          }
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [myId, partnerId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(e) {
    e.preventDefault()
    if (!text.trim() || sending) return
    setSending(true)
    await supabase.from('messages').insert({
      sender_id: myId,
      receiver_id: partnerId,
      content: text.trim(),
      timestamp: new Date().toISOString(),
      read_status: false,
    })
    setText('')
    setSending(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(e)
    }
  }

  return (
    <div className="chat-window">
      <div className="chat-header">
        <div className="avatar" style={{ width: 32, height: 32, fontSize: '.8rem' }}>
          {initials(partner?.name)}
        </div>
        {partner ? (
          <Link to={`/tutor/${partnerId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            {partner.name}
            <span style={{ fontWeight: 400, fontSize: '.8rem', color: 'var(--gray-400)', marginLeft: '.5rem' }}>
              {partner.grade}
            </span>
          </Link>
        ) : '…'}
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: '.85rem', marginTop: '2rem' }}>
            No messages yet. Say hello!
          </div>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === myId
          return (
            <div key={m.id}>
              <div className={`message-bubble ${mine ? 'mine' : 'theirs'}`}>
                {m.content}
              </div>
              <div className={`message-time ${mine ? '' : 'theirs'}`}>
                {formatTime(m.timestamp)}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <form className="chat-input-row" onSubmit={send}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (Enter to send)"
          rows={1}
        />
        <button type="submit" className="btn btn-primary btn-sm" disabled={!text.trim() || sending}>
          Send
        </button>
      </form>
    </div>
  )
}
