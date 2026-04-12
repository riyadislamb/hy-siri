import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

export default function AdminPaymentSettings() {
  const { userRole, staffPermissions } = useAuth();
  const canEdit = userRole === 'superadmin' || (staffPermissions && staffPermissions.payment === 'edit');

  const [bkashNumber, setBkashNumber] = useState('');
  const [nagadNumber, setNagadNumber] = useState('');
  const [visaNumber, setVisaNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'paymentMethods');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setBkashNumber(data.bkashNumber || '');
          setNagadNumber(data.nagadNumber || '');
          setVisaNumber(data.visaNumber || '');
        }
      } catch (error) {
        console.error("Error fetching payment settings:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'paymentMethods'), {
        bkashNumber,
        nagadNumber,
        visaNumber
      }, { merge: true });
      alert("Payment settings saved successfully!");
    } catch (error) {
      console.error("Error saving payment settings:", error);
      alert("Failed to save payment settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-8 text-center">Loading...</div>;

  return (
    <div className="space-y-6">
      <h2 className="font-headline font-bold text-2xl">Payment Settings</h2>
      <form onSubmit={handleSave} className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/20 shadow-sm space-y-4 max-w-xl">
        <div>
          <label className="block text-sm font-bold mb-1">bKash Merchant Number</label>
          <input type="text" value={bkashNumber} onChange={e => setBkashNumber(e.target.value)} disabled={!canEdit} className="w-full p-3 rounded-xl bg-surface-container border-none disabled:opacity-50" placeholder="e.g. 017XXXXXXXX" />
        </div>
        <div>
          <label className="block text-sm font-bold mb-1">Nagad Merchant Number</label>
          <input type="text" value={nagadNumber} onChange={e => setNagadNumber(e.target.value)} disabled={!canEdit} className="w-full p-3 rounded-xl bg-surface-container border-none disabled:opacity-50" placeholder="e.g. 016XXXXXXXX" />
        </div>
        <div>
          <label className="block text-sm font-bold mb-1">Visa/Mastercard Number (For Manual Transfers)</label>
          <input type="text" value={visaNumber} onChange={e => setVisaNumber(e.target.value)} disabled={!canEdit} className="w-full p-3 rounded-xl bg-surface-container border-none disabled:opacity-50" placeholder="e.g. 4000 1234 5678 9010" />
        </div>
        {canEdit && (
          <div className="pt-4">
            <button type="submit" disabled={saving} className="bg-primary text-on-primary px-8 py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
