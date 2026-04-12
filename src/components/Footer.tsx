import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface FooterLink {
  label: string;
  url: string;
}

interface FooterData {
  quickLinks: FooterLink[];
  customerSupport: FooterLink[];
  aboutUs: FooterLink[];
}

export default function Footer() {
  const [footerData, setFooterData] = useState<FooterData | null>(null);

  useEffect(() => {
    const fetchFooterData = async () => {
      try {
        const docRef = doc(db, 'settings', 'footerLinks');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setFooterData(docSnap.data() as FooterData);
        }
      } catch (error: any) {
        if (error?.message?.includes('offline')) {
          console.warn("Firestore is offline. Using default footer links.");
        } else {
          console.error("Error fetching footer links:", error);
        }
      }
    };

    fetchFooterData();
  }, []);
  return (
    <footer className="bg-[#eff1ef] w-full pt-16 pb-8 px-8 border-t border-[#d9dedb] mt-auto">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          
          {/* Brand & Newsletter */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <Link to="/" className="text-2xl font-bold text-[#176a21] italic">SalesHub Enterprise</Link>
            <p className="text-[#595c5b] text-sm leading-relaxed max-w-sm">
              Cultivating freshness and delivering premium organic produce straight from the roots to your door.
            </p>
            
            <div className="mt-4">
              <h4 className="text-[13px] font-bold text-[#2c2f2e] uppercase tracking-widest mb-3">Subscribe to our Newsletter</h4>
              <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
                <input 
                  type="email" 
                  placeholder="Email address" 
                  className="bg-white border border-[#d9dedb] rounded-full px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#176a21]/20 focus:outline-none w-full max-w-[240px]"
                />
                <button type="submit" className="bg-[#176a21] text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-[#025d16] transition-colors">
                  Subscribe
                </button>
              </form>
            </div>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col gap-3">
            <h4 className="text-[13px] font-bold text-[#2c2f2e] uppercase tracking-widest mb-2">Quick Links</h4>
            {footerData?.quickLinks ? footerData.quickLinks.map((link, idx) => (
              <Link key={idx} to={link.url} className="text-sm text-[#595c5b] hover:text-[#176a21] transition-colors">{link.label}</Link>
            )) : (
              <>
                <Link to="/" className="text-sm text-[#595c5b] hover:text-[#176a21] transition-colors">Fresh Vegetables</Link>
                <Link to="/" className="text-sm text-[#595c5b] hover:text-[#176a21] transition-colors">Organic Fruits</Link>
                <Link to="/" className="text-sm text-[#595c5b] hover:text-[#176a21] transition-colors">Weekly Harvest Box</Link>
                <Link to="/" className="text-sm text-[#595c5b] hover:text-[#176a21] transition-colors">Healthy Recipes</Link>
              </>
            )}
          </div>

          {/* Customer Support */}
          <div className="flex flex-col gap-3">
            <h4 className="text-[13px] font-bold text-[#2c2f2e] uppercase tracking-widest mb-2">Customer Support</h4>
            {footerData?.customerSupport ? footerData.customerSupport.map((link, idx) => (
              <Link key={idx} to={link.url} className="text-sm text-[#595c5b] hover:text-[#176a21] transition-colors">{link.label}</Link>
            )) : (
              <>
                <Link to="/" className="text-sm text-[#595c5b] hover:text-[#176a21] transition-colors">Contact Us</Link>
                <Link to="/" className="text-sm text-[#595c5b] hover:text-[#176a21] transition-colors">FAQ</Link>
                <Link to="/" className="text-sm text-[#595c5b] hover:text-[#176a21] transition-colors">Shipping & Delivery</Link>
                <Link to="/" className="text-sm text-[#595c5b] hover:text-[#176a21] transition-colors">Return Policy</Link>
                <Link to="/track" className="text-sm text-[#595c5b] hover:text-[#176a21] transition-colors">Track Order</Link>
              </>
            )}
          </div>

          {/* About Us */}
          <div className="flex flex-col gap-3">
            <h4 className="text-[13px] font-bold text-[#2c2f2e] uppercase tracking-widest mb-2">About Us</h4>
            {footerData?.aboutUs ? footerData.aboutUs.map((link, idx) => (
              <Link key={idx} to={link.url} className="text-sm text-[#595c5b] hover:text-[#176a21] transition-colors">{link.label}</Link>
            )) : (
              <>
                <Link to="/" className="text-sm text-[#595c5b] hover:text-[#176a21] transition-colors">Our Story</Link>
                <Link to="/" className="text-sm text-[#595c5b] hover:text-[#176a21] transition-colors">Sustainability Mission</Link>
                <Link to="/" className="text-sm text-[#595c5b] hover:text-[#176a21] transition-colors">Our Farm Partners</Link>
              </>
            )}
          </div>

        </div>

        <div className="border-t border-[#d9dedb] pt-8 flex flex-col md:flex-row justify-between items-center gap-6">
          
          {/* Copyright & Legal */}
          <div className="flex flex-col items-center md:items-start gap-2">
            <p className="text-[11px] uppercase tracking-widest text-[#595c5b] text-center md:text-left">
              © 2024 THE DIGITAL GREENHOUSE. CULTIVATING FRESHNESS.
            </p>
            <div className="flex gap-4">
              <Link to="/" className="text-[11px] uppercase tracking-widest text-[#595c5b] hover:text-[#176a21] transition-colors">Privacy Policy</Link>
              <Link to="/" className="text-[11px] uppercase tracking-widest text-[#595c5b] hover:text-[#176a21] transition-colors">Terms of Service</Link>
            </div>
          </div>

          {/* Trust Badges & Socials */}
          <div className="flex flex-col items-center md:items-end gap-4">
            <div className="flex items-center gap-3">
              <span className="text-[11px] uppercase tracking-widest text-[#595c5b] font-semibold">100% Organic Certified</span>
              <span className="material-symbols-outlined text-[#176a21] text-[20px]">nest_eco_leaf</span>
              <span className="material-symbols-outlined text-[#176a21] text-[20px]">recycling</span>
              <span className="material-symbols-outlined text-[#176a21] text-[20px]">compost</span>
            </div>
            
            <div className="flex gap-4">
              {/* Social Icons (using material symbols as placeholders for social icons) */}
              <a href="#" className="w-8 h-8 rounded-full bg-[#d9dedb] flex items-center justify-center text-[#595c5b] hover:bg-[#176a21] hover:text-white transition-colors">
                <span className="material-symbols-outlined text-[18px]">share</span>
              </a>
              <a href="#" className="w-8 h-8 rounded-full bg-[#d9dedb] flex items-center justify-center text-[#595c5b] hover:bg-[#176a21] hover:text-white transition-colors">
                <span className="material-symbols-outlined text-[18px]">photo_camera</span>
              </a>
              <a href="#" className="w-8 h-8 rounded-full bg-[#d9dedb] flex items-center justify-center text-[#595c5b] hover:bg-[#176a21] hover:text-white transition-colors">
                <span className="material-symbols-outlined text-[18px]">play_arrow</span>
              </a>
            </div>
          </div>

        </div>
      </div>
    </footer>
  );
}
