import React, { useState, useEffect, useCallback } from 'react';
import { Search, Trash2, Calendar, BookOpen, Users, Loader2, UserPlus } from 'lucide-react';
import CreateStudent from './CreateStudent';
import { supabase } from '../../config/supabaseClient'; 
import { toast } from 'react-hot-toast';
import './Students.css';

const Students = () => {
  const [students, setStudents] = useState([]);
  const [listeningExams, setListeningExams] = useState([]); 
  const [readingExams, setReadingExams] = useState([]); 
  const [writingExams, setWritingExams] = useState([]); 
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Tanlangan o'quvchilar ID larini saqlash uchun state
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [studentsRes, listeningRes, readingRes, writingRes] = await Promise.all([
        supabase.from('students').select('*').order('created_at', { ascending: false }),
        supabase.from('listening_exams').select('id, title').order('created_at', { ascending: true }),
        supabase.from('reading_exams').select('id, title').order('created_at', { ascending: true }),
        supabase.from('writing_exams').select('id, title').order('created_at', { ascending: true })
      ]);

      if (studentsRes.error) throw studentsRes.error;
      if (listeningRes.error) throw listeningRes.error;
      if (readingRes.error) throw readingRes.error;
      if (writingRes.error) throw writingRes.error;

      setStudents(studentsRes.data || []);
      setListeningExams(listeningRes.data || []);
      setReadingExams(readingRes.data || []);
      setWritingExams(writingRes.data || []);
      setSelectedStudentIds([]); // Ma'lumot yangilanganda tanlovni tozalash
    } catch (error) {
      console.error("Error loading system data:", error.message);
      toast.error("Failed to load students and exam configurations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Bitta o'quvchini o'chirish
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this student record?")) return;
    
    try {
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (error) throw error;
      
      toast.success("Student record successfully deleted");
      setStudents(prev => prev.filter(student => student.id !== id));
      setSelectedStudentIds(prev => prev.filter(item => item !== id));
    } catch (error) {
      console.error("Delete operation failure:", error.message);
      toast.error("An error occurred while deleting the student record");
    }
  };

  // Tanlangan barcha o'quvchilarni o'chirish (Bulk Delete)
  const handleBulkDelete = async () => {
    if (selectedStudentIds.length === 0) return;
    
    if (!window.confirm(`Are you sure you want to permanently delete ${selectedStudentIds.length} selected student(s)?`)) return;

    const toastId = toast.loading("Deleting selected students...");
    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .in('id', selectedStudentIds);

      if (error) throw error;

      toast.success(`${selectedStudentIds.length} student(s) successfully deleted!`, { id: toastId });
      setStudents(prev => prev.filter(student => !selectedStudentIds.includes(student.id)));
      setSelectedStudentIds([]);
    } catch (error) {
      console.error("Bulk delete failure:", error.message);
      toast.error("An error occurred while deleting selected students", { id: toastId });
    }
  };

  // Hammasini belgilash yoki belgilashni bekor qilish (Select All)
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allFilteredIds = filteredStudents.map(student => student.id);
      setSelectedStudentIds(allFilteredIds);
    } else {
      setSelectedStudentIds([]);
    }
  };

  // Bitta qatorni belgilash
  const handleSelectOne = (id) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const filteredStudents = students.filter(student => {
    const search = searchQuery.toLowerCase();
    return (
      student.full_name?.toLowerCase().includes(search) ||
      student.student_code?.toLowerCase().includes(search)
    );
  });

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDisplayLabel = (uuid, examsList, prefix) => {
    if (!uuid) return `${prefix}: N/A`;
    const index = examsList.findIndex(exam => String(exam.id) === String(uuid));
    if (index === -1) return `${prefix}: Assigned`;
    return `${prefix}-${index + 1}`; 
  };

  const isAllSelected = filteredStudents.length > 0 && filteredStudents.every(student => selectedStudentIds.includes(student.id));

  return (
    <div className="admin-students-page animate-fade-in">
      <header className="admin-page-header">
        <div className="header-meta">
          <h1>Students Management</h1>
          <p>Manage candidate profiles, access keys, and control randomized exam module assignments.</p>
        </div>
        <div className="header-actions">
          <div className="total-students-counter">
            <Users size={18} />
            <span>Total Candidates: <strong>{students.length}</strong></span>
          </div>
          <button className="btn-register-student" onClick={() => setIsModalOpen(true)}>
            <UserPlus size={16} /> Register Student
          </button>
        </div>
      </header>

      <main className="admin-full-content">
        <div className="admin-card-box full-width-card">
          <div className="table-top-controls">
            <div className="card-box-header flex items-center gap-3">
              <BookOpen size={18} className="icon-purple" />
              <h2>Registered Candidates</h2>
              
              {/* Tanlanganlar bo'lsa o'chirish tugmasi chiqadi */}
              {selectedStudentIds.length > 0 && (
                <button 
                  onClick={handleBulkDelete}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition font-medium shadow-sm ml-4"
                >
                  <Trash2 size={14} />
                  <span>Delete Selected ({selectedStudentIds.length})</span>
                </button>
              )}
            </div>
            
            <div className="admin-search-wrapper">
              <Search size={14} className="search-lens" />
              <input 
                type="text" 
                placeholder="Search by name or ST-code..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="admin-table-container">
            {loading ? (
              <div className="no-students-placeholder">
                <Loader2 className="spinner animate-spin" size={24} />
                <span>Fetching student database...</span>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="no-students-placeholder">
                <span>No matching student records found.</span>
              </div>
            ) : (
              <table className="admin-flat-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={isAllSelected}
                        onChange={handleSelectAll}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                    </th>
                    <th>Student ID</th>
                    <th>Full Name</th>
                    <th>Phone Number</th>
                    <th>Assigned Modules</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => {
                    const readingLabel = getDisplayLabel(student.assigned_reading_exam_id, readingExams, 'R');
                    const listeningLabel = getDisplayLabel(student.assigned_listening_exam_id, listeningExams, 'L');
                    const writingLabel = getDisplayLabel(student.assigned_writing_exam_id, writingExams, 'W');
                    const isSelected = selectedStudentIds.includes(student.id);
                    
                    return (
                      <tr key={student.id} className={isSelected ? 'bg-indigo-50/40' : ''}>
                        <td style={{ textAlign: 'center' }}>
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => handleSelectOne(student.id)}
                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                          />
                        </td>
                        <td>
                          <span className="badge-id">{student.student_code || 'N/A'}</span>
                        </td>
                        <td className="candidate-name">
                          {student.full_name}
                          <span className="candidate-date">
                            <Calendar size={11} /> Registered: {formatDate(student.created_at)}
                          </span>
                        </td>
                        <td className="phone-cell">{student.phone || 'N/A'}</td>
                        <td>
                          <div className="exam-pills-row">
                            <span className={`pill r-pill ${!student.assigned_reading_exam_id ? 'pill-na' : ''}`} title="Reading Module">
                              {readingLabel}
                            </span>
                            <span className={`pill l-pill ${!student.assigned_listening_exam_id ? 'pill-na' : ''}`} title="Listening Module">
                              {listeningLabel}
                            </span>
                            <span className={`pill w-pill ${!student.assigned_writing_exam_id ? 'pill-na' : ''}`} title="Writing Module">
                              {writingLabel}
                            </span>
                          </div>
                        </td>
                        <td>
                          <button 
                            className="row-action-delete" 
                            onClick={() => handleDelete(student.id)} 
                            title="Remove student record"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      <CreateStudent 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onStudentAdded={fetchInitialData} 
      />
    </div>
  );
};

export default Students;