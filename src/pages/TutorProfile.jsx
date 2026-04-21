import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { StarDisplay, StarInput } from '../components/StarRating'

function initials(name) {
  return name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '?'
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function TutorProfile() {
  const { id } = useParams()
  const { session, profile } = useAuth()
  const navigate = useNavigate()

  const [tutor, setTutor] = useState(null)
  const [reviews, setReviews] = useState([])
  const [myReview, setMyReview] = useState(null)
  const [loading, setLoading] = useState(true)

  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [reviewError, setReviewError] = useState('')

  const isOwnProfile = session?.user?.id === id

  useEffect(() => {
    async function load() {
      const [{ data: tp }, { data: revs }] = await Promise.all([
        supabase
          .from('tutor_profiles')
          .select('*, user:users(id, name, grade)')
          .eq('user_id', id)
          .single(),
        supabase
          .from('reviews')
          .select('*, student:users(name)')
          .eq('tutor_id', id)
          .order('created_at', { ascending: false }),
      ])
      setTutor(tp)
      setReviews(revs || [])
      const mine = revs?.find((r) => r.student_id === session?.user?.id)
      if (mine) setMyReview(mine)
      setLoading(false)
    }
    load()
  }, [id, session])

  async function handleMessage() {
    navigate(`/messages/${id}`)
  }

  async function submitReview(e) {
    e.preventDefault()
    setReviewError('')
    if (rating === 0) { setReviewError('Please select a star rating.'); return }
    setSubmitting(true)

    const { data, error } = await supabase
      .from('reviews')
      .insert({
        student_id: session.user.id,
        tutor_id: id,
        rating,
        comment: comment.trim() || null,
      })
      .select('*, student:users(name)')
      .single()

    if (error) { setReviewError(error.message); setSubmitting(false); return }
    setMyReview(data)
    setReviews((prev) => [data, ...prev])
    setSubmitting(false)
  }

  if (loading) return <div className="loading">Loading profile…</div>
  if (!tutor) return <div className="content-wrap"><p>Tutor not found.</p></div>

  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : null

  return (
    <div className="content-wrap">
      <div className="profile-header">
        <div className={`avatar avatar-lg`}>{initials(tutor.user?.name)}</div>
        <div className="profile-info">
          <div className="profile-name">{tutor.user?.name}</div>
          <div className="profile-meta">
            {tutor.user?.grade}
            {tutor.university && ` · ${tutor.university}`}
            {tutor.uni_grade && ` (${tutor.uni_grade})`}
          </div>
          {tutor.ib_scores && (
            <div className="profile-meta" style={{ marginBottom: '.5rem' }}>
              Scores: {tutor.ib_scores}
            </div>
          )}
          {avgRating !== null && (
            <StarDisplay value={avgRating} count={reviews.length} />
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem', margin: '.75rem 0' }}>
            {(tutor.subjects || []).map((s) => (
              <span key={s} className="tag">{s}</span>
            ))}
          </div>
          <div className="profile-bio">{tutor.bio}</div>
          {!isOwnProfile && (
            <div className="profile-actions">
              <button className="btn btn-primary" onClick={handleMessage}>
                Send Message
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="reviews-section">
        <div className="section-title">
          Reviews ({reviews.length})
        </div>

        {!isOwnProfile && profile?.role === 'student' && !myReview && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div className="section-title" style={{ fontSize: '.95rem' }}>Leave a review</div>
            {reviewError && <div className="error-msg">{reviewError}</div>}
            <form onSubmit={submitReview}>
              <StarInput value={rating} onChange={setRating} />
              <div className="form-group">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your experience (optional)…"
                  rows={3}
                />
              </div>
              <button className="btn btn-primary btn-sm" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit review'}
              </button>
            </form>
            <hr className="divider" />
          </div>
        )}

        {myReview && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '.75rem 1rem', marginBottom: '1rem', fontSize: '.85rem', color: '#92400e' }}>
            You already reviewed this tutor.
          </div>
        )}

        {reviews.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem' }}>
            <p>No reviews yet. Be the first!</p>
          </div>
        ) : (
          reviews.map((rev) => (
            <div key={rev.id} className="review-item">
              <div className="review-header">
                <span className="stars" style={{ color: 'var(--yellow)', fontSize: '.9rem' }}>
                  {'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}
                </span>
                <span className="review-author">{rev.student?.name || 'Anonymous'}</span>
                <span className="review-date">{formatDate(rev.created_at)}</span>
              </div>
              {rev.comment && <div className="review-comment">{rev.comment}</div>}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
