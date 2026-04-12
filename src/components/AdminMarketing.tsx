import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

export default function AdminMarketing() {
  const { userRole, staffPermissions } = useAuth();
  const canEdit = userRole === 'superadmin' || (staffPermissions && staffPermissions.marketing === 'edit');

  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSegment, setActiveSegment] = useState('all');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const usersQ = query(collection(db, 'users'));
        const usersSnap = await getDocs(usersQ);
        const usersData = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCustomers(usersData);
      } catch (error) {
        console.error("Error fetching customers:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCustomers();
  }, []);

  const segments = {
    all: customers,
    active: customers.filter(c => c.totalOrdersDelivered && c.totalOrdersDelivered > 0),
    inactive: customers.filter(c => !c.totalOrdersDelivered || c.totalOrdersDelivered === 0),
    vip: customers.filter(c => c.totalOrdersDelivered && c.totalOrdersDelivered > 5)
  };

  const currentCustomers = segments[activeSegment as keyof typeof segments] || [];

  const handleSendPromo = async () => {
    if (currentCustomers.length === 0) {
      alert("No customers in this segment.");
      return;
    }
    
    setSending(true);
    try {
      await addDoc(collection(db, 'promotions'), {
        segment: activeSegment,
        customerCount: currentCustomers.length,
        sentAt: new Date().toISOString(),
        status: 'sent'
      });
      alert(`Promo code sent to ${currentCustomers.length} customers in the ${activeSegment} segment via email/SMS!`);
    } catch (error) {
      console.error("Error sending promo:", error);
      alert("Failed to send promo.");
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="text-center py-8">Loading marketing data...</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-headline font-bold text-3xl text-gray-900">Marketing & Customers</h2>
          <p className="text-gray-500 mt-1">Segment your customers and send targeted promotions.</p>
        </div>
        {canEdit && (
          <button onClick={handleSendPromo} disabled={sending} className="bg-[#0052cc] text-white px-6 py-2.5 rounded-xl font-bold hover:bg-[#0043a8] transition-colors flex items-center gap-2 disabled:opacity-50">
            <span className="material-symbols-outlined text-[20px]">send</span>
            {sending ? 'Sending...' : 'Send Promo to Segment'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { id: 'all', label: 'All Customers', count: segments.all.length, icon: 'group' },
          { id: 'active', label: 'Active Buyers', count: segments.active.length, icon: 'shopping_bag' },
          { id: 'inactive', label: 'Inactive', count: segments.inactive.length, icon: 'snooze' },
          { id: 'vip', label: 'VIP Customers', count: segments.vip.length, icon: 'stars' }
        ].map(seg => (
          <div 
            key={seg.id}
            onClick={() => setActiveSegment(seg.id)}
            className={`p-6 rounded-2xl border cursor-pointer transition-all ${activeSegment === seg.id ? 'bg-[#f0f5ff] border-[#0052cc] shadow-sm' : 'bg-white border-gray-100 hover:border-gray-300'}`}
          >
            <div className="flex items-center gap-3 mb-2">
              <span className={`material-symbols-outlined ${activeSegment === seg.id ? 'text-[#0052cc]' : 'text-gray-400'}`}>{seg.icon}</span>
              <h3 className={`font-bold ${activeSegment === seg.id ? 'text-[#0052cc]' : 'text-gray-700'}`}>{seg.label}</h3>
            </div>
            <p className="text-3xl font-extrabold text-gray-900">{seg.count}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="font-bold text-lg text-gray-900">Customer List ({activeSegment})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-sm">
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Email</th>
                <th className="p-4 font-medium">Total Orders</th>
                <th className="p-4 font-medium">Role</th>
              </tr>
            </thead>
            <tbody>
              {currentCustomers.map(customer => (
                <tr key={customer.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="p-4 font-medium text-gray-900">{customer.displayName || 'Unknown'}</td>
                  <td className="p-4 text-gray-500">{customer.email}</td>
                  <td className="p-4 text-gray-900">{customer.totalOrdersDelivered || 0}</td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-1 rounded-md font-medium ${customer.role === 'admin' || customer.role === 'superadmin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                      {customer.role || 'user'}
                    </span>
                  </td>
                </tr>
              ))}
              {currentCustomers.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500">No customers found in this segment.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
