import { BrowserRouter, Routes, Route } from 'react-router-dom';
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

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dish/:id" element={<DishDetails />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/track" element={<TrackOrder />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/orders" element={<OrderHistory />} />
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/flash-deals" element={<FlashDeals />} />
            <Route path="/free-delivery" element={<FreeDelivery />} />
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}
