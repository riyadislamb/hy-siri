import React, { useState, useEffect, useRef } from 'react';
import { collection, query, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

export default function AdminBanners() {
  const { userRole, staffPermissions } = useAuth();
  const canEdit = userRole === 'superadmin' || (staffPermissions && staffPermissions.banners === 'edit');

  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Form state
  const [tag, setTag] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [link, setLink] = useState('');
  const [image, setImage] = useState('');
  const [isActive, setIsActive] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const q = query(collection(db, 'banners'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBanners(data);
    } catch (error) {
      console.error("Error fetching banners:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setIsUploading(true);
    const file = e.target.files[0];
    
    try {
      const storageRef = ref(storage, `banners/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      setImage(downloadURL);
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to upload image.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleEdit = (banner: any) => {
    setEditingId(banner.id);
    setTag(banner.tag || '');
    setTitle(banner.title || '');
    setSubtitle(banner.subtitle || '');
    setLink(banner.link || '');
    setImage(banner.image || '');
    setIsActive(banner.isActive !== false);
    setIsAdding(true);
  };

  const resetForm = () => {
    setTag('');
    setTitle('');
    setSubtitle('');
    setLink('');
    setImage('');
    setIsActive(true);
    setIsAdding(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!image) {
      alert("Please upload an image for the banner.");
      return;
    }

    try {
      const bannerData = {
        tag,
        title,
        subtitle,
        link,
        image,
        isActive,
        createdAt: new Date().toISOString()
      };

      if (editingId) {
        await updateDoc(doc(db, 'banners', editingId), bannerData);
      } else {
        await addDoc(collection(db, 'banners'), bannerData);
      }
      
      resetForm();
      fetchBanners();
    } catch (error) {
      console.error("Error saving banner:", error);
      alert("Failed to save banner.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'banners', id));
      setDeletingId(null);
      fetchBanners();
    } catch (error) {
      console.error("Error deleting banner:", error);
      alert("Failed to delete banner.");
    }
  };

  const toggleActive = async (banner: any) => {
    try {
      await updateDoc(doc(db, 'banners', banner.id), { isActive: !banner.isActive });
      fetchBanners();
    } catch (error) {
      console.error("Error toggling banner status:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="font-headline font-bold text-2xl">Manage Banners</h2>
        {canEdit && (
          <button 
            onClick={() => {
              if (isAdding) {
                resetForm();
              } else {
                setIsAdding(true);
              }
            }}
            className="bg-primary text-on-primary px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors"
          >
            <span className="material-symbols-outlined">{isAdding ? 'close' : 'add'}</span>
            {isAdding ? 'Cancel' : 'Add Banner'}
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/20 shadow-sm space-y-4">
          <h3 className="font-bold text-lg mb-4">{editingId ? 'Edit Banner' : 'Add New Banner'}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1">Tag (e.g., Chef's Pick)</label>
              <input type="text" value={tag} onChange={e => setTag(e.target.value)} className="w-full p-3 rounded-xl bg-surface-container border-none" placeholder="e.g. Chef's Pick" />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Title</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-3 rounded-xl bg-surface-container border-none" placeholder="e.g. The Artisan Harvest Bowl" />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Subtitle</label>
              <input type="text" value={subtitle} onChange={e => setSubtitle(e.target.value)} className="w-full p-3 rounded-xl bg-surface-container border-none" placeholder="e.g. Locally sourced seasonal greens..." />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Link URL (Optional)</label>
              <input type="text" value={link} onChange={e => setLink(e.target.value)} className="w-full p-3 rounded-xl bg-surface-container border-none" placeholder="e.g. /category/fruits" />
            </div>
            <div className="flex items-center mt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-5 h-5 rounded text-primary focus:ring-primary" />
                <span className="font-bold">Active (Visible on Home Page)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">Banner Image *</label>
            <div className="flex flex-col gap-4">
              <input 
                type="text" 
                placeholder="Enter Image URL directly..." 
                value={image}
                onChange={(e) => setImage(e.target.value)}
                className="w-full p-3 rounded-xl bg-surface-container border-none focus:ring-2 focus:ring-primary/20 outline-none"
              />
              <div className="flex items-center gap-4">
                <span className="text-sm font-bold text-on-surface-variant">OR</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileChange} 
                  ref={fileInputRef}
                  className="hidden" 
                />
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="bg-surface-container-high text-on-surface px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-surface-container-highest transition-colors w-full md:w-auto"
                >
                  <span className="material-symbols-outlined">upload</span>
                  {isUploading ? 'Uploading...' : 'Upload Image'}
                </button>
              </div>
              
              {image && (
                <div className="relative w-full max-w-md h-48 rounded-xl overflow-hidden border border-outline-variant/20">
                  <img src={image} alt="Banner Preview" className="w-full h-full object-cover" />
                  <button 
                    type="button"
                    onClick={() => setImage('')}
                    className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button type="submit" disabled={isUploading || !image} className="bg-primary text-on-primary px-8 py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50">
              {editingId ? 'Update Banner' : 'Save Banner'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-8">Loading banners...</div>
      ) : banners.length === 0 ? (
        <div className="text-center py-8 bg-surface-container-low rounded-xl">No banners found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {banners.map(banner => (
            <div key={banner.id} className={`bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm border ${banner.isActive ? 'border-primary/30' : 'border-outline-variant/20 opacity-70'} flex flex-col`}>
              <div className="h-48 relative">
                <img src={banner.image || 'https://placehold.co/800x400?text=No+Image'} alt={banner.title} className="w-full h-full object-cover" />
                {!banner.isActive && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="bg-surface text-on-surface font-bold px-3 py-1 rounded-lg">Inactive</span>
                  </div>
                )}
              </div>
              <div className="p-4 flex-1 flex flex-col">
                {banner.tag && <span className="inline-block bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold w-fit mb-2">{banner.tag}</span>}
                <h3 className="font-bold text-lg leading-tight mb-1">{banner.title || 'Untitled Banner'}</h3>
                {banner.subtitle && <p className="text-sm text-on-surface-variant mb-2">{banner.subtitle}</p>}
                {banner.link && <p className="text-xs text-primary mb-4 truncate">Link: {banner.link}</p>}
                
                <div className="flex justify-between items-center mt-auto pt-4 border-t border-outline-variant/20">
                  {canEdit ? (
                    <>
                      <button 
                        onClick={() => toggleActive(banner)}
                        className={`text-sm font-bold px-3 py-1.5 rounded-lg transition-colors ${banner.isActive ? 'bg-error/10 text-error hover:bg-error/20' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
                      >
                        {banner.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleEdit(banner)} className="text-primary hover:bg-primary/10 p-2 rounded-full transition-colors flex items-center justify-center" title="Edit">
                          <span className="material-symbols-outlined text-sm">edit</span>
                        </button>
                        {deletingId === banner.id ? (
                          <div className="flex items-center gap-1 bg-error/10 rounded-full px-2 py-1">
                            <span className="text-xs font-bold text-error mr-1">Sure?</span>
                            <button onClick={() => handleDelete(banner.id)} className="text-white bg-error hover:bg-error/90 p-1 rounded-full transition-colors flex items-center justify-center" title="Confirm Delete">
                              <span className="material-symbols-outlined text-[14px]">check</span>
                            </button>
                            <button onClick={() => setDeletingId(null)} className="text-on-surface hover:bg-surface-container p-1 rounded-full transition-colors flex items-center justify-center" title="Cancel">
                              <span className="material-symbols-outlined text-[14px]">close</span>
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setDeletingId(banner.id)} className="text-error hover:bg-error/10 p-2 rounded-full transition-colors flex items-center justify-center" title="Delete">
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-sm font-bold text-on-surface-variant">
                      Status: {banner.isActive ? 'Active' : 'Inactive'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
