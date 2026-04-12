import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

export default function TrackOrder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const { user } = useAuth();
  
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [etaText, setEtaText] = useState('Calculating...');
  const [progressWidth, setProgressWidth] = useState(0);

  useEffect(() => {
    if (!order) return;

    if (order.status === 'delivered') {
      setEtaText('Delivered');
      setProgressWidth(100);
      return;
    }

    const calculateEta = () => {
      if (!order.createdAt) {
        setEtaText('Arriving soon');
        setProgressWidth(10);
        return;
      }

      const orderTime = order.createdAt.toMillis();
      const now = Date.now();
      const elapsedMinutes = Math.floor((now - orderTime) / 60000);
      const totalEstimatedMinutes = 30; // 30 mins delivery
      const remainingMinutes = totalEstimatedMinutes - elapsedMinutes;

      if (remainingMinutes > 0) {
        setEtaText(`Arriving in ${remainingMinutes} min`);
        const currentProgress = Math.min(90, Math.max(5, (elapsedMinutes / totalEstimatedMinutes) * 100));
        setProgressWidth(currentProgress);
      } else {
        setEtaText('Arriving soon');
        setProgressWidth(90);
      }
    };

    calculateEta();
    const interval = setInterval(calculateEta, 60000);

    return () => clearInterval(interval);
  }, [order]);

  useEffect(() => {
    if (!orderId || !user) {
      setLoading(false);
      return;
    }

    const docRef = doc(db, 'orders', orderId);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().userId === user.uid) {
        setOrder({ id: docSnap.id, ...docSnap.data() });
      } else {
        console.log("No such document or unauthorized!");
        setOrder(null);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching order:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [orderId, user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface p-6 text-center">
        <span className="material-symbols-outlined text-6xl text-outline mb-4">error</span>
        <h2 className="font-headline text-2xl font-bold text-on-surface mb-2">Order Not Found</h2>
        <p className="text-on-surface-variant mb-6">We couldn't find the order you're looking for.</p>
        <button onClick={() => navigate('/')} className="bg-primary text-on-primary font-bold py-3 px-8 rounded-full">
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="bg-surface min-h-screen pb-32 font-body text-on-background">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-[#fff4f3]/80 dark:bg-stone-950/80 backdrop-blur-xl flex items-center justify-between px-6 py-4 no-border bg-gradient-to-b from-[#fff4f3] to-transparent">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="active:scale-95 duration-200 hover:opacity-70 transition-opacity text-[#b22200]">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-headline font-bold text-lg tracking-tight text-[#b22200]">Track Order</h1>
        </div>
        <div className="flex gap-4">
          <button className="text-[#b22200] active:scale-95 duration-200">
            <span className="material-symbols-outlined">help_outline</span>
          </button>
        </div>
      </header>

      <main className="pt-24 px-6 max-w-2xl mx-auto space-y-8">
        {/* Order Header Card */}
        <section className="bg-surface-container-lowest rounded-xl p-6 shadow-[0_8px_32px_rgba(78,33,35,0.04)]">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-on-surface-variant text-xs font-semibold tracking-widest uppercase mb-1">Order #{order.id.slice(0, 8).toUpperCase()}</p>
              <h2 className="font-headline text-3xl font-extrabold text-on-background">{etaText}</h2>
            </div>
            <div className="bg-primary-container/20 p-3 rounded-full">
              <span className="material-symbols-outlined text-primary scale-125">
                {order.status === 'delivered' ? 'done_all' : 'timer'}
              </span>
            </div>
          </div>
          <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-primary to-primary-fixed h-full rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progressWidth}%` }}
            ></div>
          </div>
        </section>

        {/* Map Snippet */}
        <section className="relative overflow-hidden rounded-xl h-64 shadow-[0_8px_32px_rgba(78,33,35,0.06)] bg-surface-container-high">
          <img className="w-full h-full object-cover opacity-80 mix-blend-multiply" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDB1DHj2DZtz0b7Hg1HCWL23KKoaONcxcOIpKZlG6oAdqAuIBClIit-bZHqBkrNcBei_vRy6gILadmIYMSQedD46zabnSO5j5mIMDAKYYe-cu7paddtCLS4lj6L7n5Qc4Toua1LyTq6fwXh0cYwHRaEf75LS9uyyy80zWwHd3wsHbec1YjzJeWgKgl8rTITix8Ps4TMyHEi95i0skMa9kLARvwBGuRW-N5AiB3KnI62-0X5tt_eJc6tYd1moFNyPo6FPOCuEVLnh-A" alt="Map" />
          <div className="absolute inset-0 bg-gradient-to-t from-surface/40 to-transparent"></div>
          
          {/* Floating Courier Info */}
          <div className="absolute bottom-4 left-4 right-4 bg-surface/90 backdrop-blur-md p-4 rounded-xl flex items-center gap-4 border border-white/20">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary-container">
              <img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuATCPf5KDBViRgkE3IoGlgIJPIXScN03qe67yNhYCAqMEIMQYg73OSrl9O2Ex17FdnO7vqm9l8z9nnD6p3jQrQ8GOHlrhgzxU2_rV_oGiUtzdAHxmJhP76zhVSd3ZcOC99PD_wbvRERoGzjIlIsSke6QrzWXCHLNq6Ok_cUB2zx6UtCS4ptC5ZmcyB5I1BryvPyg1jV8FxQeXgDTk6ZFUMJkMdV-oMcFJDbqqyDLskN5f_mTHzGL2wrD9OREUznRz1DnwdAzSoxrrs" alt="Courier" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-on-surface-variant font-medium">Your Courier</p>
              <p className="font-headline font-bold text-on-surface">Marco Santoro</p>
            </div>
            <div className="flex gap-2">
              <button className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center active:scale-90 transition-transform">
                <span className="material-symbols-outlined text-sm">call</span>
              </button>
              <button className="w-10 h-10 rounded-full bg-surface-container-highest text-primary flex items-center justify-center active:scale-90 transition-transform">
                <span className="material-symbols-outlined text-sm">chat</span>
              </button>
            </div>
          </div>
        </section>

        {/* Vertical Progress Timeline */}
        <section className="space-y-6">
          <h3 className="font-headline text-xl font-bold px-1">Order Status</h3>
          <div className="relative space-y-0 px-2">
            {/* Timeline Vertical Line */}
            <div className="absolute left-[1.375rem] top-4 bottom-4 w-0.5 bg-surface-container-highest"></div>
            
            {(() => {
              const statuses = ['placed', 'preparing', 'out_for_delivery', 'delivered'];
              const statusIndex = statuses.indexOf(order.status || 'placed');
              
              const getStepState = (index: number) => {
                if (statusIndex > index) return 'completed';
                if (statusIndex === index) return 'active';
                return 'pending';
              };

              const renderStep = (
                index: number,
                title: string,
                subtitle: string,
                icon: string,
                isLast: boolean = false
              ) => {
                const state = getStepState(index);
                return (
                  <div key={index} className={`relative flex gap-6 ${isLast ? '' : 'pb-10'} ${state === 'pending' ? 'opacity-40' : ''}`}>
                    <div className={`relative z-10 w-11 h-11 rounded-full flex items-center justify-center ${
                      state === 'completed' ? 'bg-primary text-white shadow-lg' :
                      state === 'active' ? 'bg-primary-container text-on-primary-container ring-4 ring-primary-container/20' :
                      'bg-surface-container-highest text-on-surface-variant'
                    }`}>
                      <span className="material-symbols-outlined" style={state === 'active' ? { fontVariationSettings: "'FILL' 1" } : {}}>
                        {state === 'completed' ? 'check' : icon}
                      </span>
                    </div>
                    <div>
                      <p className={`font-bold ${state === 'active' ? 'text-primary' : 'text-on-surface'}`}>{title}</p>
                      <p className="text-sm text-on-surface-variant">{subtitle}</p>
                    </div>
                  </div>
                );
              };

              return (
                <>
                  {renderStep(0, "Order Placed", "We've received your order", "receipt_long")}
                  {renderStep(1, "Preparing your food", "The chef is crafting your masterpiece", "restaurant")}
                  {renderStep(2, "Out for Delivery", "Estimated at 1:15 PM", "delivery_dining")}
                  {renderStep(3, "Delivered", "Enjoy your meal!", "sports_motorsports", true)}
                </>
              );
            })()}
          </div>
        </section>

        {/* Order Summary Bento */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-surface-container-low p-6 rounded-xl space-y-4">
            <h4 className="font-headline font-bold text-on-surface">Items</h4>
            <div className="space-y-3">
              {order.items.map((item: any, index: number) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm text-on-surface-variant">{item.quantity}x {item.name}</span>
                  <span className="text-sm font-semibold">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-secondary-container/30 p-6 rounded-xl flex flex-col justify-between">
            <div>
              <h4 className="font-headline font-bold text-on-surface">Delivery Address</h4>
              <p className="text-sm text-on-surface-variant mt-2 whitespace-pre-line">
                {order.shippingAddress || "123 Culinary Avenue, Apt 4B\nSan Francisco, CA 94103"}
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-on-secondary-container/10 flex justify-between items-end">
              <div>
                <p className="text-xs uppercase tracking-widest text-on-secondary-container font-bold">Total Paid</p>
                <p className="font-headline text-2xl font-extrabold text-on-secondary-container">${order.total.toFixed(2)}</p>
                {order.pointsDiscount > 0 && (
                  <p className="text-xs font-bold text-primary-container mt-1">
                    Includes ${order.pointsDiscount.toFixed(2)} points discount
                  </p>
                )}
                {order.paymentMethod && (
                  <p className="text-xs font-bold text-on-surface-variant mt-1 capitalize">
                    Paid via: {order.paymentMethod === 'cod' ? 'Cash on Delivery' : order.paymentMethod}
                  </p>
                )}
              </div>
              <span className="material-symbols-outlined text-on-secondary-container/40">receipt_long</span>
            </div>
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
