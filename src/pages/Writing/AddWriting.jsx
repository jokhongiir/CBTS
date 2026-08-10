import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { 
  PenTool, 
  Image as ImageIcon, 
  FileText, 
  Hash, 
  ArrowLeft, 
  Save, 
  Trash2, 
  Clock 
} from 'lucide-react';
import { supabase } from '../../config/supabaseClient';
import './Writing.css';

const AddWriting = ({ onBack, onRefresh }) => {
  const [loading, setLoading] = useState(false);
  
  // Task 1 uchun rasm state'lari
  const [imagePreview1, setImagePreview1] = useState(null);
  const [imageFile1, setImageFile1] = useState(null);

  const { 
    register, 
    handleSubmit, 
    formState: { errors }, 
    watch, 
    reset 
  } = useForm({
    defaultValues: {
      title: '',
      duration: 60, // Umumiy vaqt (masalan, 60 daqiqa)
      
      // Task 1 defaultlari
      t1_word_count: 150,
      t1_text: '',
      
      // Task 2 defaultlari
      t2_word_count: 250,
      t2_text: ''
    }
  });

  const t1TextValue = watch('t1_text', '');
  const t2TextValue = watch('t2_text', '');

  const getWordCount = useCallback((text) => {
    if (!text || !text.trim()) return 0;
    return text.trim().split(/\s+/).length;
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreview1) URL.revokeObjectURL(imagePreview1);
    };
  }, [imagePreview1]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Faqat .jpg, .png yoki .webp formatlari qo‘llab-quvvatlanadi!");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Rasm hajmi 5MB dan oshmasligi kerak!");
      return;
    }

    setImageFile1(file);
    if (imagePreview1) URL.revokeObjectURL(imagePreview1);
    setImagePreview1(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    if (imagePreview1) URL.revokeObjectURL(imagePreview1);
    setImageFile1(null);
    setImagePreview1(null);
  };

  const onSubmit = async (data) => {
    setLoading(true);
    const progressToast = toast.loading("Ikkala task yuklanmoqda va saqlanmoqda...");
    
    try {
      let uploadedImageUrl = null;

      if (imageFile1) {
        const fileExt = imageFile1.name.split('.').pop();
        const fileName = `${Date.now()}_${crypto.randomUUID().substring(0, 8)}.${fileExt}`;
        const filePath = `writing-images/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('exams')
          .upload(filePath, imageFile1, { cacheControl: '3600', upsert: false });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('exams').getPublicUrl(filePath);
        uploadedImageUrl = urlData.publicUrl;
      }

      // Ma'lumotlar bazasiga bitta yozuv (row) sifatida saqlash (Task 1 va Task 2 bittada)
      const { error: dbError } = await supabase
        .from('writing_exams')
        .insert([{
          title: data.title.trim(),
          duration: parseInt(data.duration, 10),
          
          // Task 1 ma'lumotlari
          task1_text: data.t1_text.trim(),
          task1_word_limit: parseInt(data.t1_word_count, 10),
          image_url: uploadedImageUrl, // Task 1 uchun rasm

          // Task 2 ma'lumotlari
          task2_text: data.t2_text.trim(),
          task2_word_limit: parseInt(data.t2_word_count, 10),
          
          status: 'active'
        }]);

      if (dbError) throw dbError;

      toast.success("IELTS Writing (Task 1 & Task 2) muvaffaqiyatli qo‘shildi!", { id: progressToast });
      reset();
      handleRemoveImage();
      
      if (onRefresh) await onRefresh();
      if (onBack) onBack();
    } catch (error) {
      console.error("Xatolik:", error);
      toast.error(error.message || "Saqlashda xatolik yuz berdi!", { id: progressToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="writing-panel-card animate-fade-in">
      <div className="writing-card-header">
        <button onClick={onBack} className="btn-icon-back" type="button" disabled={loading}>
          <ArrowLeft size={18} />
          <span>Orqaga</span>
        </button>
        <h2>Yangi Writing Imtihoni (Task 1 & Task 2 Bittada)</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="writing-form">
        {/* Umumiy Sozlamalar */}
        <div className="form-grid-two">
          <div className="writing-input-group">
            <label className="form-label">Imtihon Nomi / To'plam (Masalan: Cambridge 19)</label>
            <div className="writing-field-wrapper">
              <FileText className="field-icon" size={18} />
              <input
                type="text"
                placeholder="Masalan: Cambridge 19 - Test 1"
                {...register("title", { required: "Imtihon nomi majburiy" })}
                disabled={loading}
              />
            </div>
            {errors.title && <span className="error-msg">{errors.title.message}</span>}
          </div>

          <div className="writing-input-group">
            <label className="form-label">Umumiy Vaqt (daqiqa)</label>
            <div className="writing-field-wrapper">
              <Clock className="field-icon" size={18} />
              <input
                type="number"
                {...register("duration", { required: "Vaqt majburiy" })}
                disabled={loading}
              />
            </div>
            {errors.duration && <span className="error-msg">{errors.duration.message}</span>}
          </div>
        </div>

        <hr style={{ margin: '20px 0', borderColor: '#e2e8f0' }} />

        {/* --- TASK 1 QISMI --- */}
        <h3 style={{ marginBottom: '15px', color: '#1e293b' }}>1️⃣ Task 1 (Graph / Chart / Diagram)</h3>
        
        <div className="writing-input-group">
          <label className="form-label">Task 1 Rasm / Grafik (ixtiyoriy)</label>
          <label className={`image-upload-dropzone ${imageFile1 ? 'has-file' : ''}`}>
            <ImageIcon size={20} className="upload-icon" />
            <span className="upload-placeholder-text">
              {imageFile1 ? imageFile1.name : "Task 1 uchun rasm tanlang (.jpg, .png, .webp)"}
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              disabled={loading}
              className="hidden-file-input"
            />
          </label>
        </div>

        {imagePreview1 && (
          <div className="image-preview-box">
            <div className="preview-header">
              <p>Task 1 Rasm oldindan ko‘rish:</p>
              <button type="button" onClick={handleRemoveImage} className="btn-remove-preview">
                <Trash2 size={16} /> O‘chirish
              </button>
            </div>
            <div className="preview-image-wrapper">
              <img src={imagePreview1} alt="Task 1 Visual" className="img-fluid-preview" />
            </div>
          </div>
        )}

        <div className="form-grid-two" style={{ marginTop: '10px' }}>
          <div className="writing-input-group">
            <label className="form-label">Task 1 Minimal So‘z Soni</label>
            <div className="writing-field-wrapper">
              <Hash className="field-icon" size={18} />
              <input
                type="number"
                {...register("t1_word_count", { required: true })}
                disabled={loading}
              />
            </div>
          </div>
        </div>

        <div className="writing-input-group">
          <div className="textarea-label-row">
            <label className="form-label">Task 1 Savol Matni</label>
            <span className="word-counter">{getWordCount(t1TextValue)} so‘z</span>
          </div>
          <textarea
            rows="5"
            placeholder="Task 1 shartini yozing..."
            {...register("t1_text", { required: "Task 1 matni bo'sh bo'lishi mumkin emas" })}
            disabled={loading}
          />
          {errors.t1_text && <span className="error-msg">{errors.t1_text.message}</span>}
        </div>

        <hr style={{ margin: '20px 0', borderColor: '#e2e8f0' }} />

        {/* --- TASK 2 QISMI --- */}
        <h3 style={{ marginBottom: '15px', color: '#1e293b' }}>2️⃣ Task 2 (Essay)</h3>

        <div className="form-grid-two">
          <div className="writing-input-group">
            <label className="form-label">Task 2 Minimal So‘z Soni</label>
            <div className="writing-field-wrapper">
              <Hash className="field-icon" size={18} />
              <input
                type="number"
                {...register("t2_word_count", { required: true })}
                disabled={loading}
              />
            </div>
          </div>
        </div>

        <div className="writing-input-group">
          <div className="textarea-label-row">
            <label className="form-label">Task 2 Savol Matni (Essay)</label>
            <span className="word-counter">{getWordCount(t2TextValue)} so‘z</span>
          </div>
          <textarea
            rows="5"
            placeholder="Task 2 essay mavzusini yozing..."
            {...register("t2_text", { required: "Task 2 matni bo'sh bo'lishi mumkin emas" })}
            disabled={loading}
          />
          {errors.t2_text && <span className="error-msg">{errors.t2_text.message}</span>}
        </div>

        <button type="submit" className="btn-save-writing" disabled={loading} style={{ marginTop: '20px' }}>
          <Save size={18} />
          <span>{loading ? "Saqlanmoqda..." : "Ikkala Taskni Saqlash"}</span>
        </button>
      </form>
    </div>
  );
};

export default AddWriting;