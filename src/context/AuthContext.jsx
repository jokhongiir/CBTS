// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Joriy sessiyani tekshirish
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        formatAndSetUser(session.user);
      }
      setLoading(false);
    };

    checkUser();

    // 2. Auth holati o'zgarishini tinglash (Login/Logout bo'lganda avtomat ishlaydi)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        formatAndSetUser(session.user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Supabase user obyektini bizga kerakli formatga o'tkazish
  const formatAndSetUser = (supabaseUser) => {
    setUser({
      id: supabaseUser.id,
      email: supabaseUser.email,
      // Supabase'da user sign-up paytida user_metadata ichiga fullname va role yozish mumkin
      fullname: supabaseUser.user_metadata?.fullname || "Diyorbek Xudoyorov", 
      role: supabaseUser.user_metadata?.role || "Super Admin"
    });
  };

  // Login funksiyasini Supabase'ga moslab async qilamiz
  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message); // Xatolikni Login sahifasiga otamiz
    }

    return data;
  };

  // Chiqish funksiyasi
  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);