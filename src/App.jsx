import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AdminLayout from './components/layouts/AdminLayout';
import ProtectedRoute from './routes/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import Home from './pages/Home/Home';
import Login from './pages/Auth/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import Students from './pages/Students/Students'; 
import Writing from './pages/Writing/Writing'; 
import Reading from './pages/Reading/Reading'; 
import Listening from './pages/Listening/Listening';
import Results from './pages/Results/AllResults';
import StudentLogin from './pages/StudentPortal/Login';
import StudentDashboard from './pages/StudentPortal/Dashboard';
import StudentWriting from './pages/StudentPortal/Writing';
import StudentReading from './pages/StudentPortal/Reading';
import StudentListening from './pages/StudentPortal/Listening';

const SettingsPlaceholder = () => (
  <div className="p-10 text-center">
    <h2 className="text-2xl font-semibold">Tizim Sozlamalari</h2>
    <p className="text-gray-500 mt-2">Tez orada qo'shiladi...</p>
  </div>
);

const AdminIndexRedirect = () => {
  const { user } = useAuth();
  return user?.id 
    ? <Navigate to={`/admin/dashboard/${user.id}`} replace /> 
    : <Navigate to="/admin/login" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      
      <Routes>
        <Route path="/" element={<Home />} />
        
        {/* Student Portal */}
        <Route path="/student/login" element={<StudentLogin />} />
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/student/listening/:examId" element={<StudentListening />} />
        <Route path="/student/reading/:examId" element={<StudentReading />} />
        <Route path="/student/writing/:examId" element={<StudentWriting />} />
        
        {/* Admin Panel */}
        <Route path="/admin/login" element={<Login />} />
        <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
          <Route index element={<AdminIndexRedirect />} />
          <Route path="dashboard/:adminId" element={<Dashboard />} />
          <Route path="students" element={<Students />} />
          
          {/* Sidebar bilan 100% moslashtirilgan umumiy natijalar routi */}
          <Route path="all-results" element={<Results />} />
          
          <Route path="listening" element={<Listening />} />
          <Route path="reading" element={<Reading />} />
          <Route path="writing" element={<Writing />} />
          <Route path="settings" element={<SettingsPlaceholder />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;