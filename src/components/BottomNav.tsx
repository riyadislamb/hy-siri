import { Link, useLocation } from 'react-router-dom';

export default function BottomNav() {
  const location = useLocation();
  const path = location.pathname;

  return (
    <nav className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-md rounded-[2rem] z-50 bg-[#fff4f3]/80 dark:bg-stone-900/80 backdrop-blur-xl shadow-[0_8px_32px_rgba(78,33,35,0.06)] flex justify-around items-center p-2">
      <Link 
        to="/" 
        className={`flex flex-col items-center justify-center w-12 h-12 transition-transform active:scale-90 ${path === '/' ? 'bg-[#ff785a] text-white rounded-full' : 'text-stone-400 dark:text-stone-500 hover:text-[#b22200] dark:hover:text-[#ff785a]'}`}
      >
        <span className="material-symbols-outlined" style={path === '/' ? { fontVariationSettings: "'FILL' 1" } : {}}>home</span>
        {path !== '/' && <span className="font-['Inter'] text-[10px] font-semibold tracking-wide uppercase mt-1">Home</span>}
      </Link>
      
      <Link 
        to="/orders" 
        className={`flex flex-col items-center justify-center w-12 h-12 transition-transform active:scale-90 ${path === '/orders' ? 'bg-[#ff785a] text-white rounded-full' : 'text-stone-400 dark:text-stone-500 hover:text-[#b22200] dark:hover:text-[#ff785a]'}`}
      >
        <span className="material-symbols-outlined" style={path === '/orders' ? { fontVariationSettings: "'FILL' 1" } : {}}>receipt_long</span>
        {path !== '/orders' && <span className="font-['Inter'] text-[10px] font-semibold tracking-wide uppercase mt-1">Orders</span>}
      </Link>
      
      <Link 
        to="/cart" 
        className={`flex flex-col items-center justify-center w-12 h-12 transition-transform active:scale-90 ${path === '/cart' ? 'bg-[#ff785a] text-white rounded-full' : 'text-stone-400 dark:text-stone-500 hover:text-[#b22200] dark:hover:text-[#ff785a]'}`}
      >
        <span className="material-symbols-outlined" style={path === '/cart' ? { fontVariationSettings: "'FILL' 1" } : {}}>shopping_bag</span>
        {path !== '/cart' && <span className="font-['Inter'] text-[10px] font-semibold tracking-wide uppercase mt-1">Cart</span>}
      </Link>
      
      <Link 
        to="/reviews" 
        className={`flex flex-col items-center justify-center w-12 h-12 transition-transform active:scale-90 ${path === '/reviews' ? 'bg-[#ff785a] text-white rounded-full' : 'text-stone-400 dark:text-stone-500 hover:text-[#b22200] dark:hover:text-[#ff785a]'}`}
      >
        <span className="material-symbols-outlined" style={path === '/reviews' ? { fontVariationSettings: "'FILL' 1" } : {}}>reviews</span>
        {path !== '/reviews' && <span className="font-['Inter'] text-[10px] font-semibold tracking-wide uppercase mt-1">Reviews</span>}
      </Link>
      
      <Link 
        to="/profile" 
        className={`flex flex-col items-center justify-center w-12 h-12 transition-transform active:scale-90 ${path === '/profile' ? 'bg-[#ff785a] text-white rounded-full' : 'text-stone-400 dark:text-stone-500 hover:text-[#b22200] dark:hover:text-[#ff785a]'}`}
      >
        <span className="material-symbols-outlined" style={path === '/profile' ? { fontVariationSettings: "'FILL' 1" } : {}}>person</span>
        {path !== '/profile' && <span className="font-['Inter'] text-[10px] font-semibold tracking-wide uppercase mt-1">Profile</span>}
      </Link>
    </nav>
  );
}
