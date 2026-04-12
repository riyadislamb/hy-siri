import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { collection, query, where, getDocs, doc, getDoc, setDoc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export default function Profile() {
  const navigate = useNavigate();
  const { user, isAdmin, loading, logout } = useAuth();
  const { items: cartItems } = useCart();
  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [activeModal, setActiveModal] = useState<'payment' | 'address' | 'reviews' | null>(null);

  const [userData, setUserData] = useState<any>({ addresses: [], paymentMethods: [] });
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({ title: '', addressLine: '' });
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [newPayment, setNewPayment] = useState({ cardNumber: '', expiry: '' });

  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [reviewForm, setReviewForm] = useState<{ dishId: string, orderId: string, rating: number, comment: string, productName: string, productImage: string } | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserData(docSnap.data());
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };
    fetchUserData();
  }, [user]);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) {
        setOrders([]);
        setLoadingOrders(false);
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
        setOrders(ordersData);
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setLoadingOrders(false);
      }
    };

    fetchOrders();
  }, [user]);

  useEffect(() => {
    const fetchReviews = async () => {
      if (!user) {
        setReviews([]);
        setLoadingReviews(false);
        return;
      }
      try {
        const q = query(collection(db, 'reviews'), where('userId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        const reviewsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setReviews(reviewsData);
      } catch (error) {
        console.error("Error fetching reviews:", error);
      } finally {
        setLoadingReviews(false);
      }
    };
    fetchReviews();
  }, [user]);

  const deliveredOrders = orders.filter(o => o.status === 'delivered');
  const pendingReviews: any[] = [];
  deliveredOrders.forEach(order => {
    order.items?.forEach((item: any) => {
      const hasReviewed = reviews.some(r => r.orderId === order.id && r.dishId === item.id);
      if (!hasReviewed) {
        pendingReviews.push({
          orderId: order.id,
          dishId: item.id,
          productName: item.name,
          productImage: item.image,
          orderDate: order.createdAt
        });
      }
    });
  });

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !reviewForm) return;
    try {
      const docRef = await addDoc(collection(db, 'reviews'), {
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        userPhoto: user.photoURL || '',
        dishId: reviewForm.dishId,
        orderId: reviewForm.orderId,
        rating: reviewForm.rating,
        comment: reviewForm.comment,
        createdAt: serverTimestamp()
      });

      // Update dish rating
      const dishRef = doc(db, 'dishes', reviewForm.dishId);
      const dishSnap = await getDoc(dishRef);
      if (dishSnap.exists()) {
        const dishData = dishSnap.data();
        const currentReviews = dishData.reviews || 0;
        const currentRating = dishData.rating || 0;
        
        const newReviews = currentReviews + 1;
        const newRating = ((currentRating * currentReviews) + reviewForm.rating) / newReviews;
        
        await updateDoc(dishRef, {
          reviews: newReviews,
          rating: Number(newRating.toFixed(1))
        });
      }

      // Mark item as reviewed in the order
      const orderRef = doc(db, 'orders', reviewForm.orderId);
      const orderSnap = await getDoc(orderRef);
      if (orderSnap.exists()) {
        const orderData = orderSnap.data();
        const updatedItems = orderData.items.map((i: any) => 
          i.id === reviewForm.dishId ? { ...i, reviewed: true } : i
        );
        await updateDoc(orderRef, { items: updatedItems });
      }

      setReviews([...reviews, { ...reviewForm, id: docRef.id, userId: user.uid, createdAt: new Date() }]);
      setReviewForm(null);
    } catch (error) {
      console.error("Error submitting review:", error);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const updatedAddresses = [...(userData.addresses || []), {
      id: Date.now().toString(),
      title: newAddress.title,
      addressLine: newAddress.addressLine,
      isDefault: (userData.addresses || []).length === 0
    }];
    try {
      await setDoc(doc(db, 'users', user.uid), { addresses: updatedAddresses }, { merge: true });
      setUserData({ ...userData, addresses: updatedAddresses });
      setShowAddAddress(false);
      setNewAddress({ title: '', addressLine: '' });
    } catch (error) {
      console.error("Error saving address:", error);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!user) return;
    const updated = (userData.addresses || []).filter((a: any) => a.id !== id);
    try {
      await setDoc(doc(db, 'users', user.uid), { addresses: updated }, { merge: true });
      setUserData({ ...userData, addresses: updated });
    } catch (error) {
      console.error("Error deleting address:", error);
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const last4 = newPayment.cardNumber.slice(-4) || '0000';
    const updatedPayments = [...(userData.paymentMethods || []), {
      id: Date.now().toString(),
      type: 'credit_card',
      last4,
      expiry: newPayment.expiry,
      isDefault: (userData.paymentMethods || []).length === 0
    }];
    try {
      await setDoc(doc(db, 'users', user.uid), { paymentMethods: updatedPayments }, { merge: true });
      setUserData({ ...userData, paymentMethods: updatedPayments });
      setShowAddPayment(false);
      setNewPayment({ cardNumber: '', expiry: '' });
    } catch (error) {
      console.error("Error saving payment:", error);
    }
  };

  const handleDeletePayment = async (id: string) => {
    if (!user) return;
    const updated = (userData.paymentMethods || []).filter((p: any) => p.id !== id);
    try {
      await setDoc(doc(db, 'users', user.uid), { paymentMethods: updated }, { merge: true });
      setUserData({ ...userData, paymentMethods: updated });
    } catch (error) {
      console.error("Error deleting payment:", error);
    }
  };

  return (
    <div className="bg-background text-on-surface font-body min-h-screen pb-32">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-[#fff4f3]/80 dark:bg-stone-900/80 backdrop-blur-xl flex justify-between items-center px-6 h-16">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[#b22200] dark:text-[#ff785a]">restaurant_menu</span>
          <h1 className="font-headline font-extrabold tracking-tight text-[#b22200] dark:text-[#ff785a] text-xl">SalesHub Enterprise</h1>
        </div>
        <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-primary/10">
          <img alt="User profile avatar" className="w-full h-full object-cover" src={user?.photoURL || "https://lh3.googleusercontent.com/aida-public/AB6AXuADsU9ZDluHDP7yQIDW6zRQ0KBzs4GW4wiOnF52L0KlwvWoaBAOaXqNYOp7NA1IlCXUdCJIpv8A2Ty0qkP21K4wNZTZK7iFqd-osrM6xpVrBTYkNt1yir6-pI0PsUrfzpqIl1CPEv8xt4W5rPgZKwYE3KwwFumn08dyII3-He8NmInDwiJV9deVbewEBXpGRPQoe-CyKm2ighcHobRgmfc6yNWVvzhpogUVUtBEJzkdjDvDiigNBSJK5y8utgP12t9v2l0K0rib1qI"} />
        </div>
      </header>

      <main className="pt-24 px-6 max-w-2xl mx-auto">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : user ? (
          <>
            {/* Profile Header Section */}
            <section className="flex flex-col items-center mb-10 text-center">
              <div className="relative mb-4">
                <div className="w-28 h-28 rounded-full overflow-hidden shadow-xl ring-4 ring-surface-container-lowest">
                  <img alt={user.displayName || "User"} className="w-full h-full object-cover" src={user.photoURL || "https://lh3.googleusercontent.com/aida-public/AB6AXuC7Lp9nj_jOIOk077UU1fGIk6UzdUItDmQMZvCRtwwnj3cSMwzTDyGViXc0DSUXZzCN1M5Tt6I477ILmZm4_9-RYj13NvUQhzG9t_aBLWZoDMQHQxX9JSR7mqiDYf-rlok8zH7eNoHDNDZsqIAKOAvcvH13hNuJjs3nvkwKcmhQ7IWZPNR7dwjuEY61t5XBBHCrmw2uDZ8abyCvRIAF6ky2OuMpxM_MPH1WsSVjqGYhvmKY1FY2-9vx5GSQ8vmQw8zgVm3XnRgoJWY"} />
                </div>
              </div>
              <h2 className="font-headline text-3xl font-bold text-on-surface mb-1">{user.displayName || "Food Lover"}</h2>
              <p className="text-on-surface-variant font-medium">{user.email}</p>
            </section>

            {/* Stats Bento-ish Layout */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-outline-variant/10 flex flex-col items-center justify-center text-center">
                <p className="text-label-sm uppercase tracking-wider text-on-surface-variant mb-1 font-semibold text-[9px]">Total Orders</p>
                <p className="font-headline text-xl font-extrabold text-primary">{userData.totalOrdersPlaced || orders.length}</p>
              </div>
              <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-outline-variant/10 flex flex-col items-center justify-center text-center">
                <p className="text-label-sm uppercase tracking-wider text-on-surface-variant mb-1 font-semibold text-[9px]">Delivered</p>
                <p className="font-headline text-xl font-extrabold text-[#16a34a]">{userData.totalOrdersDelivered || 0}</p>
              </div>
              <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-outline-variant/10 flex flex-col items-center justify-center text-center">
                <p className="text-label-sm uppercase tracking-wider text-on-surface-variant mb-1 font-semibold text-[9px]">Points</p>
                <p className="font-headline text-xl font-extrabold text-primary-container">{userData.curatorPoints !== undefined ? userData.curatorPoints : (userData.totalOrdersPlaced || orders.length) * 10}</p>
              </div>
            </div>

            {/* Navigation Links Group */}
            <nav className="space-y-3">
              <h3 className="font-headline text-xs uppercase tracking-[0.2em] text-on-surface-variant/70 mb-4 px-2">Account Settings</h3>
              
              <Link to="/favorites" className="w-full flex items-center justify-between p-4 bg-surface-container-low rounded-xl hover:bg-surface-container-highest transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">favorite</span>
                  </div>
                  <span className="font-semibold text-on-surface">My Favorites</span>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">chevron_right</span>
              </Link>

              {isAdmin && (
                <Link to="/admin" className="w-full flex items-center justify-between p-4 bg-primary/10 rounded-xl hover:bg-primary/20 transition-colors group border border-primary/20">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white">
                      <span className="material-symbols-outlined">admin_panel_settings</span>
                    </div>
                    <span className="font-bold text-primary">Admin Dashboard</span>
                  </div>
                  <span className="material-symbols-outlined text-primary group-hover:translate-x-1 transition-transform">chevron_right</span>
                </Link>
              )}

              <button onClick={() => setActiveModal('payment')} className="w-full flex items-center justify-between p-4 bg-surface-container-low rounded-xl hover:bg-surface-container-highest transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">payments</span>
                  </div>
                  <span className="font-semibold text-on-surface">Payment Methods</span>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">chevron_right</span>
              </button>
              
              <button onClick={() => setActiveModal('address')} className="w-full flex items-center justify-between p-4 bg-surface-container-low rounded-xl hover:bg-surface-container-highest transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">location_on</span>
                  </div>
                  <span className="font-semibold text-on-surface">Address Book</span>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">chevron_right</span>
              </button>

              <button onClick={() => setActiveModal('reviews')} className="w-full flex items-center justify-between p-4 bg-surface-container-low rounded-xl hover:bg-surface-container-highest transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">rate_review</span>
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="font-semibold text-on-surface">My Reviews</span>
                    {pendingReviews.length > 0 && (
                      <span className="text-[10px] font-bold text-primary bg-primary-container/30 px-2 py-0.5 rounded-full mt-1">{pendingReviews.length} Pending</span>
                    )}
                  </div>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">chevron_right</span>
              </button>
            </nav>

            {/* Logout Action */}
            <div className="mt-12 flex flex-col items-center gap-4">
              <button onClick={async () => { await logout(); navigate('/login'); }} className="flex items-center gap-2 text-secondary font-bold hover:bg-secondary-container/20 px-6 py-3 rounded-full transition-all active:scale-95">
                <span className="material-symbols-outlined">logout</span>
                Logout
              </button>
              <p className="text-[10px] text-on-surface-variant/40 tracking-widest font-medium">VERSION 2.4.0 (2024)</p>
            </div>

            {/* Modals */}
            {activeModal === 'payment' && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => { setActiveModal(null); setShowAddPayment(false); }}>
                <div className="bg-surface w-full max-w-md rounded-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-headline font-bold text-xl">Payment Methods</h3>
                    <button onClick={() => { setActiveModal(null); setShowAddPayment(false); }} className="text-on-surface-variant hover:text-on-surface">
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>
                  
                  {showAddPayment ? (
                    <form onSubmit={handleAddPayment} className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold mb-1">Card Number</label>
                        <input 
                          type="text" 
                          required
                          maxLength={16}
                          placeholder="1234 5678 9101 1121"
                          className="w-full p-3 rounded-xl bg-surface-container border-none"
                          value={newPayment.cardNumber}
                          onChange={e => setNewPayment({...newPayment, cardNumber: e.target.value})}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold mb-1">Expiry Date</label>
                          <input 
                            type="text" 
                            required
                            placeholder="MM/YY"
                            className="w-full p-3 rounded-xl bg-surface-container border-none"
                            value={newPayment.expiry}
                            onChange={e => setNewPayment({...newPayment, expiry: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold mb-1">CVC</label>
                          <input 
                            type="text" 
                            required
                            maxLength={4}
                            placeholder="123"
                            className="w-full p-3 rounded-xl bg-surface-container border-none"
                          />
                        </div>
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setShowAddPayment(false)} className="flex-1 py-3 rounded-xl font-bold bg-surface-container-high text-on-surface">Cancel</button>
                        <button type="submit" className="flex-1 py-3 rounded-xl font-bold bg-primary text-on-primary">Save Card</button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-4">
                      {(!userData.paymentMethods || userData.paymentMethods.length === 0) ? (
                        <p className="text-center text-on-surface-variant py-4">No payment methods saved.</p>
                      ) : (
                        userData.paymentMethods.map((payment: any, idx: number) => (
                          <div key={payment.id || idx} className="flex items-center justify-between p-4 border border-outline-variant/30 rounded-xl bg-surface-container-lowest">
                            <div className="flex items-center gap-3">
                              <span className="material-symbols-outlined text-primary">credit_card</span>
                              <div>
                                <p className="font-semibold text-sm">•••• •••• •••• {payment.last4}</p>
                                <p className="text-xs text-on-surface-variant">Expires {payment.expiry}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {payment.isDefault && <span className="text-xs font-bold text-primary bg-primary-container/30 px-2 py-1 rounded-md">Default</span>}
                              <button onClick={() => handleDeletePayment(payment.id)} className="text-error hover:bg-error/10 p-1.5 rounded-full transition-colors">
                                <span className="material-symbols-outlined text-sm">delete</span>
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                      
                      <button 
                        onClick={() => setShowAddPayment(true)}
                        className="w-full py-3 border-2 border-dashed border-outline-variant/50 rounded-xl text-primary font-bold flex items-center justify-center gap-2 hover:bg-primary-container/10 transition-colors"
                      >
                        <span className="material-symbols-outlined">add</span>
                        Add New Card
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeModal === 'address' && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => { setActiveModal(null); setShowAddAddress(false); }}>
                <div className="bg-surface w-full max-w-md rounded-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-headline font-bold text-xl">Address Book</h3>
                    <button onClick={() => { setActiveModal(null); setShowAddAddress(false); }} className="text-on-surface-variant hover:text-on-surface">
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>
                  
                  {showAddAddress ? (
                    <form onSubmit={handleAddAddress} className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold mb-1">Title (e.g., Home, Work)</label>
                        <input 
                          type="text" 
                          required
                          placeholder="Home"
                          className="w-full p-3 rounded-xl bg-surface-container border-none"
                          value={newAddress.title}
                          onChange={e => setNewAddress({...newAddress, title: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold mb-1">Full Address</label>
                        <textarea 
                          required
                          rows={3}
                          placeholder="123 Culinary Avenue, Apt 4B..."
                          className="w-full p-3 rounded-xl bg-surface-container border-none resize-none"
                          value={newAddress.addressLine}
                          onChange={e => setNewAddress({...newAddress, addressLine: e.target.value})}
                        ></textarea>
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setShowAddAddress(false)} className="flex-1 py-3 rounded-xl font-bold bg-surface-container-high text-on-surface">Cancel</button>
                        <button type="submit" className="flex-1 py-3 rounded-xl font-bold bg-primary text-on-primary">Save Address</button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-4">
                      {(!userData.addresses || userData.addresses.length === 0) ? (
                        <p className="text-center text-on-surface-variant py-4">No addresses saved.</p>
                      ) : (
                        userData.addresses.map((address: any, idx: number) => (
                          <div key={address.id || idx} className="flex items-start justify-between p-4 border border-outline-variant/30 rounded-xl bg-surface-container-lowest">
                            <div className="flex items-start gap-3">
                              <span className="material-symbols-outlined text-primary mt-0.5">
                                {address.title.toLowerCase().includes('work') ? 'work' : 'home'}
                              </span>
                              <div>
                                <p className="font-semibold text-sm">{address.title}</p>
                                <p className="text-xs text-on-surface-variant mt-1 leading-relaxed whitespace-pre-line">{address.addressLine}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {address.isDefault && <span className="text-xs font-bold text-primary bg-primary-container/30 px-2 py-1 rounded-md">Default</span>}
                              <button onClick={() => handleDeleteAddress(address.id)} className="text-error hover:bg-error/10 p-1.5 rounded-full transition-colors">
                                <span className="material-symbols-outlined text-sm">delete</span>
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                      
                      <button 
                        onClick={() => setShowAddAddress(true)}
                        className="w-full py-3 border-2 border-dashed border-outline-variant/50 rounded-xl text-primary font-bold flex items-center justify-center gap-2 hover:bg-primary-container/10 transition-colors"
                      >
                        <span className="material-symbols-outlined">add</span>
                        Add New Address
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeModal === 'reviews' && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => { setActiveModal(null); setReviewForm(null); }}>
                <div className="bg-surface w-full max-w-md rounded-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-headline font-bold text-xl">My Reviews</h3>
                    <button onClick={() => { setActiveModal(null); setReviewForm(null); }} className="text-on-surface-variant hover:text-on-surface">
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>

                  {reviewForm ? (
                    <form onSubmit={handleSubmitReview} className="space-y-4">
                      <div className="flex items-center gap-4 mb-4">
                        <img src={reviewForm.productImage} alt={reviewForm.productName} className="w-16 h-16 rounded-xl object-cover" />
                        <div>
                          <p className="font-bold text-on-surface">{reviewForm.productName}</p>
                          <p className="text-xs text-on-surface-variant">Order #{reviewForm.orderId.slice(0, 8).toUpperCase()}</p>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-bold mb-2 text-center">Rating</label>
                        <div className="flex justify-center gap-2">
                          {[1, 2, 3, 4, 5].map(star => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                              className="focus:outline-none"
                            >
                              <span className={`material-symbols-outlined text-3xl ${reviewForm.rating >= star ? 'text-yellow-400' : 'text-outline-variant'}`} style={{ fontVariationSettings: reviewForm.rating >= star ? "'FILL' 1" : "'FILL' 0" }}>
                                star
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold mb-1">Comment</label>
                        <textarea
                          required
                          rows={4}
                          placeholder="What did you think about this dish?"
                          className="w-full p-3 rounded-xl bg-surface-container border-none resize-none"
                          value={reviewForm.comment}
                          onChange={e => setReviewForm({ ...reviewForm, comment: e.target.value })}
                        ></textarea>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setReviewForm(null)} className="flex-1 py-3 rounded-xl font-bold bg-surface-container-high text-on-surface">Cancel</button>
                        <button type="submit" className="flex-1 py-3 rounded-xl font-bold bg-primary text-on-primary">Submit Review</button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-6">
                      {pendingReviews.length > 0 && (
                        <div>
                          <h4 className="font-bold text-sm text-on-surface-variant uppercase tracking-wider mb-3">Pending Reviews</h4>
                          <div className="space-y-3">
                            {pendingReviews.map((pr, idx) => (
                              <div key={`${pr.orderId}-${pr.dishId}-${idx}`} className="flex items-center justify-between p-3 border border-outline-variant/30 rounded-xl bg-surface-container-lowest">
                                <div className="flex items-center gap-3">
                                  <img src={pr.productImage} alt={pr.productName} className="w-12 h-12 rounded-lg object-cover" />
                                  <div>
                                    <p className="font-semibold text-sm">{pr.productName}</p>
                                    <p className="text-[10px] text-on-surface-variant">Delivered {pr.orderDate ? new Date(pr.orderDate.toMillis()).toLocaleDateString() : ''}</p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => setReviewForm({ dishId: pr.dishId, orderId: pr.orderId, rating: 5, comment: '', productName: pr.productName, productImage: pr.productImage })}
                                  className="text-xs font-bold text-primary bg-primary-container/30 px-3 py-1.5 rounded-lg hover:bg-primary-container/50 transition-colors"
                                >
                                  Review
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {pendingReviews.length === 0 && (
                        <div className="text-center py-8">
                          <span className="material-symbols-outlined text-4xl text-on-surface-variant/30 mb-2">rate_review</span>
                          <p className="text-on-surface-variant font-medium">No pending reviews.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : null}
      </main>

      <BottomNav />
    </div>
  );
}
