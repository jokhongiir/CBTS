import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../config/supabaseClient";
import { toast } from "react-hot-toast";
import {
  FaClock,
  FaHeadphones,
  FaPlay,
  FaUnlockAlt,
  FaCircleNotch,
  FaInfoCircle,
  FaLock,
  FaFlag,
  FaRegFlag,
  FaSearchPlus,
  FaSearchMinus,
  FaSyncAlt
} from "react-icons/fa";
import "./Listening.css";

const STAGE_DURATION = 20; // Preview and Review stage duration in seconds
const AVAILABLE_PARTS = ["part1", "part2", "part3", "part4"];

const StudentListening = () => {
  const { examId, id } = useParams();
  const navigate = useNavigate();
  const currentId = examId || id;
  
  const [exam, setExam] = useState(null);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isTestStarted, setIsTestStarted] = useState(false);
  const [isAlreadySubmitted, setIsAlreadySubmitted] = useState(false);
  
  const [activePart, setActivePart] = useState("part1");
  const [partStage, setPartStage] = useState("PREVIEW"); // PREVIEW -> PLAYING -> REVIEW -> FINAL_REVIEW
  const [isFinalUnlocked, setIsFinalUnlocked] = useState(false); 
  const [timeLeft, setTimeLeft] = useState(0);
  const [stageTimeLeft, setStageTimeLeft] = useState(STAGE_DURATION);
  
  const [answers, setAnswers] = useState({});
  const [flaggedQuestions, setFlaggedQuestions] = useState({}); 
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- IN-PLACE MAP / DIAGRAM ZOOM STATES (PER GROUP OR GLOBAL) ---
  const [groupZoomLevels, setGroupZoomLevels] = useState({});

  const audioRef = useRef(null);

  const cleanExamId = useMemo(() => {
    return currentId ? currentId.toString().replace("L-", "") : "";
  }, [currentId]);

  // --- 1. INITIALIZE & SECURITY VERIFICATION ---
  useEffect(() => {
    const fetchExamAndCheckAccess = async () => {
      try {
        setLoading(true);
        if (!cleanExamId) {
          toast.error("Error: Exam ID not found!");
          return navigate("/student/dashboard");
        }
        
        const localStudentData = localStorage.getItem("current_student");
        if (!localStudentData) {
          toast.error("Session expired. Please log in again.");
          return navigate("/student/login");
        }
        
        const currentStudent = JSON.parse(localStudentData);
        setStudent(currentStudent);
        
        const { data: attemptData, error: attemptError } = await supabase
          .from("student_results")
          .select("listening_completed")
          .eq("listening_exam_id", cleanExamId)
          .eq("student_id", currentStudent.id)
          .maybeSingle();

        if (attemptError) throw new Error("Security verification failed.");
        if (attemptData?.listening_completed) {
          setIsAlreadySubmitted(true);
          toast.error("You have already submitted this Listening exam!");
          return navigate("/student/dashboard");
        }

        const { data: examData, error: examError } = await supabase
          .from("listening_exams")
          .select("*")
          .eq("id", cleanExamId)
          .single();

        if (examError || !examData) throw new Error("Failed to load exam materials.");
        
        setExam(examData);
        setTimeLeft((examData.duration || 30) * 60);
      } catch (error) {
        console.error("🚨 CRITICAL EXAM ERROR:", error);
        toast.error(error.message);
        navigate("/student/dashboard");
      } finally {
        setLoading(false);
      }
    };
    fetchExamAndCheckAccess();
  }, [cleanExamId, navigate]);

  // --- 2. DYNAMIC QUESTIONS LIST & MATRIX SETUP ---
  const allExamQuestionsMap = useMemo(() => {
    if (!exam) return [];
    const list = [];
    AVAILABLE_PARTS.forEach(partKey => {
      const groups = exam[`${partKey}_groups`] || [];
      groups.forEach(g => {
        g.questions?.forEach(q => {
          if (q.question_number !== null && q.question_number !== undefined) {
            list.push({
              number: q.question_number,
              part: partKey
            });
          }
        });
      });
    });
    return list.sort((a, b) => a.number - b.number);
  }, [exam]);

  const totalQuestionsCount = useMemo(() => {
    return allExamQuestionsMap.length || 40;
  }, [allExamQuestionsMap]);

  // --- 3. DATA SUBMISSION CORE (UPSERT) ---
  const processSubmission = useCallback(async (isAuto = false) => {
    if (isSubmitting || isAlreadySubmitted) return;
    setIsSubmitting(true);
    if (isAuto) {
      toast.error("Time is up! Your answers are being saved automatically...", { duration: 4000 });
    }
    try {
      if (!student?.id) throw new Error("Invalid session context.");
      
      const normalizedAnswers = {};
      Object.keys(answers).forEach((key) => {
        if (answers[key] !== undefined && answers[key] !== null) {
          normalizedAnswers[key] = typeof answers[key] === "string" 
            ? answers[key].toUpperCase().trim() 
            : answers[key];
        }
      });

      const { data: existingRow } = await supabase
        .from("student_results")
        .select("id")
        .eq("student_id", student.id)
        .eq("listening_exam_id", cleanExamId)
        .maybeSingle();

      const payload = {
        student_id: student.id,
        listening_exam_id: cleanExamId,
        listening_answers: normalizedAnswers,
        listening_completed: true,
        submitted_at: new Date().toISOString(),
      };

      if (existingRow?.id) {
        payload.id = existingRow.id; 
      }

      const { error } = await supabase
        .from("student_results")
        .upsert(payload, { onConflict: "id" });

      if (error) throw error;
      
      setIsAlreadySubmitted(true);
      toast.success("Listening exam submitted successfully!");
      navigate("/student/dashboard");
    } catch (error) {
      toast.error(`Submission error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [answers, cleanExamId, student, isSubmitting, isAlreadySubmitted, navigate]);

  // --- 4. GLOBAL EXAM COUNTDOWN ---
  useEffect(() => {
    if (loading || !exam || !isTestStarted || isAlreadySubmitted) return;
    if (timeLeft <= 0) {
      processSubmission(true);
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, loading, exam, isTestStarted, isAlreadySubmitted, processSubmission]);

  // --- 5. STEPPED PART TRANSITIONS ---
  const handleNextPartTransition = useCallback(() => {
    const currentIdx = AVAILABLE_PARTS.indexOf(activePart);
    
    if (currentIdx < AVAILABLE_PARTS.length - 1) {
      const nextPart = AVAILABLE_PARTS[currentIdx + 1];
      setActivePart(nextPart);
      setPartStage("PREVIEW");
      setStageTimeLeft(STAGE_DURATION);
    } else {
      setPartStage("FINAL_REVIEW");
      setIsFinalUnlocked(true);
      toast.success("All audio sections completed! You can now review your answers across any part.", { duration: 5000 });
    }
  }, [activePart]);

  // --- 6. STAGE TIMERS (PREVIEW & REVIEW) ---
  useEffect(() => {
    if (!isTestStarted || (partStage !== "PREVIEW" && partStage !== "REVIEW") || isAlreadySubmitted) return;
    if (stageTimeLeft <= 0) {
      if (partStage === "PREVIEW") {
        setPartStage("PLAYING");
      } else if (partStage === "REVIEW") {
        handleNextPartTransition();
      }
      return;
    }
    const interval = setInterval(() => {
      setStageTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [stageTimeLeft, partStage, isTestStarted, isAlreadySubmitted, handleNextPartTransition]);

  // --- 7. AUDIO HANDLERS ---
  const handleAudioEnded = () => {
    if (partStage === "PLAYING") {
      setPartStage("REVIEW");
      setStageTimeLeft(STAGE_DURATION);
      toast.info("Audio section ended. Please review your answers.");
    }
  };

  // --- 8. INPUT & NAVIGATION TRIGGERS ---
  const handleInputChange = (qNum, val) => {
    setAnswers(prev => ({ ...prev, [qNum]: val }));
  };

  const toggleFlag = (qNum) => {
    setFlaggedQuestions(prev => ({ ...prev, [qNum]: !prev[qNum] }));
  };

  const handleManualPartChange = (pKey) => {
    if (isFinalUnlocked || partStage === "FINAL_REVIEW") {
      setActivePart(pKey);
    } else {
      toast.error("Switching parts is locked while audio is playing!");
    }
  };

  const clickSubmitManual = () => {
    const confirmSubmit = window.confirm("Are you sure you want to finish the exam and submit your answers?");
    if (confirmSubmit) {
      processSubmission(false);
    }
  };

  // --- IN-PLACE ZOOM HANDLERS ---
  const handleZoomIn = (groupId) => {
    setGroupZoomLevels(prev => {
      const current = prev[groupId] || 1;
      return { ...prev, [groupId]: Math.min(current + 0.25, 2.5) };
    });
  };

  const handleZoomOut = (groupId) => {
    setGroupZoomLevels(prev => {
      const current = prev[groupId] || 1;
      return { ...prev, [groupId]: Math.max(current - 0.25, 0.25) };
    });
  };

  const handleResetZoom = (groupId) => {
    setGroupZoomLevels(prev => ({ ...prev, [groupId]: 1 }));
  };

  const currentGroups = useMemo(() => {
    if (!exam) return [];
    return exam[`${activePart}_groups`] || [];
  }, [exam, activePart]);

  const currentAudioUrl = useMemo(() => {
    if (!exam) return "";
    return exam[`${activePart}_audio_url`];
  }, [exam, activePart]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="listening-loading-screen">
        <FaCircleNotch className="spinner-icon animate-spin" />
        <p>Loading exam module, please wait...</p>
      </div>
    );
  }

  // --- INITIAL INTRO INSTRUCTIONS SCREEN ---
  if (!isTestStarted) {
    return (
      <div className="listening-intro-container">
        <div className="intro-card">
          <div className="intro-header">
            <FaHeadphones className="intro-headphone-icon" />
            <h1>IELTS Listening Test System</h1>
            <p className="exam-title-badge">{exam?.title}</p>
          </div>
          <div className="intro-body">
            <h3>Exam Rules:</h3>
            <ul>
              <li>The test consists of 4 parts containing a total of <strong>{totalQuestionsCount} questions</strong>.</li>
              <li>You will have <strong>{STAGE_DURATION} seconds</strong> to preview the questions before each audio starts.</li>
              <li>Audio files play automatically and cannot be paused, rewound, or fast-forwarded.</li>
              <li>Map and diagram images have built-in <strong>`+` and `-` zoom buttons</strong> right on top for clear viewing.</li>
              <li>Once all 4 parts are finished, <strong>all sections will unlock</strong>, allowing you to review any answers during the remaining time.</li>
              <li>Total allocated time: <strong>{exam?.duration || 30} minutes</strong>.</li>
            </ul>
            <div className="warning-box">
              <FaInfoCircle />
              <span>Please check your headphones and volume level before starting the exam!</span>
            </div>
          </div>
          <button 
            type="button"
            className="start-test-btn"
            onClick={() => {
              setIsTestStarted(true);
              setPartStage("PREVIEW");
              setStageTimeLeft(STAGE_DURATION);
            }}
          >
            <FaPlay /> Start Exam
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="listening-workspace-layout">
      {/* HEADER PANEL */}
      <header className="workspace-header">
        <div className="exam-info">
          <h2>{exam?.title}</h2>
          <div className="status-badges-wrapper">
            <span className="current-part-badge">{activePart.toUpperCase()}</span>
            {isFinalUnlocked ? (
              <span className="unlock-status-badge unlocked"><FaUnlockAlt /> All Parts Unlocked</span>
            ) : (
              <span className="unlock-status-badge locked"><FaLock /> Sequential Mode Active</span>
            )}
          </div>
        </div>
        
        <div className="timers-row">
          {(partStage === "PREVIEW" || partStage === "REVIEW") && (
            <div className="stage-timer-alert">
              <span>{partStage === "PREVIEW" ? "Preview:" : "Review:"}</span>
              <strong>{stageTimeLeft}s</strong>
            </div>
          )}
          
          <div className="global-countdown-clock">
            <FaClock />
            <span>{formatTime(timeLeft)}</span>
          </div>
          
          <button 
            type="button"
            className="finish-exam-submit-btn" 
            onClick={clickSubmitManual} 
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Finish Exam"}
          </button>
        </div>
      </header>

      <div className="workspace-main-content">
        {/* QUEST PAPER COMPONENT */}
        <div className="questions-paper-scrollable">
          
          {/* AUDIO PLAYER CONTROLLER */}
          {partStage === "PLAYING" && currentAudioUrl && (
            <div className="audio-player-sticky-strip">
              <div className="audio-playing-status">
                <div className="audio-wave-animation">
                  <span></span><span></span><span></span>
                </div>
                <p>Audio recording is playing...</p>
              </div>
              <audio 
                ref={audioRef}
                src={currentAudioUrl} 
                autoPlay 
                onEnded={handleAudioEnded}
                controlsList="nodownload"
                className="hidden-audio-element"
              />
            </div>
          )}

          {partStage === "PREVIEW" && (
            <div className="stage-overlay-info preview-mode">
              <FaLock /> <strong>Part {activePart.slice(-1)} Preview.</strong> Analyze the questions. Audio will start in {stageTimeLeft} seconds.
            </div>
          )}
          {partStage === "REVIEW" && (
            <div className="stage-overlay-info review-mode">
              <FaUnlockAlt /> <strong>Part {activePart.slice(-1)} Audio ended.</strong> Review your answers. {stageTimeLeft} seconds left to move to the next part.
            </div>
          )}
          {partStage === "FINAL_REVIEW" && (
            <div className="stage-overlay-info final-review-mode">
              <FaUnlockAlt /> <strong>Restrictions lifted.</strong> All parts are open. You can modify any answer.
            </div>
          )}

          {/* DYNAMIC QUESTIONS STACK */}
          <div className="ielts-dynamic-render-container">
            {currentGroups.map((group, gIdx) => {
              const groupId = group.id || gIdx;
              const currentZoom = groupZoomLevels[groupId] || 1;

              return (
                <div key={groupId} className="student-question-group-card">
                  
                  {group.instruction && group.instruction.trim() !== "" && (
                    <div className="group-instruction-banner">
                      <p>{group.instruction}</p>
                    </div>
                  )}

                  {/* IN-PLACE ZOOMABLE MAP / DIAGRAM IMAGE CONTAINER */}
                  {group.diagram_image_url && (
                    <div className="inline-diagram-container">
                      <div className="inline-zoom-toolbar">
                        <button type="button" onClick={() => handleZoomIn(groupId)} title="Zoom In"><FaSearchPlus /></button>
                        <button type="button" onClick={() => handleZoomOut(groupId)} title="Zoom Out"><FaSearchMinus /></button>
                        <button type="button" onClick={() => handleResetZoom(groupId)} title="Reset Zoom"><FaSyncAlt /></button>
                      </div>
                      <div className="inline-image-viewport">
                        <img 
                          src={group.diagram_image_url} 
                          alt="IELTS Map or Diagram" 
                          style={{ transform: `scale(${currentZoom})` }}
                          className="exam-fluid-image inline-zoomable-image" 
                        />
                      </div>
                    </div>
                  )}

                  {/* DYNAMIC MATCHING / LABELLING OPTIONS RENDERING */}
                  {group.matching_options && group.matching_options.length > 0 && (
                    <div className="student-matching-options-box">
                      <p className="matching-options-title">Choose one option from the list below:</p>
                      <div className="matching-options-grid">
                        {group.matching_options.map((opt) => (
                          <div key={opt.id} className="matching-option-item">
                            <strong className="matching-option-id">{opt.id}.</strong> {opt.text}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="group-questions-render-stack">
                    {group.questions?.map((q, qIdx) => {
                      const qNum = q.question_number;
                      const isFlagged = flaggedQuestions[qNum];
                      return (
                        <div key={qIdx} className={`student-question-row ${isFlagged ? "row-flagged" : ""}`}>
                          
                          <div className="q-num-sidebar">
                            <button type="button" className="btn-flag-toggle" onClick={() => toggleFlag(qNum)}>
                              {isFlagged ? <FaFlag className="flag-active" /> : <FaRegFlag />}
                            </button>
                            <span><strong>{qNum}</strong></span>
                          </div>

                          <div className="q-dynamic-input-body">
                            {/* 1. NOTE_COMPLETION */}
                            {group.type === "NOTE_COMPLETION" && (
                              <div className="gap-filling-layout">
                                {q.has_text_before !== false && q.text_before && q.text_before.trim() !== "" && (
                                  <span className="text-context">{q.text_before}</span>
                                )}
                                
                                {q.has_correct_answer !== false && (
                                  <input 
                                    type="text"
                                    className="ielts-gap-input"
                                    value={answers[qNum] || ""}
                                    onChange={(e) => handleInputChange(qNum, e.target.value)}
                                    placeholder={`[${qNum}]`}
                                  />
                                )}

                                {q.has_text_after !== false && q.text_after && q.text_after.trim() !== "" && (
                                  <span className="text-context">{q.text_after}</span>
                                )}
                              </div>
                            )}

                            {/* 2. MULTIPLE CHOICE */}
                            {group.type === "MULTIPLE_CHOICE" && (
                              <div className="multiple-choice-layout">
                                {q.text && q.text.trim() !== "" && <p className="mc-question-text">{q.text}</p>}
                                <div className="mc-options-grid">
                                  {q.options?.map((opt, optIdx) => {
                                    const optionLetter = opt?.id || String.fromCharCode(65 + optIdx);
                                    const optionText = typeof opt === "object" ? opt?.text : opt;

                                    if (!optionText || typeof optionText !== "string" || optionText.trim() === "") return null;

                                    return (
                                      <label key={optionLetter} className={`mc-option-item ${answers[qNum] === optionLetter ? "selected" : ""}`}>
                                        <input 
                                          type="radio" 
                                          name={`mc_${qNum}`} 
                                          value={optionLetter}
                                          checked={answers[qNum] === optionLetter}
                                          onChange={() => handleInputChange(qNum, optionLetter)}
                                        />
                                        <span className="opt-letter">{optionLetter}</span>
                                        <span className="opt-text">{optionText}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* 3. MATCHING & CLASSIFICATION */}
                            {(group.type === "MATCHING" || group.type === "CLASSIFICATION") && (
                              <div className="matching-select-layout">
                                {q.text && q.text.trim() !== "" && <span className="matching-q-text">{q.text}</span>}
                                <select 
                                  value={answers[qNum] || ""} 
                                  onChange={(e) => handleInputChange(qNum, e.target.value)}
                                  className="ielts-select-dropdown"
                                >
                                  <option value="">Select option...</option>
                                  {group.matching_options?.map((opt) => (
                                    <option key={opt.id} value={opt.id}>{opt.id} - {opt.text}</option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {/* 4. LABELLING */}
                            {group.type === "LABELLING" && (
                              <div className="labelling-layout">
                                {q.text && q.text.trim() !== "" && <span className="matching-q-text">{q.text}</span>}
                                <input 
                                  type="text"
                                  className="ielts-gap-input labelling-input-field"
                                  value={answers[qNum] || ""}
                                  onChange={(e) => handleInputChange(qNum, e.target.value)}
                                  placeholder="e.g. A"
                                />
                              </div>
                            )}

                            {/* 5. SHORT ANSWER */}
                            {group.type === "SHORT_ANSWER" && (
                              <div className="short-answer-layout">
                                {q.text && q.text.trim() !== "" && <p className="sa-question-text">{q.text}</p>}
                                <input 
                                  type="text"
                                  className="ielts-text-input-full"
                                  value={answers[qNum] || ""}
                                  onChange={(e) => handleInputChange(qNum, e.target.value)}
                                  placeholder="Enter answer..."
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="questions-navigation-sidebar">
          <h3>Question Matrix</h3>
          <div className="parts-mini-switcher">
            {AVAILABLE_PARTS.map((pKey, idx) => (
              <button 
                key={pKey}
                type="button"
                className={`mini-part-btn ${activePart === pKey ? "active" : ""} ${(!isFinalUnlocked && partStage !== "FINAL_REVIEW") ? "disabled-locked" : ""}`}
                onClick={() => handleManualPartChange(pKey)}
              >
                Part {idx + 1}
              </button>
            ))}
          </div>

          {/* DYNAMIC QUESTION GRID */}
          <div className="numbers-matrix-grid">
            {allExamQuestionsMap.map((qMapObj) => {
              const qNum = qMapObj.number;
              const hasAnswer = answers[qNum] && answers[qNum].toString().trim() !== "";
              const isFlagged = flaggedQuestions[qNum];
              
              let stateClass = "";
              if (isFlagged) stateClass = "matrix-flagged";
              else if (hasAnswer) stateClass = "matrix-answered";
              return (
                <div 
                  key={qNum} 
                  className={`matrix-cell ${stateClass} ${activePart === qMapObj.part ? "current-part-cell" : ""} ${(!isFinalUnlocked && partStage !== "FINAL_REVIEW") ? "matrix-cell-locked" : "matrix-cell-clickable"}`}
                  onClick={() => {
                    if (isFinalUnlocked || partStage === "FINAL_REVIEW") {
                      setActivePart(qMapObj.part);
                    }
                  }}
                >
                  {qNum}
                </div>
              );
            })}
          </div>

          <div className="sidebar-legend">
            <div className="legend-item"><span className="legend-box answered"></span> Answered</div>
            <div className="legend-item"><span className="legend-box flagged"></span> Flagged</div>
            <div className="legend-item"><span className="legend-box empty"></span> Unanswered</div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default StudentListening;