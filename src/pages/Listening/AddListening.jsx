import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trash2, Headphones, Layers, Image as ImageIcon, Upload, Loader2, Save, Plus, Minus, X, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../config/supabaseClient';
import { toast } from 'react-hot-toast';
import './AddListening.css';

const IELTS_QUESTION_TYPES = {
  NOTE_COMPLETION: 'Form / Note / Sentence Completion (Gap Filling)',
  MULTIPLE_CHOICE: 'Multiple Choice (A, B, C Selection)',
  MATCHING: 'Matching (Features / Information Mapping)',
  LABELLING: 'Plan / Map / Diagram Labelling (Image Sandbox Asset)',
  SHORT_ANSWER: 'Short-Answer Construct Isolation',
  CLASSIFICATION: 'Classification Matrices'
};

const AddListening = ({ onBack, onRefresh, editExamId = null }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [uploadingPart, setUploadingPart] = useState(null); 
  const [uploadingMapId, setUploadingMapId] = useState(null);
  const [examTitle, setExamTitle] = useState('');
  const [duration, setDuration] = useState(30);
  const [parts, setParts] = useState({
    part1: { audio_url: '', groups: [] },
    part2: { audio_url: '', groups: [] },
    part3: { audio_url: '', groups: [] },
    part4: { audio_url: '', groups: [] }
  });
  const [activeTab, setActiveTab] = useState('part1');

  useEffect(() => {
    if (editExamId) {
      const fetchExamForEdit = async () => {
        setLoadingData(true);
        const loadingToast = toast.loading("Imtihon ma'lumotlari yuklanmoqda...");
        try {
          const { data, error } = await supabase
            .from('listening_exams')
            .select('*')
            .eq('id', editExamId)
            .single();

          if (error) throw error;

          if (data) {
            setExamTitle(data.title || '');
            setDuration(data.duration || 30);
            setParts({
              part1: { audio_url: data.part1_audio_url || '', groups: data.part1_groups || [] },
              part2: { audio_url: data.part2_audio_url || '', groups: data.part2_groups || [] },
              part3: { audio_url: data.part3_audio_url || '', groups: data.part3_groups || [] },
              part4: { audio_url: data.part4_audio_url || '', groups: data.part4_groups || [] }
            });
            toast.success("Imtihon ma'lumotlari muvaffaqiyatli yuklandi!", { id: loadingToast });
          }
        } catch (error) {
          toast.error("Xatolik: " + error.message, { id: loadingToast });
        } finally {
          setLoadingData(false);
        }
      };
      fetchExamForEdit();
    }
  }, [editExamId]);

  const handleAudioUpload = async (e, partKey) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      return toast.error("Faqat audio formatdagi fayllar ruxsat etiladi (.mp3, .wav, .m4a)!");
    }

    setUploadingPart(partKey);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${partKey}.${fileExt}`;
      const filePath = `listening-audios/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('exams')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('exams')
        .getPublicUrl(filePath);

      setParts(prev => ({
        ...prev,
        [partKey]: { ...prev[partKey], audio_url: publicUrl }
      }));
      toast.success(`Part ${partKey.slice(-1)} audio fayli yuklandi!`);
    } catch (error) {
      toast.error("Audioni yuklashda xatolik: " + error.message);
    } finally {
      setUploadingPart(null);
    }
  };

  const handleMapImageUpload = async (e, partKey, groupIdx, groupId) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      return toast.error("Faqat rasm fayllari yuklanishi kerak!");
    }

    setUploadingMapId(groupId);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_map_${groupId}.${fileExt}`;
      const filePath = `listening-maps/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('exams')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('exams')
        .getPublicUrl(filePath);

      handleGroupMetaChange(partKey, groupIdx, 'diagram_image_url', publicUrl);
      toast.success("Rasm yuklandi va ulandi!");
    } catch (error) {
      toast.error("Rasmni yuklashda xatolik: " + error.message);
    } finally {
      setUploadingMapId(null);
    }
  };

  const getPartBaseNumber = (partKey) => {
    if (partKey === 'part1') return 1;
    if (partKey === 'part2') return 11;
    if (partKey === 'part3') return 21;
    if (partKey === 'part4') return 31;
    return 1;
  };

  const reindexPartQuestions = (groups, partKey) => {
    let currentNumber = getPartBaseNumber(partKey);
    return groups.map(group => {
      const updatedQuestions = group.questions.map(q => {
        let hasAns = true;
        if (group.type === 'NOTE_COMPLETION') {
          hasAns = q.has_correct_answer !== false;
        } else {
          hasAns = true; 
        }

        const updatedQ = { 
          ...q, 
          question_number: hasAns ? currentNumber : null 
        };
        if (hasAns) {
          currentNumber++;
        }
        return updatedQ;
      });
      
      const activeQuestionsWithNum = updatedQuestions.filter(q => q.question_number !== null);
      const startNum = activeQuestionsWithNum[0]?.question_number || getPartBaseNumber(partKey);
      const endNum = activeQuestionsWithNum[activeQuestionsWithNum.length - 1]?.question_number || startNum;
      const instruction = group.instruction || `Questions ${startNum}-${endNum}. Complete the fields below.`;

      return {
        ...group,
        instruction,
        questions: updatedQuestions
      };
    });
  };

  const handleAddGroup = (partKey, type) => {
    const defaultLength = 3; 
    
    const questionsArray = Array(defaultLength).fill(null).map((_, i) => {
      let qObj = { question_number: i + 1 };
      if (type === 'NOTE_COMPLETION') {
        qObj.text_before = '';
        qObj.has_text_before = true;
        qObj.correct_answer = '';
        qObj.has_correct_answer = true;
        qObj.text_after = '';
        qObj.has_text_after = true;
      } else {
        qObj.text = '';
        qObj.correct_answer = '';
        if (type === 'MULTIPLE_CHOICE') {
          qObj.options = [
            { id: 'A', text: '' },
            { id: 'B', text: '' },
            { id: 'C', text: '' }
          ];
        }
      }
      return qObj;
    });

    const defaultMatchingOptions = [
      { id: 'A', text: 'Option A' },
      { id: 'B', text: 'Option B' },
      { id: 'C', text: 'Option C' },
      { id: 'D', text: 'Option D' }
    ];

    const newGroup = {
      id: Date.now().toString(),
      type: type,
      instruction: '',
      diagram_image_url: type === 'LABELLING' ? '' : null,
      matching_options: (type === 'MATCHING' || type === 'CLASSIFICATION' || type === 'LABELLING') ? defaultMatchingOptions : [],
      questions: questionsArray
    };

    setParts(prev => {
      const updatedGroups = [...prev[partKey].groups, newGroup];
      const reindexedGroups = reindexPartQuestions(updatedGroups, partKey);
      return {
        ...prev,
        [partKey]: { ...prev[partKey], groups: reindexedGroups }
      };
    });
    toast.success("Yangi guruh qo'shildi!");
  };

  const handleRemoveGroup = (partKey, groupId) => {
    setParts(prev => {
      const filteredGroups = prev[partKey].groups.filter(g => g.id !== groupId);
      const reindexedGroups = reindexPartQuestions(filteredGroups, partKey);
      return {
        ...prev,
        [partKey]: { ...prev[partKey], groups: reindexedGroups }
      };
    });
    toast.error("Guruh o'chirildi!");
  };

  const handleAddQuestionToGroup = (partKey, groupIdx) => {
    setParts(prev => {
      const updatedGroups = [...prev[partKey].groups];
      const targetGroup = updatedGroups[groupIdx];
      
      let newQ = { question_number: targetGroup.questions.length + 1 };
      if (targetGroup.type === 'NOTE_COMPLETION') {
        newQ.text_before = '';
        newQ.has_text_before = true;
        newQ.correct_answer = '';
        newQ.has_correct_answer = true;
        newQ.text_after = '';
        newQ.has_text_after = true;
      } else {
        newQ.text = '';
        newQ.correct_answer = '';
        if (targetGroup.type === 'MULTIPLE_CHOICE') {
          newQ.options = [
            { id: 'A', text: '' },
            { id: 'B', text: '' },
            { id: 'C', text: '' }
          ];
        }
      }

      targetGroup.questions = [...targetGroup.questions, newQ];
      const reindexedGroups = reindexPartQuestions(updatedGroups, partKey);
      
      return {
        ...prev,
        [partKey]: { ...prev[partKey], groups: reindexedGroups }
      };
    });
    toast.success("Yangi qator qo'shildi!");
  };

  const handleRemoveQuestionFromGroup = (partKey, groupIdx, qIdx) => {
    setParts(prev => {
      const updatedGroups = [...prev[partKey].groups];
      const targetGroup = updatedGroups[groupIdx];
      
      if (targetGroup.questions.length <= 1) {
        toast.error("Guruhda kamida 1 ta qator qolishi shart!");
        return prev;
      }

      targetGroup.questions = targetGroup.questions.filter((_, index) => index !== qIdx);
      const reindexedGroups = reindexPartQuestions(updatedGroups, partKey);

      return {
        ...prev,
        [partKey]: { ...prev[partKey], groups: reindexedGroups }
      };
    });
    toast.error("Qator o'chirildi!");
  };

  const handleAddMatchingOption = (partKey, groupIdx) => {
    setParts(prev => {
      const updatedGroups = [...prev[partKey].groups];
      const group = updatedGroups[groupIdx];
      const currentOpts = group.matching_options || [];
      const nextLetterCode = 65 + currentOpts.length;
      const nextLetter = String.fromCharCode(nextLetterCode);

      group.matching_options = [...currentOpts, { id: nextLetter, text: `Option ${nextLetter}` }];
      return { ...prev, [partKey]: { ...prev[partKey], groups: updatedGroups } };
    });
    toast.success("Variant qo'shildi!");
  };

  const handleRemoveMatchingOption = (partKey, groupIdx, optIdx) => {
    setParts(prev => {
      const updatedGroups = [...prev[partKey].groups];
      const group = updatedGroups[groupIdx];
      if (group.matching_options.length <= 2) {
        toast.error("Kamida 2 ta variant qolishi kerak!");
        return prev;
      }
      group.matching_options = group.matching_options.filter((_, i) => i !== optIdx);
      return { ...prev, [partKey]: { ...prev[partKey], groups: updatedGroups } };
    });
    toast.error("Variant o'chirildi!");
  };

  const handleGroupMatchingOptionChange = (partKey, groupIdx, optIdx, field, value) => {
    setParts(prev => {
      const updatedGroups = [...prev[partKey].groups];
      const updatedOptions = [...updatedGroups[groupIdx].matching_options];
      updatedOptions[optIdx] = { ...updatedOptions[optIdx], [field]: value };
      updatedGroups[groupIdx].matching_options = updatedOptions;
      return { ...prev, [partKey]: { ...prev[partKey], groups: updatedGroups } };
    });
  };

  const handleQuestionOptionChange = (partKey, groupIdx, qIdx, optIdx, value) => {
    setParts(prev => {
      const updatedGroups = [...prev[partKey].groups];
      const updatedQuestions = [...updatedGroups[groupIdx].questions];
      const updatedOpts = [...(updatedQuestions[qIdx].options || [])];
      updatedOpts[optIdx] = { ...updatedOpts[optIdx], text: value };
      updatedQuestions[qIdx] = { ...updatedQuestions[qIdx], options: updatedOpts };
      updatedGroups[groupIdx].questions = updatedQuestions;
      return { ...prev, [partKey]: { ...prev[partKey], groups: updatedGroups } };
    });
  };

  const handleAddQuestionOption = (partKey, groupIdx, qIdx) => {
    setParts(prev => {
      const updatedGroups = [...prev[partKey].groups];
      const updatedQuestions = [...updatedGroups[groupIdx].questions];
      const currentOpts = updatedQuestions[qIdx].options || [];
      const nextLetter = String.fromCharCode(65 + currentOpts.length);
      updatedQuestions[qIdx].options = [...currentOpts, { id: nextLetter, text: '' }];
      updatedGroups[groupIdx].questions = updatedQuestions;
      return { ...prev, [partKey]: { ...prev[partKey], groups: updatedGroups } };
    });
  };

  const handleRemoveQuestionOption = (partKey, groupIdx, qIdx, optIdx) => {
    setParts(prev => {
      const updatedGroups = [...prev[partKey].groups];
      const updatedQuestions = [...updatedGroups[groupIdx].questions];
      const currentOpts = updatedQuestions[qIdx].options || [];
      if (currentOpts.length <= 2) {
        toast.error("Kamida 2 ta variant bo'lishi kerak!");
        return prev;
      }
      updatedQuestions[qIdx].options = currentOpts.filter((_, i) => i !== optIdx);
      updatedGroups[groupIdx].questions = updatedQuestions;
      return { ...prev, [partKey]: { ...prev[partKey], groups: updatedGroups } };
    });
  };

  const handleGroupMetaChange = (partKey, groupIdx, field, value) => {
    setParts(prev => {
      const updatedGroups = [...prev[partKey].groups];
      updatedGroups[groupIdx][field] = value;
      return { ...prev, [partKey]: { ...prev[partKey], groups: updatedGroups } };
    });
  };

  const handleQuestionFieldChange = (partKey, groupIdx, qIdx, field, value) => {
    setParts(prev => {
      const updatedGroups = [...prev[partKey].groups];
      const updatedQuestions = [...updatedGroups[groupIdx].questions];
      updatedQuestions[qIdx] = { ...updatedQuestions[qIdx], [field]: value };
      updatedGroups[groupIdx].questions = updatedQuestions;

      const reindexedGroups = reindexPartQuestions(updatedGroups, partKey);

      return { ...prev, [partKey]: { ...prev[partKey], groups: reindexedGroups } };
    });
  };

  const toggleInputVisibility = (partKey, groupIdx, qIdx, flagField, valueField, status) => {
    setParts(prev => {
      const updatedGroups = [...prev[partKey].groups];
      const updatedQuestions = [...updatedGroups[groupIdx].questions];
      
      updatedQuestions[qIdx] = { 
        ...updatedQuestions[qIdx], 
        [flagField]: status,
        [valueField]: status ? updatedQuestions[qIdx][valueField] : ''
      };
      
      updatedGroups[groupIdx].questions = updatedQuestions;
      const reindexedGroups = reindexPartQuestions(updatedGroups, partKey);

      return { ...prev, [partKey]: { ...prev[partKey], groups: reindexedGroups } };
    });
  };

  const handleSaveExam = async (e) => {
    e.preventDefault();
    if (!examTitle.trim()) return toast.error("Imtihon sarlavhasini kiriting!");

    setIsSaving(true);
    const trackingToast = toast.loading(editExamId ? "Yangilanmoqda..." : "Saqlanmoqda...");
    try {
      const examPayload = {
        title: examTitle.trim(),
        duration: parseInt(duration, 10) || 30,
        part1_audio_url: parts.part1.audio_url || null,
        part1_groups: parts.part1.groups,
        part2_audio_url: parts.part2.audio_url || null,
        part2_groups: parts.part2.groups,
        part3_audio_url: parts.part3.audio_url || null,
        part3_groups: parts.part3.groups,
        part4_audio_url: parts.part4.audio_url || null,
        part4_groups: parts.part4.groups,
        status: 'active'
      };

      let error;
      if (editExamId) {
        const res = await supabase.from('listening_exams').update(examPayload).eq('id', editExamId);
        error = res.error;
      } else {
        const res = await supabase.from('listening_exams').insert([examPayload]);
        error = res.error;
      }

      if (error) throw error;
      
      toast.success(editExamId ? "Imtihon yangilandi!" : "Imtihon saqlandi!", { id: trackingToast });
      if (onRefresh) onRefresh();
      if (onBack) onBack();
    } catch (error) {
      toast.error("Xatolik: " + error.message, { id: trackingToast });
    } finally {
      setIsSaving(false);
    }
  };

  if (loadingData) {
    return (
      <div className="add-listening-container animate-fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Loader2 size={32} className="animate-spin text-indigo-600" />
        <span style={{ marginLeft: '10px', fontWeight: 'bold' }}>Yuklanmoqda...</span>
      </div>
    );
  }

  return (
    <div className="add-listening-container animate-fade-in">
      <div className="admin-page-header">
        <button type="button" onClick={onBack} className="btn-back-link" style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <ArrowLeft size={18} /> Orqaga qaytish
        </button>
        <h2>{editExamId ? "Cambridge IELTS Listening Editor" : "Cambridge IELTS Listening Creator"}</h2>
      </div>

      <form onSubmit={handleSaveExam} className="listening-form-card">
        <div className="form-grid-header" style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
          <div className="input-group" style={{ flex: 3 }}>
            <label>Exam Full Title</label>
            <input 
              type="text" 
              placeholder="e.g. Cambridge 19 - Listening Test 1" 
              value={examTitle} 
              onChange={(e) => setExamTitle(e.target.value)} 
              required 
            />
          </div>
          <div className="input-group shrink" style={{ flex: 1 }}>
            <label>Total Duration (Minutes)</label>
            <input 
              type="number" 
              value={duration} 
              onChange={(e) => setDuration(e.target.value)} 
              required 
            />
          </div>
        </div>

        <div className="listening-parts-tabs" style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          {['part1', 'part2', 'part3', 'part4'].map((pKey, idx) => {
            const totalQ = parts[pKey].groups.reduce((acc, g) => acc + (g.questions?.filter(q => q.question_number !== null)?.length || 0), 0);
            return (
              <button 
                key={pKey} 
                type="button" 
                className={`part-tab-btn ${activeTab === pKey ? 'active' : ''}`} 
                onClick={() => setActiveTab(pKey)}
                style={{ padding: '10px', background: activeTab === pKey ? '#4f46e5' : '#e2e8f0', color: activeTab === pKey ? '#fff' : '#000', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
              >
                <Headphones size={16} style={{ marginRight: '5px' }} /> Part {idx + 1} ({totalQ} Questions)
              </button>
            );
          })}
        </div>

        <div className="part-workspace-box" style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div className="audio-uploader-zone mb-6" style={{ marginBottom: '20px' }}>
            <label className="audio-upload-label" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Section Audio Payload (.mp3 / .wav)</label>
            <div className="audio-flex-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <label className={`file-upload-custom-btn ${uploadingPart === activeTab ? 'disabled' : ''}`} style={{ padding: '8px 16px', background: '#64748b', color: '#fff', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {uploadingPart === activeTab ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Yuklanmoqda...
                  </>
                ) : (
                  <>
                    <Upload size={16} /> Audio Fayl Tanlash
                  </>
                )}
                <input 
                  type="file" 
                  accept="audio/*" 
                  onChange={(e) => handleAudioUpload(e, activeTab)} 
                  disabled={uploadingPart !== null}
                  style={{ display: 'none' }} 
                />
              </label>
              {parts[activeTab].audio_url ? (
                <div className="audio-player-preview-card" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="badge-success-audio" style={{ color: 'green', fontWeight: 'bold' }}>Audio Yuklandi ✅</span>
                  <audio src={parts[activeTab].audio_url} controls className="mini-audio-player" />
                </div>
              ) : (
                <span className="no-audio-alert" style={{ color: '#94a3b8' }}>Audio fayl yuklanmagan.</span>
              )}
            </div>
          </div>

          <div className="question-type-picker-box spec-ielts-picker" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '20px' }}>
            <Layers size={18} className="text-indigo-600" />
            <label style={{ fontWeight: '500' }}>Add New Question Group:</label>
            <select 
              onChange={(e) => { if(e.target.value) { handleAddGroup(activeTab, e.target.value); e.target.value = ''; } }} 
              defaultValue=""
            >
              <option value="" disabled>--- Formatni Tanlang ---</option>
              {Object.entries(IELTS_QUESTION_TYPES).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div className="ielts-groups-timeline mt-6">
            {parts[activeTab].groups.map((group, gIdx) => (
              <div key={group.id} className="ielts-group-card" style={{ background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '15px' }}>
                <div className="group-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span className="ielts-type-tag" style={{ background: '#eef2f6', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.85rem' }}>{IELTS_QUESTION_TYPES[group.type]}</span>
                  
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button 
                      type="button" 
                      onClick={() => handleAddQuestionToGroup(activeTab, gIdx)} 
                      style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}
                    >
                      <Plus size={14} /> Add Row
                    </button>
                    <button type="button" onClick={() => handleRemoveGroup(activeTab, group.id)} style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="input-group my-3" style={{ marginBottom: '10px' }}>
                  <label>Instruction Prompt</label>
                  <input 
                    type="text" 
                    value={group.instruction} 
                    onChange={(e) => handleGroupMetaChange(activeTab, gIdx, 'instruction', e.target.value)} 
                    placeholder="Masalan: Choose the correct letter, A, B or C."
                    style={{ width: '100%', padding: '6px', marginTop: '4px' }}
                  />
                </div>

                {group.type === 'LABELLING' && (
                  <div className="map-image-config-box my-3" style={{ border: '1px dashed #4f46e5', padding: '10px', borderRadius: '6px', marginBottom: '15px' }}>
                    <div className="input-group">
                      <label style={{ display: 'block', color: '#4f46e5', marginBottom: '5px' }}>
                        <ImageIcon size={14} /> Upload Diagram or Map Image
                      </label>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <label className={`file-upload-custom-btn ${uploadingMapId === group.id ? 'disabled' : ''}`} style={{ padding: '6px 12px', background: '#4f46e5', color: '#fff', borderRadius: '4px', cursor: 'pointer' }}>
                          {uploadingMapId === group.id ? <Loader2 size={14} className="animate-spin" /> : "Rasm Tanlash"}
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={(e) => handleMapImageUpload(e, activeTab, gIdx, group.id)} 
                            disabled={uploadingMapId !== null}
                            style={{ display: 'none' }} 
                          />
                        </label>
                        <input 
                          type="url" 
                          placeholder="Yoki rasm URL manzilini qo'ying..." 
                          value={group.diagram_image_url || ''} 
                          onChange={(e) => handleGroupMetaChange(activeTab, gIdx, 'diagram_image_url', e.target.value)} 
                          style={{ flex: 1, padding: '6px' }}
                        />
                      </div>
                    </div>
                    {group.diagram_image_url && (
                      <div className="map-preview-wrapper mt-2" style={{ marginTop: '10px' }}>
                        <img src={group.diagram_image_url} alt="Map Rendering" style={{ maxWidth: '200px', borderRadius: '4px' }} />
                      </div>
                    )}
                  </div>
                )}

                {(group.type === 'MATCHING' || group.type === 'CLASSIFICATION' || group.type === 'LABELLING') && (
                  <div className="matching-options-config-box my-3" style={{ background: '#f1f5f9', padding: '12px', borderRadius: '6px', marginBottom: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 'bold' }}>Matching Options Configuration:</p>
                      <button 
                        type="button"
                        onClick={() => handleAddMatchingOption(activeTab, gIdx)}
                        style={{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Plus size={12} /> Add Option
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      {group.matching_options?.map((opt, oIdx) => (
                        <div key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#fff', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                          <strong style={{ minWidth: '20px', color: '#4f46e5' }}>{opt.id}:</strong>
                          <input 
                            type="text" 
                            value={opt.text} 
                            onChange={(e) => handleGroupMatchingOptionChange(activeTab, gIdx, oIdx, 'text', e.target.value)} 
                            placeholder="Option text..." 
                            style={{ flex: 1, border: 'none', outline: 'none', fontSize: '0.9rem' }}
                          />
                          <button 
                            type="button"
                            onClick={() => handleRemoveMatchingOption(activeTab, gIdx, oIdx)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="group-questions-inner-list mt-4" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {group.questions?.map((q, qIdx) => {
                    const hasTextBefore = q.has_text_before !== false;
                    const hasCorrectAnswer = q.has_correct_answer !== false;
                    const hasTextAfter = q.has_text_after !== false;
                    const isQuestionActive = q.question_number !== null;

                    return (
                      <div 
                        key={qIdx} 
                        className="ielts-question-row-item" 
                        style={{ 
                          background: isQuestionActive ? '#f8fafc' : '#f1f5f9', 
                          padding: '12px', 
                          borderRadius: '6px', 
                          border: `1px solid ${isQuestionActive ? '#e2e8f0' : '#cbd5e1'}`, 
                          display: 'flex', 
                          gap: '10px', 
                          alignItems: 'flex-start',
                          opacity: isQuestionActive ? 1 : 0.85
                        }}
                      >
                        <div className="inline-q-num" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '50px' }}>
                          <strong style={{ color: isQuestionActive ? '#0f172a' : '#64748b' }}>
                            {isQuestionActive ? `Q${q.question_number}` : 'Text'}
                          </strong>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveQuestionFromGroup(activeTab, gIdx, qIdx)}
                            style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginTop: '4px' }}
                          >
                            <Minus size={12} />
                          </button>
                        </div>

                        {group.type === 'NOTE_COMPLETION' && (
                          <div style={{ display: 'flex', gap: '8px', width: '100%', alignItems: 'center', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', flex: 2, gap: '4px', alignItems: 'center', minWidth: '150px' }}>
                              {hasTextBefore && (
                                <input 
                                  type="text" 
                                  value={q.text_before || ''} 
                                  onChange={(e) => handleQuestionFieldChange(activeTab, gIdx, qIdx, 'text_before', e.target.value)} 
                                  placeholder="Text before gap..." 
                                  style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }} 
                                />
                              )}
                              <button 
                                type="button" 
                                title={hasTextBefore ? "Hide Text Before" : "Show Text Before"}
                                onClick={() => toggleInputVisibility(activeTab, gIdx, qIdx, 'has_text_before', 'text_before', !hasTextBefore)}
                                style={{ background: hasTextBefore ? '#10b981' : '#94a3b8', color: '#fff', border: 'none', borderRadius: '4px', padding: '6px', cursor: 'pointer' }}
                              >
                                {hasTextBefore ? <Eye size={14} /> : <EyeOff size={14} />}
                              </button>
                            </div>

                            <div style={{ display: 'flex', flex: 1.5, gap: '4px', alignItems: 'center', minWidth: '120px' }}>
                              {hasCorrectAnswer && (
                                <input 
                                  type="text" 
                                  value={q.correct_answer || ''} 
                                  onChange={(e) => handleQuestionFieldChange(activeTab, gIdx, qIdx, 'correct_answer', e.target.value)} 
                                  placeholder="Answer..." 
                                  style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1.5px solid #4f46e5', fontWeight: 'bold' }} 
                                />
                              )}
                              <button 
                                type="button" 
                                title={hasCorrectAnswer ? "Turn into normal text (No Q Number)" : "Turn into Gap (With Q Number)"}
                                onClick={() => toggleInputVisibility(activeTab, gIdx, qIdx, 'has_correct_answer', 'correct_answer', !hasCorrectAnswer)}
                                style={{ background: hasCorrectAnswer ? '#4f46e5' : '#94a3b8', color: '#fff', border: 'none', borderRadius: '4px', padding: '6px', cursor: 'pointer' }}
                              >
                                {hasCorrectAnswer ? <Eye size={14} /> : <EyeOff size={14} />}
                              </button>
                            </div>

                            <div style={{ display: 'flex', flex: 2, gap: '4px', alignItems: 'center', minWidth: '150px' }}>
                              {hasTextAfter && (
                                <input 
                                  type="text" 
                                  value={q.text_after || ''} 
                                  onChange={(e) => handleQuestionFieldChange(activeTab, gIdx, qIdx, 'text_after', e.target.value)} 
                                  placeholder="Text after gap..." 
                                  style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }} 
                                />
                              )}
                              <button 
                                type="button" 
                                title={hasTextAfter ? "Hide Text After" : "Show Text After"}
                                onClick={() => toggleInputVisibility(activeTab, gIdx, qIdx, 'has_text_after', 'text_after', !hasTextAfter)}
                                style={{ background: hasTextAfter ? '#10b981' : '#94a3b8', color: '#fff', border: 'none', borderRadius: '4px', padding: '6px', cursor: 'pointer' }}
                              >
                                {hasTextAfter ? <Eye size={14} /> : <EyeOff size={14} />}
                              </button>
                            </div>
                          </div>
                        )}

                        {group.type === 'MULTIPLE_CHOICE' && (
                          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <input 
                              type="text" 
                              value={q.text || ''} 
                              onChange={(e) => handleQuestionFieldChange(activeTab, gIdx, qIdx, 'text', e.target.value)} 
                              placeholder="Multiple choice question text..." 
                              style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }} 
                            />
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '10px' }}>
                              {q.options?.map((opt, oIdx) => (
                                <div key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontWeight: 'bold', minWidth: '20px' }}>{opt.id}.</span>
                                  <input 
                                    type="text" 
                                    value={opt.text} 
                                    onChange={(e) => handleQuestionOptionChange(activeTab, gIdx, qIdx, oIdx, e.target.value)} 
                                    placeholder={`Option ${opt.id} text...`} 
                                    style={{ flex: 1, padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                  />
                                  <button 
                                    type="button" 
                                    onClick={() => handleRemoveQuestionOption(activeTab, gIdx, qIdx, oIdx)}
                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ))}
                              <button 
                                type="button"
                                onClick={() => handleAddQuestionOption(activeTab, gIdx, qIdx)}
                                style={{ background: '#f1f5f9', border: '1px dashed #cbd5e1', padding: '4px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', width: 'fit-content' }}
                              >
                                + Add Option Letter
                              </button>
                            </div>

                            <input 
                              type="text" 
                              value={q.correct_answer || ''} 
                              onChange={(e) => handleQuestionFieldChange(activeTab, gIdx, qIdx, 'correct_answer', e.target.value)} 
                              placeholder="Correct Answer (e.g. A)" 
                              style={{ width: '200px', padding: '6px', borderRadius: '4px', border: '1.5px solid #4f46e5', fontWeight: 'bold' }} 
                            />
                          </div>
                        )}

                        {(group.type === 'MATCHING' || group.type === 'CLASSIFICATION' || group.type === 'LABELLING') && (
                          <div style={{ width: '100%', display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <input 
                              type="text" 
                              value={q.text || ''} 
                              onChange={(e) => handleQuestionFieldChange(activeTab, gIdx, qIdx, 'text', e.target.value)} 
                              placeholder="Question text or statement..." 
                              style={{ flex: 2, padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }} 
                            />
                            <input 
                              type="text" 
                              value={q.correct_answer || ''} 
                              onChange={(e) => handleQuestionFieldChange(activeTab, gIdx, qIdx, 'correct_answer', e.target.value)} 
                              placeholder="Correct Option ID (e.g. A)" 
                              style={{ flex: 1, padding: '6px', borderRadius: '4px', border: '1.5px solid #4f46e5', fontWeight: 'bold' }} 
                            />
                          </div>
                        )}

                        {group.type === 'SHORT_ANSWER' && (
                          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <input 
                              type="text" 
                              value={q.text || ''} 
                              onChange={(e) => handleQuestionFieldChange(activeTab, gIdx, qIdx, 'text', e.target.value)} 
                              placeholder="Short answer question text..." 
                              style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }} 
                            />
                            <input 
                              type="text" 
                              value={q.correct_answer || ''} 
                              onChange={(e) => handleQuestionFieldChange(activeTab, gIdx, qIdx, 'correct_answer', e.target.value)} 
                              placeholder="Correct answer..." 
                              style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1.5px solid #4f46e5', fontWeight: 'bold' }} 
                            />
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

        <div className="form-submit-footer" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            type="submit" 
            disabled={isSaving}
            style={{ padding: '10px 20px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {editExamId ? "Imtihonni Yangilash" : "Imtihonni Saqlash"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddListening;