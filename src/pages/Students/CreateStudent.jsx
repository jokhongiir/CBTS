import React, { useState } from 'react';
import { UserPlus, CheckCircle, Copy, ClipboardCheck, Phone, X } from 'lucide-react';
import { supabase } from '../../config/supabaseClient'; 
import { toast } from 'react-hot-toast';

const CreateStudent = ({ isOpen, onClose, onStudentAdded }) => {
  const [formData, setFormData] = useState({ fullName: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [createdStudent, setCreatedStudent] = useState(null); 
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const getRandomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // UUID formatini tekshiruvchi yordamchi funksiya
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
      const [listeningRes, readingRes, writingRes] = await Promise.all([
        supabase.from('listening_exams').select('id, title'),
        supabase.from('reading_exams').select('id, title'),
        supabase.from('writing_exams').select('id, title')
      ]);

      if (listeningRes.error) throw listeningRes.error;
      if (readingRes.error) throw readingRes.error;
      if (writingRes.error) throw writingRes.error;

      if (!listeningRes.data?.length || !readingRes.data?.length || !writingRes.data?.length) {
        toast.error("Ensure at least 1 exam exists for all modules (L, R, W) before creating a student!");
        setLoading(false);
        return;
      }

      const selectedListening = getRandomItem(listeningRes.data);
      const selectedReading = getRandomItem(readingRes.data);
      const selectedWriting = getRandomItem(writingRes.data);
      
      const studentCode = `ST-${Math.floor(1000 + Math.random() * 9000)}`;

      // ID lar UUID formatida ekanligini tekshiramiz, aks holda null yuboramiz (xato bermasligi uchun)
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
      setCopied(false);
      
      if (onStudentAdded) onStudentAdded();
    } catch (error) {
      console.error("Execution error:", error.message);
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Student ID copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setCreatedStudent(null);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-container animate-scale-up" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={handleClose}>
          <X size={20} />
        </button>

        <div className="modal-header">
          <UserPlus size={24} className="icon-blue" />
          <div>
            <h2>Register New Student</h2>
            <p className="modal-subheader">Fill details to auto-assign randomized CBT exam modules.</p>
          </div>
        </div>
        
        {!createdStudent ? (
          <form onSubmit={handleSubmit} className="admin-styled-form">
            <div className="form-input-group">
              <label>Full Name <span className="req">*</span></label>
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
            <div className="form-input-group">
              <label>Phone Number <span className="req">*</span></label>
              <div className="input-with-icon">
                <Phone size={14} className="field-inner-icon" />
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
            <button type="submit" className="admin-submit-btn" disabled={loading}>
              {loading ? "Generating Records..." : "Generate Profile & Assign Modules"}
            </button>
          </form>
        ) : (
          <div className="id-generation-alert animate-fade-in">
            <div className="alert-head">
              <CheckCircle size={20} className="icon-green" />
              <strong>Student Credentials Generated Successfully</strong>
            </div>
            
            <div className="alert-body-id">
              <div>
                <span className="id-label">Access Student ID</span>
                <p className="id-val-display">
                  <strong className="id-highlight">{createdStudent.student_code}</strong>
                </p>
              </div>
            </div>
            
            <div className="generated-modules-list">
              <span className="modules-list-title">Assigned Exam Modules:</span>
              <div className="module-item">
                <span>🎧 Listening:</span> <strong>{createdStudent.listeningTitle}</strong>
              </div>
              <div className="module-item">
                <span>📖 Reading:</span> <strong>{createdStudent.readingTitle}</strong>
              </div>
              <div className="module-item">
                <span>✍️ Writing:</span> <strong>{createdStudent.writingTitle}</strong>
              </div>
            </div>

            <button className="btn-modal-done" onClick={handleClose}>
              Done & Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateStudent;