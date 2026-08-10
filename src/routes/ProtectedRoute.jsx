// src/routes/ProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();

  if (!user) {
    // Agar login qilmagan bo'lsa, login sahifasiga otib yuboradi
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

export default ProtectedRoute;