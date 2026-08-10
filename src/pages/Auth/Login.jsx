// src/pages/Auth/Login.jsx
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { RiLockPasswordLine, RiMailLine } from "react-icons/ri";
import { useAuth } from "../../context/AuthContext";
import "./Login.css";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      // Supabase'dan qaytgan foydalanuvchi ma'lumotlarini qabul qilib olamiz
      const authData = await login(data.email, data.password);

      // Agar ma'lumotlar muvaffaqiyatli kelsa va foydalanuvchi IDsi bo'lsa
      if (authData?.user?.id) {
        toast.success("Xush kelibsiz, Admin!");
        // ID-ni URL manziliga dinamik parametr sifatida qo'shib yuboramiz
        navigate(`/admin/dashboard/${authData.user.id}`);
      } else {
        throw new Error(
          "Foydalanuvchi ma'lumotlarini yuklashda xatolik yuz berdi.",
        );
      }
    } catch (error) {
      // Supabase yoki ichki xatolik xabarini ekranga chiqaramiz
      toast.error(error.message || "Email yoki parol noto'g'ri!");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h2>Intellect Academy</h2>
          <p>CBT System — Admin portaliga kirish</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="login-form">
          <div className="login-input-group">
            <label>Email manzili</label>
            <div className="login-input-wrapper">
              <RiMailLine className="login-input-icon" />
              <input
                type="email"
                placeholder="admin@intellect.uz"
                disabled={isSubmitting}
                {...register("email", { required: "Email kiritish majburiy" })}
              />
            </div>
            {errors.email && (
              <span className="login-error-text">{errors.email.message}</span>
            )}
          </div>

          <div className="login-input-group">
            <label>Parol</label>
            <div className="login-input-wrapper">
              <RiLockPasswordLine className="login-input-icon" />
              <input
                type="password"
                placeholder="••••••••"
                disabled={isSubmitting}
                {...register("password", {
                  required: "Parol kiritish majburiy",
                })}
              />
            </div>
            {errors.password && (
              <span className="login-error-text">
                {errors.password.message}
              </span>
            )}
          </div>

          <button
            type="submit"
            className="login-submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Tekshirilmoqda..." : "Tizimga kirish"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
