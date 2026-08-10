// src/components/Navbar/Navbar.jsx
import React, { useMemo } from 'react';
import { RiUser3Line, RiNotification3Line } from 'react-icons/ri';
import { useAuth } from '../../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user } = useAuth();

  const today = useMemo(() => {
    return new Date().toLocaleDateString('uz-UZ', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }, []);

  return (
    <header className="navbar-header">
      <div className="navbar-left">
        <span className="navbar-date">Sana: {today}</span>
      </div>

      <div className="navbar-right">
        <button className="navbar-notify-btn" aria-label="Notifications">
          <RiNotification3Line />
          <span className="navbar-notify-badge"></span>
        </button>
        
        <div className="navbar-profile">
          <div className="navbar-avatar">
            <RiUser3Line />
          </div>
          <div className="navbar-profile-info">
            <h4 className="navbar-admin-name">{user?.role || "Admin"}</h4>
            {/* Mana bu yerda admin ID-si ekranda ko'rinadigan bo'ldi */}
            <span className="navbar-role" style={{ fontSize: '11px', opacity: 0.7 }}>
              ID: {user?.id ? `${user.id.substring(0, 8)}...` : 'Yuklanmoqda...'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;