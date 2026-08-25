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
      setSelectedStudentIds([]);
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

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allFilteredIds = filteredStudents.map(student => student.id);
      setSelectedStudentIds(allFilteredIds);
    } else {
      setSelectedStudentIds([]);
    }
  };

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
    <div className="std-dashboard-container">
      <header className="std-top-header">
        <div className="std-title-box">
          <h1>Students Management</h1>
          <p>Manage candidate profiles, access keys, and control randomized exam module assignments.</p>
        </div>
        <div className="std-top-actions">
          <div className="std-count-badge">
            <Users size={18} />
            <span>Total Candidates: <strong>{students.length}</strong></span>
          </div>
          <button className="std-add-btn" onClick={() => setIsModalOpen(true)}>
            <UserPlus size={16} /> Register Student
          </button>
        </div>
      </header>

      <main className="std-main-section">
        <div className="std-content-panel">
          <div className="std-panel-toolbar">
            <div className="std-toolbar-left">
              <BookOpen size={18} className="std-icon-accent" />
              <h2>Registered Candidates</h2>
              
              {selectedStudentIds.length > 0 && (
                <button onClick={handleBulkDelete} className="std-delete-bulk-btn">
                  <Trash2 size={14} />
                  <span>Delete Selected ({selectedStudentIds.length})</span>
                </button>
              )}
            </div>
            
            <div className="std-search-box">
              <Search size={14} className="std-search-icon" />
              <input 
                type="text" 
                placeholder="Search by name or ST-code..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="std-table-wrapper">
            {loading ? (
              <div className="std-state-box">
                <Loader2 className="std-spinner-anim" size={24} />
                <span>Fetching student database...</span>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="std-state-box">
                <span>No matching student records found.</span>
              </div>
            ) : (
              <table className="std-data-table">
                <thead>
                  <tr>
                    <th className="std-col-check">
                      <input 
                        type="checkbox" 
                        checked={isAllSelected}
                        onChange={handleSelectAll}
                        className="std-checkbox-input"
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
                      <tr key={student.id} className={isSelected ? 'std-row-highlight' : ''}>
                        <td className="std-col-check">
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => handleSelectOne(student.id)}
                            className="std-checkbox-input"
                          />
                        </td>
                        <td>
                          <span className="std-id-tag">{student.student_code || 'N/A'}</span>
                        </td>
                        <td className="std-name-cell">
                          {student.full_name}
                          <span className="std-date-sub">
                            <Calendar size={11} /> Registered: {formatDate(student.created_at)}
                          </span>
                        </td>
                        <td className="std-phone-cell">{student.phone || 'N/A'}</td>
                        <td>
                          <div className="std-modules-wrap">
                            <span className={`std-module-badge std-badge-reading ${!student.assigned_reading_exam_id ? 'std-badge-empty' : ''}`} title="Reading Module">
                              {readingLabel}
                            </span>
                            <span className={`std-module-badge std-badge-listening ${!student.assigned_listening_exam_id ? 'std-badge-empty' : ''}`} title="Listening Module">
                              {listeningLabel}
                            </span>
                            <span className={`std-module-badge std-badge-writing ${!student.assigned_writing_exam_id ? 'std-badge-empty' : ''}`} title="Writing Module">
                              {writingLabel}
                            </span>
                          </div>
                        </td>
                        <td>
                          <button 
                            className="std-row-delete-btn" 
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