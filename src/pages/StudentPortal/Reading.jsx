import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Clock, BookOpen, CheckCircle, AlertTriangle, ChevronRight, ChevronLeft } from 'lucide-react';
import { FaFlag, FaRegFlag } from 'react-icons/fa';
import { supabase } from "../../config/supabaseClient";
import { toast } from "react-hot-toast";
import './Reading.css';

const AVAILABLE_PASSAGES = [1, 2, 3];

const StudentReading = () => {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [studentData, setStudentData] = useState(null);
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activePart, setActivePart] = useState(1);
  const [timeLeft, setTimeLeft] = useState(3600);
  const [answers, setAnswers] = useState({});
  const [flaggedQuestions, setFlaggedQuestions] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isExamStarted, setIsExamStarted] = useState(false);

  const storageKeys = useMemo(() => {
    if (!studentData || !examId) return null;
    return {
      started: `exam_reading_started_${studentData.id}_${examId}`,
      timeLeft: `exam_reading_time_left_${studentData.id}_${examId}`,
      answers: `exam_reading_answers_${studentData.id}_${examId}`,
      flags: `exam_reading_flags_${studentData.id}_${examId}`
    };
  }, [studentData, examId]);

  useEffect(() => {
    const initializePortal = async () => {
      try {
        setLoading(true);
        const savedStudent = localStorage.getItem('current_student');
        if (!savedStudent) {
          toast.error("Session expired. Please log in again.");
          navigate('/student/login');
          return;
        }
        const parsedStudent = JSON.parse(savedStudent);

        const { data: student, error: studentError } = await supabase
          .from('students')
          .select('*')
          .eq('id', parsedStudent.id)
          .single();

        if (studentError) throw studentError;
        setStudentData(student);

        const { data: resultCheck } = await supabase
          .from('student_results')
          .select('reading_completed')
          .eq('student_id', parsedStudent.id)
          .maybeSingle();

        if (resultCheck?.reading_completed) {
          setIsFinished(true);
          toast.error("You have already submitted this examination!");
          return navigate("/student/dashboard");
        }

        const { data: examData, error: examError } = await supabase
          .from('reading_exams')
          .select('*')
          .eq('id', examId)
          .single();

        if (examError || !examData) throw new Error("Reading assessment materials could not be retrieved.");
        setExam(examData);

        const keyStarted = `exam_reading_started_${parsedStudent.id}_${examId}`;
        const keyTime = `exam_reading_time_left_${parsedStudent.id}_${examId}`;
        const keyAnswers = `exam_reading_answers_${parsedStudent.id}_${examId}`;
        const keyFlags = `exam_reading_flags_${parsedStudent.id}_${examId}`;

        const hasStartedBefore = localStorage.getItem(keyStarted) === 'true';
        const savedTimeLeft = localStorage.getItem(keyTime);
        const savedAnswers = localStorage.getItem(keyAnswers);
        const savedFlags = localStorage.getItem(keyFlags);

        if (savedAnswers) setAnswers(JSON.parse(savedAnswers));
        if (savedFlags) setFlaggedQuestions(JSON.parse(savedFlags));

        if (hasStartedBefore && savedTimeLeft !== null) {
          setIsExamStarted(true);
          setTimeLeft(parseInt(savedTimeLeft, 10));
        } else if (examData?.duration) {
          setTimeLeft(examData.duration * 60);
        }
      } catch (error) {
        console.error("Initialization error:", error);
        toast.error(error.message || "Failed to initialize examination environment.");
        navigate('/student/dashboard');
      } finally {
        setLoading(false);
      }
    };
    if (examId) initializePortal();
  }, [examId, navigate]);

  const allExamQuestionsMap = useMemo(() => {
    if (!exam) return [];
    const list = [];
    AVAILABLE_PASSAGES.forEach(partNum => {
      const groups = exam[`passage${partNum}_groups`] || [];
      groups.forEach(group => {
        if (Array.isArray(group.questions)) {
          group.questions.forEach(q => {
            if (q.question_number !== null && q.question_number !== undefined) {
              list.push({
                number: q.question_number,
                passage: partNum
              });
            }
          });
        }
      });
    });
    return list.sort((a, b) => a.number - b.number);
  }, [exam]);

  const processExamSubmission = useCallback(async (finalAnswers = answers) => {
    if (!studentData || !exam || isSubmitting) return;
    setIsSubmitting(true);
    const submissionToast = toast.loading("Saving your responses...");
    try {
      let totalCorrect = 0;
      const formattedSubmissionAnswers = {};

      AVAILABLE_PASSAGES.forEach(partNum => {
        const groups = exam[`passage${partNum}_groups`] || [];
        groups.forEach(group => {
          if (Array.isArray(group.questions)) {
            group.questions.forEach(q => {
              if (q.question_number !== null && q.question_number !== undefined) {
                const qKey = `p${partNum}_q${q.question_number}`;
                const studentAnswer = (finalAnswers[qKey] || '').toString().trim();
                const correctAnswer = (q.correct_answer || '').toString().trim();

                const isCorrect = studentAnswer.toLowerCase() === correctAnswer.toLowerCase();
                if (isCorrect && studentAnswer !== '') totalCorrect++;

                formattedSubmissionAnswers[`Q${q.question_number}`] = studentAnswer;
              }
            });
          }
        });
      });

      const { data: existingRows, error: fetchError } = await supabase
        .from('student_results')
        .select('*')
        .eq('student_id', studentData.id);

      if (fetchError) throw fetchError;

      const payload = {
        student_id: studentData.id,
        reading_exam_id: examId,
        reading_answers: formattedSubmissionAnswers,
        reading_score: totalCorrect,
        reading_completed: true,
        listening_completed: existingRows && existingRows.length > 0 ? Boolean(existingRows[0].listening_completed) : false,
        writing_completed: existingRows && existingRows.length > 0 ? Boolean(existingRows[0].writing_completed) : false,
        submitted_at: new Date().toISOString()
      };

      let dbError;

      if (existingRows && existingRows.length > 0) {
        const primaryRowId = existingRows[0].id;
        const { error: updateError } = await supabase
          .from('student_results')
          .update(payload)
          .eq('id', primaryRowId);
        dbError = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('student_results')
          .insert([payload]);
        dbError = insertError;
      }

      if (dbError) throw dbError;

      if (storageKeys) {
        localStorage.removeItem(storageKeys.started);
        localStorage.removeItem(storageKeys.timeLeft);
        localStorage.removeItem(storageKeys.answers);
        localStorage.removeItem(storageKeys.flags);
      }

      setIsFinished(true);
      toast.success("Examination successfully submitted!", { id: submissionToast });
      navigate('/student/dashboard');
    } catch (error) {
      console.error("Submission error:", error);
      toast.error(`Submission failed: ${error.message}`, { id: submissionToast });
    } finally {
      setIsSubmitting(false);
    }
  }, [exam, examId, answers, studentData, isSubmitting, storageKeys, navigate]);

  useEffect(() => {
    if (loading || isFinished || !isExamStarted || timeLeft <= 0 || !storageKeys) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          toast.error("Time expired! Your exam is being automatically submitted...", { duration: 4000 });
          processExamSubmission();
          return 0;
        }
        const newTime = prev - 1;
        localStorage.setItem(storageKeys.timeLeft, newTime.toString());
        return newTime;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [loading, isFinished, isExamStarted, storageKeys, processExamSubmission, timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartExam = () => {
    if (!storageKeys) return;
    localStorage.setItem(storageKeys.started, 'true');
    localStorage.setItem(storageKeys.timeLeft, timeLeft.toString());
    setIsExamStarted(true);
    toast.success("Reading session initialized! Best of luck.", { icon: '⏱️' });
  };

  const handleSelectAnswer = (qKey, value) => {
    setAnswers(prev => {
      const updated = { ...prev, [qKey]: value };
      if (storageKeys) {
        localStorage.setItem(storageKeys.answers, JSON.stringify(updated));
      }
      return updated;
    });
  };

  const toggleFlag = (qNum) => {
    setFlaggedQuestions(prev => {
      const updated = { ...prev, [qNum]: !prev[qNum] };
      if (storageKeys) {
        localStorage.setItem(storageKeys.flags, JSON.stringify(updated));
      }
      return updated;
    });
  };

  const handleSubmitExam = () => {
    const confirmSubmit = window.confirm("Are you sure you want to conclude the test and submit your reading answers?");
    if (confirmSubmit) {
      processExamSubmission();
    }
  };

  // Matndagi A, B, C paragraflarini profesional tarzda ajratib beruvchi funksiya
  const formatPassageContent = (text) => {
    if (!text) return '';
    // Agar matn ichida A, B, C harflari yopishib kelgan bo'lsa, ularni yangi qatorga ajratamiz
    let formatted = text
      .replace(/([^\n])\s*([A-Z])[\.\)]\s+/g, '$1\n\n$2) ')
      .replace(/\n{3,}/g, '\n\n');

    // HTML teglarga o'tkazish (paragraflarni <p> yoki <br/> orqali chiroyli ko'rsatish uchun)
    return formatted
      .split('\n\n')
      .map(paragraph => `<p style="margin-bottom: 12px; line-height: 1.7;">${paragraph.trim()}</p>`)
      .join('');
  };

  const currentPassageText = formatPassageContent(exam?.[`passage${activePart}_text`] || '');
  const currentPassageTitle = exam?.[`passage${activePart}_title`] || '';
  const currentGroups = exam?.[`passage${activePart}_groups`] || [];

  if (loading) {
    return (
      <div className="exam-loading-wrapper">
        <div className="exam-spinner-loader"></div>
        <p>Loading reading assessment package, please wait...</p>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="exam-finish-wrapper">
        <div className="exam-finish-card">
          <CheckCircle size={60} className="exam-finish-icon" />
          <h2>Examination Concluded</h2>
          <button onClick={() => navigate('/student/dashboard')} className="exam-return-btn">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!isExamStarted) {
    return (
      <div className="exam-intro-wrapper">
        <div className="exam-intro-card">
          <div className="exam-intro-header">
            <BookOpen size={50} className="exam-intro-icon" />
            <h1>IELTS Academic Reading Test</h1>
            <span className="exam-badge-pill">{exam?.title || "IELTS Reading Test"}</span>
          </div>
          <div className="exam-intro-body">
            <h3>Examination Details:</h3>
            <ul>
              <li><strong>Duration:</strong> {exam?.duration || 60} Minutes</li>
              <li><strong>Structure:</strong> 3 Passages (40 Questions)</li>
            </ul>
            <div className="exam-alert-box">
              <AlertTriangle size={20} />
              <span>Refreshing the page will not pause the timer. The session countdown continues actively.</span>
            </div>
          </div>
          <button type="button" onClick={handleStartExam} className="exam-start-btn">
            Start Examination
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="exam-workspace-container">
      <header className="exam-top-nav">
        <div className="exam-title-group">
          <h2>{exam?.title}</h2>
          <div className="exam-status-pills">
            <span className="exam-passage-indicator">Passage {activePart} / 3</span>
            <span className="exam-session-pill">Active Session</span>
          </div>
        </div>

        <div className="exam-timer-actions">
          <div className={`exam-timer-display ${timeLeft < 300 ? 'exam-timer-warning' : ''}`}>
            <Clock size={18} />
            <span>{formatTime(timeLeft)}</span>
          </div>
          <button type="button" className="exam-submit-trigger-btn" onClick={handleSubmitExam} disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Finish Exam"}
          </button>
        </div>
      </header>

      <div className="exam-main-grid">
        <div className="exam-passage-section">
          <h3 className="exam-passage-heading">Passage {activePart}: {currentPassageTitle}</h3>
          <div 
            className="exam-passage-content"
            dangerouslySetInnerHTML={{ __html: currentPassageText }}
          />
        </div>

        <div className="exam-questions-section">
          <div className="exam-groups-stack">
            {currentGroups.map((group, gIdx) => (
              <div key={group.id || gIdx} className="exam-group-card">
                <div className="exam-group-banner">
                  <p><strong>{group.instruction}</strong></p>
                </div>

                {(group.type === "MATCHING_HEADINGS" || group.type === "MATCHING_FEATURES") && group.matching_options?.length > 0 && (
                  <div className="exam-options-list-box">
                    <p className="exam-options-title">Available Options:</p>
                    <div className="exam-options-grid">
                      {group.matching_options.map((opt, oIdx) => (
                        <div key={oIdx} className="exam-option-row">
                          <strong className="exam-option-key">{opt.key}:</strong> 
                          <span>{opt.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="exam-questions-stack">
                  {group.questions?.map((q, qIdx) => {
                    const hasNumbered = q.question_number !== null && q.question_number !== undefined;
                    const qKey = hasNumbered ? `p${activePart}_q${q.question_number}` : `p${activePart}_g${gIdx}_row${qIdx}`;
                    const currentAnswer = answers[qKey] || '';
                    const isFlagged = hasNumbered ? flaggedQuestions[q.question_number] : false;
                    
                    return (
                      <div key={qIdx} className={`exam-question-item ${isFlagged ? "exam-item-flagged" : ""}`}>
                        {hasNumbered ? (
                          <div className="exam-number-sidebar">
                            <button type="button" className={`exam-flag-btn ${isFlagged ? "exam-flagged-active" : ""}`} onClick={() => toggleFlag(q.question_number)}>
                              {isFlagged ? <FaFlag /> : <FaRegFlag />}
                            </button>
                            <span className="exam-matrix-cell">{q.question_number}</span>
                          </div>
                        ) : (
                          <div className="exam-number-sidebar">
                            <span className="exam-matrix-cell">Text</span>
                          </div>
                        )}
                        
                        <div className="exam-input-body">
                          {group.type === "NOTE_COMPLETION" && (
                            <div className="exam-gap-wrapper">
                              {q.has_text_before !== false && q.text_before && (
                                <span>{q.text_before}</span>
                              )}
                              {hasNumbered && (
                                <input 
                                  type="text"
                                  className="exam-text-input"
                                  placeholder="Answer..."
                                  value={currentAnswer}
                                  onChange={(e) => handleSelectAnswer(qKey, e.target.value)}
                                />
                              )}
                              {q.has_text_after !== false && q.text_after && (
                                <span>{q.text_after}</span>
                              )}
                            </div>
                          )}

                          {group.type === "MULTIPLE_CHOICE" && (
                            <div className="exam-mc-wrapper">
                              <p className="exam-mc-question">{q.text}</p>
                              <div className="exam-mc-options">
                                {['A', 'B', 'C', 'D'].map((opt) => {
                                  const optionText = q.options?.[['A', 'B', 'C', 'D'].indexOf(opt)] || '';
                                  return (
                                    <label key={opt} className={`exam-mc-label ${currentAnswer === opt ? 'exam-mc-selected' : ''}`}>
                                      <input 
                                        type="radio"
                                        name={qKey}
                                        value={opt}
                                        checked={currentAnswer === opt}
                                        onChange={() => handleSelectAnswer(qKey, opt)}
                                      />
                                      <span className="exam-mc-letter">{opt}:</span> 
                                      <span>{optionText}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {group.type === "TRUE_FALSE_NOT_GIVEN" && (
                            <div className="exam-select-wrapper">
                              <p className="exam-select-question">{q.text}</p>
                              <select 
                                className="exam-dropdown"
                                value={currentAnswer}
                                onChange={(e) => handleSelectAnswer(qKey, e.target.value)}
                              >
                                <option value="">-- Select Answer --</option>
                                <option value="TRUE">TRUE / YES</option>
                                <option value="FALSE">FALSE / NO</option>
                                <option value="NOT GIVEN">NOT GIVEN</option>
                              </select>
                            </div>
                          )}

                          {(group.type === "MATCHING_HEADINGS" || group.type === "MATCHING_FEATURES") && (
                            <div className="exam-select-wrapper">
                              <p className="exam-select-question">{q.text}</p>
                              <select 
                                className="exam-dropdown"
                                value={currentAnswer}
                                onChange={(e) => handleSelectAnswer(qKey, e.target.value)}
                              >
                                <option value="">Select option...</option>
                                {group.matching_options?.map((opt, oIdx) => (
                                  <option key={oIdx} value={opt.key}>{opt.key}: {opt.text}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          {group.type === "SHORT_ANSWER" && (
                            <div className="exam-short-wrapper">
                              <p className="exam-short-question">{q.text}</p>
                              <input 
                                type="text"
                                className="exam-input-full"
                                placeholder="Enter your answer..."
                                value={currentAnswer}
                                onChange={(e) => handleSelectAnswer(qKey, e.target.value)}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="exam-matrix-sidebar">
          <h3>Question Matrix</h3>
          
          <div className="exam-switcher-grid">
            {AVAILABLE_PASSAGES.map(num => (
              <button
                key={num}
                type="button"
                className={`exam-switcher-btn ${activePart === num ? 'exam-switcher-active' : ''}`}
                onClick={() => setActivePart(num)}
              >
                Passage {num}
              </button>
            ))}
          </div>

          <div className="exam-matrix-grid">
            {allExamQuestionsMap.map((qMapObj) => {
              const qNum = qMapObj.number;
              const qKey = `p${qMapObj.passage}_q${qNum}`;
              const hasAnswer = answers[qKey] && answers[qKey].toString().trim() !== "";
              const isFlagged = flaggedQuestions[qNum];
              
              let cellClass = "exam-matrix-cell exam-matrix-clickable";
              if (hasAnswer) cellClass += " exam-cell-answered";
              if (isFlagged) cellClass += " exam-cell-flagged";
              if (activePart === qMapObj.passage) cellClass += " exam-cell-current";

              return (
                <div 
                  key={qNum} 
                  onClick={() => setActivePart(qMapObj.passage)}
                  className={cellClass}
                  title={`Passage ${qMapObj.passage} - Q${qNum}`}
                >
                  {qNum}
                </div>
              );
            })}
          </div>

          <div className="exam-legend-box">
            <div className="exam-legend-row">
              <span className="exam-legend-indicator exam-ind-answered"></span> Answered
            </div>
            <div className="exam-legend-row">
              <span className="exam-legend-indicator exam-ind-flagged"></span> Flagged for Review
            </div>
            <div className="exam-legend-row">
              <span className="exam-legend-indicator exam-ind-empty"></span> Unanswered
            </div>
          </div>
        </aside>
      </div>

      <footer className="exam-footer-nav">
        <button 
          type="button"
          className="exam-nav-prev-btn" 
          disabled={activePart === 1} 
          onClick={() => setActivePart(prev => prev - 1)}
        >
          <ChevronLeft size={16} /> Previous Passage
        </button>
        <span className="exam-footer-progress">Passage {activePart} / 3</span>
        <button 
          type="button"
          className="exam-nav-next-btn" 
          disabled={activePart === 3} 
          onClick={() => setActivePart(prev => prev - 1 + 2)}
        >
          Next Passage <ChevronRight size={16} />
        </button>
      </footer>
    </div>
  );
};

export default StudentReading;