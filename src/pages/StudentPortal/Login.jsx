import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, KeyRound, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { supabase } from "../../config/supabaseClient";
import { toast } from "react-hot-toast";
import logo from "../../assets/logo.png";
import "./Login.css";

const StudentLogin = () => {
  // Boshlang'ich qiymatni "ST-" qilib belgilaymiz
  const [studentId, setStudentId] = useState("ST-");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const canvasRef = useRef(null);

  // Home sahifasidagi kabi interaktiv fon kanvas animatsiyasi
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const count = Math.floor((width * height) / 9000);
    const nodes = [];
    const mouse = { x: null, y: null, reach: 200 };

    window.addEventListener("mousemove", (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    });

    window.addEventListener("mouseleave", () => {
      mouse.x = null;
      mouse.y = null;
    });

    class Node {
      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 1.5;
        this.vy = (Math.random() - 0.5) * 1.5;
        this.r = Math.random() * 2.5 + 1.2;
      }

      move() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;

        if (mouse.x !== null && mouse.y !== null) {
          const dx = mouse.x - this.x;
          const dy = mouse.y - this.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < mouse.reach) {
            const power = (mouse.reach - dist) / mouse.reach;
            const theta = Math.atan2(dy, dx);
            this.x -= Math.cos(theta) * power * 5;
            this.y -= Math.sin(theta) * power * 5;
          }
        }
      }

      render() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(44, 56, 141, 0.35)";
        ctx.fill();
      }
    }

    for (let i = 0; i < count; i++) {
      nodes.push(new Node());
    }

    const loop = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < nodes.length; i++) {
        nodes[i].move();
        nodes[i].render();

        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 140) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(44, 56, 141, ${0.18 * (1 - distance / 140)})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }

        if (mouse.x !== null && mouse.y !== null) {
          const dx = nodes[i].x - mouse.x;
          const dy = nodes[i].y - mouse.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < mouse.reach) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.strokeStyle = `rgba(242, 101, 34, ${0.35 * (1 - distance / mouse.reach)})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      animationId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  const handleIdChange = (e) => {
    let value = e.target.value;

    // Agar foydalanuvchi "ST-" qismini o'chirishga urunsa yoki matn "ST-" bilan boshlanmasa, uni qayta tiklaymiz
    if (!value.startsWith("ST-")) {
      setStudentId("ST-");
      return;
    }

    // "ST-" dan keyingi qismni ajratib olib, faqat raqamlarni qoldiramiz
    const numericPart = value.slice(3).replace(/[^0-9]/g, "");
    
    // Natijani "ST-" ga qo'shamiz
    setStudentId("ST-" + numericPart);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const formattedId = studentId.trim();

    // Agar faqat "ST-" qolgan bo'lsa, xatolik beramiz
    if (!formattedId || formattedId === "ST-") {
      toast.error("Please enter a valid Student ID numbers.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("student_code", formattedId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        throw new Error(
          "Student ID not found in the system. Please check your credentials."
        );
      }

      localStorage.setItem("current_student", JSON.stringify(data));
      toast.success(`Welcome back, ${data.full_name || "Candidate"}!`);
      navigate("/student/dashboard");
    } catch (error) {
      toast.error(error.message || "An error occurred during authentication.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ia-login-root">
      <canvas ref={canvasRef} className="ia-login-canvas" />

      <div className="ia-login-wrapper">
        <div className="ia-login-card">
          
          {/* HEADER & LOGO (Yonma-yon va Markazda) */}
          <div className="ia-login-header">
            <div className="ia-login-header-row">
              <div className="ia-login-logo-wrap">
                <img
                  src={logo}
                  alt="Intellect Academy Logo"
                  className="ia-login-logo-img"
                />
              </div>
              <h2 className="ia-login-title">Intellect Academy LC</h2>
            </div>

            <div className="ia-login-pill">
              <Sparkles size={13} />
              <span>CBT Assessment Portal</span>
            </div>

            <p className="ia-login-subtitle">
              Enter your assigned <strong>Student ID</strong> to access your secure exam session.
            </p>
          </div>

          {/* FORM */}
          <form onSubmit={handleLogin} className="ia-login-form">
            <div className="ia-form-group">
              <div className="ia-input-container">
                <KeyRound size={18} className="ia-input-ico" />
                <input
                  id="studentIdInput"
                  type="text"
                  placeholder="ST-3180"
                  value={studentId}
                  onChange={handleIdChange}
                  disabled={loading}
                  maxLength={10}
                  required
                  autoComplete="off"
                  autoFocus
                />
              </div>
            </div>

            <button type="submit" className="ia-login-submit-btn" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={18} className="ia-spinner" />
                  <span>Verifying ID...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Portal</span>
                  <LogIn size={18} />
                </>
              )}
            </button>
          </form>

          {/* FOOTER */}
          <div className="ia-login-footer">
            <ShieldCheck size={15} />
            <span>Secure proctored testing environment</span>
          </div>

        </div>
      </div>
    </div>
  );
};

export default StudentLogin;