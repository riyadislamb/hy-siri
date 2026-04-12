import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import BottomNav from '../components/BottomNav';
import Footer from '../components/Footer';

export default function FreeDelivery() {
  const [dishes, setDishes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [minRating, setMinRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>('default');
  const { addToCart, items } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFreeDeliveryItems = async () => {
      try {
        const dishesQ = query(collection(db, 'dishes'));
        const dishesSnapshot = await getDocs(dishesQ);
        const dishesData = dishesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Filter only items with freeDelivery === true
        const freeDeliveryItems = dishesData.filter((item: any) => item.freeDelivery === true);
        setDishes(freeDeliveryItems);
      } catch (error) {
        console.error("Error fetching free delivery items:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFreeDeliveryItems();
  }, []);

  const cartItemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const filteredDishes = dishes.filter(item => {
    const matchesPrice = item.price >= priceRange[0] && item.price <= priceRange[1];
    const matchesRating = (item.rating || 0) >= minRating;
    return matchesPrice && matchesRating;
  }).sort((a, b) => {
    if (sortBy === 'price_asc') return a.price - b.price;
    if (sortBy === 'price_desc') return b.price - a.price;
    if (sortBy === 'rating_desc') return (b.rating || 0) - (a.rating || 0);
    return 0;
  });

  const maxProductPrice = dishes.length > 0 ? Math.max(...dishes.map(d => d.price)) : 100;
  const maxProductRating = dishes.length > 0 ? Math.max(...dishes.map(d => d.rating || 0)) : 5;

  useEffect(() => {
    if (dishes.length > 0 && priceRange[1] === 1000) {
      setPriceRange([0, Math.ceil(maxProductPrice)]);
    }
  }, [dishes]);

  return (
    <div className="bg-[#f8f9fa] font-body text-on-surface min-h-screen pb-32 md:pb-12">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="flex justify-between items-center px-6 md:px-8 h-16 md:h-20 max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="md:hidden flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
                <span className="material-symbols-outlined text-white text-xl">storefront</span>
              </div>
              <h1 className="font-headline font-extrabold text-lg md:text-xl tracking-tight text-primary flex-shrink-0">SalesHub Enterprise</h1>
            </div>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-gray-500 hover:text-primary transition-colors font-medium text-sm">Home</Link>
            <Link to="/flash-deals" className="text-gray-500 hover:text-primary transition-colors font-medium text-sm">Flash Deals</Link>
            <Link to="/free-delivery" className="text-primary font-bold border-b-2 border-primary pb-1 text-sm">Free Delivery</Link>
            <Link to="/orders" className="text-gray-500 hover:text-primary transition-colors font-medium text-sm">Orders</Link>
          </nav>

          <div className="flex items-center gap-4">
            <Link to="/cart" className="relative text-gray-600 hover:text-gray-900 transition-colors">
              <span className="material-symbols-outlined text-2xl">shopping_bag</span>
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#c62828] text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">{cartItemCount}</span>
              )}
            </Link>
            <Link to="/profile" className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden border border-gray-200 flex items-center justify-center bg-gray-100">
              {user?.photoURL ? (
                <img alt="User Profile" src={user.photoURL} className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-gray-500">person</span>
              )}
            </Link>
          </div>
        </div>
      </header>

      <main className="mt-20 md:mt-28 px-4 md:px-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
        <section className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="font-headline font-bold text-2xl md:text-3xl text-on-surface">
                Free Delivery
              </h2>
              <p className="text-on-surface-variant mt-2 max-w-2xl text-xs md:text-sm">
                Shop our selection of premium items with complimentary shipping.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${showFilters ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}
              >
                <span className="material-symbols-outlined text-[18px]">tune</span>
                Filter
              </button>
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-colors outline-none cursor-pointer appearance-none"
              >
                <option value="default">Sort by: Trending</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="rating_desc">Rating: High to Low</option>
              </select>
            </div>
          </div>

          {showFilters && (
            <div className="bg-surface-container-lowest p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-outline-variant/20 mb-6 animate-in slide-in-from-top-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Price Range */}
                <div>
                  <label className="font-headline font-bold text-sm text-on-surface mb-3 block">Price Range</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" 
                      min="0" 
                      max={Math.ceil(maxProductPrice)} 
                      value={priceRange[1]} 
                      onChange={(e) => setPriceRange([0, parseInt(e.target.value)])}
                      className="w-full accent-primary"
                    />
                    <span className="font-bold text-primary text-sm whitespace-nowrap">Up to ${priceRange[1]}</span>
                  </div>
                </div>

                {/* Minimum Rating */}
                <div>
                  <label className="font-headline font-bold text-sm text-on-surface mb-3 block">Minimum Rating</label>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(new Set([0, 3, 4, 4.5, maxProductRating])).sort((a, b) => a - b).map(rating => (
                      <button
                        key={`rating-${rating}`}
                        onClick={() => setMinRating(rating)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${minRating === rating ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}
                      >
                        {rating === 0 ? 'Any' : `${rating}+ Stars`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">Loading products...</div>
          ) : filteredDishes.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
              <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">local_shipping</span>
              <h3 className="font-headline font-bold text-lg text-gray-900">No items found</h3>
              <p className="text-gray-500 text-sm mt-1">Try adjusting your filters to see more results.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6">
              {filteredDishes.map(item => {
                const hasDiscount = item.originalPrice && item.originalPrice > item.price;
                const discountPercent = hasDiscount ? Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100) : 0;
                
                return (
                <Link key={item.id} to={`/dish/${item.id}`} className="bg-surface-container-lowest rounded-2xl md:rounded-3xl overflow-hidden flex flex-col shadow-sm hover:shadow-xl transition-all duration-300 group border border-outline-variant/20 relative h-[240px] md:h-[280px]">
                  <div className="relative h-[160px] md:h-[186px] overflow-hidden flex-shrink-0">
                    <img alt={item.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" src={item.images?.[0] || 'https://placehold.co/400x300?text=No+Image'} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    <div className="absolute top-2 left-2 md:top-2.5 md:left-2.5 bg-green-100/95 backdrop-blur-md px-1.5 py-0.5 md:px-2 md:py-0.5 rounded-full flex items-center gap-0.5 shadow-sm border border-green-200">
                      <span className="material-symbols-outlined text-[8px] md:text-[10px] text-green-700">local_shipping</span>
                      <span className="text-[8px] md:text-[9px] font-extrabold text-green-800">FREE</span>
                    </div>

                    {item.points > 0 && (
                      <div className="absolute bottom-1 right-1 md:bottom-1.5 md:right-1.5 bg-green-100/95 backdrop-blur-md px-1 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm border border-green-200">
                        <span className="material-symbols-outlined text-[8px] md:text-[10px] text-green-700" style={{ fontSize: '8px' }}>stars</span>
                        <span className="text-[8px] md:text-[10px] font-bold text-green-800">+{item.points}</span>
                      </div>
                    )}
                    {item.stock === 0 && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
                        <span className="bg-error text-on-error text-[10px] font-bold px-2 py-1 rounded-md shadow-lg">Out of Stock</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-2 flex flex-col flex-1 bg-surface-container-lowest relative justify-between">
                    <h4 className="font-headline font-extrabold text-[11px] md:text-xs text-on-surface leading-tight line-clamp-1">{item.name}</h4>
                    
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-headline font-black text-xs md:text-sm text-primary">${item.price.toFixed(2)}</span>
                        {hasDiscount && (
                          <span className="text-[9px] md:text-[10px] text-on-surface-variant line-through">${item.originalPrice.toFixed(2)}</span>
                        )}
                      </div>
                      {item.calories && (
                        <span className="text-[7px] md:text-[8px] font-medium text-on-surface-variant bg-surface-container px-1 py-0.5 rounded-md">{item.calories}</span>
                      )}
                    </div>
                    
                    <button 
                      className={`w-full py-1.5 mt-1.5 rounded-lg text-[10px] md:text-[11px] font-bold transition-colors flex items-center justify-center gap-1 ${item.stock === 0 ? 'bg-surface-container-high text-on-surface-variant cursor-not-allowed' : 'bg-primary text-on-primary hover:bg-primary/90'}`}
                      onClick={(e) => {
                        e.preventDefault();
                        if (item.stock !== 0) {
                          addToCart({ ...item, image: item.images?.[0] || '', quantity: 1, points: item.points || 0 });
                        }
                      }}
                      disabled={item.stock === 0}
                    >
                      <span className="material-symbols-outlined text-[12px] md:text-[14px]">shopping_cart</span>
                      Add to Cart
                    </button>
                  </div>
                </Link>
              )})}
            </div>
          )}
        </section>
      </main>

      <BottomNav />
      <Footer />
    </div>
  );
}
