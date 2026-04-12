import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, query, orderBy, getDocs, doc, updateDoc, arrayUnion, arrayRemove, serverTimestamp, getDoc, addDoc, limit, startAfter } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import BottomNav from '../components/BottomNav';

export default function Reviews() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [visibleReplies, setVisibleReplies] = useState<{ [key: string]: number }>({});
  
  const [newReviewText, setNewReviewText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchReviews();
  }, []);

  const getAnonymousId = () => {
    let id = localStorage.getItem('anonymousId');
    if (!id) {
      id = 'anon_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('anonymousId', id);
    }
    return id;
  };

  const fetchReviews = async () => {
    try {
      const q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'), limit(10));
      const querySnapshot = await getDocs(q);
      const reviewsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReviews(reviewsData);
      setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
      setHasMore(querySnapshot.docs.length === 10);
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreReviews = async () => {
    if (!lastVisible || loadingMore) return;
    setLoadingMore(true);
    try {
      const q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'), startAfter(lastVisible), limit(10));
      const querySnapshot = await getDocs(q);
      const reviewsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReviews([...reviews, ...reviewsData]);
      setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
      setHasMore(querySnapshot.docs.length === 10);
    } catch (error) {
      console.error("Error fetching more reviews:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (!newReviewText.trim()) return;
    setIsSubmitting(true);

    const currentUserId = user?.uid || getAnonymousId();
    const currentUserName = user?.displayName || 'Anonymous';
    const currentUserPhoto = user?.photoURL || '';

    const newReview = {
      userId: currentUserId,
      userName: currentUserName,
      userPhoto: currentUserPhoto,
      comment: newReviewText.trim(),
      rating: 0, // 0 means no rating (didn't order)
      likes: [],
      replies: [],
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'reviews'), newReview);
      setNewReviewText('');
      fetchReviews();
    } catch (error) {
      console.error("Error submitting review:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async (reviewId: string, currentLikes: string[] = []) => {
    const currentUserId = user?.uid || getAnonymousId();
    const reviewRef = doc(db, 'reviews', reviewId);
    const hasLiked = currentLikes.includes(currentUserId);

    try {
      if (hasLiked) {
        await updateDoc(reviewRef, {
          likes: arrayRemove(currentUserId)
        });
        setReviews(reviews.map(r => r.id === reviewId ? { ...r, likes: r.likes.filter((id: string) => id !== currentUserId) } : r));
      } else {
        await updateDoc(reviewRef, {
          likes: arrayUnion(currentUserId)
        });
        setReviews(reviews.map(r => r.id === reviewId ? { ...r, likes: [...(r.likes || []), currentUserId] } : r));
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const handleReplySubmit = async (reviewId: string) => {
    const text = replyText[reviewId]?.trim();
    if (!text) return;

    const currentUserId = user?.uid || getAnonymousId();
    const currentUserName = user?.displayName || 'Anonymous';
    const currentUserPhoto = user?.photoURL || '';

    const newReply = {
      id: Date.now().toString(),
      userId: currentUserId,
      userName: currentUserName,
      userPhoto: currentUserPhoto,
      text: text,
      createdAt: new Date().toISOString()
    };

    try {
      const reviewRef = doc(db, 'reviews', reviewId);
      await updateDoc(reviewRef, {
        replies: arrayUnion(newReply)
      });
      
      setReviews(reviews.map(r => {
        if (r.id === reviewId) {
          return { ...r, replies: [...(r.replies || []), newReply] };
        }
        return r;
      }));
      
      setReplyText({ ...replyText, [reviewId]: '' });
      // Don't close activeReplyId so they see their reply
    } catch (error) {
      console.error("Error submitting reply:", error);
    }
  };

  const loadMoreReplies = (reviewId: string) => {
    setVisibleReplies(prev => ({ ...prev, [reviewId]: (prev[reviewId] || 10) + 10 }));
  };

  return (
    <div className="bg-background text-on-surface font-body min-h-screen pb-32">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-[#fff4f3]/80 dark:bg-stone-900/80 backdrop-blur-xl border-b border-outline-variant/10 flex justify-between items-center px-6 h-16 md:h-20 max-w-7xl mx-auto left-1/2 -translate-x-1/2">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[#b22200] dark:text-[#ff785a]">reviews</span>
          <h1 className="font-headline font-extrabold tracking-tight text-[#b22200] dark:text-[#ff785a] text-xl">Community Reviews</h1>
        </div>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <Link to="/" className="text-on-surface-variant hover:text-primary transition-colors font-medium">Home</Link>
          <Link to="/orders" className="text-on-surface-variant hover:text-primary transition-colors font-medium">Orders</Link>
          <Link to="/favorites" className="text-on-surface-variant hover:text-primary transition-colors font-medium">Favorites</Link>
          <Link to="/reviews" className="text-primary font-bold hover:text-primary-dim transition-colors">Reviews</Link>
          <Link to="/cart" className="text-on-surface-variant hover:text-primary transition-colors font-medium">Cart</Link>
        </nav>

        <div className="flex items-center gap-3">
          {!user ? (
            <div className="hidden md:flex items-center gap-3">
              <button onClick={() => navigate('/login')} className="text-[13px] font-semibold text-[#595c5b] hover:text-[#176a21] transition-all">Log In</button>
              <button onClick={() => navigate('/login', { state: { isSignup: true } })} className="text-[13px] font-semibold text-[#176a21] bg-[#9df197]/30 px-4 py-1.5 rounded-full hover:bg-[#9df197]/50 transition-all">Sign Up</button>
            </div>
          ) : (
            <Link to="/profile" className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-primary/10">
              <img alt="User profile avatar" className="w-full h-full object-cover" src={user?.photoURL || "https://lh3.googleusercontent.com/aida-public/AB6AXuADsU9ZDluHDP7yQIDW6zRQ0KBzs4GW4wiOnF52L0KlwvWoaBAOaXqNYOp7NA1IlCXUdCJIpv8A2Ty0qkP21K4wNZTZK7iFqd-osrM6xpVrBTYkNt1yir6-pI0PsUrfzpqIl1CPEv8xt4W5rPgZKwYE3KwwFumn08dyII3-He8NmInDwiJV9deVbewEBXpGRPQoe-CyKm2ighcHobRgmfc6yNWVvzhpogUVUtBEJzkdjDvDiigNBSJK5y8utgP12t9v2l0K0rib1qI"} />
            </Link>
          )}
        </div>
      </header>

      <main className="pt-24 px-4 md:px-8 max-w-3xl mx-auto">
        <div className="mb-8 text-center">
          <h2 className="font-headline text-3xl font-extrabold text-on-surface mb-2">What Our Community Says</h2>
          <p className="text-on-surface-variant">Discover reviews, share your thoughts, and connect with other food lovers.</p>
        </div>

        {/* New Review Form */}
        <div className="bg-surface-container-lowest p-5 md:p-6 rounded-3xl border border-outline-variant/10 shadow-sm mb-8">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-container flex-shrink-0">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="You" className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined w-full h-full flex items-center justify-center text-on-surface-variant">person</span>
              )}
            </div>
            <div className="flex-grow flex flex-col gap-3">
              <textarea 
                value={newReviewText}
                onChange={(e) => setNewReviewText(e.target.value)}
                placeholder="Share your thoughts with the community..."
                className="w-full bg-surface-container-low border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/20 resize-none"
                rows={3}
              />
              <div className="flex justify-between items-center">
                <span className="text-xs text-on-surface-variant">
                  {!user && "Posting as Anonymous"}
                </span>
                <button 
                  onClick={handleReviewSubmit}
                  disabled={!newReviewText.trim() || isSubmitting}
                  className="px-6 py-2 text-sm font-bold bg-primary text-on-primary rounded-full hover:bg-primary-dim transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
                  ) : (
                    <span className="material-symbols-outlined text-[18px]">send</span>
                  )}
                  Post
                </button>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <span className="material-symbols-outlined animate-spin text-primary text-4xl">sync</span>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12 bg-surface-container-lowest rounded-3xl border border-outline-variant/10">
            <span className="material-symbols-outlined text-6xl text-on-surface-variant/30 mb-4">forum</span>
            <p className="text-on-surface-variant font-medium">No reviews yet. Be the first to share your experience!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {reviews.map(review => {
              const repliesCount = review.replies?.length || 0;
              const visibleCount = visibleReplies[review.id] || 10;
              const displayedReplies = (review.replies || []).slice(0, visibleCount);
              const hasMoreReplies = visibleCount < repliesCount;

              return (
                <div key={review.id} className="bg-surface-container-lowest p-5 md:p-6 rounded-3xl border border-outline-variant/10 shadow-sm">
                  {/* Review Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-container">
                        {review.userPhoto ? (
                          <img src={review.userPhoto} alt={review.userName} className="w-full h-full object-cover" />
                        ) : (
                          <span className="material-symbols-outlined w-full h-full flex items-center justify-center text-on-surface-variant">person</span>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-on-surface">{review.userName}</p>
                        <p className="text-[11px] text-on-surface-variant">
                          {review.createdAt?.toMillis ? new Date(review.createdAt.toMillis()).toLocaleDateString() : 'Recently'}
                        </p>
                      </div>
                    </div>
                    {review.rating > 0 && (
                      <div className="flex items-center bg-primary-container/20 px-2 py-1 rounded-full">
                        {[1, 2, 3, 4, 5].map(star => (
                          <span key={star} className={`material-symbols-outlined text-[14px] ${star <= review.rating ? 'text-amber-400' : 'text-outline-variant/30'}`} style={{ fontVariationSettings: star <= review.rating ? "'FILL' 1" : "'FILL' 0" }}>
                            star
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Review Content */}
                  <div className="mb-4">
                    {review.productName && (
                      <Link to={`/dish/${review.dishId}`} className="inline-block mb-2 text-xs font-bold text-primary hover:underline">
                        @{review.productName}
                      </Link>
                    )}
                    <p className="text-sm md:text-base text-on-surface leading-relaxed">{review.comment}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-6 border-t border-outline-variant/10 pt-4">
                    <button 
                      onClick={() => handleLike(review.id, review.likes)}
                      className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${review.likes?.includes(user?.uid) ? 'text-red-500' : 'text-on-surface-variant hover:text-red-500'}`}
                    >
                      <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: review.likes?.includes(user?.uid) ? "'FILL' 1" : "'FILL' 0" }}>favorite</span>
                      {review.likes?.length || 0}
                    </button>
                    <button 
                      onClick={() => setActiveReplyId(activeReplyId === review.id ? null : review.id)}
                      className="flex items-center gap-1.5 text-sm font-medium text-on-surface-variant hover:text-primary transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">chat_bubble</span>
                      {repliesCount}
                    </button>
                  </div>

                  {/* Replies Section */}
                  {activeReplyId === review.id && (
                    <div className="mt-4 pl-4 md:pl-8 border-l-2 border-outline-variant/20 space-y-4">
                      {/* Existing Replies */}
                      {displayedReplies.map((reply: any) => (
                        <div key={reply.id} className="bg-surface-container-low p-3 md:p-4 rounded-2xl">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-full overflow-hidden bg-surface-container">
                              {reply.userPhoto ? (
                                <img src={reply.userPhoto} alt={reply.userName} className="w-full h-full object-cover" />
                              ) : (
                                <span className="material-symbols-outlined w-full h-full flex items-center justify-center text-[14px] text-on-surface-variant">person</span>
                              )}
                            </div>
                            <p className="font-bold text-xs text-on-surface">{reply.userName}</p>
                            <span className="text-[10px] text-on-surface-variant">• {new Date(reply.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-sm text-on-surface-variant ml-8">{reply.text}</p>
                        </div>
                      ))}

                      {hasMoreReplies && (
                        <button 
                          onClick={() => loadMoreReplies(review.id)}
                          className="text-xs font-bold text-primary hover:underline ml-8"
                        >
                          View more comments
                        </button>
                      )}

                      {/* Reply Input */}
                      {activeReplyId === review.id && (
                        <div className="flex items-start gap-3 mt-2">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-surface-container flex-shrink-0 mt-1">
                            {user?.photoURL ? (
                              <img src={user.photoURL} alt="You" className="w-full h-full object-cover" />
                            ) : (
                              <span className="material-symbols-outlined w-full h-full flex items-center justify-center text-on-surface-variant">person</span>
                            )}
                          </div>
                          <div className="flex-grow flex flex-col gap-2">
                            <textarea 
                              value={replyText[review.id] || ''}
                              onChange={(e) => setReplyText({ ...replyText, [review.id]: e.target.value })}
                              placeholder="Write a reply..."
                              className="w-full bg-surface-container-low border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20 resize-none"
                              rows={2}
                            />
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => setActiveReplyId(null)}
                                className="px-3 py-1.5 text-xs font-bold text-on-surface-variant hover:bg-surface-container-high rounded-full transition-colors"
                              >
                                Cancel
                              </button>
                              <button 
                                onClick={() => handleReplySubmit(review.id)}
                                disabled={!replyText[review.id]?.trim()}
                                className="px-3 py-1.5 text-xs font-bold bg-primary text-on-primary rounded-full hover:bg-primary-dim transition-colors disabled:opacity-50"
                              >
                                Reply
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {hasMore && (
              <div className="flex justify-center mt-8">
                <button 
                  onClick={loadMoreReviews}
                  disabled={loadingMore}
                  className="px-6 py-3 bg-surface-container-low hover:bg-surface-container-high text-primary font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {loadingMore ? (
                    <>
                      <span className="material-symbols-outlined animate-spin">sync</span>
                      Loading...
                    </>
                  ) : (
                    "Load More Reviews"
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
