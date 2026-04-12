import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { GoogleGenAI } from '@google/genai';
import { collection, query, getDocs, limit, startAfter, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import Footer from '../components/Footer';

const featuredCards = [
  {
    id: 1,
    tag: "Chef's Pick",
    title: "The Artisan Harvest Bowl",
    desc: "Locally sourced seasonal greens with smoked tahini dressing.",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAlwNUPdJfSMJoiJyQA0evGU4PxbnKnDHyT8covkuo6QplAbDGAsrP9bKMgFtrZvQHcv-4uf2x0fff-m8c_snbLG54q_uRB-emibrCEIOVAvriTX7dhCvQbNMTXC-tRr9G80gNgdR32FwUTDlKY2LFer0Tw1kYTMpvkqMrZylU6i_A7I_Qo6vGNRhMMZaZoOeHKmGW8Y09g3MJu7o753sDFjslCGaw-zCyFjlYah-Udam70UunR8_u5OIgIS4Z_u6dxbSnCqKxadCw"
  },
  {
    id: 2,
    tag: "Trending",
    title: "Spicy Miso Ramen",
    desc: "Rich pork broth, chashu, soft boiled egg, and fresh scallions.",
    img: "https://images.unsplash.com/photo-1557872943-16a5ac26437e?q=80&w=1000&auto=format&fit=crop"
  },
  {
    id: 3,
    tag: "New Arrival",
    title: "Truffle Mushroom Risotto",
    desc: "Creamy arborio rice with wild mushrooms and truffle oil.",
    img: "https://images.unsplash.com/photo-1626200419199-391ae4be7a41?q=80&w=1000&auto=format&fit=crop"
  },
  {
    id: 4,
    tag: "Limited Time",
    title: "Sizzling Fajita Platter",
    desc: "Grilled steak, peppers, and onions served with warm tortillas.",
    img: "https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?q=80&w=1000&auto=format&fit=crop"
  }
];

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingImage, setIsSearchingImage] = useState(false);
  const [dishes, setDishes] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(20);
  
  // Advanced Filters
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [minRating, setMinRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>('default');
  const [showFilters, setShowFilters] = useState(false);

  const { addToCart, items } = useCart();
  const { user } = useAuth();
  const carouselRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      if (carouselRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          // Reset to start
          carouselRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          // Scroll by one card width
          carouselRef.current.scrollBy({ left: clientWidth, behavior: 'smooth' });
        }
      }
    }, 4000); // 4 seconds

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const dishesQ = query(collection(db, 'dishes'), limit(20));
        const dishesSnapshot = await getDocs(dishesQ);
        const dishesData = dishesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setDishes(dishesData);

        if (dishesSnapshot.docs.length < 20) {
          setHasMore(false);
        } else {
          setLastVisible(dishesSnapshot.docs[dishesSnapshot.docs.length - 1]);
        }

        const categoriesQ = query(collection(db, 'categories'));
        const categoriesSnapshot = await getDocs(categoriesQ);
        const categoriesData = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCategories(categoriesData);

        const bannersQ = query(collection(db, 'banners'));
        const bannersSnapshot = await getDocs(bannersQ);
        const bannersData = bannersSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((b: any) => b.isActive !== false);
        setBanners(bannersData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const loadMoreDishes = async () => {
    if (!lastVisible || loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    try {
      const dishesQ = query(collection(db, 'dishes'), startAfter(lastVisible), limit(20));
      const dishesSnapshot = await getDocs(dishesQ);
      
      const newDishesData = dishesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDishes(prev => [...prev, ...newDishesData]);
      
      if (dishesSnapshot.docs.length < 20) {
        setHasMore(false);
      } else {
        setLastVisible(dishesSnapshot.docs[dishesSnapshot.docs.length - 1]);
      }
    } catch (error) {
      console.error("Error fetching more dishes:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  const filteredItems = dishes.filter(item => {
    if (item.stock === 0) return false;
    const matchesSearch = searchQuery ? 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (Array.isArray(item.category) ? item.category.some((c: string) => c.toLowerCase().includes(searchQuery.toLowerCase())) : (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase()))) 
      : true;
    const matchesPrice = item.price >= priceRange[0] && item.price <= priceRange[1];
    const matchesRating = (item.rating || 0) >= minRating;
    return matchesSearch && matchesPrice && matchesRating;
  }).sort((a, b) => {
    if (sortBy === 'price_asc') return a.price - b.price;
    if (sortBy === 'price_desc') return b.price - a.price;
    if (sortBy === 'rating_desc') return (b.rating || 0) - (a.rating || 0);
    return 0; // default
  });

  const displayItems = filteredItems.flatMap(item => {
    const count = 1 + (item.repostCount || 0);
    return Array.from({ length: count }, (_, i) => ({
      ...item,
      uniqueId: `${item.id}-${i}`
    }));
  });

  const maxProductPrice = dishes.length > 0 ? Math.max(...dishes.map(d => d.price)) : 100;
  const maxProductRating = dishes.length > 0 ? Math.max(...dishes.map(d => d.rating || 0)) : 5;

  const visibleDisplayItems = displayItems.slice(0, displayLimit);

  // Initialize max price dynamically when dishes load
  useEffect(() => {
    if (dishes.length > 0 && priceRange[1] === 1000) {
      setPriceRange([0, Math.ceil(maxProductPrice)]);
    }
  }, [dishes]);

  const handleLoadMore = async () => {
    if (displayLimit < displayItems.length) {
      setDisplayLimit(prev => prev + 20);
    } 
    
    if (hasMore && displayLimit + 20 >= displayItems.length) {
      await loadMoreDishes();
    }
  };

  const cartItemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleImageSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSearchingImage(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: file.type,
                  data: base64Data
                }
              },
              {
                text: "Identify the main food item in this image. Respond with ONLY the name of the food, nothing else. Keep it short (1-3 words)."
              }
            ]
          }
        });
        
        if (response.text) {
          setSearchQuery(response.text.trim());
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error during image search:", error);
      alert("Failed to analyze image. Please try again.");
    } finally {
      setIsSearchingImage(false);
    }
  };

  return (
    <div className="bg-surface font-body text-on-surface min-h-screen pb-32 md:pb-12">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-orange-50/80 dark:bg-stone-900/80 backdrop-blur-md border-b border-outline-variant/10">
        <div className="flex justify-between items-center px-6 md:px-8 h-16 md:h-20 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-white text-xl">storefront</span>
            </div>
            <h1 className="font-headline font-extrabold text-lg md:text-xl tracking-tight text-primary flex-shrink-0">SalesHub Enterprise</h1>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-primary font-bold hover:text-primary-dim transition-colors text-sm">Home</Link>
            <Link to="/orders" className="text-on-surface-variant hover:text-primary transition-colors font-medium text-sm">Orders</Link>
            <Link to="/favorites" className="text-on-surface-variant hover:text-primary transition-colors font-medium text-sm">Favorites</Link>
            <Link to="/reviews" className="text-on-surface-variant hover:text-primary transition-colors font-medium text-sm">Reviews</Link>
            <Link to="/cart" className="text-on-surface-variant hover:text-primary transition-colors font-medium flex items-center gap-1 text-sm">
              Cart
              {cartItemCount > 0 && (
                <span className="bg-primary text-on-primary text-[10px] font-bold px-2 py-0.5 rounded-full">{cartItemCount}</span>
              )}
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {!user ? (
              <div className="hidden md:flex items-center gap-3">
                <button onClick={() => navigate('/login')} className="text-xs font-semibold text-[#595c5b] hover:text-[#176a21] transition-all">Log In</button>
                <button onClick={() => navigate('/login', { state: { isSignup: true } })} className="text-xs font-semibold text-[#176a21] bg-[#9df197]/30 px-4 py-1.5 rounded-full hover:bg-[#9df197]/50 transition-all">Sign Up</button>
              </div>
            ) : null}
            <Link to="/profile" className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden border-2 border-primary-container active:scale-95 duration-200 flex items-center justify-center bg-surface-container hover:border-primary transition-colors">
              {user?.photoURL ? (
                <img alt="User Profile" src={user.photoURL} className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-on-surface-variant">person</span>
              )}
            </Link>
          </div>
        </div>
      </header>

      <main className="mt-20 md:mt-28 px-6 md:px-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
        <div className="space-y-3">
          {/* Featured Slider */}
          {!searchQuery && (banners.length > 0 || featuredCards.length > 0) && (
            <section className="relative w-full">
              <div 
                ref={carouselRef}
                className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide gap-4 pb-2"
              >
              {(banners.length > 0 ? banners : featuredCards).map(card => (
                <div 
                  key={card.id} 
                  className="relative flex-shrink-0 w-full md:w-[80%] lg:w-[60%] aspect-[16/9] md:aspect-[21/9] rounded-2xl overflow-hidden bg-primary-dim group snap-center cursor-pointer"
                  onClick={() => {
                    if (card.link) {
                      navigate(card.link);
                    }
                  }}
                >
                  <img alt={card.title} className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-80 group-hover:scale-105 transition-transform duration-700" src={card.image || card.img} />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/40 to-transparent flex flex-col justify-end p-6 md:p-8 space-y-2">
                    {card.tag && <span className="inline-block bg-white/20 backdrop-blur-md text-white px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest w-fit">{card.tag}</span>}
                    <h3 className="font-headline font-extrabold text-xl md:text-2xl text-white">{card.title}</h3>
                    <p className="text-white/80 font-body text-xs max-w-sm">{card.subtitle || card.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Search Section */}
        <section className="space-y-4">
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-outline">search</span>
            </div>
            <input 
              className="w-full bg-surface-container-highest border-none rounded-xl py-3 pl-12 pr-12 focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all placeholder:text-outline font-body text-sm text-on-surface outline-none" 
              placeholder="Search for dishes or restaurants" 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="absolute inset-y-0 right-4 flex items-center">
              <label className={`cursor-pointer hover:text-primary transition-colors text-outline flex items-center justify-center ${isSearchingImage ? 'animate-pulse text-primary' : ''}`}>
                <span className="material-symbols-outlined">photo_camera</span>
                <input type="file" className="hidden" accept="image/*" onChange={handleImageSearch} disabled={isSearchingImage} />
              </label>
            </div>
          </div>
        </section>

        {/* Category Section */}
        <section className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="font-headline font-bold text-2xl text-on-surface">Categories</h2>
            <button className="text-primary font-bold text-sm">View all</button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide px-1">
            {categories.map(category => {
              const isSelected = searchQuery === category.name;
              return (
                <button 
                  key={category.id} 
                  onClick={() => setSearchQuery(isSelected ? '' : category.name)}
                  className={`flex items-center gap-1.5 py-1.5 px-3 flex-shrink-0 rounded-full shadow-sm transition-all duration-300 group ${isSelected ? 'bg-primary text-on-primary scale-105 shadow-md' : 'bg-surface-container-highest text-on-surface-variant hover:bg-primary-container hover:text-on-primary-container hover:scale-105'}`}
                >
                  <div className="flex items-center justify-center">
                    {category.icon?.trim().startsWith('<') ? (
                      <div className="w-4 h-4 flex items-center justify-center [&_svg]:w-full [&_svg]:h-full [&_svg]:max-w-full [&_svg]:max-h-full" dangerouslySetInnerHTML={{ __html: category.icon }} />
                    ) : (
                      <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: isSelected ? "'FILL' 1" : "'FILL' 0" }}>{category.icon}</span>
                    )}
                  </div>
                  <span className="font-label font-bold text-[11px] whitespace-nowrap">{category.name}</span>
                </button>
              );
            })}
          </div>
        </section>
        </div>

        {/* Featured Bento Hero */}
        {!searchQuery && (
          <section className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide gap-4 pb-2 px-1">
            <div 
              onClick={() => navigate('/free-delivery')}
              className="min-w-[320px] md:min-w-[420px] min-h-[100px] md:min-h-[110px] flex-1 bg-secondary-container rounded-2xl p-5 flex items-center justify-between group cursor-pointer hover:opacity-90 transition-all shadow-sm snap-center"
            >
              <div className="space-y-1">
                <h4 className="font-headline font-bold text-lg text-on-secondary-container">Free Delivery</h4>
                <p className="text-on-secondary-fixed-variant text-xs">On selected items</p>
              </div>
              <div className="w-14 h-14 bg-white/40 backdrop-blur-xl rounded-full flex items-center justify-center text-primary rotate-[-15deg] group-hover:rotate-0 transition-all">
                <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>delivery_dining</span>
              </div>
            </div>
            <div 
              onClick={() => navigate('/flash-deals')}
              className="min-w-[320px] md:min-w-[420px] min-h-[100px] md:min-h-[110px] flex-1 bg-surface-container-lowest rounded-2xl p-5 flex items-center justify-between group cursor-pointer hover:bg-white transition-all shadow-sm snap-center"
            >
              <div className="space-y-1">
                <h4 className="font-headline font-bold text-lg text-on-surface">Flash Deals</h4>
                <p className="text-on-surface-variant text-xs">Up to 40% OFF today</p>
                <span className="inline-block mt-1 text-primary font-bold text-[10px] uppercase tracking-tighter">Ends in 02:45:12</span>
              </div>
              <div className="w-16 h-16 rounded-xl overflow-hidden rotate-12 group-hover:rotate-0 transition-transform duration-500 shadow-xl">
                <img alt="Burger" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDIk1oSgjWducJ1fYydaJxHhDd4ogJVVePUC6wN0t9I4zcoX68xZuodY3apdrl0Dr9Gpsuztgp52ZGSd3zgToI4mmGdc1hRuqYPthPj1jJ_5Mq8JgIdBSvzGsSGI1UDcnhLmAYPKPlgb5gLbusU-Nyfq4apImdnzjTVFnmWU3tmK_0La7Ld9vmv9iuCO1kkaGbeC_9-gAvhvC5t3G9tAVeyOUqScQMuQs6dN5v_Z6yMIQReM6dPDIdmz7skHXnyHG6Fr6D-Ot6thk0" />
              </div>
            </div>
          </section>
        )}

        {/* Popular Items Grid */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-headline font-bold text-xl text-on-surface">
              {searchQuery ? 'Search Results' : 'Popular Items'}
            </h2>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${showFilters ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}
              >
                <span className="material-symbols-outlined text-[16px]">tune</span>
                Filter
              </button>
              {!searchQuery && <button className="text-primary font-bold text-xs ml-2">See all</button>}
            </div>
          </div>

          {/* Advanced Filters Panel */}
          {showFilters && (
            <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/20 shadow-sm animate-in slide-in-from-top-2 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Price Range */}
                <div>
                  <label className="block text-sm font-bold text-on-surface mb-2">Max Price: ${priceRange[1]}</label>
                  <input 
                    type="range" 
                    min="0" 
                    max={Math.ceil(maxProductPrice)} 
                    step="1"
                    value={priceRange[1]} 
                    onChange={(e) => setPriceRange([0, parseInt(e.target.value)])}
                    className="w-full accent-primary"
                  />
                  <div className="flex justify-between text-xs text-on-surface-variant mt-1">
                    <span>$0</span>
                    <span>${Math.ceil(maxProductPrice)}</span>
                  </div>
                </div>

                {/* Rating */}
                <div>
                  <label className="block text-sm font-bold text-on-surface mb-2">Minimum Rating (Max: {maxProductRating})</label>
                  <div className="flex gap-2">
                    {Array.from(new Set([0, 3, 4, 4.5, maxProductRating])).sort((a, b) => a - b).map(rating => (
                      <button
                        key={rating}
                        onClick={() => setMinRating(rating)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${minRating === rating ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}
                      >
                        {rating === 0 ? 'All' : `${rating}+ ⭐`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sort By */}
                <div>
                  <label className="block text-sm font-bold text-on-surface mb-2">Sort By</label>
                  <select 
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full bg-surface-container border-none rounded-xl p-2.5 text-sm font-bold text-on-surface focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    <option value="default">Default</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="rating_desc">Rating: High to Low</option>
                  </select>
                </div>
              </div>
            </div>
          )}
          
          {loading ? (
            <div className="text-center py-12">Loading dishes...</div>
          ) : visibleDisplayItems.length === 0 ? (
            <div className="text-center py-12 bg-surface-container-lowest rounded-2xl border border-outline-variant/20">
              <span className="material-symbols-outlined text-4xl text-outline mb-2">search_off</span>
              <h3 className="font-headline font-bold text-lg text-on-surface">No results found</h3>
              <p className="text-on-surface-variant text-sm mt-1">We couldn't find anything matching "{searchQuery}"</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6">
                {visibleDisplayItems.map(item => (
                  <Link key={item.uniqueId} to={`/dish/${item.id}`} className="bg-surface-container-lowest rounded-2xl md:rounded-3xl overflow-hidden flex flex-col shadow-sm hover:shadow-xl transition-all duration-300 group border border-outline-variant/20 relative h-[240px] md:h-[280px]">
                    <div className="relative h-[160px] md:h-[186px] overflow-hidden flex-shrink-0">
                      <img alt={item.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" src={item.images?.[0] || 'https://placehold.co/400x300?text=No+Image'} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      
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
                        <span className="font-headline font-black text-xs md:text-sm text-primary">${item.price.toFixed(2)}</span>
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
                ))}
              </div>

              {(hasMore || displayLimit < displayItems.length) && !searchQuery && (
                <div className="mt-8 flex justify-center">
                  <button 
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-bold py-3 px-8 rounded-full transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {loadingMore ? (
                      <>
                        <span className="material-symbols-outlined animate-spin">sync</span>
                        Loading...
                      </>
                    ) : (
                      'Load More'
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        <div className="h-12"></div>
      </main>

      <BottomNav />

      {/* Floating Action Button - Mobile Only */}
      {cartItemCount > 0 && (
        <Link to="/cart" className="md:hidden fixed bottom-24 right-6 w-14 h-14 bg-primary text-on-primary rounded-full shadow-lg flex items-center justify-center active:scale-90 duration-200 z-40">
          <div className="relative">
            <span className="material-symbols-outlined text-2xl">shopping_cart</span>
            <span className="absolute -top-2 -right-2 bg-white text-primary text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-primary">{cartItemCount}</span>
          </div>
        </Link>
      )}

      <Footer />
    </div>
  );
}
