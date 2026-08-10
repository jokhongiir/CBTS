import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { supabase } from "../../config/supabaseClient"; 
import logo from '../../assets/logo.png';
import {
  BookOpen,
  Volume2,
  PenTool,
  LogOut,
  User,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  TrendingUp,
  Lock
} from "lucide-react";
import "./StudentPortal.css";

const StudentDashboard = () => {
  const [student, setStudent] = useState(null);
  const [exams, setExams] = useState({ listening: null, reading: null, writing: null });
  const [examStatuses, setExamStatuses] = useState({ listening: false, reading: false, writing: false });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStudentAndExams = async () => {
      const savedStudent = localStorage.getItem("current_student");
      if (!savedStudent) {
        toast.error("Session expired. Please log in again.");
        navigate("/student/login");
        return;
      }

      try {
        const parsedStudent = JSON.parse(savedStudent);
        
        // 1. Talaba ma'lumotlarini bazadan yangicha tortib olish
        const { data: freshStudent, error: studentError } = await supabase
          .from("students")
          .select(`
            *,
            listening_exam:assigned_listening_exam_id (id, title, duration),
            reading_exam:assigned_reading_exam_id (id, title, duration),
            writing_exam:assigned_writing_exam_id (id, title, duration, task1_word_limit, task2_word_limit)
          `)
          .eq("id", parsedStudent.id)
          .single();

        if (studentError) throw studentError;

        if (freshStudent) {
          setStudent(freshStudent);
          setExams({
            listening: freshStudent.listening_exam,
            reading: freshStudent.reading_exam,
            writing: freshStudent.writing_exam
          });

          // 2. Talabaning imtihonlarni topshirganlik statusini tekshirish
          const { data: resultsData, error: resultsError } = await supabase
            .from("student_results")
            .select("listening_completed, reading_completed, writing_completed")
            .eq("student_id", freshStudent.id)
            .maybeSingle();

          if (!resultsError && resultsData) {
            setExamStatuses({
              listening: Boolean(resultsData.listening_completed),
              reading: Boolean(resultsData.reading_completed),
              writing: Boolean(resultsData.writing_completed)
            });
          }

          localStorage.setItem("current_student", JSON.stringify(freshStudent));
        }
      } catch (error) {
        console.error("Dashboard initialization error:", error.message);
        toast.error("Failed to synchronize student session.");
        try {
          setStudent(JSON.parse(savedStudent));
        } catch (e) {
          localStorage.removeItem("current_student");
          navigate("/student/login");
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchStudentAndExams();
  }, [navigate]);

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to terminate the session and log out?")) {
      localStorage.removeItem("current_student");
      toast.success("Successfully logged out.");
      navigate("/student/login");
    }
  };

  // Professional Modul Navigatsiyasi va Avto-Bloklash Tekshiruvi
  const navigateToModule = (type, examData) => {
    if (!examData?.id) {
      toast.error("This specific module has not been allocated to your account yet.");
      return;
    }

    // Agar modul allaqachon topshirilgan bo'lsa kirishni bloklash
    if (examStatuses[type]) {
      const moduleName = type.charAt(0).toUpperCase() + type.slice(1);
      toast.error(`You have already submitted the ${moduleName} module! Re-entry is restricted.`, {
        icon: "🔒",
        duration: 4000
      });
      return;
    }

    const cleanId = String(examData.id).replace(/^[A-Z]-/, "");
    navigate(`/student/${type}/${cleanId}`);
  };

  const completedCount = Object.values(examStatuses).filter(Boolean).length;
  const progressPercentage = Math.round((completedCount / 3) * 100);

  if (loading) {
    return (
      <div className="dashboard-loading-wrapper">
        <div className="dashboard-spinner"></div>
        <p>Loading secure assessment environment...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-portal-container">
      {/* NAVBAR */}
      <nav className="dashboard-top-navbar">
        <div className="navbar-brand-identity">
          <div className="brand-logo-wrapper">
            <img src={logo} alt="Intellect Academy Logo" className="brand-logo-img" />
          </div>
          <div className="brand-text-block">
            <h3>Intellect Academy</h3>
            <span>CBT Assessment Portal</span>
          </div>
        </div>
        
        <div className="navbar-session-controls">
          <div className="user-profile-badge">
            <div className="user-avatar-circle">
              <User size={16} />
            </div>
            <span className="user-fullName">{student?.full_name || "Candidate"}</span>
          </div>
          
          <button onClick={handleLogout} className="action-logout-trigger" title="Log Out">
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </nav>

      {/* MAIN WORKSPACE */}
      <main className="dashboard-main-workspace">
        <section className="workspace-hero-banner">
          <div className="hero-content-left">
            <div className="welcome-tag">
              <Sparkles size={16} /> Welcome back, {student?.full_name?.split(" ")[0] || "Candidate"}!
            </div>
            <h1>Assigned Examination Modules</h1>
            <p>Access your allocated IELTS skill blocks below. Ensure a stable internet connection prior to launching any module.</p>
          </div>

          <div className="hero-stats-card">
            <div className="stats-info">
              <span>Overall Progress</span>
              <h3>{completedCount} / 3 Completed</h3>
            </div>
            <div className="mini-progress-bar-container">
              <div className="mini-progress-fill" style={{ width: `${progressPercentage}%` }}></div>
            </div>
            <div className="security-status-pill">
              <ShieldAlert size={14} />
              <span>Proctored Environment Active</span>
            </div>
          </div>
        </section>

        {/* MODULES GRID */}
        <div className="modules-assessment-grid">
          <ModuleCard
            title="Listening Module"
            subtitle="Audio Comprehension & Analysis"
            icon={<Volume2 size={26} />}
            data={exams.listening}
            isSubmitted={examStatuses.listening}
            onClick={() => navigateToModule("listening", exams.listening)}
            themeClass="theme-listening"
          />
          <ModuleCard
            title="Reading Module"
            subtitle="Text Analysis & Critical Tasks"
            icon={<BookOpen size={26} />}
            data={exams.reading}
            isSubmitted={examStatuses.reading}
            onClick={() => navigateToModule("reading", exams.reading)}
            themeClass="theme-reading"
          />
          <ModuleCard
            title="Writing Module"
            subtitle="Task 1 & Task 2 Composition"
            icon={<PenTool size={26} />}
            data={exams.writing}
            isSubmitted={examStatuses.writing}
            onClick={() => navigateToModule("writing", exams.writing)}
            themeClass="theme-writing"
          />
        </div>
      </main>
    </div>
  );
};

const ModuleCard = ({ title, subtitle, icon, data, isSubmitted, onClick, themeClass }) => {
  const hasExam = Boolean(data?.id);

  return (
    <div className={`assessment-module-card ${themeClass} ${isSubmitted ? 'card-completed' : ''}`}>
      <div className="module-visual-header">
        <div className="module-icon-box">{icon}</div>
        <div className="module-status-indicator">
          {isSubmitted ? (
            <span className="badge-status submitted"><CheckCircle2 size={14} /> Submitted</span>
          ) : hasExam ? (
            <span className="badge-status available"><TrendingUp size={14} /> Ready</span>
          ) : (
            <span className="badge-status unassigned"><AlertCircle size={14} /> Unassigned</span>
          )}
        </div>
      </div>
      
      <div className="module-body-context">
        <span className="module-category-tag">{title}</span>
        <h4 className="module-title-heading">{data?.title || "No Module Allocated Yet"}</h4>
        <p className="module-subtitle-desc">{subtitle}</p>
        
        <div className="module-parameters-stack">
          <div className="parameter-item">
            <Clock size={15} />
            <span>Duration: <strong>{data?.duration ? `${data.duration} Minutes` : "N/A"}</strong></span>
          </div>
        </div>
        
        <button 
          onClick={onClick} 
          className={`btn-trigger-module ${isSubmitted ? 'btn-completed' : ''}`} 
          disabled={!hasExam || isSubmitted}
        >
          {isSubmitted ? (
            <>
              <Lock size={16} /> Completed & Locked
            </>
          ) : hasExam ? (
            'Launch Assessment'
          ) : (
            'Awaiting Assignment'
          )}
        </button>
      </div>
    </div>
  );
};

export default StudentDashboard;