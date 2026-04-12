import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

interface FooterLink {
  label: string;
  url: string;
}

interface FooterData {
  quickLinks: FooterLink[];
  customerSupport: FooterLink[];
  aboutUs: FooterLink[];
}

const defaultFooterData: FooterData = {
  quickLinks: [
    { label: 'Fresh Vegetables', url: '/' },
    { label: 'Organic Fruits', url: '/' },
    { label: 'Weekly Harvest Box', url: '/' },
    { label: 'Healthy Recipes', url: '/' },
  ],
  customerSupport: [
    { label: 'Contact Us', url: '/' },
    { label: 'FAQ', url: '/' },
    { label: 'Shipping & Delivery', url: '/' },
    { label: 'Return Policy', url: '/' },
    { label: 'Track Order', url: '/track' },
  ],
  aboutUs: [
    { label: 'Our Story', url: '/' },
    { label: 'Sustainability Mission', url: '/' },
    { label: 'Our Farm Partners', url: '/' },
  ]
};

export default function AdminFooterLinks() {
  const { userRole, staffPermissions } = useAuth();
  const canEdit = userRole === 'superadmin' || (staffPermissions && staffPermissions.footer === 'edit');

  const [footerData, setFooterData] = useState<FooterData>(defaultFooterData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchFooterData = async () => {
      try {
        const docRef = doc(db, 'settings', 'footerLinks');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setFooterData(docSnap.data() as FooterData);
        } else {
          // Initialize with default data
          await setDoc(docRef, defaultFooterData);
        }
      } catch (error: any) {
        if (error?.message?.includes('offline')) {
          console.warn("Firestore is offline. Using default footer links.");
        } else {
          console.error("Error fetching footer links:", error);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchFooterData();
  }, []);

  const handleLinkChange = (category: keyof FooterData, index: number, field: 'label' | 'url', value: string) => {
    const newData = { ...footerData };
    newData[category][index][field] = value;
    setFooterData(newData);
  };

  const handleAddLink = (category: keyof FooterData) => {
    const newData = { ...footerData };
    newData[category].push({ label: 'New Link', url: '/' });
    setFooterData(newData);
  };

  const handleRemoveLink = (category: keyof FooterData, index: number) => {
    const newData = { ...footerData };
    newData[category].splice(index, 1);
    setFooterData(newData);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'footerLinks'), footerData);
      alert('Footer links saved successfully!');
    } catch (error) {
      console.error("Error saving footer links:", error);
      alert('Failed to save footer links.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading footer settings...</div>;
  }

  const renderCategory = (title: string, category: keyof FooterData) => (
    <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant/20 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg">{title}</h3>
        {canEdit && (
          <button 
            onClick={() => handleAddLink(category)}
            className="bg-secondary-container text-on-secondary-container px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-secondary-container/80 transition-colors"
          >
            + Add Link
          </button>
        )}
      </div>
      
      <div className="space-y-3">
        {footerData[category].map((link, index) => (
          <div key={index} className="flex gap-3 items-center">
            <input 
              type="text" 
              value={link.label}
              onChange={(e) => handleLinkChange(category, index, 'label', e.target.value)}
              placeholder="Link Label"
              disabled={!canEdit}
              className="flex-1 bg-surface-container p-3 rounded-xl border-none outline-none focus:ring-2 focus:ring-primary text-sm disabled:opacity-50"
            />
            <input 
              type="text" 
              value={link.url}
              onChange={(e) => handleLinkChange(category, index, 'url', e.target.value)}
              placeholder="URL (e.g., /about or https://...)"
              disabled={!canEdit}
              className="flex-[2] bg-surface-container p-3 rounded-xl border-none outline-none focus:ring-2 focus:ring-primary text-sm disabled:opacity-50"
            />
            {canEdit && (
              <button 
                onClick={() => handleRemoveLink(category, index)}
                className="w-10 h-10 flex items-center justify-center bg-error/10 text-error rounded-xl hover:bg-error/20 transition-colors flex-shrink-0"
                title="Remove Link"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <section>
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-headline font-bold text-2xl">Manage Footer Links</h2>
        {canEdit && (
          <button 
            onClick={handleSave}
            disabled={saving}
            className="bg-primary text-on-primary px-6 py-2.5 rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </div>

      {renderCategory('Quick Links', 'quickLinks')}
      {renderCategory('Customer Support', 'customerSupport')}
      {renderCategory('About Us', 'aboutUs')}
    </section>
  );
}
