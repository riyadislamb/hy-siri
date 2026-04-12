import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { collection, addDoc, serverTimestamp, doc, getDoc, setDoc, increment, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export default function Checkout() {
  const navigate = useNavigate();
  const { items, total, subtotal, totalDiscount, clearCart, applyPromoCode } = useCart();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const [promoMessage, setPromoMessage] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('manual');
  const [curatorPoints, setCuratorPoints] = useState(0);
  const [usePoints, setUsePoints] = useState(false);
  const [globalPromoDiscount, setGlobalPromoDiscount] = useState(0);
  const [merchantNumbers, setMerchantNumbers] = useState({ bkash: '017XXXXXXXX', nagad: '016XXXXXXXX', visa: '' });
  const [paymentMethod, setPaymentMethod] = useState('bkash');
  const [paymentDetails, setPaymentDetails] = useState({
    bkashNumber: '',
    bkashTrxId: '',
    nagadNumber: '',
    nagadTrxId: '',
    cardNumber: '',
    cardExpiry: '',
    cardCvc: '',
  });

  const deliveryFee = 2.50;
  const tax = total * 0.05; // 5% tax on discounted total
  
  // Points logic: 10 points = $1 discount
  const maxPointsDiscount = curatorPoints / 10;
  const subtotalWithFees = total + deliveryFee + tax;
  const pointsDiscount = usePoints ? Math.min(maxPointsDiscount, subtotalWithFees) : 0;
  const pointsUsed = pointsDiscount * 10;
  
  const finalTotal = Math.max(0, subtotalWithFees - pointsDiscount - globalPromoDiscount);

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.addresses) {
              setSavedAddresses(data.addresses);
              const defaultAddr = data.addresses.find((a: any) => a.isDefault);
              if (defaultAddr) {
                setSelectedAddressId(defaultAddr.id);
                setShippingAddress(defaultAddr.addressLine);
              } else if (data.addresses.length > 0) {
                setSelectedAddressId(data.addresses[0].id);
                setShippingAddress(data.addresses[0].addressLine);
              }
            }
            
            // Set points
            const points = data.curatorPoints !== undefined ? data.curatorPoints : (data.totalOrdersPlaced || 0) * 10;
            setCuratorPoints(points);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }

        // Fetch payment settings
        try {
          const settingsRef = doc(db, 'settings', 'paymentMethods');
          const settingsSnap = await getDoc(settingsRef);
          if (settingsSnap.exists()) {
            const settingsData = settingsSnap.data();
            setMerchantNumbers({
              bkash: settingsData.bkashNumber || '017XXXXXXXX',
              nagad: settingsData.nagadNumber || '016XXXXXXXX',
              visa: settingsData.visaNumber || ''
            });
          }
        } catch (error) {
          console.error("Error fetching payment settings:", error);
        }
      }
    };
    fetchUserData();
  }, [user]);

  const handleAddressSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedAddressId(val);
    if (val === 'manual') {
      setShippingAddress('');
    } else {
      const addr = savedAddresses.find(a => a.id === val);
      if (addr) setShippingAddress(addr.addressLine);
    }
  };

  const handlePlaceOrder = async () => {
    if (!user) {
      alert("Please log in to place an order.");
      navigate('/profile');
      return;
    }

    if (items.length === 0) {
      alert("Your cart is empty.");
      return;
    }

    if (!shippingAddress.trim()) {
      alert("Please provide a shipping address.");
      return;
    }

    const phoneRegex = /^01[3-9]\d{8}$/;
    const trxIdRegex = /^[A-Z0-9]{8,12}$/i;

    if (paymentMethod === 'bkash') {
      if (!phoneRegex.test(paymentDetails.bkashNumber)) {
        alert("Please enter a valid 11-digit bKash number (e.g., 017XXXXXXXX).");
        return;
      }
      if (!trxIdRegex.test(paymentDetails.bkashTrxId)) {
        alert("Please enter a valid bKash Transaction ID (8-12 alphanumeric characters).");
        return;
      }
    }
    
    if (paymentMethod === 'nagad') {
      if (!phoneRegex.test(paymentDetails.nagadNumber)) {
        alert("Please enter a valid 11-digit Nagad number (e.g., 016XXXXXXXX).");
        return;
      }
      if (!trxIdRegex.test(paymentDetails.nagadTrxId)) {
        alert("Please enter a valid Nagad Transaction ID (8-12 alphanumeric characters).");
        return;
      }
    }

    if (paymentMethod === 'card') {
      const cleanCard = paymentDetails.cardNumber.replace(/\s/g, '');
      if (cleanCard.length < 15 || cleanCard.length > 16) {
        alert("Please enter a valid 15 or 16 digit Card number.");
        return;
      }
      if (!/^\d{2}\/\d{2}$/.test(paymentDetails.cardExpiry)) {
        alert("Please enter a valid expiry date (MM/YY).");
        return;
      }
      if (paymentDetails.cardCvc.length < 3) {
        alert("Please enter a valid 3 or 4 digit CVC.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const orderData = {
        userId: user.uid,
        items: items,
        subtotal: subtotal,
        discount: totalDiscount + globalPromoDiscount,
        pointsDiscount: pointsDiscount,
        deliveryFee: deliveryFee,
        tax: tax,
        total: finalTotal,
        status: 'placed',
        shippingAddress: shippingAddress.trim(),
        paymentMethod: paymentMethod,
        paymentDetails: paymentMethod === 'cod' ? null : paymentDetails,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'orders'), orderData);
      
      const pointsEarned = items.reduce((sum, item) => sum + (item.points || 0) * item.quantity, 0);
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { 
        totalOrdersPlaced: increment(1),
        curatorPoints: increment(pointsEarned - pointsUsed)
      }, { merge: true });

      clearCart();
      navigate('/track?orderId=' + docRef.id);
    } catch (error) {
      console.error("Error placing order:", error);
      alert("There was an error placing your order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    
    try {
      const q = query(collection(db, 'promoCodes'), where('code', '==', promoInput.trim().toUpperCase()), where('isActive', '==', true));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const promoData = snap.docs[0].data();
        setGlobalPromoDiscount(promoData.discount);
        setPromoMessage(`Promo code applied! $${promoData.discount.toFixed(2)} off.`);
        setPromoInput('');
      } else {
        // Fallback to item-specific promo
        const applied = applyPromoCode(promoInput.trim());
        if (applied) {
          setPromoMessage('Item promo code applied successfully!');
          setPromoInput('');
        } else {
          setPromoMessage('Invalid promo code or not applicable.');
        }
      }
    } catch (error) {
      console.error("Error applying promo:", error);
      setPromoMessage('Error verifying promo code');
    }
    
    setTimeout(() => setPromoMessage(''), 3000);
  };

  const totalPointsToEarn = items.reduce((sum, item) => sum + (item.points || 0) * item.quantity, 0);

  if (!user) {
    return (
      <div className="bg-background text-on-background min-h-screen flex flex-col items-center justify-center p-6 text-center font-body">
        <div className="bg-surface-container-lowest p-8 rounded-3xl shadow-sm border border-outline-variant/20 max-w-sm w-full">
          <span className="material-symbols-outlined text-6xl text-primary mb-4">lock</span>
          <h2 className="font-headline text-2xl font-bold mb-2">Login Required</h2>
          <p className="text-on-surface-variant mb-8">Please sign in to complete your purchase securely.</p>
          <button 
            onClick={() => navigate('/login', { state: { from: { pathname: '/checkout' } } })} 
            className="w-full bg-primary text-on-primary px-6 py-4 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-primary/90 transition-colors"
          >
            <span className="material-symbols-outlined">login</span>
            Sign in to continue
          </button>
          <button 
            onClick={() => navigate(-1)} 
            className="w-full mt-4 text-on-surface-variant font-bold text-sm hover:text-primary transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background text-on-background font-body selection:bg-primary-container selection:text-on-primary-container min-h-screen pb-32 md:pb-12">
      {/* TopAppBar */}
      <nav className="sticky top-0 w-full z-50 bg-[#fff4f3]/80 dark:bg-stone-950/80 backdrop-blur-xl flex items-center justify-between px-6 md:px-8 py-4 md:py-6 border-b border-outline-variant/10">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div onClick={() => navigate(-1)} className="flex items-center gap-2 active:scale-95 duration-200 cursor-pointer hover:bg-primary/10 p-2 rounded-xl transition-colors">
            <span className="material-symbols-outlined text-[#b22200] dark:text-[#ff785a]">arrow_back</span>
            <span className="hidden md:inline font-bold text-[#b22200] dark:text-[#ff785a]">Back</span>
          </div>
          <h1 className="font-headline font-bold text-xl md:text-2xl tracking-tight text-[#b22200] dark:text-[#ff785a]">Checkout</h1>
          <div className="w-10 md:w-20"></div> {/* Spacer for centering */}
        </div>
      </nav>

      <main className="pt-8 md:pt-12 px-6 md:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-16">
          {/* Left Column: Form */}
          <div className="w-full lg:w-3/5 space-y-10">
            {/* Delivery Section */}
        <section className="space-y-4">
          <h2 className="font-headline text-2xl font-bold tracking-tight text-on-surface">Shipping Address *</h2>
          <div className="bg-surface-container-lowest p-6 rounded-xl editorial-shadow border border-outline-variant/10">
            {savedAddresses.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2 text-on-surface-variant">Select Saved Address</label>
                <select 
                  className="w-full bg-surface-container border-none rounded-xl p-3 focus:ring-2 focus:ring-primary/20 transition-all outline-none font-body text-on-surface"
                  value={selectedAddressId}
                  onChange={handleAddressSelect}
                >
                  <option value="manual">Enter a new address manually</option>
                  {savedAddresses.map(addr => (
                    <option key={addr.id} value={addr.id}>
                      {addr.title} - {addr.addressLine.substring(0, 30)}{addr.addressLine.length > 30 ? '...' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex gap-4">
              <div className="bg-primary-container/10 p-3 rounded-full h-fit">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
              </div>
              <div className="w-full">
                <textarea 
                  className="w-full bg-surface-container border-none rounded-xl p-4 focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-none font-body text-on-surface" 
                  placeholder="Enter your full delivery address (e.g., House No, Street, Area, City)" 
                  rows={3}
                  value={shippingAddress}
                  onChange={(e) => {
                    setShippingAddress(e.target.value);
                    if (selectedAddressId !== 'manual') {
                      setSelectedAddressId('manual');
                    }
                  }}
                  required
                ></textarea>
              </div>
            </div>
          </div>
        </section>

        {/* Payment Method Section */}
        <section className="space-y-4">
          <h2 className="font-headline text-2xl font-bold tracking-tight text-on-surface">Payment Method</h2>
          <div className="space-y-3">
            {/* bKash Option */}
            <div className={`bg-surface-container-lowest rounded-xl border-2 transition-all ${paymentMethod === 'bkash' ? 'border-primary/50 shadow-sm' : 'border-transparent hover:bg-surface-container-low'}`}>
              <label className="flex items-center justify-between p-5 cursor-pointer">
                <input 
                  className="hidden peer" 
                  name="payment" 
                  type="radio" 
                  checked={paymentMethod === 'bkash'}
                  onChange={() => setPaymentMethod('bkash')}
                />
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[#e2136e]/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#e2136e]" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance_wallet</span>
                  </div>
                  <div>
                    <p className="font-bold text-on-surface">bKash</p>
                    <p className="text-xs text-on-surface-variant">Instant mobile payment</p>
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${paymentMethod === 'bkash' ? 'border-primary bg-primary' : 'border-outline-variant'}`}>
                  <div className={`w-2 h-2 rounded-full bg-white transition-opacity ${paymentMethod === 'bkash' ? 'opacity-100' : 'opacity-0'}`}></div>
                </div>
              </label>
              {paymentMethod === 'bkash' && (
                <div className="px-5 pb-5 pt-2 border-t border-outline-variant/10 mt-2 animate-in slide-in-from-top-2">
                  <p className="text-sm text-on-surface-variant mb-4">Please send <span className="font-bold text-primary">${finalTotal.toFixed(2)}</span> to our bKash Merchant Number: <span className="font-bold text-on-surface">{merchantNumbers.bkash}</span> and enter the details below.</p>
                  <div className="space-y-3">
                    <input 
                      type="text" 
                      placeholder="Your bKash Account Number" 
                      className="w-full bg-surface-container border-none rounded-xl p-3 focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                      value={paymentDetails.bkashNumber}
                      onChange={e => setPaymentDetails({...paymentDetails, bkashNumber: e.target.value})}
                    />
                    <input 
                      type="text" 
                      placeholder="Transaction ID (TrxID)" 
                      className="w-full bg-surface-container border-none rounded-xl p-3 focus:ring-2 focus:ring-primary/20 outline-none text-sm uppercase"
                      value={paymentDetails.bkashTrxId}
                      onChange={e => setPaymentDetails({...paymentDetails, bkashTrxId: e.target.value.toUpperCase()})}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Nagad Option */}
            <div className={`bg-surface-container-lowest rounded-xl border-2 transition-all ${paymentMethod === 'nagad' ? 'border-primary/50 shadow-sm' : 'border-transparent hover:bg-surface-container-low'}`}>
              <label className="flex items-center justify-between p-5 cursor-pointer">
                <input 
                  className="hidden peer" 
                  name="payment" 
                  type="radio" 
                  checked={paymentMethod === 'nagad'}
                  onChange={() => setPaymentMethod('nagad')}
                />
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[#f7931e]/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#f7931e]" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance_wallet</span>
                  </div>
                  <div>
                    <p className="font-bold text-on-surface">Nagad</p>
                    <p className="text-xs text-on-surface-variant">Instant mobile payment</p>
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${paymentMethod === 'nagad' ? 'border-primary bg-primary' : 'border-outline-variant'}`}>
                  <div className={`w-2 h-2 rounded-full bg-white transition-opacity ${paymentMethod === 'nagad' ? 'opacity-100' : 'opacity-0'}`}></div>
                </div>
              </label>
              {paymentMethod === 'nagad' && (
                <div className="px-5 pb-5 pt-2 border-t border-outline-variant/10 mt-2 animate-in slide-in-from-top-2">
                  <p className="text-sm text-on-surface-variant mb-4">Please send <span className="font-bold text-primary">${finalTotal.toFixed(2)}</span> to our Nagad Merchant Number: <span className="font-bold text-on-surface">{merchantNumbers.nagad}</span> and enter the details below.</p>
                  <div className="space-y-3">
                    <input 
                      type="text" 
                      placeholder="Your Nagad Account Number" 
                      className="w-full bg-surface-container border-none rounded-xl p-3 focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                      value={paymentDetails.nagadNumber}
                      onChange={e => setPaymentDetails({...paymentDetails, nagadNumber: e.target.value})}
                    />
                    <input 
                      type="text" 
                      placeholder="Transaction ID (TrxID)" 
                      className="w-full bg-surface-container border-none rounded-xl p-3 focus:ring-2 focus:ring-primary/20 outline-none text-sm uppercase"
                      value={paymentDetails.nagadTrxId}
                      onChange={e => setPaymentDetails({...paymentDetails, nagadTrxId: e.target.value.toUpperCase()})}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Card Option */}
            <div className={`bg-surface-container-lowest rounded-xl border-2 transition-all ${paymentMethod === 'card' ? 'border-primary/50 shadow-sm' : 'border-transparent hover:bg-surface-container-low'}`}>
              <label className="flex items-center justify-between p-5 cursor-pointer">
                <input 
                  className="hidden peer" 
                  name="payment" 
                  type="radio" 
                  checked={paymentMethod === 'card'}
                  onChange={() => setPaymentMethod('card')}
                />
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-on-background/5 flex items-center justify-center">
                    <span className="material-symbols-outlined text-on-surface-variant">credit_card</span>
                  </div>
                  <div>
                    <p className="font-bold text-on-surface">Credit/Debit Card</p>
                    <div className="flex gap-2 mt-1">
                      <div className="bg-surface-container px-1.5 py-0.5 rounded text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Visa</div>
                      <div className="bg-surface-container px-1.5 py-0.5 rounded text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Mastercard</div>
                    </div>
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${paymentMethod === 'card' ? 'border-primary bg-primary' : 'border-outline-variant'}`}>
                  <div className={`w-2 h-2 rounded-full bg-white transition-opacity ${paymentMethod === 'card' ? 'opacity-100' : 'opacity-0'}`}></div>
                </div>
              </label>
              {paymentMethod === 'card' && (
                <div className="px-5 pb-5 pt-2 border-t border-outline-variant/10 mt-2 animate-in slide-in-from-top-2">
                  {merchantNumbers.visa && (
                    <p className="text-sm text-on-surface-variant mb-4">Merchant Visa/Mastercard: <span className="font-bold text-on-surface">{merchantNumbers.visa}</span></p>
                  )}
                  <div className="space-y-3">
                    <input 
                      type="text" 
                      placeholder="Card Number" 
                      maxLength={19}
                      className="w-full bg-surface-container border-none rounded-xl p-3 focus:ring-2 focus:ring-primary/20 outline-none text-sm font-mono"
                      value={paymentDetails.cardNumber}
                      onChange={e => {
                        // Basic formatting for card number (groups of 4)
                        const val = e.target.value.replace(/\D/g, '');
                        const formatted = val.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
                        setPaymentDetails({...paymentDetails, cardNumber: formatted});
                      }}
                    />
                    <div className="flex gap-3">
                      <input 
                        type="text" 
                        placeholder="MM/YY" 
                        maxLength={5}
                        className="w-1/2 bg-surface-container border-none rounded-xl p-3 focus:ring-2 focus:ring-primary/20 outline-none text-sm font-mono"
                        value={paymentDetails.cardExpiry}
                        onChange={e => {
                          let val = e.target.value.replace(/\D/g, '');
                          if (val.length > 2) {
                            val = val.substring(0, 2) + '/' + val.substring(2, 4);
                          }
                          setPaymentDetails({...paymentDetails, cardExpiry: val});
                        }}
                      />
                      <input 
                        type="text" 
                        placeholder="CVC" 
                        maxLength={4}
                        className="w-1/2 bg-surface-container border-none rounded-xl p-3 focus:ring-2 focus:ring-primary/20 outline-none text-sm font-mono"
                        value={paymentDetails.cardCvc}
                        onChange={e => setPaymentDetails({...paymentDetails, cardCvc: e.target.value.replace(/\D/g, '')})}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Cash Option */}
            <div className={`bg-surface-container-lowest rounded-xl border-2 transition-all ${paymentMethod === 'cod' ? 'border-primary/50 shadow-sm' : 'border-transparent hover:bg-surface-container-low'}`}>
              <label className="flex items-center justify-between p-5 cursor-pointer">
                <input 
                  className="hidden peer" 
                  name="payment" 
                  type="radio" 
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                />
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/5 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">payments</span>
                  </div>
                  <div>
                    <p className="font-bold text-on-surface">Cash on Delivery</p>
                    <p className="text-xs text-on-surface-variant">Pay when you receive</p>
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${paymentMethod === 'cod' ? 'border-primary bg-primary' : 'border-outline-variant'}`}>
                  <div className={`w-2 h-2 rounded-full bg-white transition-opacity ${paymentMethod === 'cod' ? 'opacity-100' : 'opacity-0'}`}></div>
                </div>
              </label>
            </div>
          </div>
        </section>

          </div>

          {/* Right Column: Order Summary */}
          <div className="w-full lg:w-2/5 flex flex-col gap-8">
            {/* Order Summary Section */}
            <section className="space-y-4 sticky top-28">
              <h2 className="font-headline text-2xl font-bold tracking-tight text-on-surface">Order Summary</h2>
              <div className="bg-surface-container-low rounded-2xl overflow-hidden">
                <div className="p-6 space-y-6">
                  {items.map(item => (
                    <div key={item.id} className="flex justify-between items-start">
                      <div className="flex gap-4">
                        <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                          <img className="w-full h-full object-cover" src={item.image} alt={item.name} />
                        </div>
                        <div>
                          <h3 className="font-headline font-bold text-on-surface">{item.name}</h3>
                          <div className="flex flex-col mt-1">
                            <span className="text-primary font-bold">
                              ${(item.price - (item.appliedDiscount || 0)).toFixed(2)}
                            </span>
                            {item.appliedDiscount && (
                              <span className="text-xs text-on-surface-variant line-through">
                                ${item.price.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="font-label font-bold text-on-surface-variant bg-surface-container px-2 py-1 rounded-md text-xs">x{item.quantity}</span>
                    </div>
                  ))}
                </div>

                {/* Price Breakdown */}
                <div className="border-t border-outline-variant/20 p-6 space-y-3 bg-surface-container-lowest/50">
                  <div className="flex justify-between text-on-surface-variant text-sm">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  {(totalDiscount > 0 || globalPromoDiscount > 0) && (
                    <div className="flex justify-between text-primary text-sm font-bold">
                      <span>Discount</span>
                      <span>-${(totalDiscount + globalPromoDiscount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-on-surface-variant text-sm">
                    <span>Delivery Fee</span>
                    <span>${deliveryFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-on-surface-variant text-sm">
                    <span>Tax</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  {curatorPoints > 0 && (
                    <div className="pt-3 mt-3 border-t border-outline-variant/20">
                      <label className="flex items-center justify-between cursor-pointer group">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary-container text-lg">stars</span>
                          <span className="text-sm font-bold text-on-surface">Use Curator Points ({curatorPoints})</span>
                        </div>
                        <div className="relative">
                          <input type="checkbox" className="sr-only peer" checked={usePoints} onChange={(e) => setUsePoints(e.target.checked)} />
                          <div className="w-11 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </div>
                      </label>
                      {usePoints && pointsDiscount > 0 && (
                        <div className="flex justify-between text-primary-container text-sm font-bold mt-2">
                          <span>Points Discount</span>
                          <span>-${pointsDiscount.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="pt-3 mt-3 border-t border-outline-variant/20 flex justify-between items-center">
                    <span className="font-headline font-bold text-xl text-on-surface">Total Price</span>
                    <span className="font-headline font-extrabold text-2xl text-primary">${finalTotal.toFixed(2)}</span>
                  </div>
                  {totalPointsToEarn > 0 && (
                    <div className="flex justify-between text-green-600 text-sm font-bold mt-2">
                      <span>Points to Earn</span>
                      <span>+{totalPointsToEarn} pts</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Promo Code Field */}
              <div className="relative group mt-6">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant">sell</span>
                <input 
                  className="w-full bg-surface-container-highest/50 border-none rounded-xl py-4 pl-12 pr-24 focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all placeholder:text-on-surface-variant/60 font-medium outline-none" 
                  placeholder="Add a promo code" 
                  type="text" 
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                />
                <button onClick={handleApplyPromo} className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-on-surface text-surface rounded-lg text-xs font-bold uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all">Apply</button>
              </div>
              {promoMessage && (
                <p className={`text-sm px-2 mt-2 ${promoMessage.includes('successfully') ? 'text-primary' : 'text-error'}`}>
                  {promoMessage}
                </p>
              )}

              {/* Desktop Place Order Button */}
              <div className="hidden md:block mt-8">
                <button 
                  onClick={handlePlaceOrder}
                  disabled={isSubmitting || items.length === 0}
                  className="w-full bg-gradient-to-r from-primary to-primary-container text-on-primary py-4 rounded-xl font-headline font-extrabold text-lg shadow-lg active:scale-[0.98] transition-all hover:shadow-primary-container/20 hover:shadow-xl flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Processing...' : 'Place Order'}
                </button>
                <p className="text-center text-[10px] text-on-surface-variant uppercase tracking-[0.2em] font-bold mt-4 opacity-60">
                  Secure 256-bit encrypted payment
                </p>
              </div>

            </section>
          </div>
        </div>
      </main>

      {/* Mobile Fixed Bottom Action Bar */}
      <div className="md:hidden fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-background via-background to-transparent z-40">
        <div className="max-w-2xl mx-auto">
          <button 
            onClick={handlePlaceOrder}
            disabled={isSubmitting || items.length === 0}
            className="w-full bg-gradient-to-r from-primary to-primary-container text-on-primary py-5 rounded-full font-headline font-extrabold text-lg shadow-lg active:scale-[0.98] transition-all hover:shadow-primary-container/20 hover:shadow-2xl flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Processing...' : 'Place Order'}
          </button>
          <p className="text-center text-[10px] text-on-surface-variant uppercase tracking-[0.2em] font-bold mt-4 opacity-60">
            Secure 256-bit encrypted payment
          </p>
        </div>
      </div>

      {/* Background Decor */}
      <div className="fixed -top-24 -right-24 w-96 h-96 bg-primary-container/5 rounded-full blur-[100px] pointer-events-none z-[-1]"></div>
      <div className="fixed -bottom-24 -left-24 w-96 h-96 bg-secondary-fixed/10 rounded-full blur-[100px] pointer-events-none z-[-1]"></div>
    </div>
  );
}
