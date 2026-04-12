import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase';

export interface StaffPermissions {
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
}

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  userRole: 'superadmin' | 'staff' | 'user' | null;
  staffPermissions: StaffPermissions | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signupWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<'superadmin' | 'staff' | 'user' | null>(null);
  const [staffPermissions, setStaffPermissions] = useState<StaffPermissions | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setLoading(true); // Ensure loading is true while fetching roles
      }
      setUser(currentUser);
      if (currentUser) {
        try {
          if (currentUser.email === 'exsajibislam11@gmail.com') {
            setUserRole('superadmin');
            setIsAdmin(true);
            setStaffPermissions({
              dashboard: 'edit',
              orders: 'edit',
              products: 'edit',
              categories: 'edit',
              marketing: 'edit',
              banners: 'edit',
              promos: 'edit',
              footer: 'edit',
              payment: 'edit',
              settings: 'edit'
            });
          } else {
            const staffRef = doc(db, 'staff', (currentUser.email || '').toLowerCase());
            const staffSnap = await getDoc(staffRef);
            
            if (staffSnap.exists()) {
              const staffData = staffSnap.data();
              setUserRole('staff');
              setIsAdmin(true);
              
              const defaultPerms = {
                dashboard: 'none',
                orders: 'none',
                products: 'none',
                categories: 'none',
                marketing: 'none',
                banners: 'none',
                promos: 'none',
                footer: 'none',
                payment: 'none',
                settings: 'none'
              } as StaffPermissions;
              
              setStaffPermissions({ ...defaultPerms, ...(staffData.permissions || {}) });
            } else {
              // Check legacy users collection for admin
              const userRef = doc(db, 'users', currentUser.uid);
              const userSnap = await getDoc(userRef);
              if (userSnap.exists() && userSnap.data().role === 'admin') {
                setUserRole('staff');
                setIsAdmin(true);
                setStaffPermissions({
                  dashboard: 'edit',
                  orders: 'edit',
                  products: 'edit',
                  categories: 'edit',
                  marketing: 'edit',
                  banners: 'edit',
                  promos: 'edit',
                  footer: 'edit',
                  payment: 'edit',
                  settings: 'edit'
                });
              } else {
                setUserRole('user');
                setIsAdmin(false);
                setStaffPermissions(null);
              }
            }
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
          setIsAdmin(false);
          setUserRole('user');
          setStaffPermissions(null);
        }
      } else {
        setIsAdmin(false);
        setUserRole(null);
        setStaffPermissions(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const currentUser = result.user;
      
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL,
          role: currentUser.email === 'exsajibislam11@gmail.com' ? 'admin' : 'user'
        });
      }
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') {
        console.error("Error signing in with Google", error);
      }
      throw error;
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error: any) {
      if (error.code !== 'auth/invalid-credential') {
        console.error("Error signing in with email", error);
      }
      throw error;
    }
  };

  const signupWithEmail = async (email: string, pass: string, name: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, pass);
      const currentUser = result.user;
      
      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(userRef, {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: name,
        photoURL: null,
        role: currentUser.email === 'exsajibislam11@gmail.com' ? 'admin' : 'user'
      });
    } catch (error: any) {
      if (error.code !== 'auth/email-already-in-use') {
        console.error("Error signing up with email", error);
      }
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, userRole, staffPermissions, loading, loginWithGoogle, loginWithEmail, signupWithEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
