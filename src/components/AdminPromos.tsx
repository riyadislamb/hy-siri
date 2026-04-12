import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

export default function AdminPromos() {
  const { userRole, staffPermissions } = useAuth();
  const canEdit = userRole === 'superadmin' || (staffPermissions && staffPermissions.promos === 'edit');

  const [promos, setPromos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  const [code, setCode] = useState('');
  const [discount, setDiscount] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [promoToDelete, setPromoToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchPromos();
  }, []);

  const fetchPromos = async () => {
    try {
      const q = query(collection(db, 'promoCodes'));
      const snap = await getDocs(q);
      setPromos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error fetching promos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !discount) return;
    try {
      await addDoc(collection(db, 'promoCodes'), {
        code: code.toUpperCase(),
        discount: parseFloat(discount),
        isActive
      });
      setCode('');
      setDiscount('');
      setIsActive(true);
      setIsAdding(false);
      fetchPromos();
    } catch (error) {
      console.error("Error saving promo:", error);
    }
  };

  const toggleStatus = async (promo: any) => {
    try {
      await updateDoc(doc(db, 'promoCodes', promo.id), { isActive: !promo.isActive });
      fetchPromos();
    } catch (error) {
      console.error("Error toggling promo status:", error);
    }
  };

  const confirmDelete = async () => {
    if (!promoToDelete) return;
    try {
      await deleteDoc(doc(db, 'promoCodes', promoToDelete));
      setPromoToDelete(null);
      fetchPromos();
    } catch (error) {
      console.error("Error deleting promo:", error);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading promo codes...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="font-headline font-bold text-2xl">Promo Codes</h2>
        {canEdit && (
          <button 
            onClick={() => setIsAdding(!isAdding)} 
            className="bg-primary text-on-primary px-5 py-2.5 rounded-full font-bold flex items-center gap-2 shadow-sm hover:shadow-md transition-shadow"
          >
            <span className="material-symbols-outlined">{isAdding ? 'close' : 'add'}</span>
            {isAdding ? 'Cancel' : 'Add Promo'}
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant/20 space-y-4 animate-in fade-in slide-in-from-top-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1 text-on-surface">Code</label>
              <input 
                type="text" 
                value={code} 
                onChange={e => setCode(e.target.value.toUpperCase())} 
                className="w-full p-3 rounded-xl bg-surface-container border-none focus:ring-2 focus:ring-primary uppercase" 
                placeholder="e.g. EID20" 
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1 text-on-surface">Discount Amount ($)</label>
              <input 
                type="number" 
                step="0.01" 
                min="0"
                value={discount} 
                onChange={e => setDiscount(e.target.value)} 
                className="w-full p-3 rounded-xl bg-surface-container border-none focus:ring-2 focus:ring-primary" 
                placeholder="e.g. 10.00"
                required 
              />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer w-max">
            <input 
              type="checkbox" 
              checked={isActive} 
              onChange={e => setIsActive(e.target.checked)} 
              className="w-5 h-5 rounded text-primary focus:ring-primary" 
            />
            <span className="font-bold text-sm text-on-surface">Active</span>
          </label>
          <button type="submit" className="w-full bg-primary text-on-primary py-3 rounded-xl font-bold mt-2 hover:bg-primary/90 transition-colors">
            Save Promo Code
          </button>
        </form>
      )}

      {promos.length === 0 && !isAdding ? (
        <div className="text-center py-12 bg-surface-container-lowest rounded-2xl border border-outline-variant/20">
          <span className="material-symbols-outlined text-6xl text-on-surface-variant mb-4 opacity-50">local_offer</span>
          <p className="text-on-surface-variant font-medium">No promo codes found. Create one to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {promos.map(promo => (
            <div key={promo.id} className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/20 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-xl text-primary tracking-wide">{promo.code}</h3>
                  <p className="text-sm text-on-surface-variant font-medium mt-1">${promo.discount.toFixed(2)} off</p>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${promo.isActive ? 'bg-green-100 text-green-800' : 'bg-surface-container-high text-on-surface-variant'}`}>
                  {promo.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex gap-2 mt-2">
                {canEdit ? (
                  <>
                    <button 
                      onClick={() => toggleStatus(promo)} 
                      className="flex-1 text-sm font-bold bg-surface-container py-2 rounded-xl hover:bg-surface-container-high transition-colors text-on-surface"
                    >
                      {promo.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button 
                      onClick={() => setPromoToDelete(promo.id)} 
                      className="w-10 h-10 flex items-center justify-center text-error bg-error/10 rounded-xl hover:bg-error/20 transition-colors"
                      aria-label="Delete promo"
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  </>
                ) : (
                  <div className="flex-1 text-sm font-bold bg-surface-container py-2 rounded-xl text-center text-on-surface-variant">
                    {promo.isActive ? 'Active' : 'Inactive'}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {promoToDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-surface-container-lowest rounded-3xl p-6 w-full max-w-sm shadow-xl animate-in zoom-in-95">
            <h3 className="text-xl font-bold text-on-surface mb-2">Delete Promo Code?</h3>
            <p className="text-on-surface-variant mb-6">Are you sure you want to delete this promo code? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setPromoToDelete(null)}
                className="flex-1 py-3 rounded-xl font-bold bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 py-3 rounded-xl font-bold bg-error text-white hover:bg-error/90 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
