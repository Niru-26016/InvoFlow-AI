import { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserRole(data.role);
          setUserProfile(data);
        }
      } else {
        setUser(null);
        setUserRole(null);
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const register = async (email, password, role, companyName, gstin) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const profile = {
      email,
      role,
      companyName,
      createdAt: new Date().toISOString()
    };
    if (gstin) profile.gstin = gstin;
    await setDoc(doc(db, 'users', result.user.uid), profile);
    setUserRole(role);
    setUserProfile(profile);
    return result;
  };

  const login = async (email, password) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getDoc(doc(db, 'users', result.user.uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      setUserRole(data.role);
      setUserProfile(data);
    }
    return result;
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setUserRole(null);
    setUserProfile(null);
  };

  const value = { user, userRole, userProfile, loading, register, login, logout };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
