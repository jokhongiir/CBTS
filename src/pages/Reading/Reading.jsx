import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';
import { toast } from 'react-hot-toast';
import { Plus, Trash2, BookOpen, Clock, FileText, Layers, Search, Calendar, Edit3, Loader2, Power } from 'lucide-react';
import AddReading from './AddReading';
import './Reading.css';

const Reading = () => {
  const [view, setView] = useState('list');
  const [editExamId, setEditExamId] = useState(null);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchReadingExams = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reading_exams')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setExams(data || []);
    } catch (error) {
      toast.error("Ma'lumotlarni yuklashda xatolik: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReadingExams();
  }, []);

  // Statusni o'zgartirish (Enable / Disable)
  const handleToggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === false ? true : false;
    const actionText = newStatus ? "enabled" : "disabled";
    
    const toastId = toast.loading(`Imtihon holati ${actionText} qilinmoqda...`);
    try {
      const { error } = await supabase
        .from('reading_exams')
        .update({ is_active: newStatus })
        .eq('id', id);

      if (error) throw error;

      setExams(prev => prev.map(exam => exam.id === id ? { ...exam, is_active: newStatus } : exam));
      toast.success(`Reading imtihoni muvaffaqiyatli ${actionText}!`, { id: toastId });
    } catch (err) {
      toast.error("Statusni o'zgartirishda xatolik: " + err.message, { id: toastId });
    }
  };

  const handleDelete = async (exam) => {
    if (!window.confirm(`Haqiqatan ham "${exam.title}" imtihonini o'chirib yubormoqchimisiz?`)) return;
    
    const operationToast = toast.loading("Imtihon o'chirilmoqda...");
    try {
      const { error } = await supabase
        .from('reading_exams')
        .delete()
        .eq('id', exam.id);
        
      if (error) throw error;
      
      toast.success("Imtihon muvaffaqiyatli o'chirildi", { id: operationToast });
      fetchReadingExams();
    } catch (error) {
      toast.error("O'chirishda xatolik yuz berdi: " + error.message, { id: operationToast });
    }
  };

  const handleEditClick = (examId) => {
    setEditExamId(examId);
    setView('add');
  };

  const handleCreateNewClick = () => {
    setEditExamId(null);
    setView('add');
  };

  const countTotalQuestions = (exam) => {
    let total = 0;
    const p1Groups = exam.passage1_groups || [];
    const p2Groups = exam.passage2_groups || [];
    const p3Groups = exam.passage3_groups || [];

    p1Groups.forEach(g => total += g.questions?.filter(q => q.question_number !== null).length || 0);
    p2Groups.forEach(g => total += g.questions?.filter(q => q.question_number !== null).length || 0);
    p3Groups.forEach(g => total += g.questions?.filter(q => q.question_number !== null).length || 0);

    return total || 40; 
  };

  const filteredExams = exams.filter(exam => 
    exam.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (view === 'add') {
    return (
      <AddReading 
        onBack={() => { setView('list'); setEditExamId(null); }} 
        onRefresh={fetchReadingExams} 
        editExamId={editExamId} 
      />
    );
  }

  return (
    <div className="reading-container-panel animate-fade-in" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div className="reading-dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '4px' }}>Reading Imtihonlari Boshqaruvi</h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem' }}>Rasmiy talablarga mos keluvchi 3 ta matnli akademik IELTS Reading testlarini yarating va boshqaring.</p>
        </div>
        <button 
          onClick={handleCreateNewClick} 
          className="btn-add-new-reading"
          style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
        >
          <Plus size={18} />
          <span>Yangi Imtihon Qo'shish</span>
        </button>
      </div>

      <div className="reading-search-bar-wrapper" style={{ position: 'relative', marginBottom: '20px' }}>
        <Search size={18} className="search-icon-inside" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
        <input 
          type="text" 
          placeholder="Imtihonlarni nomi bo'yicha qidirish..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '100%', padding: '12px 12px 12px 42px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem', background: '#fff' }}
        />
      </div>

      {loading ? (
        <div className="reading-loading" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px', color: '#64748b', gap: '10px' }}>
          <Loader2 size={32} className="animate-spin text-sky-600" />
          <p>Ma'lumotlar bazasidan yuklanmoqda...</p>
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="reading-empty-state" style={{ textAlign: 'center', padding: '60px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
          <BookOpen size={48} style={{ color: '#94a3b8', marginBottom: '12px' }} />
          <p style={{ color: '#475569', fontWeight: '500' }}>Hech qanday imtihon topilmadi yoki qidiruv natijasi bo'sh.</p>
        </div>
      ) : (
        <div className="reading-list-wrapper" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflowX: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <table className="reading-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '12px 16px', width: '100px' }}>Indeks</th>
                <th style={{ padding: '12px 16px' }}>Imtihon Nomi</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '12px 16px' }}>Ajratilgan Vaqt</th>
                <th style={{ padding: '12px 16px' }}>Tarkibi</th>
                <th style={{ padding: '12px 16px' }}>Savollar Soni</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', width: '140px' }}>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {filteredExams.map((exam, index) => {
                const examDisplayNumber = exams.length - index;
                const isActive = exam.is_active !== false;

                return (
                  <tr key={exam.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s', opacity: isActive ? 1 : 0.6, background: isActive ? 'transparent' : '#f8fafc' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <span className="reading-id-tag" style={{ background: isActive ? '#f1f5f9' : '#e2e8f0', color: '#475569', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.85rem' }}>
                        R-{examDisplayNumber}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div className="table-title-cell" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span className="reading-main-title" style={{ fontWeight: '600', color: '#1e293b', textDecoration: isActive ? 'none' : 'line-through' }}>{exam.title}</span>
                        <span className="reading-sub-text" style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center' }}>
                          <Calendar size={12} style={{ marginRight: '4px' }} />
                          Yaratilgan: {new Date(exam.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
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
                        title={isActive ? "O'chirish uchun bosing" : "Yoqish uchun bosing"}
                      >
                        <Power size={12} />
                        {isActive ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className="reading-time-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#334155', fontSize: '0.9rem' }}>
                        <Clock size={14} className="text-slate-500" /> {exam.duration || 60} daqiqa
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className="reading-structure-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#334155', fontSize: '0.9rem' }}>
                        <Layers size={14} className="text-sky-600" /> 3 ta Passage
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className="reading-questions-count" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#334155', fontSize: '0.9rem' }}>
                        <FileText size={14} className="text-emerald-600" /> {countTotalQuestions(exam)} ta savol
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button 
                          onClick={() => handleEditClick(exam.id)} 
                          className="btn-edit-reading-row" 
                          title="Tahrirlash"
                          style={{ background: '#e0f2fe', color: '#0369a1', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                        >
                          <Edit3 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(exam)} 
                          className="btn-delete-reading-row" 
                          title="O'chirish"
                          style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
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

export default Reading;