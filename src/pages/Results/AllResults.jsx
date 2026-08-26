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
  Award,
  Save,
  Mic,
  CheckCircle,
  XCircle,
  MinusCircle,
  FileText,
  FileDown,
} from "lucide-react";
import "./Results.css";

const AllResults = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSection, setFilterSection] = useState("all");
  const [selectedResult, setSelectedResult] = useState(null);

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

  // IELTS Rounding Rule
  const calculateIELTSOverall = (l, r, w, s) => {
    const scores = [
      parseFloat(l),
      parseFloat(r),
      parseFloat(w),
      parseFloat(s),
    ].filter((val) => !isNaN(val) && val >= 0);
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
      const ov =
        selectedResult.overall_band_score ?? calculateIELTSOverall(l, r, w, s);

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
      updated.speaking,
    );
    updated.overall = autoOverall;
    setAdminScores(updated);
  };

  const handleSaveBandScores = async () => {
    if (!selectedResult) return;
    try {
      setIsSavingScores(true);
      const payload = {
        listening_band_score: adminScores.listening
          ? parseFloat(adminScores.listening)
          : null,
        reading_band_score: adminScores.reading
          ? parseFloat(adminScores.reading)
          : null,
        writing_band_score: adminScores.writing
          ? parseFloat(adminScores.writing)
          : null,
        speaking_band_score: adminScores.speaking
          ? parseFloat(adminScores.speaking)
          : null,
        overall_band_score: adminScores.overall
          ? parseFloat(adminScores.overall)
          : null,
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
        prev.map((item) =>
          item.id === selectedResult.id ? updatedItem : item,
        ),
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
        listeningRes.data?.map((e) => [e.id.toString(), e]) || [],
      );
      const rExams = new Map(
        readingRes.data?.map((e) => [e.id.toString(), e]) || [],
      );

      setListeningExamsMap(lExams);
      setReadingExamsMap(rExams);

      const studentsMap = new Map(
        studentsRes.data?.map((s) => [s.id.toString(), s]) || [],
      );
      const writingMap = new Map(
        writingRes.data?.map((e) => [e.id.toString(), e]) || [],
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
            (q) => Number(q.question_number) === Number(qNum),
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

  // ====================== HTML REPORT ======================
  const downloadStudentReportHTML = (item) => {
    const lScore = calculateRealScore(
      "listening",
      item.listening_exam_id,
      item.listening_answers,
      item.listening_score,
    );
    const rScore = calculateRealScore(
      "reading",
      item.reading_exam_id,
      item.reading_answers,
      item.reading_score,
    );

    const lBand = item.listening_band_score ?? "N/A";
    const rBand = item.reading_band_score ?? "N/A";
    const wBand = item.writing_band_score ?? "N/A";
    const sBand = item.speaking_band_score ?? "N/A";
    const ovBand = item.overall_band_score ?? "N/A";

    const buildRows = (examType, examId, answers, isCompleted) => {
      if (!isCompleted || !answers) {
        return `<tr><td colspan="4" style="text-align:center;padding:24px;color:#64748b;font-style:italic;">Candidate did not submit this module.</td></tr>`;
      }

      let rows = "";
      for (let i = 1; i <= 40; i++) {
        const studentAns = getSafeAnswer(answers, i);
        const check = checkAnswerStatus(examType, examId, i, studentAns);
        const isCorrect = check.status === "correct";
        const isNeutral = check.status === "neutral";

        const bg = isNeutral ? "#f8fafc" : isCorrect ? "#f0fdf4" : "#fff1f2";
        const statusBg = isNeutral
          ? "#f1f5f9"
          : isCorrect
            ? "#ecfdf5"
            : "#fef2f2";
        const statusColor = isNeutral
          ? "#64748b"
          : isCorrect
            ? "#065f46"
            : "#991b1b";
        const statusBorder = isNeutral
          ? "#e2e8f0"
          : isCorrect
            ? "#a7f3d0"
            : "#fecaca";
        const statusText = isNeutral
          ? "N/A"
          : isCorrect
            ? "✓ To'g'ri"
            : "✕ Xato";

        rows += `
          <tr style="background:${bg};">
            <td style="padding:11px 16px;font-weight:700;color:#64748b;border-bottom:1px solid #e2e8f0;width:60px;">#${i}</td>
            <td style="padding:11px 16px;font-weight:600;color:#0f172a;border-bottom:1px solid #e2e8f0;">${studentAns}</td>
            <td style="padding:11px 16px;border-bottom:1px solid #e2e8f0;">
              ${isCorrect ? '<span style="color:#94a3b8;">—</span>' : `<span style="color:#991b1b;font-weight:600;background:#fff1f2;padding:2px 8px;border-radius:4px;border:1px solid #fecaca;font-size:13px;">${check.correct || "N/A"}</span>`}
            </td>
            <td style="padding:11px 16px;text-align:right;border-bottom:1px solid #e2e8f0;">
              <span style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:600;background:${statusBg};color:${statusColor};border:1px solid ${statusBorder};">
                ${statusText}
              </span>
            </td>
          </tr>`;
      }
      return rows;
    };

    const listeningRowsHtml = buildRows(
      "listening",
      item.listening_exam_id,
      item.listening_answers,
      item.listening_completed,
    );
    const readingRowsHtml = buildRows(
      "reading",
      item.reading_exam_id,
      item.reading_answers,
      item.reading_completed,
    );

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
        <div style="display:flex;flex-direction:column;gap:18px;">
          <div style="border:1px solid #e2e8f0;border-radius:12px;padding:20px;background:#fafaf9;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
              <h3 style="margin:0;font-size:15px;font-weight:700;color:#0f172a;">Task 1 Response</h3>
              <span style="font-size:12px;font-weight:600;background:#fff;padding:4px 10px;border-radius:6px;border:1px solid #e2e8f0;color:#64748b;">Words: ${t1Words}</span>
            </div>
            <div style="white-space:pre-wrap;font-size:14px;line-height:1.7;color:#0f172a;background:#fff;padding:16px;border-radius:8px;border:1px solid #e2e8f0;">${item.writing_answer || "No text provided for Task 1."}</div>
          </div>
          <div style="border:1px solid #e2e8f0;border-radius:12px;padding:20px;background:#fafaf9;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
              <h3 style="margin:0;font-size:15px;font-weight:700;color:#0f172a;">Task 2 Essay Response</h3>
              <span style="font-size:12px;font-weight:600;background:#fff;padding:4px 10px;border-radius:6px;border:1px solid #e2e8f0;color:#64748b;">Words: ${t2Words}</span>
            </div>
            <div style="white-space:pre-wrap;font-size:14px;line-height:1.7;color:#0f172a;background:#fff;padding:16px;border-radius:8px;border:1px solid #e2e8f0;">${item.writing_task2_answer || "No text provided for Task 2."}</div>
          </div>
        </div>`;
    } else {
      writingHtml = `<div style="padding:24px;text-align:center;color:#64748b;font-style:italic;background:#f8fafc;border:1px dashed #e2e8f0;border-radius:10px;">Candidate did not submit the Writing module.</div>`;
    }

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Exam Report – ${item.student_display_name}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f1f5f9;
      color: #0f172a;
      margin: 0;
      padding: 32px 16px;
      line-height: 1.5;
    }
    .container {
      max-width: 1000px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.06);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #0284c7, #0369a1);
      color: white;
      padding: 36px 40px;
    }
    .badge {
      display: inline-block;
      background: rgba(255,255,255,0.15);
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 12px;
      border: 1px solid rgba(255,255,255,0.25);
    }
    .header h1 {
      margin: 0 0 6px;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .header p {
      margin: 0;
      opacity: 0.9;
      font-size: 14px;
    }
    .band-banner {
      background: #e0f2fe;
      border-bottom: 1px solid #bae6fd;
      padding: 20px 40px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
    }
    .band-title {
      font-size: 15px;
      font-weight: 800;
      color: #0369a1;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .scores {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    .chip {
      background: white;
      padding: 10px 16px;
      border-radius: 10px;
      border: 1px solid #bae6fd;
      text-align: center;
      min-width: 80px;
    }
    .chip .lbl {
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .chip .val {
      font-size: 18px;
      font-weight: 800;
      color: #0c4a6e;
    }
    .chip.overall {
      background: #0284c7;
      border-color: #0369a1;
    }
    .chip.overall .lbl { color: #e0f2fe; }
    .chip.overall .val { color: white; font-size: 22px; }
    .summary {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      padding: 24px 40px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
    }
    .summary-card {
      background: white;
      padding: 18px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      text-align: center;
    }
    .summary-card h4 {
      margin: 0 0 6px;
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
    }
    .summary-card .val {
      font-size: 20px;
      font-weight: 800;
      color: #0284c7;
    }
    .section {
      padding: 32px 40px;
      border-bottom: 1px solid #e2e8f0;
    }
    .section:last-of-type { border-bottom: none; }
    .section-title {
      font-size: 16px;
      font-weight: 700;
      margin: 0 0 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .score-pill {
      font-size: 13px;
      font-weight: 600;
      color: #0284c7;
      background: #e0f2fe;
      padding: 4px 12px;
      border-radius: 999px;
    }
    .table-wrap {
      width: 100%;
      overflow-x: auto;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
      background: white;
    }
    th {
      background: #f8fafc;
      color: #64748b;
      font-weight: 700;
      padding: 12px 16px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      border-bottom: 1px solid #e2e8f0;
      text-align: left;
    }
    th:last-child { text-align: right; }
    .footer {
      text-align: center;
      padding: 22px;
      font-size: 12px;
      color: #64748b;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
    }
    @media (max-width: 700px) {
      .summary { grid-template-columns: 1fr; }
      .header, .band-banner, .section { padding-left: 20px; padding-right: 20px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">Intellect Academy CBT Platform</div>
      <h1>Candidate Exam Report</h1>
      <p>Candidate: <strong>${item.student_display_name}</strong> &bull; Email: ${item.students?.email || "N/A"}</p>
    </div>
    <div class="band-banner">
      <div class="band-title">🏆 Official Band Scores</div>
      <div class="scores">
        <div class="chip"><div class="lbl">Listening</div><div class="val">${lBand}</div></div>
        <div class="chip"><div class="lbl">Reading</div><div class="val">${rBand}</div></div>
        <div class="chip"><div class="lbl">Writing</div><div class="val">${wBand}</div></div>
        <div class="chip"><div class="lbl">Speaking</div><div class="val">${sBand}</div></div>
        <div class="chip overall"><div class="lbl">Overall</div><div class="val">${ovBand}</div></div>
      </div>
    </div>
    <div class="summary">
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
        <div class="val" style="color:${item.writing_completed ? "#059669" : "#0284c7"}">${item.writing_completed ? "Submitted" : "Not Submitted"}</div>
      </div>
    </div>
    <div class="section">
      <div class="section-title">
        <span>🎧 Listening Module Detailed Analysis</span>
        <span class="score-pill">Score: ${lScore} / 40</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>№</th>
              <th>Talabaning javobi</th>
              <th>To'g'ri javob</th>
              <th>Holati</th>
            </tr>
          </thead>
          <tbody>${listeningRowsHtml}</tbody>
        </table>
      </div>
    </div>
    <div class="section">
      <div class="section-title">
        <span>📖 Reading Module Detailed Analysis</span>
        <span class="score-pill">Score: ${rScore} / 40</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>№</th>
              <th>Talabaning javobi</th>
              <th>To'g'ri javob</th>
              <th>Holati</th>
            </tr>
          </thead>
          <tbody>${readingRowsHtml}</tbody>
        </table>
      </div>
    </div>
    <div class="section">
      <div class="section-title">
        <span>✍️ Writing Module Essays & Responses</span>
      </div>
      ${writingHtml}
    </div>
    <div class="footer">
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
      "_",
    );
    link.download = `${safeName}_Exam_Report.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`HTML Report downloaded for ${item.student_display_name}!`);
  };

  // ====================== PDF REPORT ======================
  const downloadStudentReportPDF = async (item) => {
    toast.loading("PDF tayyorlanmoqda...", { id: "pdf-toast" });
    try {
      downloadStudentReportHTML(item);
      toast.success(
        "HTML report yuklandi. PDF uchun brauzerda ochib → Ctrl+P → 'Save as PDF' ni tanlang.",
        { id: "pdf-toast", duration: 6000 },
      );
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("PDF yaratishda xatolik yuz berdi", { id: "pdf-toast" });
    }
  };

  // ====================== IELTS-STYLE CERTIFICATE ======================
  const downloadCertificate = (item) => {
    const lBand = item.listening_band_score ?? "—";
    const rBand = item.reading_band_score ?? "—";
    const wBand = item.writing_band_score ?? "—";
    const sBand = item.speaking_band_score ?? "—";
    const ovBand = item.overall_band_score ?? "—";

    const studentId = item.student_id || item.students?.id || "N/A";
    const fullName = item.student_display_name || "Unknown Candidate";
    const email = item.students?.email || "";
    const issueDate = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    // signature1.png (public papkasida bo'lishi kerak)
    const stampUrl = `${window.location.origin}/signature1.png`;

    const certHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>IELTS Certificate – ${fullName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', system-ui, sans-serif;
      background: #e2e8f0;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 30px 16px;
    }
    .cert {
      width: 900px;
      max-width: 100%;
      background: #fffef9;
      border: 14px solid #0c4a6e;
      position: relative;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
      overflow: hidden;
    }
    .cert::before {
      content: "";
      position: absolute;
      inset: 10px;
      border: 2px solid #0369a1;
      pointer-events: none;
    }
    .cert-inner {
      padding: 48px 56px 40px;
      position: relative;
      z-index: 1;
    }
    .cert-header { text-align: center; margin-bottom: 28px; }
    .academy-name {
      font-family: 'Playfair Display', serif;
      font-size: 28px;
      font-weight: 700;
      color: #0c4a6e;
      letter-spacing: 0.04em;
      margin-bottom: 4px;
    }
    .academy-sub {
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.18em;
    }
    .divider {
      width: 120px;
      height: 3px;
      background: linear-gradient(90deg, transparent, #0284c7, transparent);
      margin: 18px auto;
    }
    .cert-title {
      font-family: 'Playfair Display', serif;
      font-size: 32px;
      font-weight: 700;
      color: #0f172a;
      text-align: center;
      margin-bottom: 6px;
    }
    .cert-subtitle {
      text-align: center;
      font-size: 14px;
      color: #64748b;
      margin-bottom: 32px;
    }
    .candidate-block { text-align: center; margin-bottom: 32px; }
    .candidate-label {
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 6px;
    }
    .candidate-name {
      font-family: 'Playfair Display', serif;
      font-size: 26px;
      font-weight: 700;
      color: #0c4a6e;
      margin-bottom: 8px;
    }
    .candidate-meta {
      display: flex;
      justify-content: center;
      gap: 28px;
      flex-wrap: wrap;
      font-size: 13px;
      color: #475569;
    }
    .candidate-meta span { display: inline-flex; align-items: center; gap: 6px; }
    .candidate-meta strong { color: #0f172a; font-weight: 600; }
    .scores-table { width: 100%; border-collapse: collapse; margin-bottom: 36px; }
    .scores-table th {
      background: #0c4a6e;
      color: white;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 12px 10px;
      text-align: center;
    }
    .scores-table td {
      border: 1px solid #cbd5e1;
      padding: 16px 10px;
      text-align: center;
      font-size: 22px;
      font-weight: 700;
      color: #0c4a6e;
      background: #f0f9ff;
    }
    .scores-table td.overall {
      background: #0284c7;
      color: white;
      font-size: 26px;
    }
    .scores-table .module-name {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      display: block;
      margin-bottom: 4px;
    }
    .cert-footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 20px;
      gap: 24px;
      flex-wrap: wrap;
    }
    .date-block { font-size: 13px; color: #475569; }
    .date-block strong {
      display: block;
      font-size: 15px;
      color: #0f172a;
      margin-top: 2px;
    }
    .signature-block { text-align: center; min-width: 180px; }
    .signature-line {
      width: 160px;
      height: 1px;
      background: #94a3b8;
      margin: 0 auto 6px;
    }
    .signature-label { font-size: 12px; color: #64748b; font-weight: 500; }

    /* PECHAT - signature1.png */
    .stamp {
      width: 130px;
      height: 130px;
      display: flex;
      align-items: center;
      justify-content: center;
      transform: rotate(-8deg);
      position: relative;
    }
    .stamp img {
      width: 140px;
      height: 140px;
      object-fit: contain;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.15));
    }

    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-family: 'Playfair Display', serif;
      font-size: 90px;
      font-weight: 700;
      color: rgba(12, 74, 110, 0.04);
      white-space: nowrap;
      pointer-events: none;
      z-index: 0;
      user-select: none;
    }
    .bottom-note {
      text-align: center;
      margin-top: 28px;
      font-size: 11px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 14px;
    }
    @media print {
      body { background: white; padding: 0; }
      .cert { box-shadow: none; border-width: 10px; }
    }
  </style>
</head>
<body>
  <div class="cert">
    <div class="watermark">INTELLECT ACADEMY</div>
    <div class="cert-inner">
      <div class="cert-header">
        <div class="academy-name">Intellect Academy</div>
        <div class="academy-sub">Computer-Based Testing Platform</div>
        <div class="divider"></div>
        <h1 class="cert-title">Certificate of Achievement</h1>
        <p class="cert-subtitle">This is to certify that the candidate named below has completed the IELTS Mock Examination</p>
      </div>
      <div class="candidate-block">
        <div class="candidate-label">Candidate Name</div>
        <div class="candidate-name">${fullName}</div>
        <div class="candidate-meta">
          <span>Student ID: <strong>${studentId}</strong></span>
          ${email ? `<span>Email: <strong>${email}</strong></span>` : ""}
        </div>
      </div>
      <table class="scores-table">
        <thead>
          <tr>
            <th>Listening</th>
            <th>Reading</th>
            <th>Writing</th>
            <th>Speaking</th>
            <th>Overall Band</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><span class="module-name">Listening</span>${lBand}</td>
            <td><span class="module-name">Reading</span>${rBand}</td>
            <td><span class="module-name">Writing</span>${wBand}</td>
            <td><span class="module-name">Speaking</span>${sBand}</td>
            <td class="overall"><span class="module-name" style="color:#e0f2fe;">Overall</span>${ovBand}</td>
          </tr>
        </tbody>
      </table>
      <div class="cert-footer">
        <div class="date-block">
          Date of Issue
          <strong>${issueDate}</strong>
        </div>

        <!-- PECHAT: signature1.png -->
        <div class="stamp">
          <img src="${stampUrl}" alt="Official Seal" />
        </div>

        <div class="signature-block">
          <div class="signature-line"></div>
          <div class="signature-label">Authorized Signature</div>
        </div>
      </div>
      <div class="bottom-note">
        This certificate is issued by Intellect Academy CBT Platform for internal assessment purposes only.<br>
        It does not represent an official IELTS result from the British Council or IDP.
      </div>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([certHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const safeName = (fullName || "candidate").replace(/[^a-zA-Z0-9]/g, "_");
    link.download = `${safeName}_IELTS_Certificate.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Certificate downloaded for ${fullName}!`);
  };

  // ====================== FILTER & GROUP ======================
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

  const renderModuleAnswersTable = (
    examType,
    examId,
    answersObj,
    isCompleted,
  ) => {
    if (!isCompleted) {
      return (
        <div className="res-empty-module">
          <AlertCircle size={18} />
          Candidate did not submit this module.
        </div>
      );
    }

    const rows = [];
    for (let i = 1; i <= 40; i++) {
      const studentAns = getSafeAnswer(answersObj, i);
      const check = checkAnswerStatus(examType, examId, i, studentAns);

      rows.push(
        <tr
          key={i}
          className={`res-answer-row res-answer-row--${check.status}`}
        >
          <td className="res-q-num">#{i}</td>
          <td className="res-q-user">
            <span className="res-user-ans">{studentAns}</span>
          </td>
          <td className="res-q-correct">
            {check.status === "correct" ? (
              <span className="res-muted">—</span>
            ) : (
              <span className="res-correct-ans">{check.correct || "N/A"}</span>
            )}
          </td>
          <td className="res-q-status">
            {check.status === "correct" && (
              <span className="res-status-pill res-status-pill--correct">
                <CheckCircle size={14} /> To'g'ri
              </span>
            )}
            {check.status === "incorrect" && (
              <span className="res-status-pill res-status-pill--incorrect">
                <XCircle size={14} /> Xato
              </span>
            )}
            {check.status === "neutral" && (
              <span className="res-status-pill res-status-pill--neutral">
                <MinusCircle size={14} /> N/A
              </span>
            )}
          </td>
        </tr>,
      );
    }

    return (
      <div className="res-answers-scroll">
        <table className="res-answers-table">
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
      <div className="res-loader">
        <RefreshCw className="res-spinner" size={40} />
        <p>Loading examination results...</p>
      </div>
    );
  }

  return (
    <div className="res-dashboard">
      {/* Header */}
      <div className="res-header">
        <div className="res-header__text">
          <h1>Exam Results Dashboard</h1>
          <p>
            Comprehensive performance analysis and module reports for all
            candidates
          </p>
        </div>
        <button onClick={fetchAllResults} className="res-btn res-btn--ghost">
          <RefreshCw size={16} />
          Refresh Data
        </button>
      </div>

      {/* Toolbar */}
      <div className="res-toolbar">
        <div className="res-search">
          <Search size={18} className="res-search__icon" />
          <input
            type="text"
            placeholder="Search by student name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="res-tabs">
          {["all", "listening", "reading", "writing"].map((tab) => (
            <button
              key={tab}
              className={`res-tab ${filterSection === tab ? "res-tab--active" : ""}`}
              onClick={() => setFilterSection(tab)}
            >
              {tab === "all"
                ? "All Modules"
                : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="res-card">
        {finalDisplayList.length === 0 ? (
          <div className="res-empty">
            <AlertCircle size={48} />
            <h3>No examination results found</h3>
            <p>Try modifying your search criteria or filter options.</p>
          </div>
        ) : (
          <div className="res-table-wrap">
            <table className="res-table">
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
                    item.listening_score,
                  );
                  const rScore = calculateRealScore(
                    "reading",
                    item.reading_exam_id,
                    item.reading_answers,
                    item.reading_score,
                  );

                  return (
                    <tr key={item.student_id} className="res-table__row">
                      <td>
                        <div className="res-candidate">
                          <strong className="res-candidate__name">
                            {item.student_display_name}
                          </strong>
                          <span className="res-candidate__email">
                            {item.students?.email || "No email provided"}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`res-badge ${item.listening_completed ? "res-badge--success" : "res-badge--muted"}`}
                        >
                          {item.listening_completed
                            ? `${lScore} / 40 correct`
                            : "Not Submitted"}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`res-badge ${item.reading_completed ? "res-badge--success" : "res-badge--muted"}`}
                        >
                          {item.reading_completed
                            ? `${rScore} / 40 correct`
                            : "Not Submitted"}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`res-badge ${item.writing_completed ? "res-badge--success" : "res-badge--muted"}`}
                        >
                          {item.writing_completed
                            ? "Submitted"
                            : "Not Submitted"}
                        </span>
                      </td>
                      <td>
                        <span className="res-band">
                          {item.overall_band_score
                            ? `Band ${item.overall_band_score}`
                            : "Not Evaluated"}
                        </span>
                      </td>
                      <td className="res-date">
                        {formatDate(item.submitted_at)}
                      </td>
                      <td>
                        <div className="res-actions">
                          <button
                            className="res-action-btn"
                            onClick={() => setSelectedResult(item)}
                            title="View & Evaluate"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            className="res-action-btn"
                            onClick={() => downloadStudentReportHTML(item)}
                            title="Download HTML Report"
                          >
                            <FileText size={16} />
                          </button>
                          <button
                            className="res-action-btn"
                            onClick={() => downloadStudentReportPDF(item)}
                            title="Download PDF Report"
                          >
                            <FileDown size={16} />
                          </button>
                          <button
                            className="res-action-btn res-action-btn--cert"
                            onClick={() => downloadCertificate(item)}
                            title="Download IELTS Certificate"
                          >
                            <Award size={16} />
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

      {/* Modal */}
      {selectedResult && (
        <div className="res-modal-overlay">
          <div className="res-modal">
            <div className="res-modal__header">
              <div>
                <h2>{selectedResult.student_display_name}'s Evaluation</h2>
                <p>{selectedResult.students?.email || "No email"}</p>
              </div>
              <button
                className="res-modal__close"
                onClick={() => setSelectedResult(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="res-modal__body">
              <div className="res-score-card">
                <h3>
                  <Award size={18} /> Official IELTS Band Score Evaluation
                </h3>
                <div className="res-score-grid">
                  {[
                    {
                      key: "listening",
                      label: "Listening",
                      icon: <Headphones size={14} />,
                    },
                    {
                      key: "reading",
                      label: "Reading",
                      icon: <BookOpen size={14} />,
                    },
                    {
                      key: "writing",
                      label: "Writing",
                      icon: <PenTool size={14} />,
                    },
                    {
                      key: "speaking",
                      label: "Speaking",
                      icon: <Mic size={14} />,
                    },
                  ].map((field) => (
                    <div key={field.key} className="res-field">
                      <label>
                        {field.icon} {field.label}
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="9"
                        placeholder="e.g. 6.5"
                        value={adminScores[field.key]}
                        onChange={(e) =>
                          handleScoreChange(field.key, e.target.value)
                        }
                      />
                    </div>
                  ))}
                  <div className="res-field res-field--overall">
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
                        setAdminScores({
                          ...adminScores,
                          overall: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <button
                  className="res-btn res-btn--primary"
                  onClick={handleSaveBandScores}
                  disabled={isSavingScores}
                >
                  {isSavingScores ? (
                    <RefreshCw className="res-spinner" size={16} />
                  ) : (
                    <Save size={16} />
                  )}
                  Save Scores
                </button>
              </div>

              <div className="res-section">
                <div className="res-section__header">
                  <h3>
                    <Headphones size={18} /> Listening Answers (1 – 40)
                  </h3>
                  <span className="res-score-pill">
                    Score:{" "}
                    {calculateRealScore(
                      "listening",
                      selectedResult.listening_exam_id,
                      selectedResult.listening_answers,
                      selectedResult.listening_score,
                    )}{" "}
                    / 40
                  </span>
                </div>
                {renderModuleAnswersTable(
                  "listening",
                  selectedResult.listening_exam_id,
                  selectedResult.listening_answers,
                  selectedResult.listening_completed,
                )}
              </div>

              <div className="res-section">
                <div className="res-section__header">
                  <h3>
                    <BookOpen size={18} /> Reading Answers (1 – 40)
                  </h3>
                  <span className="res-score-pill">
                    Score:{" "}
                    {calculateRealScore(
                      "reading",
                      selectedResult.reading_exam_id,
                      selectedResult.reading_answers,
                      selectedResult.reading_score,
                    )}{" "}
                    / 40
                  </span>
                </div>
                {renderModuleAnswersTable(
                  "reading",
                  selectedResult.reading_exam_id,
                  selectedResult.reading_answers,
                  selectedResult.reading_completed,
                )}
              </div>

              <div className="res-section">
                <div className="res-section__header">
                  <h3>
                    <PenTool size={18} /> Writing Submissions
                  </h3>
                </div>
                {selectedResult.writing_completed ? (
                  <div className="res-essays">
                    <div className="res-essay">
                      <h4>Task 1 Response</h4>
                      <p className="res-essay__text">
                        {selectedResult.writing_answer ||
                          "No response provided."}
                      </p>
                    </div>
                    <div className="res-essay">
                      <h4>Task 2 Essay</h4>
                      <p className="res-essay__text">
                        {selectedResult.writing_task2_answer ||
                          "No response provided."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="res-empty-module">
                    <AlertCircle size={18} /> Candidate did not submit Writing.
                  </div>
                )}
              </div>
            </div>

            <div className="res-modal__footer">
              <button
                className="res-btn res-btn--ghost"
                onClick={() => setSelectedResult(null)}
              >
                Close
              </button>
              <div className="res-modal__actions">
                <button
                  className="res-btn res-btn--primary"
                  onClick={() => downloadStudentReportHTML(selectedResult)}
                >
                  <FileText size={16} /> Download HTML
                </button>
                <button
                  className="res-btn res-btn--teal"
                  onClick={() => downloadStudentReportPDF(selectedResult)}
                >
                  <FileDown size={16} /> Download PDF
                </button>
                <button
                  className="res-btn res-btn--cert"
                  onClick={() => downloadCertificate(selectedResult)}
                >
                  <Award size={16} /> Certificate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllResults;
