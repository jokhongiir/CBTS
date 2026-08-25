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
      <div className="db-loader-wrapper">
        <RefreshCw className="db-spin-icon" size={40} />
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
      theme: "db-theme-blue"
    },
    {
      title: "Listening Exams",
      value: stats.listeningCount,
      change: "Active audio tests",
      icon: Volume2,
      theme: "db-theme-purple"
    },
    {
      title: "Reading Exams",
      value: stats.readingCount,
      change: "Active reading tests",
      icon: BookOpen,
      theme: "db-theme-green"
    },
    {
      title: "Writing Exams",
      value: stats.writingCount,
      change: "Active essay topics",
      icon: PenTool,
      theme: "db-theme-orange"
    }
  ];

  return (
    <div className="db-main-container">
      {/* Header Section */}
      <header className="db-top-header">
        <div className="db-header-texts">
          <h1 className="db-main-title">Welcome back, Admin! 👋</h1>
          <p className="db-sub-title">Real-time statistics and overview of the Intellect Academy CBT system</p>
        </div>
        <button onClick={fetchDashboardData} className="db-sync-btn">
          <RefreshCw size={16} /> Sync Data
        </button>
      </header>

      {/* Grid Statistics Metrics */}
      <section className="db-metrics-grid" aria-label="Statistics Metrics">
        {statCards.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <div key={index} className="db-metric-card">
              <div className="db-card-inner">
                <div className="db-card-content">
                  <span className="db-card-label">{stat.title}</span>
                  <h3 className="db-card-number">{stat.value}</h3>
                  <span className="db-card-trend">
                    <TrendingUp className="db-trend-arrow" size={14} /> 
                    {stat.change}
                  </span>
                </div>
                <div className={`db-card-icon-box ${stat.theme}`}>
                  <IconComponent size={24} strokeWidth={2} />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Full Width Chart Section */}
      <div className="db-analytics-section">
        <div className="db-chart-panel">
          <div className="db-panel-header">
            <div>
              <h2 className="db-panel-title">Weekly Exam Performance</h2>
              <p className="db-panel-subtitle">Total completed CBT exam attempts per day</p>
            </div>
            <div className="db-live-badge">
              <Activity size={14} /> Live Trend
            </div>
          </div>
          <div className="db-graph-container">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="dbGradColor" x1="0" y1="0" x2="0" y2="1">
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
                <Area type="monotone" dataKey="attempts" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#dbGradColor)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;