import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, setDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

export default function DishDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [dish, setDish] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchDishAndReviews = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'dishes', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          const dishData = { id: docSnap.id, ...data };
          setDish(dishData);
          
          if (data.category) {
            const relatedQ = query(
              collection(db, 'dishes'), 
              where('category', '==', data.category),
              orderBy('name')
            );
            const relatedSnap = await getDocs(relatedQ);
            const related = relatedSnap.docs
              .map(d => ({ id: d.id, ...d.data() }))
              .filter(d => d.id !== id)
              .slice(0, 4);
            setRelatedProducts(related);
          }
        } else {
          console.log("No such document!");
        }

        // Fetch reviews
        const q = query(collection(db, 'reviews'), where('dishId', '==', id), orderBy('createdAt', 'desc'));
        const reviewSnap = await getDocs(q);
        setReviews(reviewSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        // Check if favorite
        if (user) {
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const favs = userSnap.data().favorites || [];
            setIsFavorite(favs.includes(id));
          }
        }
      } catch (error) {
        console.error("Error fetching dish details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDishAndReviews();
  }, [id, user]);

  const toggleFavorite = async () => {
    if (!user || !id) {
      alert("Please log in to save favorites.");
      return;
    }
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      let favs = userSnap.exists() ? (userSnap.data().favorites || []) : [];
      
      if (isFavorite) {
        favs = favs.filter((favId: string) => favId !== id);
      } else {
        favs.push(id);
      }
      
      await setDoc(userRef, { favorites: favs }, { merge: true });
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  };

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const scrollPosition = scrollContainerRef.current.scrollLeft;
      const width = scrollContainerRef.current.offsetWidth;
      const index = Math.round(scrollPosition / width);
      setCurrentImageIndex(index);
    }
  };

  const handleAddToCart = () => {
    if (dish && dish.stock !== 0) {
      addToCart({ ...dish, image: dish.images?.[0] || '', quantity, points: dish.points || 0 });
      navigate('/cart');
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!dish) {
    return <div className="min-h-screen flex items-center justify-center">Dish not found</div>;
  }

  return (
    <div className="bg-background text-on-surface antialiased min-h-screen flex flex-col">
      {/* Top Navigation */}
      <header className="sticky top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-outline-variant/10">
        <div className="flex items-center px-4 md:px-8 h-16 md:h-20 w-full max-w-7xl mx-auto justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-stone-800 hover:text-primary transition-colors font-bold group">
            <div className="w-10 h-10 flex items-center justify-center bg-surface-container-lowest rounded-full shadow-sm group-hover:bg-primary/10 transition-colors">
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </div>
            <span className="hidden md:inline">Back to Menu</span>
          </button>
          <button onClick={toggleFavorite} className="w-11 h-11 flex items-center justify-center bg-surface-container-lowest text-stone-800 shadow-sm hover:bg-red-50 transition-all active:scale-90 duration-200 rounded-full">
            <span className={`material-symbols-outlined text-[22px] ${isFavorite ? 'text-red-500' : ''}`} style={{ fontVariationSettings: isFavorite ? "'FILL' 1" : "'FILL' 0" }}>favorite</span>
          </button>
        </div>
      </header>

      <main className="flex-grow w-full max-w-7xl mx-auto px-0 md:px-8 py-0 md:py-8 pb-32 md:pb-12">
        <div className="flex flex-col lg:flex-row gap-0 md:gap-12 lg:gap-16">
          
          {/* Left Column: Image Gallery */}
          <div className="w-full lg:w-1/2 flex flex-col gap-4">
            <section className="relative w-full h-[55vh] md:h-auto md:aspect-[4/3] overflow-hidden bg-stone-100 md:rounded-3xl shadow-sm">
          {dish.images && dish.images.length > 0 ? (
            <div 
              className="flex overflow-x-auto snap-x snap-mandatory h-full scrollbar-hide"
              ref={scrollContainerRef}
              onScroll={handleScroll}
            >
              {dish.images.map((img: string, idx: number) => (
                <div key={idx} className="relative w-full h-full flex-shrink-0 snap-center">
                  <img 
                    alt={`${dish.name} - ${idx + 1}`} 
                    className="w-full h-full object-cover" 
                    src={img} 
                  />
                  {/* Subtle gradient overlay for better blending with the bottom edge */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none"></div>
                  {dish.stock === 0 && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
                      <span className="bg-error text-on-error text-lg md:text-xl font-bold px-4 py-2 rounded-xl shadow-2xl">Out of Stock</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-on-surface-variant bg-surface-container">
              <span className="material-symbols-outlined text-5xl mb-2 opacity-40">restaurant</span>
            </div>
          )}
          
          {/* Image Indicators */}
          {dish.images && dish.images.length > 1 && (
            <div className="absolute bottom-10 md:bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 z-20 bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-full">
              {dish.images.map((_: any, idx: number) => (
                <div 
                  key={idx} 
                  className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentImageIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/60'}`}
                ></div>
              ))}
            </div>
          )}
        </section>
        </div>

        {/* Right Column: Content Canvas */}
        <div className="w-full lg:w-1/2 flex flex-col">
          <section className="relative -mt-6 md:mt-0 px-6 md:px-0 pt-8 md:pt-0 pb-6 bg-background rounded-t-[2rem] md:rounded-none z-10 md:shadow-none shadow-[0_-8px_30px_rgba(0,0,0,0.08)]">
            {/* Title & Pricing Row */}
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1 pr-4">
              <h2 className="font-headline font-extrabold text-3xl tracking-tight leading-tight mb-2">{dish.name}</h2>
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-primary-container/20 px-3 py-1 rounded-full">
                  <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span className="font-label font-bold text-sm text-primary ml-1">
                    {reviews.length > 0 
                      ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) 
                      : 'New'}
                  </span>
                </div>
                <span className="text-on-surface-variant text-sm font-medium">({reviews.length} reviews)</span>
              </div>
            </div>
            <div className="text-right flex flex-col items-end">
              <span className="font-headline font-bold text-2xl text-primary">${dish.price.toFixed(2)}</span>
              {dish.discountAmount > 0 && (
                <span className="text-xs text-on-surface-variant line-through">${(dish.price + dish.discountAmount).toFixed(2)}</span>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-8">
            {dish.category && (
              <span className="bg-surface-container-highest text-on-surface-variant font-label text-[11px] font-semibold px-4 py-1.5 rounded-full uppercase tracking-widest">{dish.category}</span>
            )}
            {dish.discountAmount > 0 && (
              <span className="bg-primary/10 text-primary font-label text-[11px] font-bold px-4 py-1.5 rounded-full uppercase tracking-widest">Discounted</span>
            )}
            {dish.points > 0 && (
              <span className="bg-green-100 text-green-800 font-label text-[11px] font-bold px-4 py-1.5 rounded-full uppercase tracking-widest flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">stars</span>
                +{dish.points} Points
              </span>
            )}
          </div>

          {/* Description */}
          <div className="mb-10">
            <h3 className="font-headline font-bold text-lg mb-3">About this Dish</h3>
            <p className="font-body text-on-surface-variant leading-relaxed text-base whitespace-pre-wrap">
              {dish.description}
            </p>
          </div>

          {/* Ingredients / Highlights Bento-style */}
          <div className="grid grid-cols-2 gap-4 mb-10">
            <div className="bg-surface-container-lowest p-5 rounded-xl editorial-shadow flex flex-col items-center justify-center text-center border border-outline-variant/10">
              <span className="material-symbols-outlined text-primary-container text-3xl mb-2">schedule</span>
              <span className="font-headline font-bold text-sm">{dish.prepTime || '15-20 min'}</span>
              <span className="font-label text-xs text-on-surface-variant">Prep Time</span>
            </div>
            <div className="bg-surface-container-lowest p-5 rounded-xl editorial-shadow flex flex-col items-center justify-center text-center border border-outline-variant/10">
              <span className="material-symbols-outlined text-primary-container text-3xl mb-2">local_fire_department</span>
              <span className="font-headline font-bold text-sm">{dish.calories || 'N/A'}</span>
              <span className="font-label text-xs text-on-surface-variant">Nutrition</span>
            </div>
          </div>

          {/* Quantity Selector Section */}
          <div className="flex items-center justify-between bg-surface-container-low p-4 rounded-2xl mb-12">
            <span className="font-headline font-bold text-base">Quantity</span>
            <div className="flex items-center gap-6 bg-surface-container-lowest rounded-full p-2 border border-outline-variant/20">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container hover:bg-surface-container-high transition-colors active:scale-90">
                <span className="material-symbols-outlined">remove</span>
              </button>
              <span className="font-headline font-bold text-xl w-4 text-center">{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-on-primary hover:bg-primary-dim transition-colors active:scale-90">
                <span className="material-symbols-outlined">add</span>
              </button>
            </div>
          </div>

          {/* Desktop Add to Cart */}
          <div className="hidden md:flex items-center gap-6 mt-8 p-6 bg-surface-container-lowest rounded-3xl border border-outline-variant/20 shadow-sm">
            <div className="flex flex-col flex-grow">
              <span className="font-label text-xs text-on-surface-variant uppercase tracking-widest font-bold">Total Price</span>
              <span className="font-headline font-extrabold text-3xl text-primary">${(dish.price * quantity).toFixed(2)}</span>
            </div>
            <button 
              onClick={handleAddToCart} 
              disabled={dish.stock === 0}
              className={`flex-[2] font-headline font-bold py-4 px-8 rounded-full flex items-center justify-center gap-2 transition-all duration-200 ${dish.stock === 0 ? 'bg-surface-container-high text-on-surface-variant cursor-not-allowed' : 'bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-[0_8px_16px_rgba(178,34,0,0.2)] hover:shadow-[0_12px_24px_rgba(178,34,0,0.3)] hover:-translate-y-1 active:scale-95'}`}
            >
              <span className="material-symbols-outlined">shopping_basket</span>
              {dish.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
            </button>
          </div>

        </section>
        </div>

        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <section className="mt-16 md:mt-24">
            <div className="flex items-center justify-between mb-6 md:mb-8">
              <h2 className="font-headline font-extrabold text-2xl md:text-3xl text-on-surface">Related Products</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
              {relatedProducts.map(item => (
                <Link key={item.id} to={`/dish/${item.id}`} className="bg-surface-container-lowest rounded-2xl md:rounded-3xl overflow-hidden flex flex-col shadow-sm hover:shadow-xl transition-all duration-300 group border border-outline-variant/20 relative h-[220px] md:h-[280px]">
                  <div className="relative h-[148px] md:h-[192px] overflow-hidden flex-shrink-0">
                    <img alt={item.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" src={item.images?.[0] || 'https://placehold.co/400x300?text=No+Image'} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    <div className="absolute top-2 left-2 md:top-2.5 md:left-2.5 bg-white/95 backdrop-blur-md px-1.5 py-0.5 md:px-2 md:py-0.5 rounded-full flex items-center gap-0.5 shadow-sm">
                      <span className="material-symbols-outlined text-[8px] md:text-[10px] text-orange-500" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      <span className="text-[8px] md:text-[9px] font-extrabold text-stone-800">{item.rating || 'New'}</span>
                    </div>

                    {item.stock === 0 && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
                        <span className="bg-error text-on-error text-xs font-bold px-2 py-1 rounded-md shadow-lg">Out of Stock</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-2.5 md:p-3 flex flex-col flex-1 bg-surface-container-lowest relative">
                    <div className="pr-8 md:pr-10">
                      <h4 className="font-headline font-extrabold text-xs md:text-sm text-on-surface leading-tight mb-0.5 line-clamp-1">{item.name}</h4>
                      <p className="text-[9px] md:text-[10px] text-on-surface-variant line-clamp-1 mb-1">{item.description}</p>
                    </div>
                    
                    <div className="mt-auto flex items-end justify-between">
                      <div className="flex flex-col">
                        <span className="hidden md:block text-[8px] md:text-[9px] uppercase tracking-wider font-bold text-on-surface-variant mb-0.5">Price</span>
                        <span className="font-headline font-extrabold text-sm md:text-base text-primary leading-none">${item.price.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        </div>
      </main>

      {/* Mobile Fixed Action Bar Bottom */}
      <footer className="md:hidden fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-xl px-6 py-6 border-t border-outline-variant/10 z-50">
        <div className="flex items-center gap-4 max-w-xl mx-auto">
          <div className="flex flex-col flex-grow">
            <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">Total Price</span>
            <span className="font-headline font-extrabold text-2xl text-on-surface">${(dish.price * quantity).toFixed(2)}</span>
          </div>
          <button 
            onClick={handleAddToCart} 
            disabled={dish.stock === 0}
            className={`flex-[2] font-headline font-bold py-4 px-8 rounded-full flex items-center justify-center gap-2 transition-transform duration-200 ${dish.stock === 0 ? 'bg-surface-container-high text-on-surface-variant cursor-not-allowed' : 'bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-[0_12px_24px_rgba(178,34,0,0.25)] active:scale-95'}`}
          >
            <span className="material-symbols-outlined">shopping_basket</span>
            {dish.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
          </button>
        </div>
      </footer>
    </div>
  );
}
