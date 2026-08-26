import React, { useState } from 'react';
import { UserPlus, CheckCircle, Phone, X } from 'lucide-react';
import { supabase } from '../../config/supabaseClient'; 
import { toast } from 'react-hot-toast';
import './CreateStudent.css';

const CreateStudent = ({ isOpen, onClose, onStudentAdded }) => {
  const [formData, setFormData] = useState({ fullName: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [createdStudent, setCreatedStudent] = useState(null); 

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Chinakam random (tasodifiy) ta'minlash uchun Fisher-Yates shuffle algoritmi
  const shuffleArray = (array) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const isValidUuid = (id) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return typeof id === 'string' && uuidRegex.test(id);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { fullName, phone } = formData;
    
    if (!fullName.trim() || !phone.trim()) {
      toast.error("Full Name and Phone Number are strictly required!");
      return;
    }
    
    setLoading(true);
    try {
      // 1. Bazadan barcha imtihonlarni to'g'ridan-to'g'ri tortib olamiz
      const [listeningRes, readingRes, writingRes] = await Promise.all([
        supabase.from('listening_exams').select('id, title, is_active'),
        supabase.from('reading_exams').select('id, title, is_active'),
        supabase.from('writing_exams').select('id, title, is_active')
      ]);

      if (listeningRes.error) throw listeningRes.error;
      if (readingRes.error) throw readingRes.error;
      if (writingRes.error) throw writingRes.error;

      // 2. Faolligini tekshirish (agar is_active ustuni false bo'lmasa, demak active deb qaraymiz)
      const activeListening = (listeningRes.data || []).filter(item => item.is_active === true || item.is_active === undefined || item.is_active === null);
      const activeReading = (readingRes.data || []).filter(item => item.is_active === true || item.is_active === undefined || item.is_active === null);
      const activeWriting = (writingRes.data || []).filter(item => item.is_active === true || item.is_active === undefined || item.is_active === null);

      if (!activeListening.length || !activeReading.length || !activeWriting.length) {
        toast.error("Ensure at least 1 exam exists for all modules (L, R, W) before creating a student!");
        setLoading(false);
        return;
      }

      // 3. Uchala modulni ham alohida to'liq aralashtiramiz (Shuffle)
      const shuffledListening = shuffleArray(activeListening);
      const shuffledReading = shuffleArray(activeReading);
      const shuffledWriting = shuffleArray(activeWriting);

      // 4. Aralashtirilgan ro'yxatdan birinchi elementni olamiz (bu har safar 100% random bo'ladi)
      const selectedListening = shuffledListening[0];
      const selectedReading = shuffledReading[0];
      const selectedWriting = shuffledWriting[0];
      
      const studentCode = `ST-${Math.floor(1000 + Math.random() * 9000)}`;

      const listeningId = isValidUuid(selectedListening.id) ? selectedListening.id : null;
      const readingId = isValidUuid(selectedReading.id) ? selectedReading.id : null;
      const writingId = isValidUuid(selectedWriting.id) ? selectedWriting.id : null;

      const newStudentPayload = {
        full_name: fullName.trim(),
        phone: phone.trim(),
        student_code: studentCode, 
        assigned_listening_exam_id: listeningId,
        assigned_reading_exam_id: readingId,
        assigned_writing_exam_id: writingId,
        status: 'active'
      };

      const { error: studentError } = await supabase
        .from('students')
        .insert([newStudentPayload]);

      if (studentError) throw studentError;
      
      toast.success("Student profile generated and modules successfully assigned!");
      
      setCreatedStudent({
        student_code: studentCode,
        listeningTitle: selectedListening.title,
        readingTitle: selectedReading.title,
        writingTitle: selectedWriting.title
      });
      
      setFormData({ fullName: '', phone: '' });
      
      if (onStudentAdded) onStudentAdded();
    } catch (error) {
      console.error("Execution error:", error.message);
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCreatedStudent(null);
    onClose();
  };

  return (
    <div className="cstd-overlay" onClick={handleClose}>
      <div className="cstd-wrapper cstd-scale-anim" onClick={(e) => e.stopPropagation()}>
        <button className="cstd-close-btn" onClick={handleClose}>
          <X size={20} />
        </button>

        <div className="cstd-header">
          <UserPlus size={24} className="cstd-icon-blue" />
          <div>
            <h2>Register New Student</h2>
            <p className="cstd-subtitle">Fill details to auto-assign randomized CBT exam modules.</p>
          </div>
        </div>
        
        {!createdStudent ? (
          <form onSubmit={handleSubmit} className="cstd-form">
            <div className="cstd-field-group">
              <label>Full Name <span className="cstd-req">*</span></label>
              <input 
                type="text" 
                name="fullName"
                placeholder="e.g., John Doe" 
                value={formData.fullName}
                onChange={handleInputChange}
                disabled={loading}
                required 
              />
            </div>
            <div className="cstd-field-group">
              <label>Phone Number <span className="cstd-req">*</span></label>
              <div className="cstd-input-icon-wrap">
                <Phone size={14} className="cstd-field-icon" />
                <input 
                  type="tel" 
                  name="phone"
                  placeholder="+998901234567" 
                  value={formData.phone}
                  onChange={handleInputChange}
                  disabled={loading}
                  required
                />
              </div>
            </div>
            <button type="submit" className="cstd-submit-btn" disabled={loading}>
              {loading ? "Generating Records..." : "Generate Profile & Assign Modules"}
            </button>
          </form>
        ) : (
          <div className="cstd-success-card cstd-fade-anim">
            <div className="cstd-success-head">
              <CheckCircle size={20} className="cstd-icon-green" />
              <strong>Student Credentials Generated Successfully</strong>
            </div>
            
            <div className="cstd-id-display-box">
              <div>
                <span className="cstd-id-lbl">Access Student ID</span>
                <p className="cstd-id-val-wrap">
                  <strong className="cstd-id-highlight">{createdStudent.student_code}</strong>
                </p>
              </div>
            </div>
            
            <div className="cstd-modules-box">
              <span className="cstd-modules-title">Assigned Exam Modules:</span>
              <div className="cstd-module-row">
                <span>🎧 Listening:</span> <strong>{createdStudent.listeningTitle}</strong>
              </div>
              <div className="cstd-module-row">
                <span>📖 Reading:</span> <strong>{createdStudent.readingTitle}</strong>
              </div>
              <div className="cstd-module-row">
                <span>✍️ Writing:</span> <strong>{createdStudent.writingTitle}</strong>
              </div>
            </div>

            <button className="cstd-done-btn" onClick={handleClose}>
              Done & Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateStudent;