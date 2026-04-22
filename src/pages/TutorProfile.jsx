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

  const [post, setPost] = useState(null)
  const [reviews, setReviews] = useState([])
  const [myReview, setMyReview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [photoError, setPhotoError] = useState(false)

  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [reviewError, setReviewError] = useState('')

  const isOwnProfile = session?.user?.id === id

  useEffect(() => {
    async function load() {
      const [{ data: postData }, { data: revs }] = await Promise.all([
        supabase
          .from('posts')
          .select(`
            id, title, subjects, description,
            user:users!posts_tutor_id_fkey (
              id, name, grade,
              tutor_profiles ( university, uni_grade, ib_scores, photo_url )
            )
          `)
          .eq('tutor_id', id)
          .maybeSingle(),
        supabase
          .from('reviews')
          .select('*, student:users!reviews_student_id_fkey(name)')
          .eq('tutor_id', id)
          .order('created_at', { ascending: false }),
      ])
      setPost(postData)
      setReviews(revs || [])
      const mine = revs?.find((r) => r.student_id === session?.user?.id)
      if (mine) setMyReview(mine)
      setLoading(false)
    }
    load()
  }, [id, session])

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
  if (!post) return <div className="content-wrap"><p>Tutor not found.</p></div>

  const tp = post.user?.tutor_profiles?.[0]
  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : null

  return (
    <div className="content-wrap">
      <div className="profile-header">
        {tp?.photo_url && !photoError ? (
          <img
            src={tp.photo_url}
            alt={post.user?.name}
            className="avatar avatar-lg avatar-photo"
            onError={() => setPhotoError(true)}
          />
        ) : (
          <div className="avatar avatar-lg">{initials(post.user?.name)}</div>
        )}
        <div className="profile-info">
          <div className="profile-name">{post.user?.name}</div>
          <div className="profile-meta">
            {post.user?.grade}
            {tp?.university && ` · ${tp.university}`}
            {tp?.uni_grade && ` (${tp.uni_grade})`}
          </div>
          {tp?.ib_scores && (
            <div className="profile-meta" style={{ marginBottom: '.5rem' }}>
              Scores: {tp.ib_scores}
            </div>
          )}
          {avgRating !== null && (
            <StarDisplay value={avgRating} count={reviews.length} />
          )}
          {post.title && (
            <div className="profile-listing-title">{post.title}</div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem', margin: '.75rem 0' }}>
            {(post.subjects || []).map((s) => (
              <span key={s} className="tag">{s}</span>
            ))}
          </div>
          <div className="profile-bio">{post.description}</div>
          {!isOwnProfile && (
            <div className="profile-actions">
              <button className="btn btn-primary" onClick={() => navigate(`/messages/${id}`)}>
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
