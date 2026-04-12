import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, doc, getDoc, setDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import BottomNav from '../components/BottomNav';

export default function OrderHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [visibleActive, setVisibleActive] = useState(5);
  const [visibleCompleted, setVisibleCompleted] = useState(10);
  const [loading, setLoading] = useState(true);
  
  // Single item review modal (for already delivered orders)
  const [reviewModal, setReviewModal] = useState<{ isOpen: boolean, orderId: string, item: any } | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  
  // Post-delivery review modal
  const [deliveryReviewModal, setDeliveryReviewModal] = useState<{ isOpen: boolean, order: any } | null>(null);
  const [deliveryReviewRatings, setDeliveryReviewRatings] = useState<Record<string, { rating: number, comment: string }>>({});
  
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const q = query(
          collection(db, 'orders'),
          where('userId', '==', user.uid)
        );
        const querySnapshot = await getDocs(q);
        const ordersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        ordersData.sort((a: any, b: any) => {
          if (!a.createdAt || !b.createdAt) return 0;
          return b.createdAt.toMillis() - a.createdAt.toMillis();
        });
        setAllOrders(ordersData);
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [user]);

  const activeOrders = allOrders.filter(o => !o.isUserArchived);
  const completedOrders = allOrders.filter(o => o.isUserArchived);

  const displayedActive = activeOrders.slice(0, visibleActive);
  const displayedCompleted = completedOrders.slice(0, visibleCompleted);

  const hasMoreActive = visibleActive < activeOrders.length;
  const hasMoreCompleted = visibleCompleted < completedOrders.length;

  const currentOrders = activeTab === 'active' ? displayedActive : displayedCompleted;
  const hasMore = activeTab === 'active' ? hasMoreActive : hasMoreCompleted;
  const loadMore = activeTab === 'active' ? () => setVisibleActive(prev => prev + 5) : () => setVisibleCompleted(prev => prev + 10);

  const openReviewModal = (orderId: string, item: any) => {
    setReviewModal({ isOpen: true, orderId, item });
    setRating(5);
    setComment('');
  };

  const submitReview = async () => {
    if (!user || !reviewModal) return;
    setSubmittingReview(true);
    try {
      // Save review
      const reviewRef = doc(collection(db, 'reviews'));
      await setDoc(reviewRef, {
        dishId: reviewModal.item.id,
        orderId: reviewModal.orderId,
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        userPhoto: user.photoURL || '',
        rating,
        comment,
        createdAt: serverTimestamp()
      });

      // Update dish rating
      const dishRef = doc(db, 'dishes', reviewModal.item.id);
      const dishSnap = await getDoc(dishRef);
      if (dishSnap.exists()) {
        const dishData = dishSnap.data();
        const currentReviews = dishData.reviews || 0;
        const currentRating = dishData.rating || 0;
        
        const newReviews = currentReviews + 1;
        const newRating = ((currentRating * currentReviews) + rating) / newReviews;
        
        await updateDoc(dishRef, {
          reviews: newReviews,
          rating: Number(newRating.toFixed(1))
        });
      }

      // Mark item as reviewed in the order to prevent duplicate reviews
      const orderRef = doc(db, 'orders', reviewModal.orderId);
      const order = allOrders.find(o => o.id === reviewModal.orderId);
      if (order) {
        const updatedItems = order.items.map((i: any) => 
          i.id === reviewModal.item.id ? { ...i, reviewed: true } : i
        );
        await updateDoc(orderRef, { items: updatedItems });
        
        // Update local state
        setAllOrders(allOrders.map(o => o.id === reviewModal.orderId ? { ...o, items: updatedItems } : o));
      }

      setReviewModal(null);
      alert("Review submitted successfully!");
    } catch (error) {
      console.error("Error submitting review:", error);
      alert("Failed to submit review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const confirmDelivery = async (orderId: string) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, { 
        status: 'delivered',
        isArchived: true // Hides from Admin active orders
      });

      // Update user's total delivered orders count
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, { totalOrdersDelivered: increment(1) }, { merge: true });
      }

      // Update local state to 'delivered'
      const order = allOrders.find(o => o.id === orderId);
      if (order) {
        const updatedOrder = { ...order, status: 'delivered' };
        setAllOrders(allOrders.map(o => o.id === orderId ? updatedOrder : o));
        
        // Open the post-delivery review modal
        setDeliveryReviewModal({ isOpen: true, order: updatedOrder });
      }
    } catch (error) {
      console.error("Error confirming delivery:", error);
      alert("Failed to confirm delivery. Please try again.");
    }
  };

  const handleSubmitDeliveryReview = async (orderId: string) => {
    if (!user || !deliveryReviewModal) return;
    setSubmittingReview(true);
    try {
      const order = deliveryReviewModal.order;
      const updatedItems = [...order.items];

      for (let i = 0; i < order.items.length; i++) {
        const item = order.items[i];
        const reviewData = deliveryReviewRatings[item.id];
        
        if (reviewData && reviewData.rating > 0) {
          // Save review
          const reviewRef = doc(collection(db, 'reviews'));
          await setDoc(reviewRef, {
            dishId: item.id,
            orderId: orderId,
            userId: user.uid,
            userName: user.displayName || 'Anonymous',
            userPhoto: user.photoURL || '',
            rating: reviewData.rating,
            comment: reviewData.comment || '',
            createdAt: serverTimestamp()
          });

          // Update dish rating
          const dishRef = doc(db, 'dishes', item.id);
          const dishSnap = await getDoc(dishRef);
          if (dishSnap.exists()) {
            const dishData = dishSnap.data();
            const currentReviews = dishData.reviews || 0;
            const currentRating = dishData.rating || 0;
            
            const newReviews = currentReviews + 1;
            const newRating = ((currentRating * currentReviews) + reviewData.rating) / newReviews;
            
            await updateDoc(dishRef, {
              reviews: newReviews,
              rating: Number(newRating.toFixed(1))
            });
          }

          updatedItems[i] = { ...updatedItems[i], reviewed: true };
        }
      }

      // Mark order as user archived and update items
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, { 
        items: updatedItems,
        isUserArchived: true 
      });

      // Update local state to move to completed tab
      setAllOrders(allOrders.map(o => o.id === orderId ? { ...o, items: updatedItems, isUserArchived: true } : o));
      setDeliveryReviewModal(null);
      setDeliveryReviewRatings({});
      alert("Reviews submitted successfully!");
    } catch (error) {
      console.error("Error submitting reviews:", error);
      alert("Failed to submit reviews.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleSkipDeliveryReview = async (orderId: string) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, { isUserArchived: true });
      // Update local state to move to completed tab
      setAllOrders(allOrders.map(o => o.id === orderId ? { ...o, isUserArchived: true } : o));
      setDeliveryReviewModal(null);
      setDeliveryReviewRatings({});
    } catch (error) {
      console.error("Error archiving order:", error);
    }
  };

  return (
    <div className="bg-background text-on-background min-h-screen pb-32 font-body">
      <header className="fixed top-0 w-full z-50 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md">
        <div className="flex items-center px-6 h-16 w-full max-w-xl mx-auto">
          <button onClick={() => navigate(-1)} className="text-orange-700 dark:text-orange-500 hover:bg-stone-100/50 dark:hover:bg-stone-800/50 transition-colors active:scale-95 duration-200 p-2 rounded-full">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-headline font-bold text-xl ml-4 text-orange-700 dark:text-orange-500">Order History</h1>
        </div>
      </header>

      <main className="pt-24 px-6 max-w-xl mx-auto space-y-6">
        {loading ? (
          <div className="text-center py-10">Loading orders...</div>
        ) : allOrders.length === 0 ? (
          <div className="text-center py-20">
            <span className="material-symbols-outlined text-6xl text-on-surface-variant/30 mb-4">receipt_long</span>
            <h2 className="font-headline text-xl font-bold mb-2">No orders yet</h2>
            <p className="text-on-surface-variant mb-6">You haven't placed any orders.</p>
            <Link to="/" className="bg-primary text-on-primary px-6 py-3 rounded-full font-bold">Start Ordering</Link>
          </div>
        ) : (
          <>
            <div className="flex border-b border-outline-variant/20 mb-2">
              <button 
                className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'active' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`} 
                onClick={() => setActiveTab('active')}
              >
                Recent Orders ({activeOrders.length})
              </button>
              <button 
                className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'completed' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`} 
                onClick={() => setActiveTab('completed')}
              >
                Completed ({completedOrders.length})
              </button>
            </div>

            {currentOrders.length === 0 ? (
              <div className="text-center py-10 text-on-surface-variant">
                No {activeTab === 'active' ? 'recent' : 'completed'} orders found.
              </div>
            ) : (
              currentOrders.map(order => (
                <div key={order.id} className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/10">
                <div className="flex justify-between items-start mb-4 border-b border-outline-variant/10 pb-4">
                  <div>
                    <p className="font-bold text-on-surface">Order #{order.id.slice(0, 8).toUpperCase()}</p>
                    <p className="text-xs text-on-surface-variant mt-1">
                      {order.createdAt ? new Date(order.createdAt.toMillis()).toLocaleString() : 'Just now'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-headline font-bold text-primary">${order.total.toFixed(2)}</p>
                    <span className={`inline-block mt-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                      order.status === 'delivered' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                      'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                    }`}>
                      {order.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {order.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface-container">
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{item.quantity}x {item.name}</p>
                          <p className="text-xs text-on-surface-variant">${item.price.toFixed(2)}</p>
                        </div>
                      </div>
                      {order.status === 'delivered' && !item.reviewed && (
                        <button 
                          onClick={() => openReviewModal(order.id, item)}
                          className="text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-full transition-colors"
                        >
                          Review
                        </button>
                      )}
                      {item.reviewed && (
                        <span className="text-xs font-bold text-green-600 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">check_circle</span>
                          Reviewed
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-outline-variant/10 flex justify-between items-center">
                  {order.status !== 'delivered' && (
                    <button 
                      onClick={() => confirmDelivery(order.id)}
                      className="text-sm font-bold text-white bg-primary hover:bg-primary/90 px-4 py-2 rounded-xl transition-colors shadow-sm"
                    >
                      Mark as Received
                    </button>
                  )}
                  <Link to={`/track?orderId=${order.id}`} className={`text-sm font-bold text-primary hover:underline flex items-center gap-1 ${order.status === 'delivered' ? 'ml-auto' : ''}`}>
                    {order.status === 'delivered' ? 'Order Details' : 'Track Order'}
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </Link>
                </div>
              </div>
              ))
            )}
            
            {hasMore && (
              <button 
                onClick={loadMore}
                className="w-full py-3 bg-surface-container-low hover:bg-surface-container-high text-primary font-bold rounded-xl transition-colors"
              >
                Load More {activeTab === 'active' ? 'Recent' : 'Completed'} Orders
              </button>
            )}
            {currentOrders.length > 0 && !hasMore && (
              <p className="text-center text-xs text-on-surface-variant py-4">You've reached the end of the list.</p>
            )}
          </>
        )}
      </main>

      {/* Single Item Review Modal */}
      {reviewModal && reviewModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setReviewModal(null)}>
          <div className="bg-surface w-full max-w-sm rounded-3xl p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-headline font-bold text-xl mb-1">Rate your food</h3>
            <p className="text-sm text-on-surface-variant mb-6">How was the {reviewModal.item.name}?</p>
            
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map(star => (
                <button 
                  key={star} 
                  onClick={() => setRating(star)}
                  className="transition-transform active:scale-90"
                >
                  <span className={`material-symbols-outlined text-4xl ${star <= rating ? 'text-amber-400' : 'text-outline-variant'}`} style={{ fontVariationSettings: star <= rating ? "'FILL' 1" : "'FILL' 0" }}>
                    star
                  </span>
                </button>
              ))}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold mb-2">Write a review (optional)</label>
              <textarea 
                className="w-full bg-surface-container border-none rounded-xl p-4 focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-none font-body text-on-surface"
                rows={3}
                placeholder="Tell us what you liked or what could be better..."
                value={comment}
                onChange={e => setComment(e.target.value)}
              ></textarea>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setReviewModal(null)} 
                className="flex-1 py-3 rounded-xl font-bold bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors"
                disabled={submittingReview}
              >
                Cancel
              </button>
              <button 
                onClick={submitReview} 
                className="flex-1 py-3 rounded-xl font-bold bg-primary text-on-primary hover:bg-primary/90 transition-colors flex items-center justify-center"
                disabled={submittingReview}
              >
                {submittingReview ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post-Delivery Review Modal */}
      {deliveryReviewModal && deliveryReviewModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => handleSkipDeliveryReview(deliveryReviewModal.order.id)}>
          <div className="bg-surface w-full max-w-md rounded-3xl p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-headline font-bold text-xl mb-1 text-center">Please rate your food</h3>
            <p className="text-sm text-on-surface-variant mb-6 text-center">How was your order?</p>
            
            <div className="space-y-6 mb-6">
              {deliveryReviewModal.order.items.map((item: any, idx: number) => (
                <div key={idx} className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/20">
                  <div className="flex items-center gap-4 mb-3">
                    <img src={item.image} alt={item.name} className="w-12 h-12 rounded-lg object-cover" />
                    <p className="font-bold text-sm">{item.name}</p>
                  </div>
                  <div className="flex justify-center gap-2 mb-3">
                    {[1, 2, 3, 4, 5].map(star => {
                      const currentRating = deliveryReviewRatings[item.id]?.rating || 0;
                      return (
                        <button 
                          key={star} 
                          onClick={() => setDeliveryReviewRatings(prev => ({ ...prev, [item.id]: { ...prev[item.id], rating: star } }))}
                          className="transition-transform active:scale-90"
                        >
                          <span className={`material-symbols-outlined text-3xl ${star <= currentRating ? 'text-amber-400' : 'text-outline-variant'}`} style={{ fontVariationSettings: star <= currentRating ? "'FILL' 1" : "'FILL' 0" }}>
                            star
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <textarea 
                    className="w-full bg-surface-container border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-none font-body text-on-surface"
                    rows={2}
                    placeholder="Write a review (optional)..."
                    value={deliveryReviewRatings[item.id]?.comment || ''}
                    onChange={e => setDeliveryReviewRatings(prev => ({ ...prev, [item.id]: { ...prev[item.id], comment: e.target.value } }))}
                  ></textarea>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => handleSkipDeliveryReview(deliveryReviewModal.order.id)} 
                className="flex-1 py-3 rounded-xl font-bold bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors"
                disabled={submittingReview}
              >
                Skip
              </button>
              <button 
                onClick={() => handleSubmitDeliveryReview(deliveryReviewModal.order.id)} 
                className="flex-1 py-3 rounded-xl font-bold bg-primary text-on-primary hover:bg-primary/90 transition-colors flex items-center justify-center"
                disabled={submittingReview}
              >
                {submittingReview ? 'Submitting...' : 'Submit Reviews'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
