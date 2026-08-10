import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  RiDashboardLine, 
  RiUserFollowLine, 
  RiVolumeUpLine, 
  RiBookOpenLine, 
  RiPenNibLine, 
  RiAwardLine, 
  RiSettings4Line, 
  RiLogoutBoxRLine 
} from 'react-icons/ri';
import { useAuth } from '../../context/AuthContext'; 
import './Sidebar.css';

// Komponentga `isModalOpen` propsini uzatamiz (ixtiyoriy, agar modal holatini global boshqarsangiz)
const Sidebar = ({ isModalOpen = false }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Menyu ro'yxati (App.jsx dagi url arxitekturasiga to'liq moslangan)
  const menuItems = [
    { 
      path: user?.id ? `/admin/dashboard/${user.id}` : '/admin/dashboard', 
      name: 'Dashboard', 
      icon: <RiDashboardLine /> 
    },
    { path: '/admin/students', name: 'Students', icon: <RiUserFollowLine /> },
    { path: '/admin/all-results', name: 'All Results', icon: <RiAwardLine /> },
    { path: '/admin/listening', name: 'Listening Questions', icon: <RiVolumeUpLine /> },
    { path: '/admin/reading', name: 'Reading Questions', icon: <RiBookOpenLine /> },
    { path: '/admin/writing', name: 'Writing Questions', icon: <RiPenNibLine /> },
    { path: '/admin/settings', name: 'Settings', icon: <RiSettings4Line /> },
  ];

  const handleLogout = async () => {
    // Brauzer standart confirm() oynasini chiroyli tarzda ishlatish
    const confirmLogout = window.confirm("Tizimdan chiqmoqchimisiz?");
    if (!confirmLogout) return;

    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error("Chiqishda xatolik yuz berdi:", error.message);
    }
  };

  return (
    <aside 
      /* Modal ochiq bo'lsa, sidebar bosilmaydigan va xiralashgan holatga o'tadi */
      className={`sidebar-container ${isModalOpen ? 'sidebar-disabled-blur' : ''}`}
      aria-hidden={isModalOpen}
    >
      {/* LOGO QISMI */}
      <div className="sidebar-logo-section">
        <h2 className="sidebar-logo-text">
          Intellect <span>Academy</span>
        </h2>
        <span className="sidebar-badge">CBT System</span>
      </div>

      {/* NAVIGATSIYA MENYUSI */}
      <nav className="sidebar-nav-menu">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            tabIndex={isModalOpen ? -1 : 0} /* Modal ochiqligida tab bosilganda o'tmasligi uchun */
            className={({ isActive }) => 
              isActive ? "sidebar-nav-link sidebar-active-link" : "sidebar-nav-link"
            }
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-link-text">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* CHIQISH TUGMASI (FOOTER) */}
      <div className="sidebar-footer">
        <button 
          onClick={handleLogout} 
          className="sidebar-logout-btn"
          tabIndex={isModalOpen ? -1 : 0}
        >
          <RiLogoutBoxRLine className="sidebar-icon" />
          <span className="sidebar-link-text">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;