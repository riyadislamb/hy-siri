import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

interface StaffMember {
  email: string;
  roleTitle: string;
  permissions: {
    dashboard: 'none' | 'view' | 'edit';
    orders: 'none' | 'view' | 'edit';
    products: 'none' | 'view' | 'edit';
    categories: 'none' | 'view' | 'edit';
    marketing: 'none' | 'view' | 'edit';
    banners: 'none' | 'view' | 'edit';
    promos: 'none' | 'view' | 'edit';
    footer: 'none' | 'view' | 'edit';
    payment: 'none' | 'view' | 'edit';
    settings: 'none' | 'view' | 'edit';
  };
}

const defaultPermissions = {
  dashboard: 'none' as const,
  orders: 'none' as const,
  products: 'none' as const,
  categories: 'none' as const,
  marketing: 'none' as const,
  banners: 'none' as const,
  promos: 'none' as const,
  footer: 'none' as const,
  payment: 'none' as const,
  settings: 'none' as const,
};

const modules = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'orders', label: 'Orders' },
  { id: 'products', label: 'Products' },
  { id: 'categories', label: 'Categories' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'banners', label: 'Banners' },
  { id: 'promos', label: 'Promos' },
  { id: 'footer', label: 'Footer Links' },
  { id: 'payment', label: 'Payment Methods' },
  { id: 'settings', label: 'Settings' },
];

export default function AdminStaffManagement() {
  const { userRole } = useAuth();
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertOpen, setAlertOpen] = useState(false);

  // Form State
  const [email, setEmail] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [permissions, setPermissions] = useState(defaultPermissions);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const staffSnap = await getDocs(collection(db, 'staff'));
      const staffData = staffSnap.docs.map(doc => ({ email: doc.id, ...doc.data() } as StaffMember));
      setStaffList(staffData);
    } catch (error) {
      console.error("Error fetching staff:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (module: keyof typeof defaultPermissions, level: 'none' | 'view' | 'edit') => {
    setPermissions(prev => ({ ...prev, [module]: level }));
  };

  const showAlert = (message: string) => {
    setAlertMessage(message);
    setAlertOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !roleTitle) {
      showAlert("Please enter email and role title.");
      return;
    }

    setSaving(true);
    try {
      await setDoc(doc(db, 'staff', email.toLowerCase()), {
        roleTitle,
        permissions,
        createdAt: new Date().toISOString()
      });
      showAlert("Staff member saved successfully!");
      setIsAdding(false);
      resetForm();
      fetchStaff();
    } catch (error) {
      console.error("Error saving staff:", error);
      showAlert("Failed to save staff member.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (staff: StaffMember) => {
    setEmail(staff.email);
    setRoleTitle(staff.roleTitle);
    setPermissions(staff.permissions || defaultPermissions);
    setIsAdding(true);
  };

  const handleDeleteClick = (staffEmail: string) => {
    setStaffToDelete(staffEmail);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (staffToDelete) {
      try {
        await deleteDoc(doc(db, 'staff', staffToDelete));
        fetchStaff();
      } catch (error) {
        console.error("Error deleting staff:", error);
        showAlert("Failed to delete staff member.");
      } finally {
        setDeleteModalOpen(false);
        setStaffToDelete(null);
      }
    }
  };

  const resetForm = () => {
    setEmail('');
    setRoleTitle('');
    setPermissions(defaultPermissions);
  };

  if (userRole !== 'superadmin') {
    return (
      <div className="p-8 text-center bg-surface-container-lowest rounded-2xl border border-outline-variant/20">
        <span className="material-symbols-outlined text-4xl text-error mb-2">lock</span>
        <h2 className="font-headline font-bold text-xl text-on-surface">Access Denied</h2>
        <p className="text-on-surface-variant mt-2">Only the Super Admin can manage staff roles and permissions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-headline font-bold text-2xl">Staff Management</h2>
          <p className="text-sm text-on-surface-variant mt-1">Manage admin access and permissions for your team.</p>
        </div>
        <button 
          onClick={() => {
            if (isAdding) {
              resetForm();
              setIsAdding(false);
            } else {
              setIsAdding(true);
            }
          }}
          className="bg-primary text-on-primary px-4 py-2 rounded-full font-bold flex items-center gap-2"
        >
          <span className="material-symbols-outlined">{isAdding ? 'close' : 'add'}</span>
          {isAdding ? 'Cancel' : 'Add Staff'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant/20 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1">User Email *</label>
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                className="w-full p-3 rounded-xl bg-surface-container border-none" 
                placeholder="e.g. nusratjahanoraiya@gmail.com"
                required 
                disabled={staffList.some(s => s.email === email) && email !== ''} // Disable if editing existing
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Role Title (পদ) *</label>
              <input 
                type="text" 
                value={roleTitle} 
                onChange={e => setRoleTitle(e.target.value)} 
                className="w-full p-3 rounded-xl bg-surface-container border-none" 
                placeholder="e.g. Manager, Investor, Marketing Admin"
                required 
              />
            </div>
          </div>

          <div>
            <h3 className="font-bold text-lg mb-4 border-b border-outline-variant/20 pb-2">Permissions (অ্যাক্সেস)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant/20">
                    <th className="p-3 font-bold text-sm text-on-surface-variant">Module (ক্যাটাগরি)</th>
                    <th className="p-3 font-bold text-sm text-center text-error">No Access</th>
                    <th className="p-3 font-bold text-sm text-center text-primary">View Only (শুধু দেখা)</th>
                    <th className="p-3 font-bold text-sm text-center text-green-600">Edit (এডিট)</th>
                  </tr>
                </thead>
                <tbody>
                  {modules.map(mod => (
                    <tr key={mod.id} className="border-b border-outline-variant/10 last:border-0 hover:bg-surface-container/50">
                      <td className="p-3 font-medium text-sm">{mod.label}</td>
                      <td className="p-3 text-center">
                        <input 
                          type="radio" 
                          name={`perm-${mod.id}`} 
                          checked={permissions[mod.id as keyof typeof defaultPermissions] === 'none'}
                          onChange={() => handlePermissionChange(mod.id as keyof typeof defaultPermissions, 'none')}
                          className="w-4 h-4 accent-error"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <input 
                          type="radio" 
                          name={`perm-${mod.id}`} 
                          checked={permissions[mod.id as keyof typeof defaultPermissions] === 'view'}
                          onChange={() => handlePermissionChange(mod.id as keyof typeof defaultPermissions, 'view')}
                          className="w-4 h-4 accent-primary"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <input 
                          type="radio" 
                          name={`perm-${mod.id}`} 
                          checked={permissions[mod.id as keyof typeof defaultPermissions] === 'edit'}
                          onChange={() => handlePermissionChange(mod.id as keyof typeof defaultPermissions, 'edit')}
                          className="w-4 h-4 accent-green-600"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button type="submit" disabled={saving} className="bg-primary text-on-primary px-8 py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Staff Member'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-8">Loading staff...</div>
      ) : staffList.length === 0 ? (
        <div className="text-center py-8 bg-surface-container-low rounded-xl">No staff members found.</div>
      ) : (
        <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant/20">
                  <th className="p-4 font-bold text-sm text-on-surface-variant">Email</th>
                  <th className="p-4 font-bold text-sm text-on-surface-variant">Role</th>
                  <th className="p-4 font-bold text-sm text-on-surface-variant">Access Summary</th>
                  <th className="p-4 font-bold text-sm text-on-surface-variant text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map(staff => (
                  <tr key={staff.email} className="border-b border-outline-variant/10 last:border-0 hover:bg-surface-container/30">
                    <td className="p-4 font-medium">{staff.email}</td>
                    <td className="p-4">
                      <span className="bg-primary/10 text-primary px-2 py-1 rounded-md text-xs font-bold">
                        {staff.roleTitle}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(staff.permissions).map(([mod, level]) => {
                          if (level === 'none') return null;
                          return (
                            <span key={mod} className={`text-[10px] px-1.5 py-0.5 rounded ${level === 'edit' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                              {mod}: {level}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => handleEdit(staff)} className="text-primary hover:bg-primary/10 p-2 rounded-full transition-colors inline-flex items-center justify-center mr-1" title="Edit">
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                      <button onClick={() => handleDeleteClick(staff.email)} className="text-error hover:bg-error/10 p-2 rounded-full transition-colors inline-flex items-center justify-center" title="Remove">
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteModalOpen(false)}>
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-headline font-bold text-xl mb-2 text-red-600">Remove Staff Member</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to remove access for {staffToDelete}?
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteModalOpen(false)} 
                className="flex-1 py-3 rounded-xl font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete} 
                className="flex-1 py-3 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {alertOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setAlertOpen(false)}>
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-xl text-center" onClick={e => e.stopPropagation()}>
            <p className="text-gray-800 mb-6 font-medium">{alertMessage}</p>
            <button 
              onClick={() => setAlertOpen(false)} 
              className="w-full py-3 rounded-xl font-bold bg-primary text-white hover:bg-primary/90 transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
