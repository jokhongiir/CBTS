import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';
import { toast } from 'react-hot-toast';
import { Plus, Trash2, PenTool, Image as ImageIcon, ExternalLink, Search, Power } from 'lucide-react';
import AddWriting from './AddWriting';
import './Writing.css';

const Writing = () => {
  const [view, setView] = useState('list'); 
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchWritingExams = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('writing_exams')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setExams(data || []);
    } catch (error) {
      toast.error("Failed to load data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWritingExams();
  }, []);

  // Statusni o'zgartirish (Enable / Disable)
  const handleToggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === false ? true : false;
    const actionText = newStatus ? "enabled" : "disabled";
    
    const toastId = toast.loading(`Updating exam status to ${actionText}...`);
    try {
      const { error } = await supabase
        .from('writing_exams')
        .update({ is_active: newStatus })
        .eq('id', id);

      if (error) throw error;

      setExams(prev => prev.map(exam => exam.id === id ? { ...exam, is_active: newStatus } : exam));
      toast.success(`Writing exam successfully ${actionText}!`, { id: toastId });
    } catch (err) {
      toast.error("Failed to update status: " + err.message, { id: toastId });
    }
  };

  const handleDelete = async (exam) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${exam.title}"?`)) return;
    
    const loadingToast = toast.loading("Deleting exam package...");
    try {
      if (exam.image_url) {
        const urlParts = exam.image_url.split('/storage/v1/object/public/exams/');
        if (urlParts.length > 1) {
          const filePath = urlParts[1];
          await supabase.storage.from('exams').remove([filePath]);
        }
      }
      const { error } = await supabase
        .from('writing_exams')
        .delete()
        .eq('id', exam.id);
      if (error) throw error;
      
      toast.success("Exam package successfully deleted", { id: loadingToast });
      fetchWritingExams();
    } catch (error) {
      toast.error("Deletion failed: " + error.message, { id: loadingToast });
    }
  };

  const filteredExams = exams.filter(ex => {
    const matchesSearch = ex.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          ex.task1_text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          ex.task2_text?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  if (view === 'add') {
    return <AddWriting onBack={() => setView('list')} onRefresh={fetchWritingExams} />;
  }

  return (
    <div className="writing-container-panel animate-fade-in">
      <div className="writing-dashboard-header">
        <div>
          <h1>IELTS Writing Question Bank</h1>
          <p>Manage combined exam prompts, Task 1 & Task 2 modules, assets, and configurations.</p>
        </div>
        <button onClick={() => setView('add')} className="btn-add-new-writing">
          <Plus size={18} />
          <span>Add New Exam (Task 1 & 2)</span>
        </button>
      </div>

      <div className="dashboard-control-bar" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <div className="search-input-wrapper" style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input 
            type="text" 
            placeholder="Search exams or topics..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '2.5rem', width: '100%', height: '42px' }}
          />
        </div>
      </div>

      {loading ? (
        <div className="writing-loading">
          <div className="spinner"></div>
          <p>Synchronizing with Cloud Database...</p>
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="writing-empty-state">
          <PenTool size={40} style={{ color: '#94a3b8' }} />
          <p>No writing tasks found matching the criteria.</p>
        </div>
      ) : (
        <div className="writing-list-wrapper">
          <table className="writing-table">
            <thead>
              <tr>
                <th style={{ width: '90px' }}>Exam ID</th>
                <th>Title / Package</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th>Task 1 Preview</th>
                <th>Task 2 Preview</th>
                <th>Visual Asset</th>
                <th style={{ textAlign: 'right', width: '100px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredExams.map((exam) => {
                const isActive = exam.is_active !== false;

                return (
                  <tr key={exam.id} style={{ opacity: isActive ? 1 : 0.6, background: isActive ? 'transparent' : '#f8fafc' }}>
                    <td>
                      <span className="badge-id">
                        W-{exam.id}
                      </span>
                    </td>
                    <td>
                      <div className="table-title-cell">
                        <span className="main-title" style={{ textDecoration: isActive ? 'none' : 'line-through' }}>{exam.title}</span>
                        <span className="sub-prompt">Duration: {exam.duration || 60} mins</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => handleToggleStatus(exam.id, isActive)}
                        style={{
                          background: isActive ? '#d1fae5' : '#ffe4e6',
                          color: isActive ? '#065f46' : '#9f1239',
                          border: 'none',
                          padding: '5px 10px',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title={isActive ? "Click to Disable" : "Click to Enable"}
                      >
                        <Power size={12} />
                        {isActive ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td>
                      <div className="table-title-cell">
                        <span className="sub-prompt">
                          {exam.task1_text ? `${exam.task1_text.substring(0, 50)}...` : 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="table-title-cell">
                        <span className="sub-prompt">
                          {exam.task2_text ? `${exam.task2_text.substring(0, 50)}...` : 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td>
                      {exam.image_url ? (
                        <a href={exam.image_url} target="_blank" rel="noreferrer" className="table-img-link">
                          <ImageIcon size={14} /> 
                          <span>View Graph</span>
                          <ExternalLink size={11} />
                        </a>
                      ) : (
                        <span className="no-img-text">Text Only</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button onClick={() => handleDelete(exam)} className="btn-delete-row" title="Delete Task">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Writing;