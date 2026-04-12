import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import Footer from '../components/Footer';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { loginWithEmail, signupWithEmail, loginWithGoogle, user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  useEffect(() => {
    if (user && !authLoading) {
      if (isAdmin) {
        navigate('/admin', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    }
  }, [user, isAdmin, authLoading, navigate, from]);

  // Check if we should default to signup based on navigation state
  useEffect(() => {
    if (location.state?.isSignup) {
      setIsLogin(false);
    }
  }, [location.state]);

  const renderHeader = () => (
    <header className="w-full z-50 bg-transparent flex justify-between items-center px-8 py-6 max-w-full relative">
      <Link to="/" className="text-[22px] font-bold text-[#176a21] italic hover:opacity-80 transition-opacity">SalesHub Enterprise</Link>
      <div className="hidden md:flex gap-8">
        <Link to="/" className="text-[13px] font-semibold text-[#595c5b] hover:text-[#176a21] transition-all cursor-pointer">Shop</Link>
        <Link to="/reviews" className="text-[13px] font-semibold text-[#595c5b] hover:text-[#176a21] transition-all cursor-pointer">Reviews</Link>
        <Link to="/" className="text-[13px] font-semibold text-[#595c5b] hover:text-[#176a21] transition-all cursor-pointer">Recipes</Link>
        <Link to="/" className="text-[13px] font-semibold text-[#595c5b] hover:text-[#176a21] transition-all cursor-pointer">Sustainability</Link>
        <Link to="/" className="text-[13px] font-semibold text-[#595c5b] hover:text-[#176a21] transition-all cursor-pointer">About</Link>
      </div>
      <div className="flex items-center gap-4">
        <button onClick={() => setIsLogin(true)} className={`text-[13px] font-semibold transition-all ${isLogin ? 'text-[#176a21]' : 'text-[#595c5b] hover:text-[#176a21]'}`}>Log In</button>
        <button onClick={() => setIsLogin(false)} className={`text-[13px] font-semibold px-5 py-2 rounded-full transition-all ${!isLogin ? 'text-[#176a21] bg-[#9df197]/30 hover:bg-[#9df197]/50' : 'text-[#595c5b] hover:text-[#176a21] hover:bg-[#9df197]/10'}`}>Sign Up</button>
      </div>
    </header>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!isLogin && password !== confirmPassword) {
      return setError('Passwords do not match');
    }

    setLoading(true);

    try {
      if (isLogin) {
        await loginWithEmail(email, password);
      } else {
        await signupWithEmail(email, password, name);
      }
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password login is not enabled. Please enable it in the Firebase Console under Authentication > Sign-in method.');
      } else if (err.code === 'auth/invalid-credential') {
        setError('Invalid email or password. Please try again.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.');
      } else {
        setError(err.message || 'Failed to authenticate');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        setError('');
      } else {
        setError(err.message || 'Failed to authenticate with Google');
      }
    } finally {
      setLoading(false);
    }
  };

  if (isLogin) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f5f7f5] text-[#2c2f2e] font-sans selection:bg-[#9df197] selection:text-[#005c15]">
        {/* Pattern Background */}
        <div className="fixed inset-0 z-0 opacity-15 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#abaeac 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
        
        {/* Organic shapes */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden opacity-[0.08]">
          <div className="absolute top-10 left-10 transform -rotate-12">
            <span className="material-symbols-outlined text-[120px] text-[#176a21]">nutrition</span>
          </div>
          <div className="absolute top-1/4 right-[-20px] transform rotate-45">
            <span className="material-symbols-outlined text-[160px] text-[#914700]">eco</span>
          </div>
          <div className="absolute bottom-10 left-[-30px] transform rotate-12">
            <span className="material-symbols-outlined text-[200px] text-[#176a21]">potted_plant</span>
          </div>
          <div className="absolute bottom-1/4 right-20 transform -rotate-6">
            <span className="material-symbols-outlined text-[140px] text-[#7b5400]">restaurant</span>
          </div>
          <div className="absolute top-1/2 left-1/3 opacity-50">
            <span className="material-symbols-outlined text-[80px] text-[#914700]">local_mall</span>
          </div>
          <div className="absolute top-[15%] left-[60%]">
            <span className="material-symbols-outlined text-[100px] text-[#176a21]">skillet</span>
          </div>
        </div>

        {renderHeader()}

        <main className="flex-grow flex items-center justify-center relative z-10 px-4 py-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative w-full max-w-[420px]"
          >
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#ffc6a1]/30 rounded-[63%_37%_54%_46%/45%_48%_52%_55%] blur-3xl z-0"></div>
            
            <div className="bg-white/80 backdrop-blur-2xl p-8 md:p-10 rounded-[2rem] shadow-[0_40px_60px_-15px_rgba(44,47,46,0.08)] relative z-10">
              <div className="text-center mb-8">
                <h1 className="font-bold text-[28px] text-[#176a21] italic mb-1">SalesHub Enterprise</h1>
                <p className="text-[#595c5b] text-[13px] tracking-wide">Welcome back to the harvest.</p>
              </div>

              {error && (
                <div className="mb-6 p-3 bg-red-100 border border-red-200 rounded-xl text-red-600 text-sm text-center">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-[13px] font-semibold text-[#2c2f2e] mb-1.5 px-1" htmlFor="email">Email Address</label>
                  <input 
                    type="email" 
                    id="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#d9dedb] border-none rounded-full px-5 py-3.5 text-[#2c2f2e] focus:ring-2 focus:ring-[#176a21]/20 focus:bg-white transition-all duration-300 placeholder:text-[#595c5b]/50 text-sm"
                    placeholder="hello@greenhouse.com"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1.5 px-1">
                    <label className="block text-[13px] font-semibold text-[#2c2f2e]" htmlFor="password">Password</label>
                    <button type="button" className="text-[13px] font-semibold text-[#176a21] hover:text-[#025d16] transition-colors">Forgot?</button>
                  </div>
                  <div className="relative">
                    <input 
                      type="password" 
                      id="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#d9dedb] border-none rounded-full px-5 py-3.5 text-[#2c2f2e] focus:ring-2 focus:ring-[#176a21]/20 focus:bg-white transition-all duration-300 placeholder:text-[#595c5b]/50 text-sm"
                      placeholder="••••••••"
                    />
                    <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-[#595c5b]">
                      <span className="material-symbols-outlined text-[20px]">visibility</span>
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center px-1 pt-1">
                  <input type="checkbox" id="remember" className="w-[18px] h-[18px] rounded-full border-[#abaeac] text-[#176a21] focus:ring-[#176a21] transition-all bg-transparent" />
                  <label htmlFor="remember" className="ml-2.5 text-[13px] text-[#2c2f2e] font-medium">Keep me logged in</label>
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#025d16] text-white font-bold py-3.5 rounded-full shadow-lg hover:shadow-[#176a21]/20 active:scale-95 transition-all duration-300 uppercase tracking-widest text-[13px] mt-2 disabled:opacity-70"
                >
                  {loading ? 'Logging in...' : 'LOGIN'}
                </button>
                
                <button 
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full mt-3 bg-white border border-[#d9dedb] text-[#2c2f2e] font-bold py-3.5 rounded-full shadow-sm hover:bg-gray-50 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70 text-[13px]"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-4 h-4" />
                  Sign in with Google
                </button>
              </form>

              <div className="mt-8 text-center">
                <p className="text-[13px] text-[#595c5b]">
                  New to the garden? 
                  <button onClick={() => setIsLogin(false)} className="font-bold text-[#176a21] hover:underline underline-offset-4 ml-1 transition-all">Create an account</button>
                </p>
              </div>
            </div>

            <div className="mt-8 flex justify-center items-center gap-3 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
              <img src="https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?auto=format&fit=crop&w=100&q=80" alt="Produce" className="w-10 h-10 rounded-full object-cover border-2 border-white/50 shadow-sm" />
              <img src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=100&q=80" alt="Salad" className="w-10 h-10 rounded-full object-cover border-2 border-white/50 shadow-sm" />
              <img src="https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&w=100&q=80" alt="Avocado" className="w-10 h-10 rounded-full object-cover border-2 border-white/50 shadow-sm" />
            </div>
          </motion.div>
        </main>

        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f7f5] text-[#2c2f2e] font-sans">
      {renderHeader()}

      <div className="fixed top-0 left-0 w-full h-full z-[-1] opacity-15 pointer-events-none grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-8 p-8">
        <span className="material-symbols-outlined text-4xl text-[#abaeac]">nutrition</span>
        <span className="material-symbols-outlined text-4xl text-[#abaeac]">eco</span>
        <span className="material-symbols-outlined text-4xl text-[#abaeac]">potted_plant</span>
        <span className="material-symbols-outlined text-4xl text-[#abaeac]">egg_alt</span>
        <span className="material-symbols-outlined text-4xl text-[#abaeac]">spa</span>
        <span className="material-symbols-outlined text-4xl text-[#abaeac]">bakery_dining</span>
        <span className="material-symbols-outlined text-4xl text-[#abaeac]">grass</span>
        <span className="material-symbols-outlined text-4xl text-[#abaeac]">local_florist</span>
        <span className="material-symbols-outlined text-4xl text-[#abaeac]">restaurant</span>
        <span className="material-symbols-outlined text-4xl text-[#abaeac]">water_drop</span>
      </div>
      
      <main className="flex-grow flex items-center justify-center pt-4 pb-16 px-4 relative z-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="max-w-[1000px] w-full grid grid-cols-1 md:grid-cols-2 bg-white rounded-[2.5rem] overflow-hidden shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] relative"
        >
          <div className="hidden md:block relative overflow-hidden bg-[#025d16]">
            <img src="https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80" alt="Fresh Produce" className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#025d16] via-[#025d16]/80 to-transparent"></div>
            <div className="relative z-10 p-12 h-full flex flex-col justify-end text-white">
              <h2 className="text-[42px] font-extrabold tracking-tighter leading-[1.1] mb-4 text-white">Cultivating <br/>Freshness.</h2>
              <p className="text-[15px] opacity-90 max-w-[280px] text-white/90 leading-relaxed">Join the digital greenhouse and get premium organic produce delivered straight from the roots to your door.</p>
            </div>
            <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-[#ffc6a1] rounded-full opacity-20 blur-3xl"></div>
          </div>

          <div className="p-10 md:p-14 bg-white flex flex-col justify-center">
            <div className="mb-8">
              <h1 className="text-[28px] font-extrabold text-[#2c2f2e] tracking-tight mb-1.5">Create Account</h1>
              <p className="text-[#595c5b] text-[13px]">Start your journey to a healthier, sustainable lifestyle today.</p>
            </div>

            {error && (
              <div className="mb-6 p-3 bg-red-100 border border-red-200 rounded-xl text-red-600 text-sm text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#595c5b] ml-1">FULL NAME</label>
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#d9dedb] border-none rounded-full px-5 py-3.5 text-[#2c2f2e] focus:ring-2 focus:ring-[#176a21]/20 focus:bg-white transition-all text-[13px]" 
                  placeholder="Alex Gardener" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#595c5b] ml-1">EMAIL ADDRESS</label>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#d9dedb] border-none rounded-full px-5 py-3.5 text-[#2c2f2e] focus:ring-2 focus:ring-[#176a21]/20 focus:bg-white transition-all text-[13px]" 
                  placeholder="alex@greenhouse.com" 
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#595c5b] ml-1">PASSWORD</label>
                  <input 
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#d9dedb] border-none rounded-full px-5 py-3.5 text-[#2c2f2e] focus:ring-2 focus:ring-[#176a21]/20 focus:bg-white transition-all text-[13px]" 
                    placeholder="••••••••" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#595c5b] ml-1">CONFIRM</label>
                  <input 
                    type="password" 
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#d9dedb] border-none rounded-full px-5 py-3.5 text-[#2c2f2e] focus:ring-2 focus:ring-[#176a21]/20 focus:bg-white transition-all text-[13px]" 
                    placeholder="••••••••" 
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2.5 pt-2">
                <input type="checkbox" id="terms" required className="w-4 h-4 rounded-full text-[#176a21] border-[#abaeac] focus:ring-[#176a21] bg-[#d9dedb]" />
                <label htmlFor="terms" className="text-[12px] text-[#2c2f2e]">I agree to the <a href="#" className="text-[#176a21] font-bold">Terms of Service</a> and <a href="#" className="text-[#176a21] font-bold">Privacy Policy</a>.</label>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-[#025d16] text-white font-semibold py-3.5 rounded-full shadow-lg shadow-[#176a21]/20 hover:scale-[1.02] active:scale-95 transition-all mt-4 disabled:opacity-70 text-[14px]"
              >
                {loading ? 'Creating Account...' : 'Sign Up'}
              </button>
              
              <button 
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full mt-3 bg-white border border-[#d9dedb] text-[#2c2f2e] font-semibold py-3.5 rounded-full shadow-sm hover:bg-gray-50 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70 text-[14px]"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-4 h-4" />
                Sign up with Google
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-[#e6e9e7] text-center">
              <p className="text-[#595c5b] text-[13px]">
                Already have an account? 
                <button type="button" onClick={() => setIsLogin(true)} className="text-[#914700] font-bold hover:text-[#733700] transition-colors ml-1">Log In</button>
              </p>
            </div>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
