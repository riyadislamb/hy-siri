import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

export default function AdminSettings() {
  const { userRole, staffPermissions } = useAuth();
  const canEdit = userRole === 'superadmin' || (staffPermissions && staffPermissions.settings === 'edit');

  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(true);
  const [orderShipped, setOrderShipped] = useState(true);
  const [orderDelivered, setOrderDelivered] = useState(true);
  const [promotions, setPromotions] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'notifications');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setEmailEnabled(data.emailEnabled ?? true);
          setSmsEnabled(data.smsEnabled ?? false);
          setOrderPlaced(data.orderPlaced ?? true);
          setOrderShipped(data.orderShipped ?? true);
          setOrderDelivered(data.orderDelivered ?? true);
          setPromotions(data.promotions ?? true);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'notifications'), {
        emailEnabled,
        smsEnabled,
        orderPlaced,
        orderShipped,
        orderDelivered,
        promotions,
        updatedAt: new Date().toISOString()
      });
      alert("Notification settings saved successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-8">Loading settings...</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="font-headline font-bold text-3xl text-gray-900">Notification Settings</h2>
        <p className="text-gray-500 mt-1">Manage automated Email and SMS notifications for your customers.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 space-y-8">
        {/* Channels */}
        <div>
          <h3 className="font-bold text-lg text-gray-900 mb-4 border-b border-gray-100 pb-2">Active Channels</h3>
          <div className="space-y-4">
            <label className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-gray-400">mail</span>
                <div>
                  <h4 className="font-bold text-gray-900">Email Notifications</h4>
                  <p className="text-sm text-gray-500">Send updates via email</p>
                </div>
              </div>
              <input type="checkbox" checked={emailEnabled} onChange={(e) => setEmailEnabled(e.target.checked)} disabled={!canEdit} className="w-5 h-5 accent-[#0052cc] disabled:opacity-50" />
            </label>
            <label className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-gray-400">sms</span>
                <div>
                  <h4 className="font-bold text-gray-900">SMS Notifications</h4>
                  <p className="text-sm text-gray-500">Send text messages to customers</p>
                </div>
              </div>
              <input type="checkbox" checked={smsEnabled} onChange={(e) => setSmsEnabled(e.target.checked)} disabled={!canEdit} className="w-5 h-5 accent-[#0052cc] disabled:opacity-50" />
            </label>
          </div>
        </div>

        {/* Triggers */}
        <div>
          <h3 className="font-bold text-lg text-gray-900 mb-4 border-b border-gray-100 pb-2">Automated Triggers</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={orderPlaced} onChange={(e) => setOrderPlaced(e.target.checked)} disabled={!canEdit} className="w-4 h-4 accent-[#0052cc] disabled:opacity-50" />
              <span className="text-gray-700 font-medium">Order Placed Confirmation</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={orderShipped} onChange={(e) => setOrderShipped(e.target.checked)} disabled={!canEdit} className="w-4 h-4 accent-[#0052cc] disabled:opacity-50" />
              <span className="text-gray-700 font-medium">Order Shipped / Out for Delivery</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={orderDelivered} onChange={(e) => setOrderDelivered(e.target.checked)} disabled={!canEdit} className="w-4 h-4 accent-[#0052cc] disabled:opacity-50" />
              <span className="text-gray-700 font-medium">Order Delivered</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={promotions} onChange={(e) => setPromotions(e.target.checked)} disabled={!canEdit} className="w-4 h-4 accent-[#0052cc] disabled:opacity-50" />
              <span className="text-gray-700 font-medium">Marketing & Promotions</span>
            </label>
          </div>
        </div>

        {canEdit && (
          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button onClick={handleSave} disabled={saving} className="bg-[#0052cc] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#0043a8] transition-colors disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
