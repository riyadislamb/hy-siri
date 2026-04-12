import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

export default function AdminOffers() {
  const { userRole, staffPermissions } = useAuth();
  const canEdit = userRole === 'superadmin' || (staffPermissions && staffPermissions.products === 'edit');

  const [activeTab, setActiveTab] = useState<'flash_deals' | 'free_delivery'>('flash_deals');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [discountInputs, setDiscountInputs] = useState<{[key: string]: string}>({});

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'dishes'));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setProducts(data);
      
      // Initialize discount inputs based on existing data
      const initialDiscounts: {[key: string]: string} = {};
      data.forEach((p: any) => {
        if (p.originalPrice && p.originalPrice > p.price) {
          const discount = Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100);
          initialDiscounts[p.id] = discount.toString();
        }
      });
      setDiscountInputs(initialDiscounts);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleDiscountChange = (id: string, val: string) => {
    setDiscountInputs(prev => ({ ...prev, [id]: val }));
  };

  const saveDiscount = async (product: any) => {
    if (!canEdit) return;
    
    const pctStr = discountInputs[product.id];
    if (!pctStr || pctStr.trim() === '') {
      // Remove discount
      try {
        await updateDoc(doc(db, 'dishes', product.id), {
          originalPrice: null
        });
        alert('Discount removed!');
        fetchProducts();
      } catch (error) {
        console.error("Error removing discount:", error);
        alert('Failed to remove discount');
      }
      return;
    }

    const pct = parseFloat(pctStr);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      return alert('Invalid percentage. Please enter a number between 0 and 100.');
    }
    
    const originalPrice = product.originalPrice || product.price;
    const newPrice = originalPrice - (originalPrice * (pct / 100));
    
    try {
      await updateDoc(doc(db, 'dishes', product.id), {
        originalPrice: originalPrice,
        price: newPrice
      });
      alert('Discount applied successfully!');
      fetchProducts();
    } catch (error) {
      console.error("Error applying discount:", error);
      alert('Failed to apply discount');
    }
  };

  const toggleFreeDelivery = async (product: any, checked: boolean) => {
    if (!canEdit) return;
    try {
      await updateDoc(doc(db, 'dishes', product.id), {
        freeDelivery: checked
      });
      fetchProducts();
    } catch (error) {
      console.error("Error updating free delivery:", error);
      alert('Failed to update free delivery status');
    }
  };

  if (loading) return <div className="text-center py-8">Loading products...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="font-headline font-bold text-2xl">Offers Card</h2>
      </div>

      <div className="flex gap-4 border-b border-outline-variant/30 pb-2">
        <button 
          onClick={() => setActiveTab('flash_deals')}
          className={`font-bold pb-2 px-2 border-b-2 transition-colors ${activeTab === 'flash_deals' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}
        >
          Flash Deals
        </button>
        <button 
          onClick={() => setActiveTab('free_delivery')}
          className={`font-bold pb-2 px-2 border-b-2 transition-colors ${activeTab === 'free_delivery' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}
        >
          Free Delivery
        </button>
      </div>

      {activeTab === 'flash_deals' && (
        <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/20 overflow-hidden">
          <div className="p-4 bg-surface-container-highest border-b border-outline-variant/20">
            <h3 className="font-bold text-on-surface">Manage Flash Deals</h3>
            <p className="text-sm text-on-surface-variant">Set discount percentages for products to feature them on the Flash Deals page.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container text-on-surface-variant text-sm border-b border-outline-variant/20">
                  <th className="p-4 font-bold">Product</th>
                  <th className="p-4 font-bold">Original Price</th>
                  <th className="p-4 font-bold">Current Price</th>
                  <th className="p-4 font-bold">Discount (%)</th>
                  <th className="p-4 font-bold">Action</th>
                </tr>
              </thead>
              <tbody>
                {products.map(product => (
                  <tr key={product.id} className="border-b border-outline-variant/10 hover:bg-surface-container-lowest/50">
                    <td className="p-4 flex items-center gap-3">
                      <img src={product.images?.[0] || 'https://placehold.co/100x100'} alt={product.name} className="w-12 h-12 rounded-lg object-cover" />
                      <span className="font-medium">{product.name}</span>
                    </td>
                    <td className="p-4 text-on-surface-variant">
                      ৳{product.originalPrice ? product.originalPrice.toLocaleString() : product.price.toLocaleString()}
                    </td>
                    <td className="p-4 font-bold text-primary">
                      ৳{product.price.toLocaleString()}
                    </td>
                    <td className="p-4">
                      <input 
                        type="number" 
                        min="0" 
                        max="100" 
                        value={discountInputs[product.id] || ''} 
                        onChange={(e) => handleDiscountChange(product.id, e.target.value)}
                        placeholder="0"
                        className="w-20 p-2 rounded-lg bg-surface-container border-none text-center"
                        disabled={!canEdit}
                      />
                    </td>
                    <td className="p-4">
                      <button 
                        onClick={() => saveDiscount(product)}
                        disabled={!canEdit}
                        className="bg-primary text-on-primary px-4 py-2 rounded-lg font-bold text-sm hover:bg-primary/90 disabled:opacity-50"
                      >
                        Save
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'free_delivery' && (
        <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/20 overflow-hidden">
          <div className="p-4 bg-surface-container-highest border-b border-outline-variant/20">
            <h3 className="font-bold text-on-surface">Manage Free Delivery</h3>
            <p className="text-sm text-on-surface-variant">Select products that will be eligible for free delivery.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container text-on-surface-variant text-sm border-b border-outline-variant/20">
                  <th className="p-4 font-bold">Product</th>
                  <th className="p-4 font-bold">Price</th>
                  <th className="p-4 font-bold">Free Delivery</th>
                </tr>
              </thead>
              <tbody>
                {products.map(product => (
                  <tr key={product.id} className="border-b border-outline-variant/10 hover:bg-surface-container-lowest/50">
                    <td className="p-4 flex items-center gap-3">
                      <img src={product.images?.[0] || 'https://placehold.co/100x100'} alt={product.name} className="w-12 h-12 rounded-lg object-cover" />
                      <span className="font-medium">{product.name}</span>
                    </td>
                    <td className="p-4 font-bold">
                      ৳{product.price.toLocaleString()}
                    </td>
                    <td className="p-4">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={product.freeDelivery || false}
                          onChange={(e) => toggleFreeDelivery(product, e.target.checked)}
                          disabled={!canEdit}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
