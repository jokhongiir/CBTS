import React, { useState, useEffect } from 'react';
import { 
  Users, 
  BookOpen, 
  Volume2, 
  PenTool, 
  TrendingUp, 
  Activity,
  RefreshCw
} from 'lucide-react';
import { supabase } from '../../config/supabaseClient';
import { toast } from 'react-hot-toast';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import './Dashboard.css';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    studentsCount: 0,
    listeningCount: 0,
    readingCount: 0,
    writingCount: 0,
  });

  // Fetch real count data from Supabase
  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const [studentsRes, listeningRes, readingRes, writingRes] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }),
        supabase.from('listening_exams').select('*', { count: 'exact', head: true }),
        supabase.from('reading_exams').select('*', { count: 'exact', head: true }),
        supabase.from('writing_exams').select('*', { count: 'exact', head: true }),
      ]);

      setStats({
        studentsCount: studentsRes.count || 0,
        listeningCount: listeningRes.count || 0,
        readingCount: readingRes.count || 0,
        writingCount: writingRes.count || 0,
      });

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to update dashboard statistics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Mock data for weekly analytics visualization
  const chartData = [
    { name: 'Monday', attempts: 240 },
    { name: 'Tuesday', attempts: 380 },
    { name: 'Wednesday', attempts: 410 },
    { name: 'Thursday', attempts: 320 },
    { name: 'Friday', attempts: 590 },
    { name: 'Saturday', attempts: 720 },
    { name: 'Sunday', attempts: 480 },
  ];

  if (loading) {
    return (
      <div className="dashboard-loading">
        <RefreshCw className="spinner animate-spin" size={40} />
        <p>Loading dashboard statistics...</p>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Students",
      value: stats.studentsCount,
      change: "Registered accounts",
      icon: Users,
      colorClass: "blue"
    },
    {
      title: "Listening Exams",
      value: stats.listeningCount,
      change: "Active audio tests",
      icon: Volume2,
      colorClass: "purple"
    },
    {
      title: "Reading Exams",
      value: stats.readingCount,
      change: "Active reading tests",
      icon: BookOpen,
      colorClass: "green"
    },
    {
      title: "Writing Exams",
      value: stats.writingCount,
      change: "Active essay topics",
      icon: PenTool,
      colorClass: "orange"
    }
  ];

  return (
    <div className="dashboard-container animate-fade-in">
      {/* Header Section */}
      <header className="dashboard-header">
        <div className="header-title-wrapper">
          <h1 className="dashboard-title">Welcome back, Admin! 👋</h1>
          <p className="dashboard-subtitle">Real-time statistics and overview of the Intellect Academy CBT system</p>
        </div>
        <button onClick={fetchDashboardData} className="btn-refresh-dashboard">
          <RefreshCw size={16} /> Sync Data
        </button>
      </header>

      {/* Grid Statistics Metrics */}
      <section className="dashboard-stats-grid" aria-label="Statistics Metrics">
        {statCards.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <div key={index} className="stat-card">
              <div className="stat-card-body">
                <div className="stat-card-info">
                  <span className="stat-card-title">{stat.title}</span>
                  <h3 className="stat-card-value">{stat.value}</h3>
                  <span className="stat-card-change">
                    <TrendingUp className="change-icon" size={14} /> 
                    {stat.change}
                  </span>
                </div>
                <div className={`stat-card-icon-wrapper ${stat.colorClass}`}>
                  <IconComponent size={24} strokeWidth={2} />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Full Width Chart Section */}
      <div className="dashboard-charts-layout-full">
        <div className="dashboard-chart-card full-width">
          <div className="chart-card-header">
            <div>
              <h2 className="chart-card-title">Weekly Exam Performance</h2>
              <p className="chart-card-subtitle">Total completed CBT exam attempts per day</p>
            </div>
            <div className="chart-badge">
              <Activity size={14} /> Live Trend
            </div>
          </div>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAttempts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderRadius: '8px', 
                    color: '#fff', 
                    border: 'none',
                    fontSize: '12px'
                  }} 
                />
                <Area type="monotone" dataKey="attempts" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorAttempts)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;