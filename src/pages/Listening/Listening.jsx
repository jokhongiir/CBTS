import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Headphones, Clock, Calendar, Eye, Loader2, Edit3 } from 'lucide-react';
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
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">IELTS Listening Question Bank</h1>
          <p className="text-sm text-gray-500">Manage 4-part simulation modules running on computerized test engines.</p>
        </div>
        <button
          onClick={handleAddNew}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-indigo-700 transition shadow-sm font-medium"
        >
          <Plus size={18} /> Add New Listening Task
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 p-12 text-slate-500 font-medium">
          <Loader2 size={20} className="animate-spin text-indigo-500" />
          <span>Synchronizing media parameters...</span>
        </div>
      ) : exams.length === 0 ? (
        <div className="bg-slate-50 border border-dashed rounded-2xl p-12 text-center text-gray-500">
          No listening exam modules deployed yet. Use the action studio button to establish a track cluster.
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full border-collapse text-left">
            <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-600 font-semibold text-sm">
              <tr>
                <th className="p-4">Exam Architecture Reference</th>
                <th className="p-4 text-center">Duration</th>
                <th className="p-4">Deployment Date</th>
                <th className="p-4 text-center">Actions Matrix</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
              {exams.map((exam, index) => {
                const examDisplayNumber = exams.length - index;

                return (
                  <tr key={exam.id} className="hover:bg-slate-50/50 transition">
                    <td className="p-4 font-medium text-slate-900">
                      <div className="flex items-center gap-3">
                        <Headphones size={18} className="text-indigo-500 shrink-0" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded font-bold">
                              L-{examDisplayNumber}
                            </span>
                            <span>{exam.title}</span>
                          </div>
                          <div className="block mt-0.5 text-xs">
                            <a 
                              href={`/student/listening/${exam.id}`} 
                              target="_blank" 
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-semibold"
                            >
                              <Eye size={12} /> Launch Candidate Interface Simulation
                            </a>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-center text-slate-600">
                      <span className="inline-flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-md text-xs font-medium">
                        <Clock size={12} /> {exam.duration} mins
                      </span>
                    </td>
                    <td className="p-4 text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <Calendar size={12} /> {new Date(exam.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleEdit(exam.id)}
                          className="text-slate-400 hover:text-indigo-600 p-2 rounded-lg hover:bg-indigo-50 transition"
                          title="Edit Task"
                        >
                          <Edit3 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(exam.id)}
                          className="text-slate-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition"
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
      )}
    </div>
  );
};

export default Listening;