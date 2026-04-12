import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';

export default function Cart() {
  const navigate = useNavigate();
  const { items, updateQuantity, removeFromCart, total, subtotal, totalDiscount, applyPromoCode } = useCart();
  const { user } = useAuth();
  const [promoInput, setPromoInput] = useState('');
  const [promoMessage, setPromoMessage] = useState('');

  const handleCheckout = async () => {
    if (!user) {
      navigate('/login', { state: { from: { pathname: '/checkout' } } });
    } else {
      navigate('/checkout');
    }
  };

  const handleApplyPromo = () => {
    if (!promoInput.trim()) return;
    const applied = applyPromoCode(promoInput.trim());
    if (applied) {
      setPromoMessage('Promo code applied successfully!');
      setPromoInput('');
    } else {
      setPromoMessage('Invalid promo code or not applicable to items in cart.');
    }
    setTimeout(() => setPromoMessage(''), 3000);
  };

  return (
    <div className="bg-surface text-on-surface min-h-screen pb-32 md:pb-12">
      {/* TopAppBar */}
      <header className="sticky top-0 w-full z-50 bg-[#fff4f3]/80 dark:bg-stone-900/80 backdrop-blur-md border-b border-outline-variant/10">
        <div className="flex items-center justify-between px-6 md:px-8 h-16 md:h-20 w-full max-w-7xl mx-auto">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[#b22200] dark:text-[#ff785a] hover:bg-[#ff785a]/10 transition-colors active:scale-95 duration-200 p-2 rounded-full md:rounded-xl md:px-4">
            <span className="material-symbols-outlined">arrow_back</span>
            <span className="hidden md:inline font-bold">Back</span>
          </button>
          <h1 className="font-headline font-bold text-xl md:text-2xl tracking-tight text-[#b22200] dark:text-[#ff785a]">Your Basket</h1>
          <div className="w-10 md:w-20"></div> {/* Spacer for centering */}
        </div>
      </header>

      <main className="pt-8 md:pt-12 px-6 md:px-8 max-w-7xl mx-auto">
        {items.length === 0 ? (
          <div className="text-center py-20 max-w-md mx-auto">
            <span className="material-symbols-outlined text-6xl text-outline mb-4">shopping_cart</span>
            <h2 className="font-headline text-2xl font-bold text-on-surface mb-2">Your cart is empty</h2>
            <p className="text-on-surface-variant mb-8">Looks like you haven't added anything to your cart yet.</p>
            <Link to="/" className="inline-block bg-primary text-on-primary font-bold py-4 px-8 rounded-full hover:bg-primary/90 transition-colors">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-16">
            {/* Left Column: Cart Items */}
            <div className="w-full lg:w-3/5 space-y-6">
              <h2 className="font-headline font-bold text-2xl hidden lg:block mb-6">Cart Items</h2>
              {items.map(item => (
              <div key={item.id} className="flex items-center gap-6 bg-surface-container-lowest p-4 rounded-xl shadow-sm relative">
                <button onClick={() => removeFromCart(item.id)} className="absolute top-2 right-2 text-on-surface-variant hover:text-error transition-colors">
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
                <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                  <img alt={item.name} className="w-full h-full object-cover" src={item.image} />
                </div>
                <div className="flex-grow flex flex-col justify-between h-24 py-1">
                  <div>
                    <h3 className="font-headline font-bold text-lg leading-tight pr-6">{item.name}</h3>
                    {item.appliedDiscount && (
                      <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                        Discount Applied: -${item.appliedDiscount.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="font-headline font-bold text-primary">
                        ${((item.price - (item.appliedDiscount || 0)) * item.quantity).toFixed(2)}
                      </span>
                      {item.appliedDiscount && (
                        <span className="text-xs text-on-surface-variant line-through">
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center bg-surface-container-low rounded-full px-2 py-1">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-1 hover:bg-surface-variant rounded-full transition-colors"><span className="material-symbols-outlined text-sm">remove</span></button>
                      <span className="px-3 font-bold text-sm">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-1 hover:bg-surface-variant rounded-full transition-colors"><span className="material-symbols-outlined text-sm">add</span></button>
                    </div>
                  </div>
                </div>
              </div>
              ))}
            </div>

            {/* Right Column: Order Summary & Promo */}
            <div className="w-full lg:w-2/5 flex flex-col gap-8">
              {/* Promo Code Section */}
              <section className="space-y-4 bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/20 shadow-sm">
                <h4 className="font-headline font-bold text-lg text-on-surface">Promotions</h4>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input 
                    className="w-full bg-surface-container-highest border-none rounded-xl px-4 md:px-6 py-4 font-body text-sm focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all outline-none" 
                    placeholder="Promo Code" 
                    type="text" 
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                  />
                  <button onClick={handleApplyPromo} className="w-full sm:w-auto px-6 md:px-8 py-4 bg-secondary-container text-on-secondary-container font-headline font-bold rounded-xl hover:bg-secondary-fixed-dim transition-colors active:scale-95 whitespace-nowrap">Apply</button>
                </div>
                {promoMessage && (
                  <p className={`text-sm px-2 ${promoMessage.includes('successfully') ? 'text-primary' : 'text-error'}`}>
                    {promoMessage}
                  </p>
                )}
              </section>

              {/* Order Summary */}
              <section className="bg-surface-container-lowest rounded-3xl p-6 space-y-4 border border-outline-variant/20 shadow-sm sticky top-28">
                <h4 className="font-headline font-bold text-lg text-on-surface mb-4">Order Summary</h4>
                <div className="flex justify-between items-center text-sm font-body">
                  <span className="text-on-surface-variant">Subtotal</span>
                  <span className="font-semibold">${subtotal.toFixed(2)}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between items-center text-sm font-body text-primary">
                    <span>Discount</span>
                    <span className="font-semibold">-${totalDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm font-body">
                  <span className="text-on-surface-variant">Delivery Fee</span>
                  <span className="font-semibold">$5.00</span>
                </div>
                <div className="pt-4 border-t border-outline-variant/20 flex justify-between items-center mb-6">
                  <span className="font-headline font-bold text-lg">Total</span>
                  <span className="font-headline font-extrabold text-2xl text-primary">${(total + 5).toFixed(2)}</span>
                </div>

                {/* Desktop Checkout Button */}
                <button onClick={handleCheckout} className="hidden md:flex w-full bg-gradient-to-r from-primary to-primary-container text-white py-4 rounded-xl font-headline font-bold text-lg shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all items-center justify-center gap-3">
                  Proceed to Checkout
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              </section>
            </div>
          </div>
        )}
      </main>

      {/* Mobile Bottom Action Area */}
      {items.length > 0 && (
        <div className="md:hidden fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-surface via-surface to-transparent pt-12 z-40">
          <div className="max-w-2xl mx-auto">
            <button onClick={handleCheckout} className="w-full bg-gradient-to-r from-primary to-primary-container text-white py-5 rounded-full font-headline font-bold text-lg shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3">
              Proceed to Checkout
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
