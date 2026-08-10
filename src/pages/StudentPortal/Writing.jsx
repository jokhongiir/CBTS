import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../config/supabaseClient";
import { toast } from "react-hot-toast";
import {
  PenTool,
  Clock,
  Send,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Play,
  Maximize2,
  X,
  CheckCircle,
} from "lucide-react";
import "./Writing.css";

const StudentWriting = () => {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [activeTask, setActiveTask] = useState(1);
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState(null);
  const [writingExam, setWritingExam] = useState(null);

  const [task1Answer, setTask1Answer] = useState("");
  const [task2Answer, setTask2Answer] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isExamStarted, setIsExamStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const cleanExamId = useMemo(() => {
    return examId ? examId.toString().replace("W-", "") : "";
  }, [examId]);

  const storageKeys = useMemo(() => {
    if (!studentData?.id || !cleanExamId) return null;
    return {
      started: `exam_writing_started_${studentData.id}_${cleanExamId}`,
      timeLeft: `exam_writing_time_left_${studentData.id}_${cleanExamId}`,
      draft1: `exam_writing_draft_t1_${studentData.id}_${cleanExamId}`,
      draft2: `exam_writing_draft_t2_${studentData.id}_${cleanExamId}`,
    };
  }, [studentData, cleanExamId]);

  const wordCount1 = useMemo(() => {
    const text = task1Answer.trim();
    return text ? text.split(/\s+/).length : 0;
  }, [task1Answer]);

  const wordCount2 = useMemo(() => {
    const text = task2Answer.trim();
    return text ? text.split(/\s+/).length : 0;
  }, [task2Answer]);

  useEffect(() => {
    const initializeWritingExam = async () => {
      setLoading(true);
      try {
        const savedStudent = localStorage.getItem("current_student");
        if (!savedStudent) {
          toast.error("Session expired. Please log in again.");
          navigate("/student/login");
          return;
        }
        const parsedStudent = JSON.parse(savedStudent);

        const { data: student, error: studentError } = await supabase
          .from("students")
          .select("*")
          .eq("id", parsedStudent.id)
          .single();

        if (studentError) throw studentError;
        setStudentData(student);

        if (!cleanExamId) {
          toast.error("Writing examination ID not found.");
          navigate("/student/dashboard");
          return;
        }

        const { data: resultCheck } = await supabase
          .from("student_results")
          .select("writing_completed, writing_answer, writing_task2_answer")
          .eq("student_id", parsedStudent.id)
          .eq("writing_exam_id", cleanExamId)
          .maybeSingle();

        if (resultCheck?.writing_completed) {
          setIsSubmitted(true);
          setTask1Answer(resultCheck.writing_answer || "");
          setTask2Answer(resultCheck.writing_task2_answer || "");
          toast.error("You have already submitted the Writing module!");
          navigate("/student/dashboard");
          return;
        }

        const { data: examDetails, error: examError } = await supabase
          .from("writing_exams")
          .select("*")
          .eq("id", cleanExamId)
          .single();

        if (examError || !examDetails)
          throw new Error("Writing assessment materials could not be retrieved.");
        setWritingExam(examDetails);

        const keyStarted = `exam_writing_started_${parsedStudent.id}_${cleanExamId}`;
        const keyTime = `exam_writing_time_left_${parsedStudent.id}_${cleanExamId}`;
        const keyDraft1 = `exam_writing_draft_t1_${parsedStudent.id}_${cleanExamId}`;
        const keyDraft2 = `exam_writing_draft_t2_${parsedStudent.id}_${cleanExamId}`;

        const hasStartedBefore = localStorage.getItem(keyStarted) === "true";
        const savedTimeLeft = localStorage.getItem(keyTime);
        const savedDraft1 = localStorage.getItem(keyDraft1);
        const savedDraft2 = localStorage.getItem(keyDraft2);

        if (savedDraft1) setTask1Answer(savedDraft1);
        if (savedDraft2) setTask2Answer(savedDraft2);

        if (hasStartedBefore && savedTimeLeft !== null) {
          setIsExamStarted(true);
          setTimeLeft(parseInt(savedTimeLeft, 10));
        } else {
          setTimeLeft((examDetails.duration || 60) * 60);
        }
      } catch (error) {
        console.error("Initialization error:", error.message);
        toast.error(error.message || "Failed to initialize examination environment.");
        navigate("/student/dashboard");
      } finally {
        setLoading(false);
      }
    };

    if (cleanExamId) initializeWritingExam();
  }, [navigate, cleanExamId]);

  useEffect(() => {
    if (isExamStarted && storageKeys && !isSubmitted) {
      localStorage.setItem(storageKeys.draft1, task1Answer);
      localStorage.setItem(storageKeys.draft2, task2Answer);
    }
  }, [task1Answer, task2Answer, isExamStarted, storageKeys, isSubmitted]);

  const processExamSubmission = useCallback(
    async (isAuto = false) => {
      if (isSubmitting || isSubmitted || !studentData?.id) return;
      setIsSubmitting(true);

      if (isAuto) {
        toast.error("Time expired! Your essays are being automatically submitted...", {
          duration: 4000,
        });
      } else {
        toast.loading("Uploading and securing your essay responses...");
      }

      try {
        const { data: existingRow } = await supabase
          .from("student_results")
          .select("*")
          .eq("student_id", studentData.id)
          .order("submitted_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const payload = {
          student_id: studentData.id,
          writing_exam_id: cleanExamId,
          writing_answer: task1Answer,
          writing_task2_answer: task2Answer,
          writing_completed: true,
          submitted_at: new Date().toISOString(),
        };

        if (existingRow) {
          payload.id = existingRow.id;
          payload.listening_completed = existingRow.listening_completed;
          payload.listening_score = existingRow.listening_score;
          payload.listening_answers = existingRow.listening_answers;
          payload.listening_exam_id = existingRow.listening_exam_id;
          payload.reading_completed = existingRow.reading_completed;
          payload.reading_score = existingRow.reading_score;
          payload.reading_answers = existingRow.reading_answers;
          payload.reading_exam_id = existingRow.reading_exam_id;
        }

        const { error: resultError } = await supabase
          .from("student_results")
          .upsert(payload, { onConflict: "id" });

        if (resultError) throw resultError;

        if (storageKeys) {
          localStorage.removeItem(storageKeys.started);
          localStorage.removeItem(storageKeys.timeLeft);
          localStorage.removeItem(storageKeys.draft1);
          localStorage.removeItem(storageKeys.draft2);
        }

        setIsSubmitted(true);
        toast.dismiss();
        toast.success(
          isAuto
            ? "Exam automatically archived and saved!"
            : "Your responses have been successfully submitted!"
        );
        setTimeout(() => navigate("/student/dashboard"), 1500);
      } catch (error) {
        console.error("Submission error:", error);
        toast.dismiss();
        toast.error("Submission failed: " + error.message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [cleanExamId, studentData, isSubmitting, isSubmitted, navigate, task1Answer, task2Answer, storageKeys]
  );

  useEffect(() => {
    if (!isExamStarted || timeLeft === null || isSubmitted || !storageKeys) return;
    if (timeLeft <= 0) {
      processExamSubmission(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        const newTime = prev - 1;
        localStorage.setItem(storageKeys.timeLeft, newTime.toString());
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isExamStarted, isSubmitted, storageKeys, processExamSubmission]);

  const handleStartExam = () => {
    if (!storageKeys || !writingExam) return;
    localStorage.setItem(storageKeys.started, "true");
    const currentDuration = (writingExam.duration || 60) * 60;
    localStorage.setItem(storageKeys.timeLeft, currentDuration.toString());
    setTimeLeft(currentDuration);
    setIsExamStarted(true);
    toast.success("Writing session initialized! Best of luck.", { icon: "⏱️" });
  };

  const handleSubmitAnswer = () => {
    if (!task1Answer.trim() && !task2Answer.trim()) {
      toast.error("Please provide responses for the tasks before submitting.");
      return;
    }
    const confirmSubmit = window.confirm(
      "Are you sure you want to conclude the test and submit both essay responses?"
    );
    if (confirmSubmit) {
      processExamSubmission(false);
    }
  };

  const handleKeyDown = (e, setter) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const { selectionStart, selectionEnd, value } = e.target;
      const newValue = value.substring(0, selectionStart) + "  " + value.substring(selectionEnd);
      setter(newValue);
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = selectionStart + 2;
      }, 0);
    }
  };

  const formatTime = (seconds) => {
    if (seconds === null || seconds < 0) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="student-writing-loading">
        <div className="portal-spinner"></div>
        <p>Loading writing assessment package, please wait...</p>
      </div>
    );
  }

  if (!writingExam) {
    return (
      <div className="student-writing-empty">
        <AlertTriangle size={48} className="warn-icon" />
        <h3>Assessment Not Found or Deactivated</h3>
        <button onClick={() => navigate("/student/dashboard")} className="btn-back-dashboard">
          <ArrowLeft size={16} /> Return to Dashboard
        </button>
      </div>
    );
  }

  const isEditorDisabled = !isExamStarted || isSubmitting || timeLeft <= 0;

  return (
    <div className="student-writing-container animate-fade-in">
      <div className="top-navigation-row">
        <button
          onClick={() => navigate("/student/dashboard")}
          className="btn-text-back"
          disabled={isExamStarted && timeLeft > 0}
        >
          <ArrowLeft size={16} />
          <span>
            {isExamStarted ? "Leaving during active exam is restricted." : "Return to Dashboard"}
          </span>
        </button>
      </div>

      <div className="portal-exam-header">
        <div className="exam-meta-info">
          <span className="exam-section-badge">Task {activeTask} of 2</span>
          <h1>{writingExam.title}</h1>
        </div>

        <div className="task-switch-tabs">
          <button
            className={`tab-btn ${activeTask === 1 ? "active" : ""}`}
            onClick={() => setActiveTask(1)}
          >
            Task 1 {wordCount1 >= 10 && <CheckCircle size={14} className="icon-complete" />}
          </button>
          <button
            className={`tab-btn ${activeTask === 2 ? "active" : ""}`}
            onClick={() => setActiveTask(2)}
          >
            Task 2 {wordCount2 >= 10 && <CheckCircle size={14} className="icon-complete" />}
          </button>
        </div>

        <div className="exam-limits-panel">
          <div className={`limit-item exam-timer-display ${isExamStarted && timeLeft < 300 ? "timer-danger" : ""}`}>
            <Clock size={18} />
            <span>
              {isExamStarted ? `Time Remaining: ${formatTime(timeLeft)}` : `Duration: ${writingExam.duration || 60} Minutes`}
            </span>
          </div>
        </div>
      </div>

      <div className="portal-exam-workspace">
        {!isExamStarted && (
          <div className="start-exam-overlay">
            <div className="overlay-card">
              <h3>Ready to initialize your Writing assessment?</h3>
              <p>This exam contains Task 1 and Task 2. Once started, the timer cannot be paused.</p>
              <button onClick={handleStartExam} className="btn-trigger-start-exam">
                <Play size={16} /> Start Examination
              </button>
            </div>
          </div>
        )}

        {activeTask === 1 && (
          <div className="task-view-container animate-fade-in">
            <div className="exam-question-panel">
              <div className="panel-section-title">
                <PenTool size={18} />
                <h3>Task 1 (Graph / Chart / Diagram)</h3>
              </div>
              <div className="question-prompt-text">{writingExam.task1_text}</div>

              {writingExam.image_url && (
                <div className="image-zoom-container" onClick={() => setIsImageModalOpen(true)}>
                  <img src={writingExam.image_url} alt="Task 1 Visual Material" className="exam-question-img" />
                  <div className="image-hover-hint">
                    <Maximize2 size={16} /> Click to enlarge
                  </div>
                </div>
              )}
            </div>

            <div className={`exam-answer-panel-wrapper ${!isExamStarted ? "panel-locked-blur" : ""}`}>
              <div className="exam-answer-panel">
                <div className="editor-block">
                  <div className="editor-label">
                    <span>Task 1 Response</span>
                    <div className={`word-counter-badge ${wordCount1 >= (writingExam.task1_word_limit || 150) ? "limit-reached" : ""}`}>
                      Words: <strong>{wordCount1}</strong> / {writingExam.task1_word_limit || 150}
                    </div>
                  </div>
                  <textarea
                    className="portal-writing-textarea"
                    placeholder="Type your Task 1 response here..."
                    value={task1Answer}
                    onChange={(e) => setTask1Answer(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, setTask1Answer)}
                    disabled={isEditorDisabled}
                  />
                </div>

                <div className="navigation-actions-row">
                  <div></div>
                  <button
                    className="btn-nav-next"
                    onClick={() => setActiveTask(2)}
                    disabled={!isExamStarted}
                  >
                    Next: Task 2 <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTask === 2 && (
          <div className="task-view-container animate-fade-in">
            <div className="exam-question-panel">
              <div className="panel-section-title">
                <PenTool size={18} />
                <h3>Task 2 (Essay)</h3>
              </div>
              <div className="question-prompt-text">{writingExam.task2_text}</div>
            </div>

            <div className={`exam-answer-panel-wrapper ${!isExamStarted ? "panel-locked-blur" : ""}`}>
              <div className="exam-answer-panel">
                <div className="editor-block">
                  <div className="editor-label">
                    <span>Task 2 Essay Response</span>
                    <div className={`word-counter-badge ${wordCount2 >= (writingExam.task2_word_limit || 250) ? "limit-reached" : ""}`}>
                      Words: <strong>{wordCount2}</strong> / {writingExam.task2_word_limit || 250}
                    </div>
                  </div>
                  <textarea
                    className="portal-writing-textarea"
                    placeholder="Type your Task 2 essay response here..."
                    value={task2Answer}
                    onChange={(e) => setTask2Answer(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, setTask2Answer)}
                    disabled={isEditorDisabled}
                  />
                </div>

                <div className="navigation-actions-row">
                  <button
                    className="btn-nav-prev"
                    onClick={() => setActiveTask(1)}
                    disabled={!isExamStarted}
                  >
                    <ArrowLeft size={18} /> Back: Task 1
                  </button>

                  <button
                    onClick={handleSubmitAnswer}
                    className="btn-portal-submit-exam"
                    disabled={isEditorDisabled}
                  >
                    <Send size={18} />
                    {isSubmitting ? "Submitting..." : "Submit All Tasks"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {isImageModalOpen && writingExam?.image_url && (
        <div className="writing-modal-overlay" onClick={() => setIsImageModalOpen(false)}>
          <div className="writing-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="writing-modal-header">
              <h4>Task 1 Visual Diagram</h4>
              <button className="btn-close-modal" onClick={() => setIsImageModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="writing-modal-body">
              <img src={writingExam.image_url} alt="Enlarged Task Visual" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentWriting;