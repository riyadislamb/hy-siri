import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, getDocs, doc, updateDoc, orderBy, deleteDoc, setDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import BottomNav from '../components/BottomNav';
import AdminProducts from '../components/AdminProducts';
import AdminCategories from '../components/AdminCategories';
import AdminAnalytics from '../components/AdminAnalytics';
import AdminPromos from '../components/AdminPromos';
import AdminFooterLinks from '../components/AdminFooterLinks';
import AdminBanners from '../components/AdminBanners';
import AdminPaymentSettings from '../components/AdminPaymentSettings';
import AdminMarketing from '../components/AdminMarketing';
import AdminSettings from '../components/AdminSettings';
import AdminStaffManagement from '../components/AdminStaffManagement';
import AdminOffers from '../components/AdminOffers';

export default function AdminDashboard() {
  const { user, isAdmin, userRole, staffPermissions, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'categories' | 'analytics' | 'promos' | 'footer' | 'banners' | 'payment' | 'marketing' | 'settings' | 'staff' | 'offers'>('analytics');
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [visibleOrders, setVisibleOrders] = useState(20);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const canEditOrders = userRole === 'superadmin' || (staffPermissions && staffPermissions.orders === 'edit');

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/');
    } else if (!loading && userRole === 'staff' && staffPermissions) {
      // Redirect to first available tab if current tab is not allowed
      const isCurrentTabAllowed = () => {
        if (activeTab === 'analytics') return staffPermissions.dashboard !== 'none';
        if (activeTab === 'orders') return staffPermissions.orders !== 'none';
        if (activeTab === 'products') return staffPermissions.products !== 'none';
        if (activeTab === 'categories') return staffPermissions.categories !== 'none';
        if (activeTab === 'marketing') return staffPermissions.marketing !== 'none';
        if (activeTab === 'banners') return staffPermissions.banners !== 'none';
        if (activeTab === 'promos') return staffPermissions.promos !== 'none';
        if (activeTab === 'footer') return staffPermissions.footer !== 'none';
        if (activeTab === 'payment') return staffPermissions.payment !== 'none';
        if (activeTab === 'settings') return staffPermissions.settings !== 'none';
        if (activeTab === 'staff') return false; // Staff can never access staff management
        return true;
      };

      if (!isCurrentTabAllowed()) {
        if (staffPermissions.dashboard !== 'none') setActiveTab('analytics');
        else if (staffPermissions.orders !== 'none') setActiveTab('orders');
        else if (staffPermissions.products !== 'none') setActiveTab('products');
        else if (staffPermissions.categories !== 'none') setActiveTab('categories');
        else if (staffPermissions.marketing !== 'none') setActiveTab('marketing');
        else if (staffPermissions.banners !== 'none') setActiveTab('banners');
        else if (staffPermissions.promos !== 'none') setActiveTab('promos');
        else if (staffPermissions.footer !== 'none') setActiveTab('footer');
        else if (staffPermissions.payment !== 'none') setActiveTab('payment');
        else if (staffPermissions.settings !== 'none') setActiveTab('settings');
      }
    }
  }, [isAdmin, loading, navigate, userRole, activeTab, staffPermissions]);

  useEffect(() => {
    const fetchAllOrders = async () => {
      if (!isAdmin) return;
      
      try {
        const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const ordersData = querySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((order: any) => !order.isArchived);
        setOrders(ordersData);
      } catch (error) {
        console.error("Error fetching all orders:", error);
      } finally {
        setLoadingOrders(false);
      }
    };

    if (isAdmin && activeTab === 'orders') {
      fetchAllOrders();
    }
  }, [isAdmin, activeTab]);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, { status: newStatus });
      
      if (newStatus === 'delivered') {
        const order = orders.find(o => o.id === orderId);
        if (order && order.userId) {
          const userRef = doc(db, 'users', order.userId);
          await setDoc(userRef, { totalOrdersDelivered: increment(1) }, { merge: true });
        }
      }
      
      // Update local state
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      ));
    } catch (error) {
      console.error("Error updating order status:", error);
    }
  };

  const confirmDeleteOrder = async () => {
    if (!orderToDelete) return;
    
    try {
      const orderRef = doc(db, 'orders', orderToDelete);
      await updateDoc(orderRef, { isArchived: true });
      
      // Remove from local state
      setOrders(orders.filter(order => order.id !== orderToDelete));
    } catch (error) {
      console.error("Error archiving order:", error);
    } finally {
      setOrderToDelete(null);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  const handleAllDelete = async () => {
    setIsDeletingAll(true);
    try {
      const collectionsToClear = [
        'dishes', 'categories', 'orders', 'banners', 'promoCodes', 
        'staff', 'users', 'reviews', 'settings', 'promotions'
      ];

      for (const colName of collectionsToClear) {
        try {
          console.log(`Fetching documents for collection: ${colName}`);
          const colRef = collection(db, colName);
          const snapshot = await getDocs(colRef);
          
          console.log(`Deleting ${snapshot.docs.length} documents from collection: ${colName}`);
          const deletePromises = snapshot.docs.map(document => deleteDoc(doc(db, colName, document.id)));
          await Promise.all(deletePromises);
          console.log(`Successfully cleared collection: ${colName}`);
        } catch (colError) {
          console.error(`Error clearing collection ${colName}:`, colError);
          throw colError; // Re-throw to be caught by the outer try-catch
        }
      }

      setShowDeleteAllModal(false);
      window.location.reload();
    } catch (error) {
      console.error("Error deleting all data:", error);
      alert("Failed to delete all data. Check console for details.");
    } finally {
      setIsDeletingAll(false);
    }
  };

  if (loading || !isAdmin) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const SidebarLink = ({ icon, label, tab }: { icon: string, label: string, tab: any }) => (
    <button 
      onClick={() => { setActiveTab(tab); setMobileMenuOpen(false); }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium ${
        activeTab === tab 
          ? 'bg-[#f0f5ff] text-[#0052cc] border-l-4 border-[#0052cc]' 
          : 'text-gray-600 hover:bg-gray-50 border-l-4 border-transparent'
      }`}
    >
      <span className="material-symbols-outlined text-[20px]">{icon}</span>
      {label}
    </button>
  );

  return (
    <div className="flex h-screen bg-[#f8f9fa] font-body text-on-surface overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-300 ease-in-out ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="h-16 flex items-center px-6 border-b border-gray-200 shrink-0">
          <h1 className="font-headline font-bold text-xl text-[#0052cc]">SalesHub</h1>
          <span className="ml-2 text-[10px] font-bold text-gray-400 tracking-widest uppercase mt-1">Enterprise</span>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto space-y-1 scrollbar-hide">
          {(userRole === 'superadmin' || (staffPermissions && staffPermissions.dashboard !== 'none')) && <SidebarLink icon="dashboard" label="Dashboard" tab="analytics" />}
          {(userRole === 'superadmin' || (staffPermissions && staffPermissions.orders !== 'none')) && <SidebarLink icon="shopping_cart" label="Orders" tab="orders" />}
          {(userRole === 'superadmin' || (staffPermissions && staffPermissions.products !== 'none')) && <SidebarLink icon="inventory_2" label="Products" tab="products" />}
          {(userRole === 'superadmin' || (staffPermissions && staffPermissions.products !== 'none')) && <SidebarLink icon="local_offer" label="Offers Card" tab="offers" />}
          {(userRole === 'superadmin' || (staffPermissions && staffPermissions.categories !== 'none')) && <SidebarLink icon="category" label="Categories" tab="categories" />}
          {(userRole === 'superadmin' || (staffPermissions && staffPermissions.marketing !== 'none')) && <SidebarLink icon="campaign" label="Marketing" tab="marketing" />}
          {(userRole === 'superadmin' || (staffPermissions && staffPermissions.banners !== 'none')) && <SidebarLink icon="view_carousel" label="Banners" tab="banners" />}
          {(userRole === 'superadmin' || (staffPermissions && staffPermissions.promos !== 'none')) && <SidebarLink icon="local_offer" label="Promos" tab="promos" />}
          {(userRole === 'superadmin' || (staffPermissions && staffPermissions.footer !== 'none')) && <SidebarLink icon="link" label="Footer Links" tab="footer" />}
          {(userRole === 'superadmin' || (staffPermissions && staffPermissions.payment !== 'none')) && <SidebarLink icon="payments" label="Payment Methods" tab="payment" />}
          {(userRole === 'superadmin' || (staffPermissions && staffPermissions.settings !== 'none')) && <SidebarLink icon="settings" label="Settings" tab="settings" />}
          {userRole === 'superadmin' && (
            <SidebarLink icon="manage_accounts" label="Staff Management" tab="staff" />
          )}
        </div>

        <div className="p-4 border-t border-gray-200 space-y-2 shrink-0">
          <div className="bg-[#0052cc] text-white rounded-xl p-4 mb-4">
            <h4 className="font-bold text-sm mb-1">Upgrade Plan</h4>
            <p className="text-xs opacity-80 leading-relaxed">Unlock advanced predictive analytics and real-time streaming.</p>
          </div>
          <button className="flex items-center gap-3 px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg w-full transition-colors">
            <span className="material-symbols-outlined text-[20px]">help</span>
            <span className="font-medium text-sm">Support</span>
          </button>
          {userRole === 'superadmin' && (
            <button onClick={() => setShowDeleteAllModal(true)} className="flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg w-full transition-colors">
              <span className="material-symbols-outlined text-[20px]">delete_forever</span>
              <span className="font-medium text-sm">AL delete</span>
            </button>
          )}
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg w-full transition-colors">
            <span className="material-symbols-outlined text-[20px]">logout</span>
            <span className="font-medium text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 shrink-0">
          <div className="flex items-center gap-4 flex-1">
            <button onClick={() => setMobileMenuOpen(true)} className="md:hidden text-gray-500 hover:text-gray-900">
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div className="hidden md:flex items-center gap-2 text-[#0052cc] font-bold text-xl">
              SalesHub Enterprise
            </div>
            <div className="relative max-w-md w-full md:ml-8 hidden sm:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
              <input type="text" placeholder="Search analytics..." className="w-full bg-gray-50 border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[#0052cc]/20 outline-none" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-gray-500 hover:text-gray-700">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 border border-gray-200">
              <span className="material-symbols-outlined text-[20px]">person</span>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">

        {activeTab === 'analytics' ? (
          <AdminAnalytics />
        ) : activeTab === 'marketing' ? (
          <AdminMarketing />
        ) : activeTab === 'settings' ? (
          <AdminSettings />
        ) : activeTab === 'payment' ? (
          <AdminPaymentSettings />
        ) : activeTab === 'staff' ? (
          <AdminStaffManagement />
        ) : activeTab === 'offers' ? (
          <AdminOffers />
        ) : activeTab === 'orders' ? (
          <section>
            <h2 className="font-headline font-bold text-2xl mb-4">Manage Orders</h2>
            
            {loadingOrders ? (
              <div className="text-center py-8">Loading orders...</div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8 bg-surface-container-low rounded-xl">No orders found.</div>
            ) : (
              <div className="space-y-4">
                {orders.slice(0, visibleOrders).map(order => (
                  <div key={order.id} className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant/20 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                    <div className="space-y-2 flex-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-lg">Order #{order.id.slice(0, 8).toUpperCase()}</span>
                        <span className="text-sm text-on-surface-variant">
                          {order.createdAt ? new Date(order.createdAt.toMillis()).toLocaleString() : 'N/A'}
                        </span>
                      </div>
                      
                      <div className="text-sm text-on-surface-variant">
                        <p>User ID: <span className="font-mono text-xs">{order.userId}</span></p>
                        {order.shippingAddress && (
                          <p className="mt-1">
                            <span className="font-bold">Shipping Address:</span><br/>
                            <span className="whitespace-pre-line">{order.shippingAddress}</span>
                          </p>
                        )}
                        <p className="font-semibold text-primary mt-1">Total: ${order.total.toFixed(2)}</p>
                        {order.paymentMethod && (
                          <p className="text-xs font-bold text-on-surface-variant mt-1 capitalize">
                            Payment: {order.paymentMethod === 'cod' ? 'Cash on Delivery' : order.paymentMethod}
                            {order.paymentDetails?.bkashTrxId && ` (TrxID: ${order.paymentDetails.bkashTrxId})`}
                            {order.paymentDetails?.nagadTrxId && ` (TrxID: ${order.paymentDetails.nagadTrxId})`}
                          </p>
                        )}
                      </div>

                      <div className="mt-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">Items:</p>
                        <ul className="text-sm space-y-1">
                          {order.items.map((item: any, idx: number) => (
                            <li key={idx}>• {item.quantity}x {item.name}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 min-w-[200px] w-full md:w-auto">
                      <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Status</label>
                      <div className="flex gap-2">
                        <select 
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          disabled={!canEditOrders}
                          className="bg-surface-container p-3 rounded-xl border-none outline-none focus:ring-2 focus:ring-primary flex-1 disabled:opacity-50"
                        >
                          <option value="placed">Placed</option>
                          <option value="preparing">Preparing</option>
                          <option value="out_for_delivery">Out for Delivery</option>
                          <option value="delivered">Delivered</option>
                        </select>
                        {canEditOrders && (
                          <button 
                            onClick={() => setOrderToDelete(order.id)}
                            className="w-12 h-12 flex items-center justify-center bg-error/10 text-error rounded-xl hover:bg-error/20 transition-colors"
                            title="Delete Order"
                          >
                            <span className="material-symbols-outlined">delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {visibleOrders < orders.length && (
                  <button 
                    onClick={() => setVisibleOrders(prev => prev + 20)}
                    className="w-full py-4 mt-4 bg-surface-container-low text-primary font-bold rounded-xl hover:bg-surface-container transition-colors"
                  >
                    Load More Orders
                  </button>
                )}
              </div>
            )}
          </section>
        ) : activeTab === 'products' ? (
          <AdminProducts />
        ) : activeTab === 'categories' ? (
          <AdminCategories />
        ) : activeTab === 'promos' ? (
          <AdminPromos />
        ) : activeTab === 'footer' ? (
          <AdminFooterLinks />
        ) : activeTab === 'banners' ? (
          <AdminBanners />
        ) : (
          <AdminPaymentSettings />
        )}
        </main>
      </div>

      {/* Confirmation Modal */}
      {orderToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setOrderToDelete(null)}>
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-headline font-bold text-xl mb-2 text-red-600">Remove Order</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to remove this order from the active orders list? It will still be preserved in your analytics.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setOrderToDelete(null)} 
                className="flex-1 py-3 rounded-xl font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeleteOrder} 
                className="flex-1 py-3 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Data Modal */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => !isDeletingAll && setShowDeleteAllModal(false)}>
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4 text-red-600">
              <span className="material-symbols-outlined text-3xl">warning</span>
              <h3 className="font-headline font-bold text-xl">Delete All Data</h3>
            </div>
            <p className="text-gray-800 font-medium mb-2">
              Are you absolutely sure you want to delete ALL data?
            </p>
            <p className="text-gray-600 text-sm mb-6">
              This action cannot be undone. All products, categories, orders, staff, users, and settings will be permanently erased, and the app will start fresh.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowDeleteAllModal(false)} 
                disabled={isDeletingAll}
                className="flex-1 py-3 rounded-xl font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleAllDelete} 
                disabled={isDeletingAll}
                className="flex-1 py-3 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeletingAll ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                    Deleting...
                  </>
                ) : (
                  'Yes, Delete Everything'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
