import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import BottomNav from '../components/BottomNav';

export default function Favorites() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        const favIds = userSnap.data()?.favorites || [];

        if (favIds.length === 0) {
          setFavorites([]);
          setLoading(false);
          return;
        }

        // Fetch all dishes and filter
        const dishesSnap = await getDocs(collection(db, 'dishes'));
        const allDishes = dishesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const favDishes = allDishes.filter(d => favIds.includes(d.id));
        setFavorites(favDishes);
      } catch (error) {
        console.error("Error fetching favorites:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchFavorites();
  }, [user]);

  return (
    <div className="bg-background text-on-background min-h-screen pb-32 font-body">
      <header className="fixed top-0 w-full z-50 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md">
        <div className="flex items-center px-6 h-16 w-full max-w-xl mx-auto">
          <button onClick={() => navigate(-1)} className="text-orange-700 dark:text-orange-500 hover:bg-stone-100/50 dark:hover:bg-stone-800/50 transition-colors active:scale-95 duration-200 p-2 rounded-full">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-headline font-bold text-xl ml-4 text-orange-700 dark:text-orange-500">My Favorites</h1>
        </div>
      </header>

      <main className="pt-24 px-6 max-w-xl mx-auto">
        {loading ? (
          <div className="text-center py-10">Loading...</div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-20">
            <span className="material-symbols-outlined text-6xl text-on-surface-variant/30 mb-4">favorite_border</span>
            <h2 className="font-headline text-xl font-bold mb-2">No favorites yet</h2>
            <p className="text-on-surface-variant mb-6">Save your favorite dishes to quickly find them later.</p>
            <Link to="/" className="bg-primary text-on-primary px-6 py-3 rounded-full font-bold">Explore Menu</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {favorites.map(dish => (
              <Link key={dish.id} to={`/dish/${dish.id}`} className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm border border-outline-variant/10 group flex flex-col">
                <div className="relative aspect-square overflow-hidden bg-surface-container">
                  <img src={dish.images?.[0] || ''} alt={dish.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-2 right-2 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                  </div>
                </div>
                <div className="p-4 flex flex-col flex-grow">
                  <h3 className="font-headline font-bold text-sm line-clamp-1 mb-1">{dish.name}</h3>
                  <div className="flex items-center gap-1 mb-2">
                    <span className="material-symbols-outlined text-primary text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    <span className="text-xs font-bold">{dish.rating || 'New'}</span>
                  </div>
                  <div className="mt-auto">
                    <span className="font-headline font-bold text-primary">${dish.price.toFixed(2)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
