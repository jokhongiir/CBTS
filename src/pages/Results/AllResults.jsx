import React, { useState, useEffect } from "react";
import { supabase } from "../../config/supabaseClient";
import { toast } from "react-hot-toast";
import {
  Search,
  RefreshCw,
  Headphones,
  BookOpen,
  PenTool,
  Calendar,
  User,
  X,
  Eye,
  AlertCircle,
  Download,
  Award,
  Save,
  Mic,
  CheckCircle,
  XCircle,
  MinusCircle,
} from "lucide-react";
import "./Results.css";

const AllResults = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSection, setFilterSection] = useState("all");
  const [selectedResult, setSelectedResult] = useState(null);

  // Score Management States for Admin
  const [adminScores, setAdminScores] = useState({
    listening: "",
    reading: "",
    writing: "",
    speaking: "",
    overall: "",
  });
  const [isSavingScores, setIsSavingScores] = useState(false);

  const [listeningExamsMap, setListeningExamsMap] = useState(new Map());
  const [readingExamsMap, setReadingExamsMap] = useState(new Map());

  // IELTS Rounding Rule (e.g. 6.25 -> 6.5, 6.75 -> 7.0, 6.125 -> 6.0)
  const calculateIELTSOverall = (l, r, w, s) => {
    const scores = [parseFloat(l), parseFloat(r), parseFloat(w), parseFloat(s)].filter(
      (val) => !isNaN(val) && val >= 0
    );
    if (scores.length === 0) return "";

    const sum = scores.reduce((acc, curr) => acc + curr, 0);
    const avg = sum / scores.length;
    const decimal = avg - Math.floor(avg);

    if (decimal < 0.25) return Math.floor(avg).toFixed(1);
    if (decimal < 0.75) return (Math.floor(avg) + 0.5).toFixed(1);
    return Math.ceil(avg).toFixed(1);
  };

  useEffect(() => {
    if (selectedResult) {
      const l = selectedResult.listening_band_score ?? "";
      const r = selectedResult.reading_band_score ?? "";
      const w = selectedResult.writing_band_score ?? "";
      const s = selectedResult.speaking_band_score ?? "";
      const ov = selectedResult.overall_band_score ?? calculateIELTSOverall(l, r, w, s);

      setAdminScores({
        listening: l,
        reading: r,
        writing: w,
        speaking: s,
        overall: ov,
      });
    }
  }, [selectedResult]);

  const handleScoreChange = (field, value) => {
    const updated = { ...adminScores, [field]: value };
    const autoOverall = calculateIELTSOverall(
      updated.listening,
      updated.reading,
      updated.writing,
      updated.speaking
    );
    updated.overall = autoOverall;
    setAdminScores(updated);
  };

  const handleSaveBandScores = async () => {
    if (!selectedResult) return;
    try {
      setIsSavingScores(true);
      const payload = {
        listening_band_score: adminScores.listening ? parseFloat(adminScores.listening) : null,
        reading_band_score: adminScores.reading ? parseFloat(adminScores.reading) : null,
        writing_band_score: adminScores.writing ? parseFloat(adminScores.writing) : null,
        speaking_band_score: adminScores.speaking ? parseFloat(adminScores.speaking) : null,
        overall_band_score: adminScores.overall ? parseFloat(adminScores.overall) : null,
      };

      const { error } = await supabase
        .from("student_results")
        .update(payload)
        .eq("id", selectedResult.id);

      if (error) throw error;

      toast.success("Band scores updated successfully!");

      const updatedItem = { ...selectedResult, ...payload };
      setSelectedResult(updatedItem);
      setResults((prev) =>
        prev.map((item) => (item.id === selectedResult.id ? updatedItem : item))
      );
    } catch (err) {
      console.error("Save band scores error:", err);
      toast.error(`Failed to save scores: ${err.message}`);
    } finally {
      setIsSavingScores(false);
    }
  };

  const fetchAllResults = async () => {
    try {
      setLoading(true);
      const { data: rawResults, error: resultsError } = await supabase
        .from("student_results")
        .select("*")
        .order("submitted_at", { ascending: false });

      if (resultsError) throw resultsError;
      if (!rawResults || rawResults.length === 0) {
        setResults([]);
        return;
      }

      const [studentsRes, listeningRes, readingRes, writingRes] =
        await Promise.all([
          supabase.from("students").select("*"),
          supabase.from("listening_exams").select("*"),
          supabase.from("reading_exams").select("*"),
          supabase.from("writing_exams").select("id, title"),
        ]);

      const lExams = new Map(
        listeningRes.data?.map((e) => [e.id.toString(), e]) || []
      );
      const rExams = new Map(
        readingRes.data?.map((e) => [e.id.toString(), e]) || []
      );

      setListeningExamsMap(lExams);
      setReadingExamsMap(rExams);

      const studentsMap = new Map(
        studentsRes.data?.map((s) => [s.id.toString(), s]) || []
      );
      const writingMap = new Map(
        writingRes.data?.map((e) => [e.id.toString(), e]) || []
      );

      const combinedData = rawResults.map((item) => {
        const studentKey = item.student_id ? item.student_id.toString() : "";
        const listeningKey = item.listening_exam_id
          ? item.listening_exam_id.toString()
          : "";
        const readingKey = item.reading_exam_id
          ? item.reading_exam_id.toString()
          : "";
        const writingKey = item.writing_exam_id
          ? item.writing_exam_id.toString()
          : "";

        const rawStudent = studentsMap.get(studentKey) || null;
        let finalName = "Unknown Student";
        if (rawStudent) {
          finalName =
            rawStudent.full_name ||
            rawStudent.name ||
            rawStudent.first_name ||
            rawStudent.email ||
            "Unknown";
        }

        return {
          ...item,
          student_display_name: finalName,
          students: rawStudent,
          listening_exams: lExams.get(listeningKey) || null,
          reading_exams: rExams.get(readingKey) || null,
          writing_exams: writingMap.get(writingKey) || null,
        };
      });

      setResults(combinedData);
    } catch (error) {
      console.error("Error fetching results:", error);
      toast.error(`Failed to load results: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllResults();
  }, []);

  const getSafeAnswer = (answersObj, qNum) => {
    if (!answersObj) return "-";
    if (answersObj[qNum] !== undefined && answersObj[qNum] !== null) {
      return answersObj[qNum].toString().trim();
    }
    if (
      answersObj[qNum.toString()] !== undefined &&
      answersObj[qNum.toString()] !== null
    ) {
      return answersObj[qNum.toString()].toString().trim();
    }

    const formats = [
      `Q${qNum}`,
      `q${qNum}`,
      `p1_q${qNum}`,
      `p2_q${qNum}`,
      `p3_q${qNum}`,
      `p4_q${qNum}`,
      `l1_q${qNum}`,
      `l2_q${qNum}`,
      `l3_q${qNum}`,
      `l4_q${qNum}`,
    ];
    for (const key of formats) {
      if (answersObj[key] !== undefined && answersObj[key] !== null) {
        return answersObj[key].toString().trim();
      }
    }
    return "-";
  };

  const checkAnswerStatus = (examType, examId, qNum, studentAns) => {
    if (!examId || !studentAns || studentAns === "-")
      return { status: "neutral", correct: "" };

    const exam =
      examType === "listening"
        ? listeningExamsMap.get(examId.toString())
        : readingExamsMap.get(examId.toString());
    if (!exam) return { status: "neutral", correct: "" };

    let originalCorrectAnswer = "";
    const checkGroups = (groups) => {
      if (!groups || !Array.isArray(groups)) return;
      for (const group of groups) {
        if (group.questions && Array.isArray(group.questions)) {
          const qFound = group.questions.find(
            (q) => Number(q.question_number) === Number(qNum)
          );
          if (
            qFound &&
            qFound.correct_answer !== undefined &&
            qFound.correct_answer !== null
          ) {
            originalCorrectAnswer = qFound.correct_answer.toString().trim();
            break;
          }
        }
      }
    };

    if (examType === "reading") {
      checkGroups(exam.passage1_groups);
      if (!originalCorrectAnswer) checkGroups(exam.passage2_groups);
      if (!originalCorrectAnswer) checkGroups(exam.passage3_groups);
    } else {
      checkGroups(exam.part1_groups);
      if (!originalCorrectAnswer) checkGroups(exam.part2_groups);
      if (!originalCorrectAnswer) checkGroups(exam.part3_groups);
      if (!originalCorrectAnswer) checkGroups(exam.part4_groups);
      if (!originalCorrectAnswer) checkGroups(exam.section1_groups);
      if (!originalCorrectAnswer) checkGroups(exam.section2_groups);
      if (!originalCorrectAnswer) checkGroups(exam.section3_groups);
      if (!originalCorrectAnswer) checkGroups(exam.section4_groups);
      if (!originalCorrectAnswer) checkGroups(exam.groups);
    }

    if (!originalCorrectAnswer) return { status: "neutral", correct: "" };

    const normalizeAns = (val) => {
      const v = val
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]/g, "");
      if (v === "t" || v === "true" || v === "yes" || v === "y") return "true";
      if (v === "f" || v === "false" || v === "no" || v === "n") return "false";
      return v;
    };

    const isCorrect =
      normalizeAns(originalCorrectAnswer) === normalizeAns(studentAns);

    return {
      status: isCorrect ? "correct" : "incorrect",
      correct: originalCorrectAnswer,
    };
  };

  const calculateRealScore = (examType, examId, answersObj, dbScore) => {
    if (dbScore !== null && dbScore !== undefined && dbScore > 0)
      return dbScore;
    if (!examId || !answersObj) return 0;

    let calculated = 0;
    for (let i = 1; i <= 40; i++) {
      const studentAns = getSafeAnswer(answersObj, i);
      const check = checkAnswerStatus(examType, examId, i, studentAns);
      if (check.status === "correct") calculated++;
    }
    return calculated;
  };

  const downloadStudentReportHTML = (item) => {
    const lScore = calculateRealScore(
      "listening",
      item.listening_exam_id,
      item.listening_answers,
      item.listening_score
    );
    const rScore = calculateRealScore(
      "reading",
      item.reading_exam_id,
      item.reading_answers,
      item.reading_score
    );

    const lBand = item.listening_band_score ?? "N/A";
    const rBand = item.reading_band_score ?? "N/A";
    const wBand = item.writing_band_score ?? "N/A";
    const sBand = item.speaking_band_score ?? "N/A";
    const ovBand = item.overall_band_score ?? "N/A";

    let listeningRowsHtml = "";
    if (item.listening_completed && item.listening_answers) {
      for (let i = 1; i <= 40; i++) {
        const studentAns = getSafeAnswer(item.listening_answers, i);
        const check = checkAnswerStatus(
          "listening",
          item.listening_exam_id,
          i,
          studentAns
        );
        const isCorrect = check.status === "correct";
        const isNeutral = check.status === "neutral";

        listeningRowsHtml += `
          <tr style="background-color: ${isNeutral ? '#f8fafc' : isCorrect ? '#ffffff' : '#fffdfd'};">
            <td style="padding: 12px 18px; font-weight: 700; color: #64748b; border-bottom: 1px solid #f8fafc;">#${i}</td>
            <td style="padding: 12px 18px; font-weight: 600; color: #0f172a; border-bottom: 1px solid #f8fafc;">${studentAns}</td>
            <td style="padding: 12px 18px; border-bottom: 1px solid #f8fafc;">
              ${isCorrect ? '—' : `<span style="color: #ef4444; font-weight: 600; background: #fff1f2; padding: 2px 8px; border-radius: 4px; border: 1px solid #fecaca; display: inline-block; font-size: 13px;">${check.correct || 'N/A'}</span>`}
            </td>
            <td style="padding: 12px 18px; text-align: right; border-bottom: 1px solid #f8fafc;">
              <span style="display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; background-color: ${isNeutral ? '#f1f5f9' : isCorrect ? '#ecfdf5' : '#fef2f2'}; color: ${isNeutral ? '#64748b' : isCorrect ? '#065f46' : '#991b1b'}; border: 1px solid ${isNeutral ? '#e2e8f0' : isCorrect ? '#a7f3d0' : '#fecaca'};">
                ${isNeutral ? 'N/A' : isCorrect ? '✓ To\'g\'ri' : '✕ Xato'}
              </span>
            </td>
          </tr>
        `;
      }
    } else {
      listeningRowsHtml = `<tr><td colspan="4" style="text-align: center; padding: 20px; color: #64748b; font-style: italic;">Candidate did not submit the Listening module.</td></tr>`;
    }

    let readingRowsHtml = "";
    if (item.reading_completed && item.reading_answers) {
      for (let i = 1; i <= 40; i++) {
        const studentAns = getSafeAnswer(item.reading_answers, i);
        const check = checkAnswerStatus(
          "reading",
          item.reading_exam_id,
          i,
          studentAns
        );
        const isCorrect = check.status === "correct";
        const isNeutral = check.status === "neutral";

        readingRowsHtml += `
          <tr style="background-color: ${isNeutral ? '#f8fafc' : isCorrect ? '#ffffff' : '#fffdfd'};">
            <td style="padding: 12px 18px; font-weight: 700; color: #64748b; border-bottom: 1px solid #f8fafc;">#${i}</td>
            <td style="padding: 12px 18px; font-weight: 600; color: #0f172a; border-bottom: 1px solid #f8fafc;">${studentAns}</td>
            <td style="padding: 12px 18px; border-bottom: 1px solid #f8fafc;">
              ${isCorrect ? '—' : `<span style="color: #ef4444; font-weight: 600; background: #fff1f2; padding: 2px 8px; border-radius: 4px; border: 1px solid #fecaca; display: inline-block; font-size: 13px;">${check.correct || 'N/A'}</span>`}
            </td>
            <td style="padding: 12px 18px; text-align: right; border-bottom: 1px solid #f8fafc;">
              <span style="display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; background-color: ${isNeutral ? '#f1f5f9' : isCorrect ? '#ecfdf5' : '#fef2f2'}; color: ${isNeutral ? '#64748b' : isCorrect ? '#065f46' : '#991b1b'}; border: 1px solid ${isNeutral ? '#e2e8f0' : isCorrect ? '#a7f3d0' : '#fecaca'};">
                ${isNeutral ? 'N/A' : isCorrect ? '✓ To\'g\'ri' : '✕ Xato'}
              </span>
            </td>
          </tr>
        `;
      }
    } else {
      readingRowsHtml = `<tr><td colspan="4" style="text-align: center; padding: 20px; color: #64748b; font-style: italic;">Candidate did not submit the Reading module.</td></tr>`;
    }

    let writingHtml = "";
    if (item.writing_completed) {
      const t1Words = (item.writing_answer || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;
      const t2Words = (item.writing_task2_answer || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;
      writingHtml = `
        <div class="essay-container" style="display: flex; flex-direction: column; gap: 20px;">
          <div class="essay-box" style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; background: #fafaf9;">
            <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 15px; display: flex; justify-content: space-between; align-items: center; color: #0f172a;">Task 1 Response <span class="badge-words" style="font-size: 12px; font-weight: 600; background: white; padding: 4px 10px; border-radius: 6px; border: 1px solid #e2e8f0; color: #64748b;">Words: ${t1Words}</span></h3>
            <div class="essay-text" style="white-space: pre-wrap; font-size: 14px; line-height: 1.7; color: #0f172a; background: white; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 0;">${item.writing_answer || "No text provided for Task 1."}</div>
          </div>
          <div class="essay-box" style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; background: #fafaf9;">
            <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 15px; display: flex; justify-content: space-between; align-items: center; color: #0f172a;">Task 2 Essay Response <span class="badge-words" style="font-size: 12px; font-weight: 600; background: white; padding: 4px 10px; border-radius: 6px; border: 1px solid #e2e8f0; color: #64748b;">Words: ${t2Words}</span></h3>
            <div class="essay-text" style="white-space: pre-wrap; font-size: 14px; line-height: 1.7; color: #0f172a; background: white; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 0;">${item.writing_task2_answer || "No text provided for Task 2."}</div>
          </div>
        </div>
      `;
    } else {
      writingHtml = `<p class="no-data" style="color: #64748b; font-style: italic; font-size: 14px; background: #f8fafc; padding: 20px; text-align: center; border-radius: 8px; border: 1px dashed #e2e8f0;">Candidate did not submit the Writing module.</p>`;
    }

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Exam Report - ${item.student_display_name}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f1f5f9; color: #0f172a; margin: 0; padding: 30px; line-height: 1.5; }
    .container { max-width: 1000px; margin: 0 auto; background: #ffffff; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0; overflow: hidden; }
    .header { background: linear-gradient(135deg, #4f46e5, #3730a3); color: white; padding: 35px 40px; }
    .badge-academy { display: inline-block; background: rgba(255, 255, 255, 0.15); padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; margin-bottom: 10px; border: 1px solid rgba(255, 255, 255, 0.2); }
    .header h1 { margin: 0 0 6px 0; font-size: 24px; font-weight: 800; }
    .header p { margin: 0; opacity: 0.9; font-size: 14px; }
    
    .overall-banner { background: #EEF2FF; border-bottom: 1px solid #C7D2FE; padding: 20px 40px; display: flex; align-items: center; justify-content: space-between; }
    .overall-title { font-size: 16px; font-weight: 800; color: #3730A3; text-transform: uppercase; letter-spacing: 0.5px; }
    .scores-wrapper { display: flex; gap: 15px; }
    .score-chip { background: white; padding: 10px 16px; border-radius: 10px; border: 1px solid #C7D2FE; text-align: center; }
    .score-chip .lbl { font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; margin-bottom: 2px; }
    .score-chip .val { font-size: 18px; font-weight: 800; color: #1E1B4B; }
    .score-chip.main-overall { background: #4F46E5; border-color: #4338CA; }
    .score-chip.main-overall .lbl { color: #E0E7FF; }
    .score-chip.main-overall .val { color: #FFFFFF; font-size: 22px; }

    .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; padding: 25px 40px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
    .summary-card { background: white; padding: 18px 20px; border-radius: 12px; border: 1px solid #e2e8f0; text-align: center; }
    .summary-card h4 { margin: 0 0 6px 0; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; }
    .summary-card .val { font-size: 20px; font-weight: 800; color: #4f46e5; }
    .section { padding: 35px 40px; border-bottom: 1px solid #e2e8f0; }
    .section-title { font-size: 17px; font-weight: 700; margin-top: 0; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; }
    .table-container { width: 100%; overflow-x: auto; border-radius: 10px; border: 1px solid #e2e8f0; }
    table { width: 100%; border-collapse: collapse; text-align: left; font-size: 14px; background: white; }
    th { background: #f1f5f9; color: #64748b; font-weight: 600; padding: 12px 18px; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
    .footer-note { text-align: center; padding: 25px; font-size: 12px; color: #64748b; background: #f8fafc; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge-academy">Intellect Academy CBT Platform</div>
      <h1>Candidate Exam Report</h1>
      <p>Candidate: <strong>${item.student_display_name}</strong> &bull; Email: ${item.students?.email || "N/A"}</p>
    </div>

    <div class="overall-banner">
      <div class="overall-title">🏆 Official Band Scores</div>
      <div class="scores-wrapper">
        <div class="score-chip"><div class="lbl">Listening</div><div class="val">${lBand}</div></div>
        <div class="score-chip"><div class="lbl">Reading</div><div class="val">${rBand}</div></div>
        <div class="score-chip"><div class="lbl">Writing</div><div class="val">${wBand}</div></div>
        <div class="score-chip"><div class="lbl">Speaking</div><div class="val">${sBand}</div></div>
        <div class="score-chip main-overall"><div class="lbl">OVERALL</div><div class="val">${ovBand}</div></div>
      </div>
    </div>

    <div class="summary-grid">
      <div class="summary-card">
        <h4>Listening Score</h4>
        <div class="val">${item.listening_completed ? `${lScore} / 40` : "Not Submitted"}</div>
      </div>
      <div class="summary-card">
        <h4>Reading Score</h4>
        <div class="val">${item.reading_completed ? `${rScore} / 40` : "Not Submitted"}</div>
      </div>
      <div class="summary-card">
        <h4>Writing Status</h4>
        <div class="val" style="color: ${item.writing_completed ? '#10b981' : '#4f46e5'};">${item.writing_completed ? "Submitted" : "Not Submitted"}</div>
      </div>
    </div>
    <div class="section">
      <div class="section-title">
        <span>🎧 Listening Module Detailed Analysis</span>
        <span style="font-size: 13px; font-weight: 600; color: #4f46e5;">Score: ${lScore} / 40</span>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>№ Savol</th>
              <th>Talabaning javobi</th>
              <th>To'g'ri javob</th>
              <th style="text-align: right;">Holati</th>
            </tr>
          </thead>
          <tbody>
            ${listeningRowsHtml}
          </tbody>
        </table>
      </div>
    </div>
    <div class="section">
      <div class="section-title">
        <span>📖 Reading Module Detailed Analysis</span>
        <span style="font-size: 13px; font-weight: 600; color: #4f46e5;">Score: ${rScore} / 40</span>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>№ Savol</th>
              <th>Talabaning javobi</th>
              <th>To'g'ri javob</th>
              <th style="text-align: right;">Holati</th>
            </tr>
          </thead>
          <tbody>
            ${readingRowsHtml}
          </tbody>
        </table>
      </div>
    </div>
    <div class="section">
      <div class="section-title">
        <span>✍️ Writing Module Essays & Responses</span>
      </div>
      ${writingHtml}
    </div>
    <div class="footer-note">
      Generated automatically by Intellect Academy CBT Platform &bull; ${new Date().toLocaleString()}
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const safeName = (item.student_display_name || "student").replace(
      /[^a-zA-Z0-9]/g,
      "_"
    );
    link.download = `${safeName}_Exam_Report.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Report downloaded for ${item.student_display_name}!`);
  };

  const filteredResults = results.filter((item) => {
    const studentName = (item.student_display_name || "").toLowerCase();
    const studentEmail = (item.students?.email || "").toLowerCase();
    return (
      studentName.includes(searchTerm.toLowerCase()) ||
      studentEmail.includes(searchTerm.toLowerCase())
    );
  });

  const groupedResults = filteredResults.reduce((acc, curr) => {
    const studentId = curr.student_id;
    if (!acc[studentId]) {
      acc[studentId] = { ...curr };
    } else {
      if (curr.listening_completed) {
        acc[studentId].listening_completed = true;
        acc[studentId].listening_score = curr.listening_score;
        acc[studentId].listening_answers = curr.listening_answers;
        acc[studentId].listening_exam_id = curr.listening_exam_id;
        acc[studentId].listening_exams = curr.listening_exams;
      }
      if (curr.reading_completed) {
        acc[studentId].reading_completed = true;
        acc[studentId].reading_score = curr.reading_score;
        acc[studentId].reading_answers = curr.reading_answers;
        acc[studentId].reading_exam_id = curr.reading_exam_id;
        acc[studentId].reading_exams = curr.reading_exams;
      }
      if (curr.writing_completed) {
        acc[studentId].writing_completed = true;
        acc[studentId].writing_answer = curr.writing_answer;
        acc[studentId].writing_task2_answer = curr.writing_task2_answer;
        acc[studentId].writing_exams = curr.writing_exams;
      }
    }
    return acc;
  }, {});

  const finalDisplayList = Object.values(groupedResults).filter((item) => {
    if (filterSection === "listening") return item.listening_completed;
    if (filterSection === "reading") return item.reading_completed;
    if (filterSection === "writing") return item.writing_completed;
    return true;
  });

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Helper Function: Render Modal Answer Tables (1 - 40 questions)
  const renderModuleAnswersTable = (examType, examId, answersObj, isCompleted) => {
    if (!isCompleted) {
      return (
        <div className="no-module-data-banner">
          <AlertCircle size={18} /> Candidate did not submit this module.
        </div>
      );
    }

    const rows = [];
    for (let i = 1; i <= 40; i++) {
      const studentAns = getSafeAnswer(answersObj, i);
      const check = checkAnswerStatus(examType, examId, i, studentAns);

      rows.push(
        <tr key={i} className={`answer-row ${check.status}`}>
          <td className="q-num">#{i}</td>
          <td className="q-user-ans">
            <span className="user-text">{studentAns}</span>
          </td>
          <td className="q-correct-ans">
            {check.status === "correct" ? (
              <span className="text-muted">—</span>
            ) : (
              <span className="correct-text">{check.correct || "N/A"}</span>
            )}
          </td>
          <td className="q-status">
            {check.status === "correct" && (
              <span className="status-pill status-correct">
                <CheckCircle size={14} /> To'g'ri
              </span>
            )}
            {check.status === "incorrect" && (
              <span className="status-pill status-incorrect">
                <XCircle size={14} /> Xato
              </span>
            )}
            {check.status === "neutral" && (
              <span className="status-pill status-neutral">
                <MinusCircle size={14} /> N/A
              </span>
            )}
          </td>
        </tr>
      );
    }

    return (
      <div className="answers-table-wrapper">
        <table className="answers-modal-table">
          <thead>
            <tr>
              <th>№</th>
              <th>Talabaning javobi</th>
              <th>To'g'ri javob</th>
              <th>Holati</th>
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="admin-results-loading">
        <RefreshCw className="spinner animate-spin" size={40} />
        <p>Loading examination results....</p>
      </div>
    );
  }

  return (
    <div className="admin-results-container animate-fade-in">
      <div className="admin-results-header">
        <div>
          <h1>Exam Results Dashboard</h1>
          <p>
            Comprehensive performance analysis and module reports for all candidates
          </p>
        </div>
        <button onClick={fetchAllResults} className="btn-refresh">
          <RefreshCw size={16} /> Refresh Data
        </button>
      </div>

      <div className="admin-filters-bar">
        <div className="search-box-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search by student name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-tabs">
          <button
            className={`filter-tab ${filterSection === "all" ? "active" : ""}`}
            onClick={() => setFilterSection("all")}
          >
            All Modules
          </button>
          <button
            className={`filter-tab ${filterSection === "listening" ? "active" : ""}`}
            onClick={() => setFilterSection("listening")}
          >
            Listening
          </button>
          <button
            className={`filter-tab ${filterSection === "reading" ? "active" : ""}`}
            onClick={() => setFilterSection("reading")}
          >
            Reading
          </button>
          <button
            className={`filter-tab ${filterSection === "writing" ? "active" : ""}`}
            onClick={() => setFilterSection("writing")}
          >
            Writing
          </button>
        </div>
      </div>

      <div className="table-responsive-wrapper">
        {finalDisplayList.length === 0 ? (
          <div className="empty-results-state">
            <AlertCircle size={48} />
            <h3>No examination results found.</h3>
            <p>Try modifying your search criteria or filter options.</p>
          </div>
        ) : (
          <table className="admin-results-table">
            <thead>
              <tr>
                <th>
                  <User size={14} /> Candidate Info
                </th>
                <th>
                  <Headphones size={14} /> Listening
                </th>
                <th>
                  <BookOpen size={14} /> Reading
                </th>
                <th>
                  <PenTool size={14} /> Writing
                </th>
                <th>
                  <Award size={14} /> Band Score
                </th>
                <th>
                  <Calendar size={14} /> Last Activity
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {finalDisplayList.map((item) => {
                const lScore = calculateRealScore(
                  "listening",
                  item.listening_exam_id,
                  item.listening_answers,
                  item.listening_score
                );
                const rScore = calculateRealScore(
                  "reading",
                  item.reading_exam_id,
                  item.reading_answers,
                  item.reading_score
                );

                return (
                  <tr key={item.student_id} className="table-data-row">
                    <td>
                      <div className="candidate-info-cell">
                        <strong className="candidate-name">
                          {item.student_display_name}
                        </strong>
                        <span className="candidate-email">
                          {item.students?.email || "No email provided"}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`status-badge ${item.listening_completed ? "done" : "pending"}`}
                      >
                        {item.listening_completed
                          ? `${lScore} / 40 correct`
                          : "Not Submitted"}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`status-badge ${item.reading_completed ? "done" : "pending"}`}
                      >
                        {item.reading_completed
                          ? `${rScore} / 40 correct`
                          : "Not Submitted"}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`status-badge ${item.writing_completed ? "done" : "pending"}`}
                      >
                        {item.writing_completed ? "Submitted" : "Not Submitted"}
                      </span>
                    </td>
                    <td>
                      <span className="overall-score-pill">
                        {item.overall_band_score
                          ? `Band ${item.overall_band_score}`
                          : "Not Evaluated"}
                      </span>
                    </td>
                    <td>{formatDate(item.submitted_at)}</td>
                    <td>
                      <div className="action-buttons-group">
                        <button
                          className="btn-action btn-view"
                          onClick={() => setSelectedResult(item)}
                          title="View & Evaluate"
                        >
                          <Eye size={16} /> View/Grade
                        </button>
                        <button
                          className="btn-action btn-download"
                          onClick={() => downloadStudentReportHTML(item)}
                          title="Download Report HTML"
                        >
                          <Download size={16} /> Report
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* DETAILED EVALUATION & FULL ANSWERS MODAL */}
      {selectedResult && (
        <div className="result-modal-backdrop">
          <div className="result-modal-content">
            <div className="result-modal-header">
              <div>
                <h2>{selectedResult.student_display_name}'s Evaluation</h2>
                <p>{selectedResult.students?.email || "No email"}</p>
              </div>
              <button
                className="btn-close-modal"
                onClick={() => setSelectedResult(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="result-modal-body">
              {/* 1. OFFICIAL BAND SCORE MANAGEMENT */}
              <div className="band-score-management-card">
                <h3>
                  <Award size={18} /> Official IELTS Band Score Evaluation
                </h3>
                <div className="band-inputs-grid">
                  <div className="input-group">
                    <label>
                      <Headphones size={14} /> Listening
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="9"
                      placeholder="e.g. 6.5"
                      value={adminScores.listening}
                      onChange={(e) =>
                        handleScoreChange("listening", e.target.value)
                      }
                    />
                  </div>
                  <div className="input-group">
                    <label>
                      <BookOpen size={14} /> Reading
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="9"
                      placeholder="e.g. 7.0"
                      value={adminScores.reading}
                      onChange={(e) =>
                        handleScoreChange("reading", e.target.value)
                      }
                    />
                  </div>
                  <div className="input-group">
                    <label>
                      <PenTool size={14} /> Writing
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="9"
                      placeholder="e.g. 6.0"
                      value={adminScores.writing}
                      onChange={(e) =>
                        handleScoreChange("writing", e.target.value)
                      }
                    />
                  </div>
                  <div className="input-group">
                    <label>
                      <Mic size={14} /> Speaking
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="9"
                      placeholder="e.g. 6.5"
                      value={adminScores.speaking}
                      onChange={(e) =>
                        handleScoreChange("speaking", e.target.value)
                      }
                    />
                  </div>
                  <div className="input-group overall-highlight">
                    <label>
                      <Award size={14} /> Overall Band
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="9"
                      placeholder="Auto"
                      value={adminScores.overall}
                      onChange={(e) =>
                        setAdminScores({ ...adminScores, overall: e.target.value })
                      }
                    />
                  </div>
                </div>
                <button
                  className="btn-save-scores"
                  onClick={handleSaveBandScores}
                  disabled={isSavingScores}
                >
                  {isSavingScores ? (
                    <RefreshCw className="spinner animate-spin" size={16} />
                  ) : (
                    <Save size={16} />
                  )}
                  Save Scores
                </button>
              </div>

              {/* 2. LISTENING ANSWERS (1-40) */}
              <div className="modal-section">
                <div className="modal-section-header">
                  <h3>
                    <Headphones size={18} /> Listening Answers (1 - 40)
                  </h3>
                  <span className="score-summary-pill">
                    Score:{" "}
                    {calculateRealScore(
                      "listening",
                      selectedResult.listening_exam_id,
                      selectedResult.listening_answers,
                      selectedResult.listening_score
                    )}{" "}
                    / 40
                  </span>
                </div>
                {renderModuleAnswersTable(
                  "listening",
                  selectedResult.listening_exam_id,
                  selectedResult.listening_answers,
                  selectedResult.listening_completed
                )}
              </div>

              {/* 3. READING ANSWERS (1-40) */}
              <div className="modal-section">
                <div className="modal-section-header">
                  <h3>
                    <BookOpen size={18} /> Reading Answers (1 - 40)
                  </h3>
                  <span className="score-summary-pill">
                    Score:{" "}
                    {calculateRealScore(
                      "reading",
                      selectedResult.reading_exam_id,
                      selectedResult.reading_answers,
                      selectedResult.reading_score
                    )}{" "}
                    / 40
                  </span>
                </div>
                {renderModuleAnswersTable(
                  "reading",
                  selectedResult.reading_exam_id,
                  selectedResult.reading_answers,
                  selectedResult.reading_completed
                )}
              </div>

              {/* 4. WRITING SUBMISSIONS */}
              <div className="modal-section">
                <div className="modal-section-header">
                  <h3>
                    <PenTool size={18} /> Writing Submissions
                  </h3>
                </div>
                {selectedResult.writing_completed ? (
                  <div className="essays-grid">
                    <div className="essay-view-card">
                      <h4>Task 1 Response</h4>
                      <p className="essay-text">
                        {selectedResult.writing_answer || "No response provided."}
                      </p>
                    </div>
                    <div className="essay-view-card">
                      <h4>Task 2 Essay</h4>
                      <p className="essay-text">
                        {selectedResult.writing_task2_answer || "No response provided."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="no-module-data-banner">
                    <AlertCircle size={18} /> Candidate did not submit Writing.
                  </div>
                )}
              </div>
            </div>

            <div className="result-modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setSelectedResult(null)}
              >
                Close
              </button>
              <button
                className="btn-primary"
                onClick={() => downloadStudentReportHTML(selectedResult)}
              >
                <Download size={16} /> Download HTML Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllResults;