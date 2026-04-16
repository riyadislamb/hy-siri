import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import PageWrapper from './components/PageWrapper';
import Home from './pages/Home';
import DishDetails from './pages/DishDetails';
import Cart from './pages/Cart';
import TrackOrder from './pages/TrackOrder';
import Profile from './pages/Profile';
import Checkout from './pages/Checkout';
import AdminDashboard from './pages/AdminDashboard';
import Favorites from './pages/Favorites';
import OrderHistory from './pages/OrderHistory';
import Login from './pages/Login';
import Reviews from './pages/Reviews';
import FlashDeals from './pages/FlashDeals';
import FreeDelivery from './pages/FreeDelivery';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location}>
        <Route path="/" element={<PageWrapper><Home /></PageWrapper>} />
        <Route path="/login" element={<PageWrapper><Login /></PageWrapper>} />
        <Route path="/dish/:id" element={<PageWrapper><DishDetails /></PageWrapper>} />
        <Route path="/cart" element={<PageWrapper><Cart /></PageWrapper>} />
        <Route path="/checkout" element={<PageWrapper><Checkout /></PageWrapper>} />
        <Route path="/track" element={<PageWrapper><TrackOrder /></PageWrapper>} />
        <Route path="/profile" element={<PageWrapper><Profile /></PageWrapper>} />
        <Route path="/admin" element={<PageWrapper><AdminDashboard /></PageWrapper>} />
        <Route path="/favorites" element={<PageWrapper><Favorites /></PageWrapper>} />
        <Route path="/orders" element={<PageWrapper><OrderHistory /></PageWrapper>} />
        <Route path="/reviews" element={<PageWrapper><Reviews /></PageWrapper>} />
        <Route path="/flash-deals" element={<PageWrapper><FlashDeals /></PageWrapper>} />
        <Route path="/free-delivery" element={<PageWrapper><FreeDelivery /></PageWrapper>} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <AnimatedRoutes />
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}
