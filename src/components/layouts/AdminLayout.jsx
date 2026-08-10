import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../Sidebar/Sidebar';
import Navbar from '../Navbar/Navbar';
import './AdminLayout.css';

const AdminLayout = () => {
  return (
    <div className="admin-layout-wrapper">
      <Sidebar />
      <div className="admin-main-content">
        <Navbar />
        <main className="admin-page-body">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;