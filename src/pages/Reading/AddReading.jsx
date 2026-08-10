import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trash2, BookOpen, Layers, Loader2, Save, Plus, Minus } from 'lucide-react';
import { supabase } from '../../config/supabaseClient';
import { toast } from 'react-hot-toast';
import './AddReading.css';

const IELTS_READING_TYPES = {
  TRUE_FALSE_NOT_GIVEN: 'True / False / Not Given (or Yes / No / Not Given)',
  NOTE_COMPLETION: 'Summary / Note / Table / Flow-chart Completion',
  MULTIPLE_CHOICE: 'Multiple Choice (A, B, C, D Selection)',
  MATCHING_HEADINGS: 'Matching Headings (Paragraph to Heading)',
  MATCHING_FEATURES: 'Matching Features / Information',
  SHORT_ANSWER: 'Short-Answer Questions'
};

const AddReading = ({ onBack, onRefresh, editExamId }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [examTitle, setExamTitle] = useState('');
  const [duration, setDuration] = useState(60);
  const [passages, setPassages] = useState({
    passage1: { title: '', text: '', groups: [] },
    passage2: { title: '', text: '', groups: [] },
    passage3: { title: '', text: '', groups: [] }
  });
  const [activeTab, setActiveTab] = useState('passage1');

  useEffect(() => {
    if (editExamId) {
      fetchExamData(editExamId);
    }
  }, [editExamId]);

  const sanitizeGroups = (groups) => {
    if (!Array.isArray(groups)) return [];
    return groups.map(group => {
      let formattedOptions = group.matching_options;
      if (Array.isArray(formattedOptions)) {
        formattedOptions = formattedOptions.map((opt, idx) => {
          if (typeof opt === 'string') {
            const defaultKey = String.fromCharCode(65 + idx);
            return { key: defaultKey, text: opt };
          }
          return opt;
        });
      } else {
        if (group.type === 'MATCHING_HEADINGS' || group.type === 'MATCHING_FEATURES') {
          formattedOptions = [{ key: 'A', text: '' }, { key: 'B', text: '' }, { key: 'C', text: '' }, { key: 'D', text: '' }];
        } else {
          formattedOptions = [];
        }
      }
      return {
        ...group,
        matching_options: formattedOptions
      };
    });
  };

  const fetchExamData = async (id) => {
    setIsLoading(true);
    const trackingToast = toast.loading("Imtihon ma'lumotlari yuklanmoqda...");
    try {
      const { data, error } = await supabase
        .from('reading_exams')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        setExamTitle(data.title || '');
        setDuration(data.duration || 60);
        setPassages({
          passage1: {
            title: data.passage1_title || '',
            text: data.passage1_text || '',
            groups: sanitizeGroups(data.passage1_groups)
          },
          passage2: {
            title: data.passage2_title || '',
            text: data.passage2_text || '',
            groups: sanitizeGroups(data.passage2_groups)
          },
          passage3: {
            title: data.passage3_title || '',
            text: data.passage3_text || '',
            groups: sanitizeGroups(data.passage3_groups)
          }
        });
        toast.success("Ma'lumotlar muvaffaqiyatli yuklandi!", { id: trackingToast });
      }
    } catch (error) {
      toast.error("Xatolik: " + error.message, { id: trackingToast });
    } finally {
      setIsLoading(false);
    }
  };

  const getPassageBaseNumber = (pKey) => {
    if (pKey === 'passage1') return 1;
    if (pKey === 'passage2') return 14;
    if (pKey === 'passage3') return 28;
    return 1;
  };

  const reindexPassageQuestions = (groups, pKey) => {
    let currentNumber = getPassageBaseNumber(pKey);
    return groups.map(group => {
      const updatedQuestions = group.questions.map(q => {
        const hasCorrectAnswer = q.has_correct_answer !== false;
        
        if (!hasCorrectAnswer) {
          return { ...q, question_number: null };
        }

        const updatedQ = { ...q, question_number: currentNumber };
        currentNumber++;
        return updatedQ;
      });
      
      const validNumbered = updatedQuestions.filter(q => q.question_number !== null);
      const startNum = validNumbered[0]?.question_number || getPassageBaseNumber(pKey);
      const endNum = validNumbered[validNumbered.length - 1]?.question_number || startNum;
      
      const instruction = group.instruction || `Questions ${startNum}-${endNum}. Complete the tasks below.`;

      return {
        ...group,
        instruction,
        questions: updatedQuestions
      };
    });
  };

  const handleAddGroup = (pKey, type) => {
    const defaultLength = 5; 
    
    const questionsArray = Array(defaultLength).fill(null).map((_, i) => {
      let qObj = { question_number: i + 1, has_correct_answer: true };
      
      if (type === 'NOTE_COMPLETION') {
        qObj.text_before = '';
        qObj.has_text_before = true;
        qObj.correct_answer = '';
        qObj.text_after = '';
        qObj.has_text_after = true;
      } else if (type === 'TRUE_FALSE_NOT_GIVEN') {
        qObj.text = '';
        qObj.correct_answer = 'TRUE';
      } else if (type === 'MULTIPLE_CHOICE') {
        qObj.text = '';
        qObj.options = ['', '', '', ''];
        qObj.correct_answer = 'A';
      } else {
        qObj.text = '';
        qObj.correct_answer = '';
      }
      return qObj;
    });

    const newGroup = {
      id: Date.now().toString(),
      type: type,
      instruction: '',
      matching_options: (type === 'MATCHING_HEADINGS' || type === 'MATCHING_FEATURES') 
        ? [{ key: 'A', text: '' }, { key: 'B', text: '' }, { key: 'C', text: '' }, { key: 'D', text: '' }] 
        : [],
      questions: questionsArray
    };

    setPassages(prev => {
      const updatedGroups = [...prev[pKey].groups, newGroup];
      const reindexedGroups = reindexPassageQuestions(updatedGroups, pKey);
      return {
        ...prev,
        [pKey]: { ...prev[pKey], groups: reindexedGroups }
      };
    });
    toast.success("Yangi savollar guruhi qo'shildi!");
  };

  const handleRemoveGroup = (pKey, groupId) => {
    setPassages(prev => {
      const filteredGroups = prev[pKey].groups.filter(g => g.id !== groupId);
      const reindexedGroups = reindexPassageQuestions(filteredGroups, pKey);
      return {
        ...prev,
        [pKey]: { ...prev[pKey], groups: reindexedGroups }
      };
    });
    toast.error("Guruh o'chirildi");
  };

  const handleAddQuestionToGroup = (pKey, groupIdx) => {
    setPassages(prev => {
      const updatedGroups = [...prev[pKey].groups];
      const targetGroup = updatedGroups[groupIdx];
      
      let newQ = { question_number: targetGroup.questions.length + 1, has_correct_answer: true };
      
      if (targetGroup.type === 'NOTE_COMPLETION') {
        newQ.text_before = '';
        newQ.has_text_before = true;
        newQ.correct_answer = '';
        newQ.text_after = '';
        newQ.has_text_after = true;
      } else if (targetGroup.type === 'TRUE_FALSE_NOT_GIVEN') {
        newQ.text = '';
        newQ.correct_answer = 'TRUE';
      } else if (targetGroup.type === 'MULTIPLE_CHOICE') {
        newQ.text = '';
        newQ.options = ['', '', '', ''];
        newQ.correct_answer = 'A';
      } else {
        newQ.text = '';
        newQ.correct_answer = '';
      }

      targetGroup.questions = [...targetGroup.questions, newQ];
      const reindexedGroups = reindexPassageQuestions(updatedGroups, pKey);
      
      return {
        ...prev,
        [pKey]: { ...prev[pKey], groups: reindexedGroups }
      };
    });
    toast.success("Yangi qator qo'shildi!");
  };

  const handleRemoveQuestionFromGroup = (pKey, groupIdx, qIdx) => {
    setPassages(prev => {
      const updatedGroups = [...prev[pKey].groups];
      const targetGroup = updatedGroups[groupIdx];
      
      if (targetGroup.questions.length <= 1) {
        toast.error("Guruhda kamida 1 ta qator qolishi kerak!");
        return prev;
      }

      targetGroup.questions = targetGroup.questions.filter((_, index) => index !== qIdx);
      const reindexedGroups = reindexPassageQuestions(updatedGroups, pKey);

      return {
        ...prev,
        [pKey]: { ...prev[pKey], groups: reindexedGroups }
      };
    });
    toast.error("Qator o'chirildi!");
  };

  const handleAddMatchingOption = (pKey, groupIdx) => {
    setPassages(prev => {
      const updatedGroups = [...prev[pKey].groups];
      const group = updatedGroups[groupIdx];
      const currentOpts = group.matching_options || [];
      const nextLetter = String.fromCharCode(65 + currentOpts.length);
      
      group.matching_options = [...currentOpts, { key: nextLetter, text: '' }];
      return { ...prev, [pKey]: { ...prev[pKey], groups: updatedGroups } };
    });
  };

  const handleRemoveMatchingOption = (pKey, groupIdx, optIdx) => {
    setPassages(prev => {
      const updatedGroups = [...prev[pKey].groups];
      const group = updatedGroups[groupIdx];
      group.matching_options = group.matching_options.filter((_, i) => i !== optIdx);
      return { ...prev, [pKey]: { ...prev[pKey], groups: updatedGroups } };
    });
  };

  const handleMatchingOptionChange = (pKey, groupIdx, optIdx, field, value) => {
    setPassages(prev => {
      const updatedGroups = [...prev[pKey].groups];
      const group = updatedGroups[groupIdx];
      group.matching_options[optIdx][field] = value;
      return { ...prev, [pKey]: { ...prev[pKey], groups: updatedGroups } };
    });
  };

  const toggleAnswerStatus = (pKey, groupIdx, qIdx, status) => {
    setPassages(prev => {
      const updatedGroups = [...prev[pKey].groups];
      const updatedQuestions = [...updatedGroups[groupIdx].questions];
      
      updatedQuestions[qIdx] = { 
        ...updatedQuestions[qIdx], 
        has_correct_answer: status,
        correct_answer: status ? updatedQuestions[qIdx].correct_answer : ''
      };
      
      updatedGroups[groupIdx].questions = updatedQuestions;
      const reindexedGroups = reindexPassageQuestions(updatedGroups, pKey);

      return { ...prev, [pKey]: { ...prev[pKey], groups: reindexedGroups } };
    });
  };

  const toggleInputVisibility = (pKey, groupIdx, qIdx, flagField, valueField, status) => {
    setPassages(prev => {
      const updatedGroups = [...prev[pKey].groups];
      const updatedQuestions = [...updatedGroups[groupIdx].questions];
      
      updatedQuestions[qIdx] = { 
        ...updatedQuestions[qIdx], 
        [flagField]: status,
        [valueField]: status ? updatedQuestions[qIdx][valueField] : ''
      };
      
      updatedGroups[groupIdx].questions = updatedQuestions;
      return { ...prev, [pKey]: { ...prev[pKey], groups: updatedGroups } };
    });
  };

  const handleQuestionFieldChange = (pKey, groupIdx, qIdx, field, value) => {
    setPassages(prev => {
      const updatedGroups = [...prev[pKey].groups];
      const updatedQuestions = [...updatedGroups[groupIdx].questions];
      updatedQuestions[qIdx] = { ...updatedQuestions[qIdx], [field]: value };
      updatedGroups[groupIdx].questions = updatedQuestions;
      return { ...prev, [pKey]: { ...prev[pKey], groups: updatedGroups } };
    });
  };

  const handleMultipleChoiceOptionChange = (pKey, groupIdx, qIdx, optIdx, value) => {
    setPassages(prev => {
      const updatedGroups = [...prev[pKey].groups];
      const updatedQuestions = [...updatedGroups[groupIdx].questions];
      const currentOpts = [...(updatedQuestions[qIdx].options || ['', '', '', ''])];
      currentOpts[optIdx] = value;
      updatedQuestions[qIdx] = { ...updatedQuestions[qIdx], options: currentOpts };
      updatedGroups[groupIdx].questions = updatedQuestions;
      return { ...prev, [pKey]: { ...prev[pKey], groups: updatedGroups } };
    });
  };

  const handlePassageMetaChange = (pKey, field, value) => {
    setPassages(prev => ({
      ...prev,
      [pKey]: { ...prev[pKey], [field]: value }
    }));
  };

  const handleGroupMetaChange = (pKey, groupIdx, field, value) => {
    setPassages(prev => {
      const updatedGroups = [...prev[pKey].groups];
      updatedGroups[groupIdx][field] = value;
      return { ...prev, [pKey]: { ...prev[pKey], groups: updatedGroups } };
    });
  };

  const handleSaveExam = async (e) => {
    e.preventDefault();
    if (!examTitle.trim()) return toast.error("Imtihon sarlavhasini kiriting!");

    setIsSaving(true);
    const trackingToast = toast.loading(editExamId ? "Reading imtihoni tahrirlanmoqda..." : "Reading imtihoni saqlanmoqda...");
    try {
      const examPayload = {
        title: examTitle.trim(),
        duration: parseInt(duration, 10) || 60,
        passage1_title: passages.passage1.title,
        passage1_text: passages.passage1.text,
        passage1_groups: passages.passage1.groups,
        passage2_title: passages.passage2.title,
        passage2_text: passages.passage2.text,
        passage2_groups: passages.passage2.groups,
        passage3_title: passages.passage3.title,
        passage3_text: passages.passage3.text,
        passage3_groups: passages.passage3.groups,
        status: 'active'
      };

      let error;
      if (editExamId) {
        const res = await supabase
          .from('reading_exams')
          .update(examPayload)
          .eq('id', editExamId);
        error = res.error;
      } else {
        const res = await supabase
          .from('reading_exams')
          .insert([examPayload]);
        error = res.error;
      }

      if (error) throw error;
      
      toast.success(editExamId ? "IELTS Reading imtihoni yangilandi!" : "IELTS Reading imtihoni saqlandi!", { id: trackingToast });
      if (onRefresh) onRefresh();
      if (onBack) onBack();
    } catch (error) {
      toast.error("Baza xatoligi: " + error.message, { id: trackingToast });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-500">
        <Loader2 size={24} className="animate-spin mr-2" /> Ma'lumotlar yuklanmoqda...
      </div>
    );
  }

  return (
    <div className="add-reading-container animate-fade-in" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div className="admin-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button type="button" onClick={onBack} className="btn-back-link" style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '1rem', color: '#475569' }}>
          <ArrowLeft size={18} /> Orqaga qaytish
        </button>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b' }}>
          {editExamId ? "Cambridge IELTS Reading Exam Editor" : "Cambridge IELTS Reading Exam Creator"}
        </h2>
      </div>

      <form onSubmit={handleSaveExam} className="reading-form-card">
        <div className="form-grid-header" style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
          <div className="input-group" style={{ flex: 3 }}>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>Exam Full Title</label>
            <input 
              type="text" 
              placeholder="e.g. Cambridge 19 - Reading Test 1" 
              value={examTitle} 
              onChange={(e) => setExamTitle(e.target.value)} 
              required 
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>
          <div className="input-group shrink" style={{ flex: 1 }}>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>Total Duration (Minutes)</label>
            <input 
              type="number" 
              value={duration} 
              onChange={(e) => setDuration(e.target.value)} 
              required 
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>
        </div>

        <div className="reading-passages-tabs" style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          {['passage1', 'passage2', 'passage3'].map((pKey, idx) => {
            const totalQ = passages[pKey].groups.reduce((acc, g) => {
              const validQCount = (g.questions || []).filter(q => q.question_number !== null).length;
              return acc + validQCount;
            }, 0);
            return (
              <button 
                key={pKey} 
                type="button" 
                className={`passage-tab-btn ${activeTab === pKey ? 'active' : ''}`} 
                onClick={() => setActiveTab(pKey)}
                style={{ 
                  padding: '10px 18px', 
                  background: activeTab === pKey ? '#0284c7' : '#e2e8f0', 
                  color: activeTab === pKey ? '#fff' : '#334155', 
                  border: 'none', 
                  borderRadius: '6px', 
                  cursor: 'pointer',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <BookOpen size={16} style={{ marginRight: '6px' }} /> Passage {idx + 1} ({totalQ} Questions)
              </button>
            );
          })}
        </div>

        <div className="passage-workspace-box" style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          
          <div className="input-group" style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>Passage Title</label>
            <input 
              type="text" 
              placeholder="e.g. The History of Glass" 
              value={passages[activeTab].title} 
              onChange={(e) => handlePassageMetaChange(activeTab, 'title', e.target.value)} 
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>

          <div className="input-group" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontWeight: '600' }}>Passage Text Content (HTML or Plain Text)</label>
              
              {/* To'g'rilangan Paragraflarni avtomatik ajratish tugmasi */}
              <button
                type="button"
                onClick={() => {
                  const currentText = passages[activeTab].text;
                  const formatted = currentText
                    .replace(/([A-Z])\s*[\.\)]\s+/g, '\n\n$1) ')
                    .replace(/\n{3,}/g, '\n\n')
                    .trim();
                  handlePassageMetaChange(activeTab, 'text', formatted);
                  toast.success("Paragraflar avtomatik ajratildi!");
                }}
                style={{ background: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 10px', fontSize: '0.75rem', cursor: 'pointer' }}
              >
                Paragraflarni Ajratish (A, B, C...)
              </button>
            </div>
            
            <textarea 
              rows={10} 
              placeholder="Enter full passage text here..." 
              value={passages[activeTab].text} 
              onChange={(e) => handlePassageMetaChange(activeTab, 'text', e.target.value)} 
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontFamily: 'inherit', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}
            />
          </div>

          <div className="question-type-picker-box" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fff', padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '20px' }}>
            <Layers size={18} style={{ color: '#0284c7' }} />
            <label style={{ fontWeight: '600' }}>Add Question Group:</label>
            <select 
              onChange={(e) => { if(e.target.value) { handleAddGroup(activeTab, e.target.value); e.target.value = ''; } }} 
              defaultValue=""
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', cursor: 'pointer' }}
            >
              <option value="" disabled>--- Formatni Tanlang ---</option>
              {Object.entries(IELTS_READING_TYPES).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div className="ielts-groups-timeline">
            {passages[activeTab].groups.map((group, gIdx) => (
              <div key={group.id} className="ielts-group-card" style={{ background: '#fff', padding: '18px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '20px' }}>
                <div className="group-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span className="ielts-type-tag" style={{ background: '#e0f2fe', color: '#0369a1', padding: '6px 10px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.85rem' }}>
                    {IELTS_READING_TYPES[group.type]}
                  </span>
                  
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button 
                      type="button" 
                      onClick={() => handleAddQuestionToGroup(activeTab, gIdx)} 
                      style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: '500' }}
                    >
                      <Plus size={14} /> Add Row
                    </button>
                    <button type="button" onClick={() => handleRemoveGroup(activeTab, group.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="input-group my-3" style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Instruction Prompt</label>
                  <input 
                    type="text" 
                    value={group.instruction} 
                    onChange={(e) => handleGroupMetaChange(activeTab, gIdx, 'instruction', e.target.value)} 
                    placeholder="Masalan: Questions 1-5. Complete the tasks below."
                    style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                {(group.type === 'MATCHING_HEADINGS' || group.type === 'MATCHING_FEATURES') && (
                  <div style={{ background: '#f1f5f9', padding: '12px', borderRadius: '6px', marginBottom: '15px', border: '1px dashed #cbd5e1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#334155' }}>Matching Options (Variantlar ro'yxati):</label>
                      <button
                        type="button"
                        onClick={() => handleAddMatchingOption(activeTab, gIdx)}
                        style={{ background: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                      >
                        <Plus size={12} /> Add Option
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {group.matching_options?.map((opt, optIdx) => (
                        <div key={optIdx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input 
                            type="text" 
                            value={opt.key || ''} 
                            onChange={(e) => handleMatchingOptionChange(activeTab, gIdx, optIdx, 'key', e.target.value)} 
                            style={{ width: '50px', textAlign: 'center', fontWeight: 'bold', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                            placeholder="Key"
                          />
                          <input 
                            type="text" 
                            value={opt.text || ''} 
                            onChange={(e) => handleMatchingOptionChange(activeTab, gIdx, optIdx, 'text', e.target.value)} 
                            style={{ flex: 1, padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                            placeholder="Option matni..."
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveMatchingOption(activeTab, gIdx, optIdx)}
                            style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#dc2626', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="group-questions-inner-list mt-4" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {group.questions?.map((q, qIdx) => {
                    const hasCorrectAnswer = q.has_correct_answer !== false;

                    return (
                      <div key={qIdx} className="ielts-question-row-item" style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        
                        <div className="inline-q-num" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '40px', paddingTop: '4px' }}>
                          <strong style={{ color: q.question_number !== null ? '#0284c7' : '#94a3b8', fontSize: '0.9rem' }}>
                            {q.question_number !== null ? `Q${q.question_number}` : 'Text'}
                          </strong>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveQuestionFromGroup(activeTab, gIdx, qIdx)}
                            style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginTop: '6px' }}
                            title="Qatorni o'chirish"
                          >
                            <Minus size={12} />
                          </button>
                        </div>

                        {/* NOTE COMPLETION */}
                        {group.type === 'NOTE_COMPLETION' && (
                          <div style={{ display: 'flex', gap: '8px', width: '100%', alignItems: 'center', flexWrap: 'wrap' }}>
                            {q.has_text_before !== false ? (
                              <div style={{ display: 'flex', flex: 2, gap: '4px', alignItems: 'center', minWidth: '150px' }}>
                                <input 
                                  type="text" 
                                  value={q.text_before || ''} 
                                  onChange={(e) => handleQuestionFieldChange(activeTab, gIdx, qIdx, 'text_before', e.target.value)} 
                                  placeholder="Text before gap..." 
                                  style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1' }} 
                                />
                                <button
                                  type="button"
                                  onClick={() => toggleInputVisibility(activeTab, gIdx, qIdx, 'has_text_before', 'text_before', false)}
                                  style={{ background: '#fee2e2', border: '1px solid #fca5a5', padding: '6px', borderRadius: '4px', cursor: 'pointer', color: '#dc2626' }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => toggleInputVisibility(activeTab, gIdx, qIdx, 'has_text_before', 'text_before', true)}
                                style={{ background: '#e0e7ff', border: '1px solid #c7d2fe', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', color: '#4338ca', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Plus size={12} /> Text Before
                              </button>
                            )}

                            {hasCorrectAnswer ? (
                              <div style={{ display: 'flex', flex: 1.5, gap: '4px', alignItems: 'center', minWidth: '130px' }}>
                                <input 
                                  type="text" 
                                  value={q.correct_answer || ''} 
                                  onChange={(e) => handleQuestionFieldChange(activeTab, gIdx, qIdx, 'correct_answer', e.target.value)} 
                                  placeholder="Correct Answer" 
                                  style={{ width: '100%', fontWeight: 'bold', padding: '6px 10px', borderRadius: '4px', border: '1.5px solid #059669', background: '#f0fdf4' }} 
                                />
                                <button
                                  type="button"
                                  onClick={() => toggleAnswerStatus(activeTab, gIdx, qIdx, false)}
                                  style={{ background: '#fee2e2', border: '1px solid #fca5a5', padding: '6px', borderRadius: '4px', cursor: 'pointer', color: '#dc2626' }}
                                  title="O'chirsangiz, bu qator faqat oddiy matn bo'lib qoladi"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => toggleAnswerStatus(activeTab, gIdx, qIdx, true)}
                                style={{ background: '#d1fae5', border: '1px solid #a7f3d0', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', color: '#047857', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Plus size={12} /> Correct Answer
                              </button>
                            )}

                            {q.has_text_after !== false ? (
                              <div style={{ display: 'flex', flex: 2, gap: '4px', alignItems: 'center', minWidth: '150px' }}>
                                <input 
                                  type="text" 
                                  value={q.text_after || ''} 
                                  onChange={(e) => handleQuestionFieldChange(activeTab, gIdx, qIdx, 'text_after', e.target.value)} 
                                  placeholder="Text after gap..." 
                                  style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1' }} 
                                />
                                <button
                                  type="button"
                                  onClick={() => toggleInputVisibility(activeTab, gIdx, qIdx, 'has_text_after', 'text_after', false)}
                                  style={{ background: '#fee2e2', border: '1px solid #fca5a5', padding: '6px', borderRadius: '4px', cursor: 'pointer', color: '#dc2626' }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => toggleInputVisibility(activeTab, gIdx, qIdx, 'has_text_after', 'text_after', true)}
                                style={{ background: '#e0e7ff', border: '1px solid #c7d2fe', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', color: '#4338ca', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Plus size={12} /> Text After
                              </button>
                            )}
                          </div>
                        )}

                        {/* MULTIPLE CHOICE */}
                        {group.type === 'MULTIPLE_CHOICE' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                            <input 
                              type="text" 
                              value={q.text || ''} 
                              onChange={(e) => handleQuestionFieldChange(activeTab, gIdx, qIdx, 'text', e.target.value)} 
                              placeholder="Savol matni..." 
                              style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1' }} 
                            />
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                              {['A', 'B', 'C', 'D'].map((optKey, optIdx) => (
                                <div key={optKey} style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                  <span style={{ fontWeight: 'bold', fontSize: '0.8rem', width: '20px' }}>{optKey}:</span>
                                  <input 
                                    type="text" 
                                    value={q.options?.[optIdx] || ''} 
                                    onChange={(e) => handleMultipleChoiceOptionChange(activeTab, gIdx, qIdx, optIdx, e.target.value)} 
                                    placeholder={`Variant ${optKey}`} 
                                    style={{ width: '100%', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} 
                                  />
                                </div>
                              ))}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                              <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>To'g'ri javob:</label>
                              <select 
                                value={q.correct_answer || 'A'} 
                                onChange={(e) => handleQuestionFieldChange(activeTab, gIdx, qIdx, 'correct_answer', e.target.value)}
                                style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #059669', background: '#f0fdf4', fontWeight: 'bold' }}
                              >
                                {['A', 'B', 'C', 'D'].map(k => <option key={k} value={k}>{k}</option>)}
                              </select>
                            </div>
                          </div>
                        )}

                        {/* TRUE / FALSE / NOT GIVEN & OTHER TYPES */}
                        {group.type !== 'NOTE_COMPLETION' && group.type !== 'MULTIPLE_CHOICE' && (
                          <div style={{ display: 'flex', gap: '8px', width: '100%', alignItems: 'center', flexWrap: 'wrap' }}>
                            <input 
                              type="text" 
                              value={q.text || ''} 
                              onChange={(e) => handleQuestionFieldChange(activeTab, gIdx, qIdx, 'text', e.target.value)} 
                              placeholder="Savol yoki jumla matni..." 
                              style={{ flex: 3, padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', minWidth: '200px' }} 
                            />
                            
                            {group.type === 'TRUE_FALSE_NOT_GIVEN' ? (
                              <select 
                                value={q.correct_answer || 'TRUE'} 
                                onChange={(e) => handleQuestionFieldChange(activeTab, gIdx, qIdx, 'correct_answer', e.target.value)}
                                style={{ flex: 1, padding: '6px 10px', borderRadius: '4px', border: '1.5px solid #059669', background: '#f0fdf4', fontWeight: 'bold', minWidth: '120px' }}
                              >
                                <option value="TRUE">TRUE / YES</option>
                                <option value="FALSE">FALSE / NO</option>
                                <option value="NOT GIVEN">NOT GIVEN</option>
                              </select>
                            ) : (
                              <input 
                                type="text" 
                                value={q.correct_answer || ''} 
                                onChange={(e) => handleQuestionFieldChange(activeTab, gIdx, qIdx, 'correct_answer', e.target.value)} 
                                placeholder="Correct Answer" 
                                style={{ flex: 1, padding: '6px 10px', borderRadius: '4px', border: '1.5px solid #059669', background: '#f0fdf4', fontWeight: 'bold', minWidth: '120px' }} 
                              />
                            )}
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>

              </div>
            ))}
          </div>

        </div>

        <div className="form-action-footer" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            type="submit" 
            disabled={isSaving}
            style={{ background: '#10b981', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '6px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {editExamId ? "O'zgarishlarni Saqlash" : "Imtihonni Saqlash"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddReading;