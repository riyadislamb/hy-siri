import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

export default function AdminCategories() {
  const { userRole, staffPermissions } = useAuth();
  const canEdit = userRole === 'superadmin' || (staffPermissions && staffPermissions.categories === 'edit');

  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const q = query(collection(db, 'categories'));
      const querySnapshot = await getDocs(q);
      const categoriesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCategories(categoriesData);
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (category: any) => {
    setEditingId(category.id);
    setName(category.name);
    setIcon(category.icon);
    setIsAdding(true);
  };

  const resetForm = () => {
    setName('');
    setIcon('');
    setIsAdding(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !icon) {
      alert("Please fill in all required fields.");
      return;
    }

    try {
      const categoryData = {
        name,
        icon
      };

      if (editingId) {
        await updateDoc(doc(db, 'categories', editingId), categoryData);
      } else {
        await addDoc(collection(db, 'categories'), categoryData);
      }
      
      resetForm();
      fetchCategories();
    } catch (error) {
      console.error("Error saving category:", error);
      alert("Failed to save category.");
    }
  };

  const handleDelete = (id: string) => {
    setCategoryToDelete(id);
  };

  const confirmDelete = async () => {
    if (!categoryToDelete) return;
    try {
      await deleteDoc(doc(db, 'categories', categoryToDelete));
      fetchCategories();
    } catch (error) {
      console.error("Error deleting category:", error);
      alert("Failed to delete category.");
    } finally {
      setCategoryToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="font-headline font-bold text-2xl">Manage Categories</h2>
        {canEdit && (
          <button 
            onClick={() => {
              if (isAdding) {
                resetForm();
              } else {
                setIsAdding(true);
              }
            }}
            className="bg-primary text-on-primary px-4 py-2 rounded-full font-bold flex items-center gap-2"
          >
            <span className="material-symbols-outlined">{isAdding ? 'close' : 'add'}</span>
            {isAdding ? 'Cancel' : 'Add Category'}
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant/20 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1">Category Name *</label>
              <input 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                className="w-full p-3 rounded-xl bg-surface-container border-none" 
                placeholder="e.g. Burgers"
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Icon (Class, SVG, or HTML) *</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={icon} 
                  onChange={e => setIcon(e.target.value)} 
                  className="flex-1 p-3 rounded-xl bg-surface-container border-none" 
                  placeholder="e.g. fa-solid fa-burger OR <svg>...</svg>"
                  required 
                />
                <div className="w-12 h-12 bg-surface-container rounded-xl flex items-center justify-center flex-shrink-0">
                  {icon ? (
                    icon.trim().startsWith('<') ? (
                      <div className="w-6 h-6 flex items-center justify-center text-primary [&_svg]:w-full [&_svg]:h-full [&_svg]:max-w-full [&_svg]:max-h-full" dangerouslySetInnerHTML={{ __html: icon }} />
                    ) : (
                      <span className="material-symbols-outlined text-xl text-primary">{icon}</span>
                    )
                  ) : (
                    <span className="text-xs text-on-surface-variant">Icon</span>
                  )}
                </div>
              </div>
              <p className="text-xs text-on-surface-variant mt-1">
                Paste a class name (e.g. <code>fa-solid fa-burger</code>), an SVG tag, or an HTML tag.
              </p>
            </div>
          </div>

          <button type="submit" className="w-full bg-primary text-on-primary py-3 rounded-xl font-bold mt-4">
            {editingId ? 'Update Category' : 'Save Category'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="text-center py-8">Loading categories...</div>
      ) : categories.length === 0 ? (
        <div className="text-center py-8 bg-surface-container-low rounded-xl">No categories found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map(category => (
            <div key={category.id} className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-outline-variant/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-container/20 rounded-full flex items-center justify-center">
                  {category.icon?.trim().startsWith('<') ? (
                    <div className="w-5 h-5 flex items-center justify-center text-primary [&_svg]:w-full [&_svg]:h-full [&_svg]:max-w-full [&_svg]:max-h-full" dangerouslySetInnerHTML={{ __html: category.icon }} />
                  ) : (
                    <span className="material-symbols-outlined text-primary text-lg">{category.icon}</span>
                  )}
                </div>
                <span className="font-bold">{category.name}</span>
              </div>
              <div className="flex items-center gap-1">
                {canEdit && (
                  <>
                    <button onClick={() => handleEdit(category)} className="text-primary hover:bg-primary/10 p-2 rounded-full transition-colors flex items-center justify-center">
                      <span className="material-symbols-outlined text-sm">edit</span>
                    </button>
                    <button onClick={() => handleDelete(category.id)} className="text-error hover:bg-error/10 p-2 rounded-full transition-colors flex items-center justify-center">
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setCategoryToDelete(null)}>
          <div className="bg-surface w-full max-w-sm rounded-2xl p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-headline font-bold text-xl mb-2 text-error">Confirm Deletion</h3>
            <p className="text-on-surface-variant mb-6">
              Are you sure you want to delete this category? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setCategoryToDelete(null)} 
                className="flex-1 py-3 rounded-xl font-bold bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete} 
                className="flex-1 py-3 rounded-xl font-bold bg-error text-on-error hover:bg-error/90 transition-colors"
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
