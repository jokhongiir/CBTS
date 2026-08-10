import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, ShieldCheck, ArrowRight, Lock } from "lucide-react";
import logo from "../../assets/logo.png";
import "./Home.css";

const Home = () => {
  const navigate = useNavigate();
  const canvasRef = useRef(null);

  // Kengaytirilgan interaktiv sichqoncha animatsiyasi (Canvas Constellation)
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

  return (
    <div className="ia-gateway-root">
      <canvas ref={canvasRef} className="ia-dynamic-canvas" />

      <div className="ia-gateway-wrapper">
        
        {/* HEADER SECTION */}
        <header className="ia-header-cluster">
          <div className="ia-brand-header-row">
            <div className="ia-brand-logo-wrap">
              <img src={logo} alt="Intellect Academy Logo" className="ia-brand-logo" />
            </div>
            <h1 className="ia-brand-title">Intellect Academy LC</h1>
          </div>

          <div className="ia-status-pill">
            <ShieldCheck size={14} />
            <span>Computer-Based Testing (CBT) Platform</span>
          </div>
          <p className="ia-brand-subtitle">
            Welcome to the secure examination portal. Choose your designated gateway below to proceed.
          </p>
        </header>

        {/* STUDENT PORTAL CARD */}
        <main className="ia-card-deck">
          <div
            className="ia-interactive-card ia-student-zone"
            onClick={() => navigate("/student/login")}
          >
            {/* <div className="ia-icon-frame">
              <GraduationCap size={32} />
            </div> */}

            <div className="ia-card-info">
              <h2>Student Portal</h2>
              <p>
                Sign in using your assigned Student ID to access and complete your allocated assessment modules.
              </p>
            </div>

            <button className="ia-action-trigger">
              <span>Access Student Portal</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </main>

        {/* ADMIN GATEWAY LINK */}
        {/* <nav className="ia-sub-nav">
          <button
            className="ia-admin-trigger"
            onClick={() => navigate("/admin/login")}
          >
            <Lock size={14} />
            <span>Administrator Access</span>
          </button>
        </nav> */}

        {/* FOOTER */}
        <footer className="ia-footer-note">
          &copy; {new Date().getFullYear()} Intellect Academy CBT System. All rights reserved.
        </footer>

      </div>
    </div>
  );
};

export default Home;