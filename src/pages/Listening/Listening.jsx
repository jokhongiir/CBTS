import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Headphones, Clock, Calendar, Eye, Loader2, Edit3, Power } from 'lucide-react';
import { supabase } from '../../config/supabaseClient';
import { toast } from 'react-hot-toast';
import AddListening from './AddListening';
import './Listening.css';

const Listening = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list' | 'add' | 'edit'
  const [selectedExamId, setSelectedExamId] = useState(null);

  const fetchExams = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('listening_exams')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExams(data || []);
    } catch (err) {
      toast.error("Failed to load assessments: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const handleToggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === false ? true : false;
    const actionText = newStatus ? "enabled" : "disabled";
    
    const toastId = toast.loading(`Updating exam status to ${actionText}...`);
    try {
      const { error } = await supabase
        .from('listening_exams')
        .update({ is_active: newStatus })
        .eq('id', id);

      if (error) throw error;

      setExams(prev => prev.map(exam => exam.id === id ? { ...exam, is_active: newStatus } : exam));
      toast.success(`Listening exam successfully ${actionText}!`, { id: toastId });
    } catch (err) {
      toast.error("Failed to update status: " + err.message, { id: toastId });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this Listening exam? All associated student records and group configurations will be purged!")) return;
    
    const operationalToast = toast.loading("Purging asset nodes from cloud database...");
    try {
      const { error } = await supabase.from('listening_exams').delete().eq('id', id);
      if (error) throw error;
      toast.success("Exam battery successfully unlinked", { id: operationalToast });
      fetchExams();
    } catch (err) {
      toast.error("Lifecycle error: " + err.message, { id: operationalToast });
    }
  };

  const handleEdit = (id) => {
    setSelectedExamId(id);
    setView('edit');
  };

  const handleAddNew = () => {
    setSelectedExamId(null);
    setView('add');
  };

  if (view === 'add' || view === 'edit') {
    return (
      <AddListening 
        onBack={() => { setView('list'); setSelectedExamId(null); }} 
        onRefresh={fetchExams} 
        editExamId={selectedExamId} 
      />
    );
  }

  return (
    <div className="listening-container animate-fade-in">
      <div className="listening-header-box">
        <div className="listening-title-group">
          <h1>IELTS Listening Question Bank</h1>
          <p>Manage 4-part simulation modules running on computerized test engines.</p>
        </div>
        <button onClick={handleAddNew} className="btn-add-listening">
          <Plus size={18} /> Add New Listening Task
        </button>
      </div>

      {loading ? (
        <div className="listening-loading-box">
          <Loader2 size={24} className="listening-spinner" />
          <span>Synchronizing media parameters...</span>
        </div>
      ) : exams.length === 0 ? (
        <div className="listening-empty-box">
          No listening exam modules deployed yet. Use the action studio button to establish a track cluster.
        </div>
      ) : (
        <div className="listening-table-card">
          <div className="listening-table-wrapper">
            <table className="listening-flat-table">
              <thead>
                <tr>
                  <th>Exam Architecture Reference</th>
                  <th className="text-center">Status</th>
                  <th className="text-center">Duration</th>
                  <th>Deployment Date</th>
                  <th className="text-center">Actions Matrix</th>
                </tr>
              </thead>
              <tbody>
                {exams.map((exam, index) => {
                  const examDisplayNumber = exams.length - index;
                  const isActive = exam.is_active !== false;

                  return (
                    <tr key={exam.id} className={!isActive ? 'listening-row-disabled' : ''}>
                      <td>
                        <div className="listening-cell-main">
                          <Headphones size={18} className={`listening-main-icon ${!isActive ? 'disabled' : ''}`} />
                          <div className="listening-info-stack">
                            <div className="listening-title-row">
                              <span className={`listening-badge-id ${!isActive ? 'disabled' : ''}`}>
                                L-{examDisplayNumber}
                              </span>
                              <span className={!isActive ? 'listening-text-strike' : ''}>{exam.title}</span>
                            </div>
                            <div>
                              <a 
                                href={`/student/listening/${exam.id}`} 
                                target="_blank" 
                                rel="noreferrer"
                                className="listening-preview-link"
                              >
                                <Eye size={12} /> Launch Candidate Interface Simulation
                              </a>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="text-center">
                        <button
                          onClick={() => handleToggleStatus(exam.id, isActive)}
                          className={`listening-status-btn ${isActive ? 'active' : 'disabled-state'}`}
                          title={isActive ? "Click to Disable" : "Click to Enable"}
                        >
                          <Power size={12} />
                          {isActive ? 'Active (Enabled)' : 'Disabled'}
                        </button>
                      </td>
                      <td className="text-center">
                        <span className="listening-pill-meta">
                          <Clock size={12} /> {exam.duration} mins
                        </span>
                      </td>
                      <td>
                        <span className="listening-date-text">
                          <Calendar size={12} /> {new Date(exam.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                        </span>
                      </td>
                      <td className="text-center">
                        <div className="listening-actions-group">
                          <button
                            onClick={() => handleEdit(exam.id)}
                            className="listening-action-btn edit"
                            title="Edit Task"
                          >
                            <Edit3 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(exam.id)}
                            className="listening-action-btn delete"
                            title="Purge Task"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Listening;