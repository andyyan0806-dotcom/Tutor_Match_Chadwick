import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// Fill in your bank details below
const PAYMENT_BANK = '토스 뱅크'        // e.g. 카카오뱅크, 국민은행, 신한은행
const PAYMENT_ACCOUNT = '1908-4431-9433'  // your account number
const PAYMENT_NAME = 'ㅇㄱㅂ'            // account holder name

function initials(name) {
  return name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '?'
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function daysLeft(expiresAt) {
  const diff = new Date(expiresAt) - Date.now()
  if (diff <= 0) return 0
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default function Conversation() {
  const { userId: partnerId } = useParams()
  const { session, profile } = useAuth()
  const myId = session?.user?.id

  const [partner, setPartner] = useState(null)
  const [messages, setMessages] = useState([])
  const [match, setMatch] = useState(undefined) // undefined = not yet fetched, null = no match exists
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [showExtensionForm, setShowExtensionForm] = useState(false)
  const [extensionReason, setExtensionReason] = useState('')
  const [extensionSubmitted, setExtensionSubmitted] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [promoError, setPromoError] = useState('')
  const [promoApplied, setPromoApplied] = useState(false)
  const [applyingPromo, setApplyingPromo] = useState(false)
  const bottomRef = useRef(null)

  // Fetch partner (include role so we can determine student/tutor)
  useEffect(() => {
    if (!partnerId) return
    supabase
      .from('users')
      .select('id, name, grade, role')
      .eq('id', partnerId)
      .single()
      .then(({ data }) => setPartner(data))
  }, [partnerId])

  // Fetch match once both roles are known
  useEffect(() => {
    if (!myId || !partnerId || !profile || !partner) return

    const myRole = profile.role
    const partnerRole = partner.role

    // Only show match UI for student↔tutor conversations
    if (!myRole || !partnerRole || myRole === partnerRole) {
      setMatch(null)
      return
    }

    const studentId = myRole === 'student' ? myId : partnerId
    const tutorId = myRole === 'tutor' ? myId : partnerId

    async function fetchMatch() {
      const { data } = await supabase
        .from('matches')
        .select('*')
        .eq('student_id', studentId)
        .eq('tutor_id', tutorId)
        .maybeSingle()

      if (!data) {
        setMatch(null)
        return
      }

      // Auto-expire client-side if the window passed
      if (data.status === 'pending' && new Date(data.expires_at) < new Date()) {
        const { data: updated } = await supabase
          .from('matches')
          .update({ status: 'expired' })
          .eq('id', data.id)
          .select()
          .single()
        setMatch(updated ?? { ...data, status: 'expired' })
      } else {
        setMatch(data)
      }
    }

    fetchMatch()

    // Realtime: reflect when either party clicks Start Tutoring or admin marks paid
    const channel = supabase
      .channel(`match-${studentId}-${tutorId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches' }, (payload) => {
        const m = payload.new
        if (m.student_id === studentId && m.tutor_id === tutorId) setMatch(m)
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [myId, partnerId, profile?.role, partner?.role]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load messages + realtime subscription
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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
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
      })
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

    // Create match on first message from student to tutor
    if (match === null && profile?.role === 'student' && partner?.role === 'tutor') {
      const { data: newMatch } = await supabase
        .from('matches')
        .insert({
          student_id: myId,
          tutor_id: partnerId,
          expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single()
      if (newMatch) setMatch(newMatch)
    }

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

  async function handleStartTutoring() {
    if (!match) return
    const { data: updated } = await supabase
      .from('matches')
      .update({ status: 'active', activated_at: new Date().toISOString() })
      .eq('id', match.id)
      .select()
      .single()
    if (updated) setMatch(updated)
    setShowPaymentModal(true)
  }

  async function handleSubmitExtension() {
    if (!match) return
    const { error } = await supabase.from('extension_requests').insert({
      match_id: match.id,
      requested_by: myId,
      reason: extensionReason.trim() || null,
    })
    if (!error) {
      setExtensionSubmitted(true)
      setShowExtensionForm(false)
      setExtensionReason('')
    }
  }

  async function handleApplyPromo() {
    if (!promoCode.trim() || !match) return
    setApplyingPromo(true)
    setPromoError('')

    const { data: code } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', promoCode.trim().toUpperCase())
      .maybeSingle()

    if (!code) {
      setPromoError('Invalid promo code.')
      setApplyingPromo(false)
      return
    }
    if (code.used_by) {
      setPromoError('This code has already been used.')
      setApplyingPromo(false)
      return
    }

    const now = new Date().toISOString()
    const [{ error: codeErr }, { error: matchErr }] = await Promise.all([
      supabase.from('promo_codes')
        .update({ used_by: myId, used_at: now })
        .eq('id', code.id)
        .is('used_by', null),
      supabase.from('matches')
        .update({ status: 'paid', activated_at: now, paid_months: Math.ceil(code.days / 30) || 1 })
        .eq('id', match.id),
    ])

    if (codeErr || matchErr) {
      setPromoError('Could not apply code — it may have just been used. Try again.')
      setApplyingPromo(false)
      return
    }

    setMatch((prev) => ({ ...prev, status: 'paid', activated_at: now }))
    setPromoApplied(true)
    setApplyingPromo(false)
  }

  const isExpired = match?.status === 'expired' ||
    (match?.status === 'pending' && new Date(match?.expires_at) < new Date())

  return (
    <div className="chat-window">
      {/* Header */}
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

      {/* Match banner — pending */}
      {match && !isExpired && match.status === 'pending' && (
        <div className="match-banner match-banner--pending">
          <span className="match-banner-label">
            {daysLeft(match.expires_at) > 0
              ? `${daysLeft(match.expires_at)} day${daysLeft(match.expires_at) !== 1 ? 's' : ''} left to decide`
              : 'Expires today'}
          </span>
          <div className="match-banner-actions">
            <button className="btn btn-primary btn-sm" onClick={handleStartTutoring}>
              Start Tutoring
            </button>
            {extensionSubmitted ? (
              <span className="match-banner-note">Extension requested</span>
            ) : (
              <button className="btn btn-secondary btn-sm" onClick={() => setShowExtensionForm((v) => !v)}>
                Request Extension
              </button>
            )}
          </div>
        </div>
      )}

      {/* Match banner — active / paid */}
      {match && (match.status === 'active' || match.status === 'paid') && (
        <div className="match-banner match-banner--active">
          <span className="match-banner-label">
            Tutoring {match.status === 'paid' ? 'Active · Paid' : 'Active'}
          </span>
          {match.status === 'active' && (
            <button
              className="btn btn-sm"
              style={{ background: 'rgba(255,255,255,.2)', color: 'white', border: 'none' }}
              onClick={() => setShowPaymentModal(true)}
            >
              View Payment Link
            </button>
          )}
        </div>
      )}

      {/* Extension request form */}
      {showExtensionForm && (
        <div className="extension-form">
          <textarea
            value={extensionReason}
            onChange={(e) => setExtensionReason(e.target.value)}
            placeholder="Reason for extension (optional)"
            rows={2}
            style={{ marginBottom: '.5rem' }}
          />
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <button className="btn btn-primary btn-sm" onClick={handleSubmitExtension}>Submit Request</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowExtensionForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Payment modal */}
      {showPaymentModal && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '.75rem', fontWeight: 800, color: 'var(--gray-900)' }}>
              Activate Your Tutoring
            </h3>
            <p style={{ fontSize: '.9rem', color: 'var(--gray-600)', marginBottom: '1.25rem' }}>
              Send <strong>₩1,000/month</strong> via Toss 송금 or bank transfer:
            </p>
            <div style={{
              background: 'var(--gray-50)', border: '1px solid var(--gray-200)',
              borderRadius: 'var(--radius-sm)', padding: '1rem', marginBottom: '1rem',
              fontSize: '.9rem', lineHeight: 2,
            }}>
              <div><span style={{ color: 'var(--gray-400)', width: 72, display: 'inline-block' }}>은행</span> <strong>{PAYMENT_BANK}</strong></div>
              <div><span style={{ color: 'var(--gray-400)', width: 72, display: 'inline-block' }}>계좌번호</span> <strong>{PAYMENT_ACCOUNT}</strong></div>
              <div><span style={{ color: 'var(--gray-400)', width: 72, display: 'inline-block' }}>예금주</span> <strong>{PAYMENT_NAME}</strong></div>
              <div style={{ borderTop: '1px solid var(--gray-200)', marginTop: '.5rem', paddingTop: '.5rem' }}>
                <span style={{ color: 'var(--gray-400)', width: 72, display: 'inline-block' }}>입금자명</span> <strong style={{ color: 'var(--blue)' }}>{profile?.name}</strong>
              </div>
            </div>
            <p style={{ fontSize: '.8rem', color: 'var(--gray-400)', marginBottom: '1.25rem' }}>
              송금 확인까지 최대 6시간이 소요될 수 있습니다.
            </p>

            <div style={{ borderTop: '1px solid var(--gray-100)', paddingTop: '1rem', marginBottom: '1rem' }}>
              <p style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--gray-600)', marginBottom: '.5rem' }}>
                Have a promo code?
              </p>
              {promoApplied ? (
                <p style={{ fontSize: '.85rem', color: '#15803d', fontWeight: 600 }}>Promo code applied!</p>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: '.5rem' }}>
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoError('') }}
                      placeholder="ENTER CODE"
                      style={{ flex: 1, padding: '.45rem .75rem', fontSize: '.85rem', textTransform: 'uppercase', letterSpacing: '.05em' }}
                    />
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={handleApplyPromo}
                      disabled={!promoCode.trim() || applyingPromo}
                    >
                      {applyingPromo ? '…' : 'Apply'}
                    </button>
                  </div>
                  {promoError && (
                    <p style={{ fontSize: '.78rem', color: 'var(--red)', marginTop: '.4rem' }}>{promoError}</p>
                  )}
                </>
              )}
            </div>

            <button className="btn btn-secondary btn-sm" onClick={() => setShowPaymentModal(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Expired state replaces the messages + input */}
      {isExpired ? (
        <div className="chat-expired">
          <p style={{ fontSize: '1.5rem', marginBottom: '.5rem' }}>⏰</p>
          <p style={{ fontWeight: 700, marginBottom: '.35rem' }}>This conversation has expired</p>
          <p style={{ fontSize: '.85rem', color: 'var(--gray-400)' }}>
            The 5-day decision window passed without a response.
          </p>
        </div>
      ) : (
        <>
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
                  <div className={`message-bubble ${mine ? 'mine' : 'theirs'}`}>{m.content}</div>
                  <div className={`message-time ${mine ? '' : 'theirs'}`}>{formatTime(m.timestamp)}</div>
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
        </>
      )}
    </div>
  )
}
