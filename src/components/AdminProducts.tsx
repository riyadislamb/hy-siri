import React, { useState, useEffect, useRef } from 'react';
import { collection, query, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

export default function AdminProducts() {
  const { userRole, staffPermissions } = useAuth();
  const canEdit = userRole === 'superadmin' || (staffPermissions && staffPermissions.products === 'edit');

  const [dishes, setDishes] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [visibleProducts, setVisibleProducts] = useState(10);
  const [repostCounts, setRepostCounts] = useState<{[key: string]: number}>({});
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [promoCode, setPromoCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  const [prepTime, setPrepTime] = useState('15-20 min');
  const [points, setPoints] = useState('');
  const [stock, setStock] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [imageInput, setImageInput] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const dishesQ = query(collection(db, 'dishes'));
      const dishesSnapshot = await getDocs(dishesQ);
      const dishesData = dishesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDishes(dishesData);

      const categoriesQ = query(collection(db, 'categories'));
      const categoriesSnapshot = await getDocs(categoriesQ);
      const categoriesData = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCategories(categoriesData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setIsUploading(true);
    const newImageUrls: string[] = [];
    
    try {
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        newImageUrls.push(downloadURL);
      }
      setImages(prev => [...prev, ...newImageUrls]);
    } catch (error) {
      console.error("Error uploading images:", error);
      alert("Failed to upload images.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAddImageUrl = () => {
    if (imageInput.trim()) {
      const urls = imageInput.split(/[\s\n,]+/).filter(url => url.trim() !== '');
      setImages([...images, ...urls]);
      setImageInput('');
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleAddRepost = async (dish: any) => {
    try {
      const dishRef = doc(db, 'dishes', dish.id);
      const newCount = (dish.repostCount || 0) + 1;
      await updateDoc(dishRef, {
        repostCount: newCount
      });
      fetchData();
    } catch (error) {
      console.error("Error updating copy count:", error);
      alert("Failed to update copy count.");
    }
  };

  const handleReduceRepost = async (dish: any) => {
    if (!dish.repostCount || dish.repostCount <= 0) return;
    try {
      const dishRef = doc(db, 'dishes', dish.id);
      const newCount = dish.repostCount - 1;
      await updateDoc(dishRef, {
        repostCount: newCount
      });
      fetchData();
    } catch (error) {
      console.error("Error updating copy count:", error);
      alert("Failed to update copy count.");
    }
  };

  const handleEdit = (dish: any) => {
    setEditingId(dish.id);
    setName(dish.name);
    setDescription(dish.description);
    setPrice(dish.price.toString());
    setOriginalPrice(dish.originalPrice ? dish.originalPrice.toString() : '');
    setSelectedCategories(Array.isArray(dish.category) ? dish.category : (dish.category ? [dish.category] : []));
    setPromoCode(dish.promoCode || '');
    setDiscountAmount(dish.discountAmount ? dish.discountAmount.toString() : '');
    setPrepTime(dish.prepTime || '15-20 min');
    setPoints(dish.points ? dish.points.toString() : '');
    setStock(dish.stock !== undefined ? dish.stock.toString() : '');
    setImages(dish.images || []);
    setIsAdding(true);
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setPrice('');
    setOriginalPrice('');
    setSelectedCategories([]);
    setPromoCode('');
    setDiscountAmount('');
    setPrepTime('15-20 min');
    setPoints('');
    setStock('');
    setImages([]);
    setImageInput('');
    setIsAdding(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !description || !price || images.length === 0) {
      alert("Please fill in all required fields and add at least one image.");
      return;
    }

    try {
      const dishData = {
        name,
        description,
        price: parseFloat(price),
        originalPrice: originalPrice ? parseFloat(originalPrice) : null,
        category: selectedCategories,
        images,
        promoCode: promoCode || null,
        discountAmount: discountAmount ? parseFloat(discountAmount) : 0,
        prepTime: prepTime || "15-20 min",
        points: points ? parseInt(points, 10) : 0,
        stock: stock ? parseInt(stock, 10) : 0,
        rating: 0,
        reviews: 0,
        calories: "500 kcal" // Default
      };

      if (editingId) {
        await updateDoc(doc(db, 'dishes', editingId), dishData);
      } else {
        await addDoc(collection(db, 'dishes'), dishData);
      }
      
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error saving dish:", error);
      alert("Failed to save product.");
    }
  };

  const handleDelete = (id: string) => {
    setProductToDelete(id);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
    try {
      await deleteDoc(doc(db, 'dishes', productToDelete));
      fetchData();
    } catch (error) {
      console.error("Error deleting dish:", error);
      alert("Failed to delete product.");
    } finally {
      setProductToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="font-headline font-bold text-2xl">Manage Products</h2>
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
            {isAdding ? 'Cancel' : 'Add Product'}
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant/20 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1">Product Name *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-3 rounded-xl bg-surface-container border-none" required />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Price ($) *</label>
              <input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} className="w-full p-3 rounded-xl bg-surface-container border-none" required />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Original Price ($) (For Flash Deals)</label>
              <input type="number" step="0.01" value={originalPrice} onChange={e => setOriginalPrice(e.target.value)} className="w-full p-3 rounded-xl bg-surface-container border-none" placeholder="e.g. 5.99" />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Categories</label>
              {categories.length > 0 ? (
                <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-surface-container border-none min-h-[50px]">
                  {categories.map(cat => (
                    <label key={cat.id} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg shadow-sm cursor-pointer hover:bg-gray-50">
                      <input 
                        type="checkbox" 
                        checked={selectedCategories.includes(cat.name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCategories([...selectedCategories, cat.name]);
                          } else {
                            setSelectedCategories(selectedCategories.filter(c => c !== cat.name));
                          }
                        }}
                        className="w-4 h-4 accent-primary"
                      />
                      <span className="text-sm font-medium">{cat.name}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <input type="text" value={selectedCategories[0] || ''} onChange={e => setSelectedCategories([e.target.value])} className="w-full p-3 rounded-xl bg-surface-container border-none" placeholder="e.g. Burgers" />
              )}
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Promo Code (Hidden)</label>
              <input type="text" value={promoCode} onChange={e => setPromoCode(e.target.value)} className="w-full p-3 rounded-xl bg-surface-container border-none" placeholder="e.g. SAVE20" />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Discount Amount ($)</label>
              <input type="number" step="0.01" value={discountAmount} onChange={e => setDiscountAmount(e.target.value)} className="w-full p-3 rounded-xl bg-surface-container border-none" />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Prep Time</label>
              <input type="text" value={prepTime} onChange={e => setPrepTime(e.target.value)} className="w-full p-3 rounded-xl bg-surface-container border-none" placeholder="e.g. 15-20 min" />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Points Earned</label>
              <input type="number" min="0" value={points} onChange={e => setPoints(e.target.value)} className="w-full p-3 rounded-xl bg-surface-container border-none" placeholder="e.g. 10" />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Stock Quantity</label>
              <input type="number" min="0" value={stock} onChange={e => setStock(e.target.value)} className="w-full p-3 rounded-xl bg-surface-container border-none" placeholder="e.g. 50" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">Description *</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full p-3 rounded-xl bg-surface-container border-none h-24" required></textarea>
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">Images *</label>
            <div className="flex flex-col gap-3 mb-4">
              {/* File Upload */}
              <div>
                <input 
                  type="file" 
                  multiple
                  accept="image/*"
                  onChange={handleFileChange} 
                  ref={fileInputRef}
                  className="hidden" 
                />
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()} 
                  disabled={isUploading}
                  className="w-full bg-secondary-container text-on-secondary-container px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 border border-dashed border-outline"
                >
                  <span className="material-symbols-outlined">upload</span>
                  {isUploading ? 'Uploading...' : 'Upload Images from Device'}
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="h-px bg-outline-variant/30 flex-1"></div>
                <span className="text-xs font-bold text-on-surface-variant uppercase">OR</span>
                <div className="h-px bg-outline-variant/30 flex-1"></div>
              </div>

              {/* URL Input */}
              <div className="flex flex-col gap-2">
                <textarea 
                  value={imageInput} 
                  onChange={e => setImageInput(e.target.value)} 
                  className="w-full p-3 rounded-xl bg-surface-container border-none min-h-[100px]" 
                  placeholder="Paste multiple image URLs here (separated by spaces or newlines)" 
                />
                <button type="button" onClick={handleAddImageUrl} className="bg-secondary text-on-secondary px-4 py-2 rounded-xl font-bold self-end">Add URLs</button>
              </div>
            </div>
            
            {images.length > 0 && (
              <div className="flex gap-2 overflow-x-auto py-2">
                {images.map((img, idx) => (
                  <div key={idx} className="relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden group">
                    <img src={img} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                    <button 
                      type="button" 
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button type="submit" disabled={isUploading} className="w-full bg-primary text-on-primary py-3 rounded-xl font-bold mt-4 disabled:opacity-50">
            {editingId ? 'Update Product' : 'Save Product'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="text-center py-8">Loading products...</div>
      ) : dishes.length === 0 ? (
        <div className="text-center py-8 bg-surface-container-low rounded-xl">No products found.</div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dishes.slice(0, visibleProducts).map(dish => (
              <div key={dish.id} className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm border border-outline-variant/20 flex flex-col">
                <div className="h-48 relative">
                  <img src={dish.images?.[0] || 'https://placehold.co/400x300?text=No+Image'} alt={dish.name} className="w-full h-full object-cover" />
                  {dish.promoCode && (
                    <div className="absolute top-2 right-2 bg-primary text-on-primary text-xs font-bold px-2 py-1 rounded-md">
                      Has Promo
                    </div>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg leading-tight">{dish.name}</h3>
                    <span className="font-bold text-primary">${dish.price.toFixed(2)}</span>
                  </div>
                  <p className="text-sm text-on-surface-variant line-clamp-2 mb-4 flex-1">{dish.description}</p>
                  
                  <div className="flex justify-between items-center mt-auto pt-4 border-t border-outline-variant/20">
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap gap-1">
                        {Array.isArray(dish.category) ? dish.category.map((c: string, i: number) => (
                          <span key={i} className="text-xs text-on-surface-variant bg-surface-container px-2 py-1 rounded-md w-fit">{c}</span>
                        )) : (
                          <span className="text-xs text-on-surface-variant bg-surface-container px-2 py-1 rounded-md w-fit">{dish.category || 'Uncategorized'}</span>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-md w-fit ${dish.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {dish.stock > 0 ? `Stock: ${dish.stock}` : 'Out of Stock'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {canEdit && (
                        <>
                          <div className="flex items-center bg-surface-container rounded-lg overflow-hidden mr-1">
                            <button onClick={() => handleReduceRepost(dish)} disabled={!dish.repostCount || dish.repostCount <= 0} className="text-error hover:bg-error/10 p-1 transition-colors flex items-center justify-center disabled:opacity-30" title="Remove Copy">
                              <span className="material-symbols-outlined text-sm">remove</span>
                            </button>
                            <span className="text-xs font-bold px-2 min-w-[20px] text-center" title="Total Copies">{dish.repostCount || 0}</span>
                            <button onClick={() => handleAddRepost(dish)} className="text-primary hover:bg-primary/10 p-1 transition-colors flex items-center justify-center" title="Add Copy">
                              <span className="material-symbols-outlined text-sm">add</span>
                            </button>
                          </div>
                          <button onClick={() => handleEdit(dish)} className="text-primary hover:bg-primary/10 p-2 rounded-full transition-colors flex items-center justify-center" title="Edit">
                            <span className="material-symbols-outlined text-sm">edit</span>
                          </button>
                          <button onClick={() => handleDelete(dish.id)} className="text-error hover:bg-error/10 p-2 rounded-full transition-colors flex items-center justify-center" title="Delete">
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {visibleProducts < dishes.length && (
            <button 
              onClick={() => setVisibleProducts(prev => prev + 10)}
              className="w-full py-4 mt-4 bg-surface-container-low text-primary font-bold rounded-xl hover:bg-surface-container transition-colors"
            >
              Load More Products
            </button>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setProductToDelete(null)}>
          <div className="bg-surface w-full max-w-sm rounded-2xl p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-headline font-bold text-xl mb-2 text-error">Confirm Deletion</h3>
            <p className="text-on-surface-variant mb-6">
              Are you sure you want to delete this product? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setProductToDelete(null)} 
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
