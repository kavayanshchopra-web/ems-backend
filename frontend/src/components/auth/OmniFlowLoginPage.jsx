import React, { useState, useEffect } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Users,
  TrendingUp,
  Settings,
  BarChart3,
  Sparkles,
  ArrowUpRight,
  Activity,
  CheckCircle2
} from 'lucide-react';
import loginConfigService, { DEFAULT_LOGIN_CONFIG } from '../../core/services/loginConfigService';

export default function OmniFlowLoginPage({
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  rememberMe,
  setRememberMe,
  authLoading,
  authError,
  handleLogin,
  handleGoogleLogin,
  onOpenForgotPassword,
  onSwitchToRegister,
  ghlContext = {}
}) {
  const [config, setConfig] = useState(DEFAULT_LOGIN_CONFIG);

  useEffect(() => {
    let isMounted = true;
    async function loadConfig() {
      try {
        const loaded = await loginConfigService.getLoginConfig();
        if (isMounted) setConfig(loaded);
      } catch (e) {
        console.warn('Failed to load login config:', e);
      }
    }
    loadConfig();
    return () => { isMounted = false; };
  }, []);

  const renderFeatureIcon = (iconName) => {
    switch (iconName) {
      case 'Users':
        return <Users size={22} color="#0db49e" strokeWidth={2.2} />;
      case 'TrendingUp':
        return <TrendingUp size={22} color="#0db49e" strokeWidth={2.2} />;
      case 'Settings':
        return <Settings size={22} color="#0db49e" strokeWidth={2.2} />;
      case 'BarChart3':
      default:
        return <BarChart3 size={22} color="#0db49e" strokeWidth={2.2} />;
    }
  };

  const enabledFeatures = (config.features || []).filter(f => f.enabled !== false);
  const firstThreeFeatures = enabledFeatures.slice(0, 3);

  return (
    <div className="omniflow-saas-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Caveat:wght@600;700&display=swap');

        .omniflow-saas-root {
          min-height: 100vh;
          width: 100%;
          background: #f2faf7;
          background-image: 
            radial-gradient(900px circle at 85% 30%, rgba(45, 212, 191, 0.42) 0%, rgba(13, 180, 158, 0.22) 42%, transparent 75%),
            radial-gradient(850px circle at 15% 75%, rgba(13, 180, 158, 0.38) 0%, rgba(20, 184, 166, 0.18) 45%, transparent 75%),
            radial-gradient(700px circle at 50% 12%, rgba(94, 234, 212, 0.32) 0%, transparent 65%);
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #0f172a;
          position: relative;
          box-sizing: border-box;
          display: flex;
          justifyContent: center;
          align-items: stretch;
          overflow-x: hidden;
        }

        /* High-Intensity Atmospheric Ambient Glow Orbs */
        .omniflow-glow-orb {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          z-index: 0;
        }

        /* Vibrant Mint Halo behind Login Card */
        .omniflow-glow-right {
          top: 6%;
          right: 3%;
          width: 700px;
          height: 700px;
          background: radial-gradient(circle, rgba(45, 212, 191, 0.45) 0%, rgba(13, 180, 158, 0.28) 40%, rgba(20, 184, 166, 0.12) 60%, transparent 75%);
          filter: blur(55px);
        }

        /* Rich Emerald-Mint Halo behind Dashboard Card */
        .omniflow-glow-left {
          bottom: 2%;
          left: 2%;
          width: 680px;
          height: 680px;
          background: radial-gradient(circle, rgba(13, 180, 158, 0.40) 0%, rgba(45, 212, 191, 0.25) 42%, transparent 72%);
          filter: blur(55px);
        }

        /* Top Center Ambient Radiant Glow */
        .omniflow-glow-center {
          top: 8%;
          left: 30%;
          width: 550px;
          height: 550px;
          background: radial-gradient(circle, rgba(94, 234, 212, 0.35) 0%, rgba(13, 180, 158, 0.15) 50%, transparent 70%);
          filter: blur(65px);
        }

        /* Max-Width Container */
        .omniflow-saas-container {
          width: 100%;
          max-width: 1440px;
          min-height: 100vh;
          margin: 0 auto;
          padding: clamp(16px, 2.5vh, 28px) clamp(24px, 3.5vw, 68px);
          display: flex;
          flex-direction: column;
          justifyContent: space-between;
          box-sizing: border-box;
          position: relative;
          z-index: 1;
        }

        /* Top Header Navigation (Inline brand with clean divider) */
        .omniflow-header {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
          box-sizing: border-box;
          margin-bottom: clamp(10px, 1.8vh, 18px);
        }

        .omniflow-brand {
          display: flex;
          align-items: center;
          gap: 14px;
          user-select: none;
        }

        .omniflow-logo-clover {
          width: 38px;
          height: 38px;
          flex-shrink: 0;
        }

        .omniflow-name {
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.5px;
          color: #064e43;
          line-height: 1;
        }

        .omniflow-brand-divider {
          width: 1px;
          height: 18px;
          background: #cbd5e1;
        }

        .omniflow-tagline {
          font-size: 11.5px;
          font-weight: 600;
          color: #64748b;
          letter-spacing: 1.2px;
          text-transform: uppercase;
        }

        .omniflow-signup-top-prompt {
          font-size: 13.5px;
          color: #64748b;
          font-weight: 500;
        }
        .omniflow-signup-top-link {
          color: #0db49e;
          font-weight: 700;
          cursor: pointer;
          margin-left: 4px;
          text-decoration: none;
          transition: color 0.15s ease;
        }
        .omniflow-signup-top-link:hover {
          color: #064e43;
          text-decoration: underline;
        }

        /* Main Content Row */
        .omniflow-main-content-row {
          width: 100%;
          display: flex;
          justifyContent: space-between;
          align-items: center;
          gap: clamp(28px, 4vw, 56px);
          flex: 1;
          box-sizing: border-box;
          margin: clamp(8px, 1.4vh, 20px) 0;
        }

        /* Left Hero Showcase Area */
        .omniflow-hero-wrap {
          display: flex;
          flex-direction: column;
          justifyContent: center;
          flex: 1;
          max-width: 820px;
          min-width: 0;
        }

        .omniflow-pill-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 9999px;
          background: rgba(13, 180, 158, 0.12);
          border: 1px solid rgba(13, 180, 158, 0.28);
          color: #064e43;
          font-size: 11.5px;
          font-weight: 800;
          letter-spacing: 0.8px;
          width: fit-content;
          margin-bottom: clamp(10px, 1.5vh, 16px);
        }

        .omniflow-headline-h1 {
          font-size: clamp(38px, 5vh, 54px);
          line-height: 1.12;
          font-weight: 800;
          letter-spacing: -1.6px;
          color: #0f172a;
          margin: 0 0 clamp(8px, 1.4vh, 14px) 0;
        }

        .omniflow-teal-accent {
          color: #0db49e;
        }

        .omniflow-desc-p {
          font-size: clamp(14px, 1.35vw, 16px);
          line-height: 1.55;
          color: #475569;
          max-width: 560px;
          margin: 0 0 clamp(16px, 2.4vh, 24px) 0;
        }

        /* Top 3 Feature Cards in Horizontal Row */
        .omniflow-feature-pills-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-bottom: clamp(16px, 2.2vh, 24px);
          max-width: 780px;
        }

        .omniflow-feature-pill-card {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          background: #ffffff;
          padding: 12px 14px;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 14px -2px rgba(13, 180, 158, 0.08);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .omniflow-feature-pill-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 22px -4px rgba(13, 180, 158, 0.22);
          border-color: #a7f3d0;
        }

        .omniflow-feature-icon-pill {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: #e6f7f4;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .omniflow-feature-title {
          font-size: 13.5px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 2px;
          line-height: 1.25;
        }

        .omniflow-feature-desc {
          font-size: 11.5px;
          color: #64748b;
          line-height: 1.35;
        }

        /* Bottom Section: Dashboard Preview + Scale Stats */
        .omniflow-showcase-row {
          display: flex;
          align-items: center;
          gap: clamp(18px, 2vw, 26px);
          max-width: 780px;
        }

        /* OmniFlow Mini Dashboard Preview Card */
        .omniflow-preview-card {
          flex: 1.55;
          min-width: 380px;
          background: #ffffff;
          border-radius: 18px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 20px 45px -10px rgba(13, 180, 158, 0.15), 0 0 0 1px rgba(226, 232, 240, 0.7);
          overflow: hidden;
          display: flex;
          height: clamp(210px, 26vh, 245px);
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .omniflow-preview-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 26px 52px -12px rgba(13, 180, 158, 0.25);
        }

        /* Mini Sidebar */
        .omniflow-mini-sidebar {
          width: 110px;
          background: #042722;
          padding: 14px 10px;
          display: flex;
          flex-direction: column;
          gap: 5px;
          flex-shrink: 0;
          color: #e2e8f0;
          box-sizing: border-box;
        }

        .omniflow-mini-logo-row {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 10px;
          padding: 0 4px;
        }
        .omniflow-mini-logo-text {
          font-size: 12px;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.2px;
        }

        .omniflow-mini-nav-item {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 5px 8px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 600;
          color: #94a3b8;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .omniflow-mini-nav-item.active {
          background: rgba(13, 180, 158, 0.22);
          color: #2dd4bf;
          font-weight: 700;
        }

        /* Mini Main Workspace */
        .omniflow-mini-main {
          flex: 1;
          padding: 12px 16px;
          display: flex;
          flex-direction: column;
          justifyContent: space-between;
          background: #ffffff;
          box-sizing: border-box;
          min-width: 0;
        }

        .omniflow-mini-top {
          display: flex;
          justifyContent: space-between;
          align-items: center;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 8px;
        }

        .omniflow-mini-heading {
          font-size: 13px;
          font-weight: 800;
          color: #0f172a;
        }

        .omniflow-mini-controls {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .omniflow-mini-badge {
          font-size: 9.5px;
          padding: 2px 7px;
          border-radius: 4px;
          background: #e6f7f4;
          color: #064e43;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        /* 4 Metric Boxes */
        .omniflow-mini-metrics {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin: 6px 0;
        }

        .omniflow-mini-metric-box {
          background: #f8fafc;
          border-radius: 7px;
          padding: 6px 4px;
          text-align: center;
          border: 1px solid #e2e8f0;
        }
        .omniflow-mini-metric-num {
          font-size: 13px;
          font-weight: 800;
          color: #064e43;
          line-height: 1.1;
        }
        .omniflow-mini-metric-lbl {
          font-size: 8.5px;
          color: #64748b;
          font-weight: 600;
          margin-top: 2px;
        }

        /* SVG Trend Wave Chart */
        .omniflow-mini-chart-wrap {
          flex: 1;
          display: flex;
          flex-direction: column;
          justifyContent: flex-end;
          min-height: 60px;
          position: relative;
        }
        .omniflow-chart-svg {
          width: 100%;
          height: 60px;
          overflow: visible;
        }

        .omniflow-chart-months {
          display: flex;
          justifyContent: space-between;
          font-size: 8.5px;
          color: #94a3b8;
          font-weight: 600;
          padding: 2px 4px 0;
        }

        /* Scale Feature & Stats Column */
        .omniflow-scale-doodle-column {
          flex: 1;
          display: flex;
          flex-direction: column;
          justifyContent: center;
          gap: 12px;
        }

        .omniflow-scale-card {
          background: #ffffff;
          border-radius: 14px;
          padding: 14px 16px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 14px -2px rgba(13, 180, 158, 0.08);
        }

        .omniflow-stat-row {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 10px;
        }
        .omniflow-stat-chip {
          padding: 4px 10px;
          border-radius: 6px;
          background: #f0fdf9;
          border: 1px solid #ccfbf1;
          color: #064e43;
          font-size: 11.5px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          width: fit-content;
        }

        /* Handwritten Doodle Signature */
        .omniflow-doodle-text-wrap {
          font-family: 'Caveat', cursive, sans-serif;
          font-size: clamp(28px, 3.8vh, 38px);
          font-weight: 700;
          color: #0f172a;
          transform: rotate(-3deg);
          user-select: none;
          text-align: left;
          width: fit-content;
          margin-top: 12px;
        }

        .omniflow-doodle-brush-bar {
          width: 150px;
          height: 4.5px;
          background: #0db49e;
          border-radius: 3px;
          margin-top: -2px;
        }

        /* Right Column — Floating Login Card with Dedicated Aura Glow */
        .omniflow-card-column {
          display: flex;
          justifyContent: flex-end;
          align-items: center;
          width: 100%;
          max-width: 445px;
          flex-shrink: 0;
          position: relative;
        }

        /* Dedicated Aura Glow tightly hugging the Login Card */
        .omniflow-card-aura-glow {
          position: absolute;
          top: -25px;
          left: -25px;
          right: -25px;
          bottom: -25px;
          background: radial-gradient(circle at center, rgba(45, 212, 191, 0.50) 0%, rgba(13, 180, 158, 0.28) 50%, transparent 75%);
          filter: blur(35px);
          border-radius: 40px;
          z-index: 0;
          pointer-events: none;
        }

        .omniflow-white-card-body {
          width: 100%;
          background: #ffffff;
          border-radius: 28px;
          padding: clamp(28px, 3.8vh, 40px) clamp(24px, 2.8vw, 36px);
          box-shadow: 
            0 28px 70px -15px rgba(6, 78, 67, 0.18),
            0 12px 30px -5px rgba(13, 180, 158, 0.12),
            0 0 0 1px rgba(226, 232, 240, 0.9);
          box-sizing: border-box;
          position: relative;
          z-index: 1;
          text-align: left;
        }

        /* Left-aligned crisp heading */
        .omniflow-c-title {
          font-size: clamp(24px, 3vh, 29px);
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 5px 0;
          letter-spacing: -0.6px;
          text-align: left;
        }

        .omniflow-c-subtitle {
          font-size: clamp(13px, 1.4vh, 14px);
          color: #64748b;
          margin: 0 0 clamp(16px, 2.2vh, 22px) 0;
          text-align: left;
          font-weight: 500;
        }

        /* GHL Connected Chip */
        .omniflow-ghl-chip {
          background: #f0fdf4;
          border: 1px solid #86efac;
          border-radius: 8px;
          padding: 6px 10px;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          text-align: left;
        }

        /* Error Notification */
        .omniflow-err-badge {
          padding: 8px 10px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          color: #ef4444;
          font-size: 11.5px;
          font-weight: 600;
          margin-bottom: 12px;
          text-align: left;
        }

        /* Form Controls */
        .omniflow-form-flow {
          display: flex;
          flex-direction: column;
          gap: clamp(10px, 1.4vh, 16px);
        }

        .omniflow-input-row {
          text-align: left;
          width: 100%;
        }

        .omniflow-field-lbl {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 6px;
        }

        /* Password and Forgot Password Split Row - Guaranteed 100% space-between */
        .omniflow-between-lbl-row {
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          width: 100% !important;
          margin-bottom: 6px !important;
          box-sizing: border-box !important;
        }

        .omniflow-forgot-action {
          font-size: 12px;
          color: #0db49e;
          font-weight: 700;
          cursor: pointer;
          text-decoration: none;
          transition: color 0.15s ease;
          margin-left: auto;
        }
        .omniflow-forgot-action:hover {
          color: #064e43;
          text-decoration: underline;
        }

        .omniflow-iconic-input {
          position: relative;
          width: 100%;
        }

        .omniflow-input-svg {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          pointer-events: none;
        }

        .omniflow-real-input {
          width: 100%;
          padding: clamp(10px, 1.4vh, 13px) 14px clamp(10px, 1.4vh, 13px) 42px;
          border-radius: 10px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #0f172a;
          font-size: 13.5px;
          font-family: inherit;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .omniflow-real-input:focus {
          border-color: #0db49e;
          box-shadow: 0 0 0 3px rgba(13, 180, 158, 0.18);
        }
        .omniflow-real-input::placeholder {
          color: #94a3b8;
          font-size: 13px;
        }

        .omniflow-eye-action {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          cursor: pointer;
          display: flex;
          align-items: center;
        }
        .omniflow-eye-action:hover {
          color: #064e43;
        }

        .omniflow-check-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
          user-select: none;
          margin-top: 1px;
        }

        .omniflow-check-box {
          width: 16px;
          height: 16px;
          accent-color: #007a68;
          cursor: pointer;
          border-radius: 4px;
        }

        .omniflow-check-txt {
          font-size: 12.5px;
          color: #64748b;
          font-weight: 500;
          cursor: pointer;
        }

        /* Solid Vibrant Teal Sign In CTA */
        .omniflow-solid-teal-btn {
          width: 100%;
          padding: clamp(11px, 1.5vh, 14px) 16px;
          border-radius: 10px;
          background: linear-gradient(135deg, #008775 0%, #005a4e 100%);
          color: #ffffff;
          border: none;
          font-size: clamp(14px, 1.5vh, 15.5px);
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 6px 18px rgba(0, 90, 78, 0.35);
          transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
          margin-top: 4px;
        }
        .omniflow-solid-teal-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          filter: brightness(1.06);
          box-shadow: 0 8px 22px rgba(0, 90, 78, 0.45);
        }
        .omniflow-solid-teal-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        /* OR Divider */
        .omniflow-divider-row {
          display: flex;
          align-items: center;
          text-align: center;
          margin: clamp(6px, 1vh, 10px) 0;
          color: #94a3b8;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.8px;
        }
        .omniflow-divider-row::before,
        .omniflow-divider-row::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid #e2e8f0;
        }
        .omniflow-divider-row::before { margin-right: 12px; }
        .omniflow-divider-row::after { margin-left: 12px; }

        /* Google OAuth Button */
        .omniflow-google-auth-btn {
          width: 100%;
          padding: clamp(9px, 1.2vh, 12px) 14px;
          border-radius: 9px;
          background: #ffffff;
          color: #1e293b;
          border: 1px solid #cbd5e1;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: background 0.15s ease, border-color 0.15s ease;
        }
        .omniflow-google-auth-btn:hover {
          background: #f8fafc;
          border-color: #94a3b8;
        }

        /* Switch Link inside card */
        .omniflow-switch-link-footer {
          text-align: center;
          margin-top: clamp(10px, 1.4vh, 16px);
          font-size: 12.5px;
          color: #64748b;
        }
        .omniflow-switch-link-footer span {
          color: #0db49e;
          font-weight: 700;
          cursor: pointer;
          margin-left: 4px;
        }
        .omniflow-switch-link-footer span:hover {
          color: #064e43;
          text-decoration: underline;
        }

        /* Mobile View Specifics */
        .omniflow-mobile-top-bar {
          display: none;
          text-align: center;
          margin-bottom: 20px;
        }

        .omniflow-mobile-doodle-bottom {
          display: none;
          text-align: center;
          margin-top: 20px;
          font-family: 'Caveat', cursive, sans-serif;
          font-size: 23px;
          font-weight: 700;
          color: #0f172a;
        }

        /* Bottom Footer */
        .omniflow-bottom-bar {
          width: 100%;
          margin-top: clamp(8px, 1.2vh, 16px);
          display: flex;
          justifyContent: flex-start;
          font-size: 11px;
          font-weight: 600;
          color: #94a3b8;
          letter-spacing: 0.8px;
          flex-shrink: 0;
          box-sizing: border-box;
        }

        /* Responsive Breakpoints */
        @media (max-width: 1100px) {
          .omniflow-main-content-row {
            flex-direction: column;
            gap: 36px;
            align-items: center;
          }
          .omniflow-hero-wrap {
            max-width: 100%;
            text-align: center;
            align-items: center;
          }
          .omniflow-pill-badge {
            margin: 0 auto clamp(8px, 1.4vh, 14px);
          }
          .omniflow-desc-p {
            margin: 0 auto clamp(16px, 2.4vh, 26px);
          }
          .omniflow-showcase-row {
            flex-direction: column;
            width: 100%;
            max-width: 540px;
          }
          .omniflow-preview-card {
            width: 100%;
          }
          .omniflow-scale-doodle-column {
            width: 100%;
            align-items: center;
          }
          .omniflow-doodle-text-wrap {
            margin: 10px auto;
          }
          .omniflow-card-column {
            justify-content: center;
            max-width: 440px;
          }
          .omniflow-bottom-bar {
            justify-content: center;
          }
        }

        @media (max-width: 640px) {
          .omniflow-saas-container {
            padding: 20px 16px;
          }
          .omniflow-showcase-row,
          .omniflow-feature-pills-row {
            display: none;
          }
          .omniflow-header {
            display: none;
          }
          .omniflow-mobile-top-bar {
            display: block;
          }
          .omniflow-mobile-doodle-bottom {
            display: block;
          }
          .omniflow-headline-h1 {
            font-size: 28px;
          }
        }
      `}</style>

      {/* Atmospheric Ambient Glow Orbs */}
      <div className="omniflow-glow-orb omniflow-glow-right" />
      <div className="omniflow-glow-orb omniflow-glow-left" />
      <div className="omniflow-glow-orb omniflow-glow-center" />

      <div className="omniflow-saas-container">
        {/* Desktop Top Header Bar (With inline brand & divider) */}
        <header className="omniflow-header">
          <div className="omniflow-brand">
            {/* 4-petal interlocking clover logo */}
            <svg className="omniflow-logo-clover" viewBox="0 0 48 48" fill="none">
              <rect width="48" height="48" rx="12" fill="#ffffff" />
              <path
                d="M16 12C12.6863 12 10 14.6863 10 18V24C10 27.3137 12.6863 30 16 30H22C25.3137 30 28 27.3137 28 24V18C28 14.6863 25.3137 12 22 12H16Z"
                stroke="#064e43"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M26 18C26 14.6863 28.6863 12 32 12H38C41.3137 12 44 14.6863 44 18V24C44 27.3137 41.3137 30 38 30H32C28.6863 30 26 27.3137 26 24V30C26 33.3137 28.6863 36 32 36H38C41.3137 36 44 33.3137 44 30"
                stroke="#0db49e"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="24" cy="24" r="3.5" fill="#0db49e" />
            </svg>

            <span className="omniflow-name">{config.brandName || 'OmniFlow'}</span>
            <div className="omniflow-brand-divider" />
            <span className="omniflow-tagline">{config.brandTagline || 'Manage · Automate · Grow'}</span>
          </div>

          <div className="omniflow-signup-top-prompt">
            {config.signUpPromptText || "Don't have an account?"}{' '}
            <span onClick={onSwitchToRegister} className="omniflow-signup-top-link">
              {config.signUpLinkText || 'Sign Up'}
            </span>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="omniflow-main-content-row">
          {/* Left Column: Rich Showcase & Interactive UI Preview */}
          <div className="omniflow-hero-wrap">
            <div className="omniflow-pill-badge">
              <Sparkles size={13} color="#0db49e" /> {config.heroTagline || 'WELCOME TO OMNIFLOW'}
            </div>

            <h1 className="omniflow-headline-h1">
              Streamline Your<br />
              Business, <span className="omniflow-teal-accent">Effortlessly.</span>
            </h1>

            <p className="omniflow-desc-p">
              {config.heroDescription ||
                'An all-in-one platform to manage your team, automate processes and drive growth — beautifully simple.'}
            </p>

            {/* Top 3 Features in Clean Row */}
            <div className="omniflow-feature-pills-row">
              {firstThreeFeatures.map((feat) => (
                <div key={feat.id} className="omniflow-feature-pill-card">
                  <div className="omniflow-feature-icon-pill">
                    {renderFeatureIcon(feat.icon)}
                  </div>
                  <div>
                    <div className="omniflow-feature-title">{feat.title}</div>
                    <div className="omniflow-feature-desc">{feat.description}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Row: UI Preview Card + Scale Feature & Doodle */}
            <div className="omniflow-showcase-row">
              {/* OmniFlow Mini Dashboard UI Preview Card */}
              <div className="omniflow-preview-card">
                {/* Mini Sidebar */}
                <div className="omniflow-mini-sidebar">
                  <div className="omniflow-mini-logo-row">
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0db49e' }} />
                    <span className="omniflow-mini-logo-text">OmniFlow</span>
                  </div>
                  <div className="omniflow-mini-nav-item active">
                    <BarChart3 size={11} />
                    <span>Analytics</span>
                  </div>
                  <div className="omniflow-mini-nav-item">
                    <Users size={11} />
                    <span>Contacts</span>
                  </div>
                  <div className="omniflow-mini-nav-item">
                    <TrendingUp size={11} />
                    <span>Pipeline</span>
                  </div>
                  <div className="omniflow-mini-nav-item">
                    <Settings size={11} />
                    <span>Settings</span>
                  </div>
                </div>

                {/* Mini Main Workspace */}
                <div className="omniflow-mini-main">
                  <div className="omniflow-mini-top">
                    <span className="omniflow-mini-heading">Analytics</span>
                    <div className="omniflow-mini-controls">
                      <span className="omniflow-mini-badge">
                        <Activity size={10} /> Live
                      </span>
                    </div>
                  </div>

                  {/* 4 Metric Chips */}
                  <div className="omniflow-mini-metrics">
                    <div className="omniflow-mini-metric-box">
                      <div className="omniflow-mini-metric-num">12,482</div>
                      <div className="omniflow-mini-metric-lbl">Contacts</div>
                    </div>
                    <div className="omniflow-mini-metric-box">
                      <div className="omniflow-mini-metric-num">98</div>
                      <div className="omniflow-mini-metric-lbl">Teams</div>
                    </div>
                    <div className="omniflow-mini-metric-box">
                      <div className="omniflow-mini-metric-num">92%</div>
                      <div className="omniflow-mini-metric-lbl">Completed</div>
                    </div>
                    <div className="omniflow-mini-metric-box">
                      <div className="omniflow-mini-metric-num">700</div>
                      <div className="omniflow-mini-metric-lbl">Completed</div>
                    </div>
                  </div>

                  {/* Smooth SVG Mint Wave Chart */}
                  <div className="omniflow-mini-chart-wrap">
                    <svg className="omniflow-chart-svg" viewBox="0 0 280 60" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="omniChartGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#0db49e" stopOpacity="0.38" />
                          <stop offset="100%" stopColor="#0db49e" stopOpacity="0.02" />
                        </linearGradient>
                      </defs>
                      {/* Area Fill */}
                      <path
                        d="M 0 50 Q 35 48 65 32 T 130 20 T 195 28 T 260 12 L 280 10 L 280 60 L 0 60 Z"
                        fill="url(#omniChartGrad)"
                      />
                      {/* Spline Curve Stroke */}
                      <path
                        d="M 0 50 Q 35 48 65 32 T 130 20 T 195 28 T 260 12 L 280 10"
                        fill="none"
                        stroke="#0db49e"
                        strokeWidth="2.6"
                        strokeLinecap="round"
                      />
                      {/* Highlight Nodes */}
                      <circle cx="65" cy="32" r="3" fill="#ffffff" stroke="#0db49e" strokeWidth="2" />
                      <circle cx="130" cy="20" r="3" fill="#ffffff" stroke="#0db49e" strokeWidth="2" />
                      <circle cx="195" cy="28" r="3" fill="#ffffff" stroke="#0db49e" strokeWidth="2" />
                      <circle cx="260" cy="12" r="3.5" fill="#064e43" stroke="#0db49e" strokeWidth="2" />
                    </svg>

                    <div className="omniflow-chart-months">
                      <span>Jan</span>
                      <span>Feb</span>
                      <span>Mar</span>
                      <span>Apr</span>
                      <span>May</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4th Feature (Scale) & Stats */}
              <div className="omniflow-scale-doodle-column">
                <div className="omniflow-scale-card">
                  <div className="omniflow-feature-title" style={{ fontSize: '14px', marginBottom: '3px' }}>
                    Scale Your Business
                  </div>
                  <div className="omniflow-feature-desc" style={{ marginBottom: '8px' }}>
                    Growth metrics and automation.
                  </div>

                  <div className="omniflow-stat-row">
                    <span className="omniflow-stat-chip">
                      100% <ArrowUpRight size={13} color="#0db49e" /> Growth metrics
                    </span>
                    <span className="omniflow-stat-chip">
                      +53% <ArrowUpRight size={13} color="#0db49e" /> Growth stats
                    </span>
                  </div>
                </div>

                {/* Handwritten Doodle Signature */}
                <div className="omniflow-doodle-text-wrap">
                  {config.workSmarterBadgeText || 'Work Smarter Together'}
                  <div className="omniflow-doodle-brush-bar" />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Floating Login Card */}
          <div className="omniflow-card-column">
            {/* Dedicated Vibrant Card Aura Glow */}
            <div className="omniflow-card-aura-glow" />

            <div className="omniflow-white-card-body">
              {/* Mobile View Top Brand */}
              <div className="omniflow-mobile-top-bar">
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                  <svg style={{ width: '36px', height: '36px' }} viewBox="0 0 48 48" fill="none">
                    <rect width="48" height="48" rx="10" fill="#ffffff" />
                    <path
                      d="M16 12C12.6863 12 10 14.6863 10 18V24C10 27.3137 12.6863 30 16 30H22C25.3137 30 28 27.3137 28 24V18C28 14.6863 25.3137 12 22 12H16Z"
                      stroke="#064e43"
                      strokeWidth="4"
                    />
                    <path
                      d="M26 18C26 14.6863 28.6863 12 32 12H38C41.3137 12 44 14.6863 44 18V24C44 27.3137 41.3137 30 38 30H32C28.6863 30 26 27.3137 26 24V30C26 33.3137 28.6863 36 32 36H38C41.3137 36 44 33.3137 44 30"
                      stroke="#0db49e"
                      strokeWidth="4"
                    />
                  </svg>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '19px', fontWeight: '800', color: '#064e43', lineHeight: 1.1 }}>
                      {config.brandName || 'OmniFlow'}
                    </div>
                    <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '600' }}>
                      {config.brandTagline || 'Manage · Automate · Grow'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Title & Subtitle (Left-aligned) */}
              <h2 className="omniflow-c-title">{config.loginHeading || 'Welcome Back'}</h2>
              <p className="omniflow-c-subtitle">
                {config.loginSubtitle || 'Sign in to your account to continue'}
              </p>

              {/* GHL Chip */}
              {ghlContext && ghlContext.locationId && (
                <div className="omniflow-ghl-chip">
                  <div style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '7px',
                    background: '#dcfce7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px'
                  }}>
                    ⚡
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: '#166534' }}>
                      HighLevel Connected
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#15803d', fontFamily: 'monospace' }}>
                      Loc: {ghlContext.locationId}
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {authError && (
                <div className="omniflow-err-badge">
                  {authError}
                </div>
              )}

              {/* Form Flow */}
              <form onSubmit={handleLogin} className="omniflow-form-flow">
                {/* Email Field */}
                <div className="omniflow-input-row">
                  <label className="omniflow-field-lbl">Email Address</label>
                  <div className="omniflow-iconic-input">
                    <Mail size={16} className="omniflow-input-svg" />
                    <input
                      type="email"
                      required
                      placeholder="yourname@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="omniflow-real-input"
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="omniflow-input-row">
                  <div
                    className="omniflow-between-lbl-row"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      width: '100%',
                      marginBottom: '6px'
                    }}
                  >
                    <label className="omniflow-field-lbl" style={{ margin: 0, display: 'inline-block' }}>
                      Password
                    </label>
                    <span
                      onClick={onOpenForgotPassword}
                      className="omniflow-forgot-action"
                      style={{ cursor: 'pointer', display: 'inline-block' }}
                    >
                      {config.forgotPasswordText || 'Forgot password?'}
                    </span>
                  </div>
                  <div className="omniflow-iconic-input">
                    <Lock size={16} className="omniflow-input-svg" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="omniflow-real-input"
                      style={{ paddingRight: '38px' }}
                      autoComplete="current-password"
                    />
                    <div
                      onClick={() => setShowPassword(!showPassword)}
                      className="omniflow-eye-action"
                      title={showPassword ? 'Hide Password' : 'Show Password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </div>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="omniflow-check-wrap">
                  <input
                    type="checkbox"
                    id="omniRememberResponsive"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="omniflow-check-box"
                  />
                  <label htmlFor="omniRememberResponsive" className="omniflow-check-txt">
                    Remember me
                  </label>
                </div>

                {/* Sign In CTA Button (Vibrant Deep Emerald Gradient) */}
                <button
                  type="submit"
                  disabled={authLoading}
                  className="omniflow-solid-teal-btn"
                >
                  {authLoading ? 'Signing In...' : (config.signInButtonText || 'Sign In →')}
                </button>

                {/* Google Sign In */}
                {config.showGoogleAuth !== false && (
                  <>
                    <div className="omniflow-divider-row">OR</div>
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={authLoading}
                      className="omniflow-google-auth-btn"
                    >
                      <svg width="17" height="17" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.27 21.36 7.35 24 12 24z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.94 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.27 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                        />
                      </svg>
                      <span>{config.googleButtonText || 'Continue with Google'}</span>
                    </button>
                  </>
                )}

                {/* Sign Up Link */}
                <div className="omniflow-switch-link-footer">
                  {config.signUpPromptText || "Don't have an account?"}{' '}
                  <span onClick={onSwitchToRegister}>
                    {config.signUpLinkText || 'Sign Up'}
                  </span>
                </div>

                {/* Mobile Doodle Accent */}
                <div className="omniflow-mobile-doodle-bottom">
                  {config.workSmarterBadgeText || 'Work Smarter Together'}
                  <div style={{ width: '85px', height: '3px', background: '#0db49e', margin: '2px auto 0', borderRadius: '2px' }} />
                </div>
              </form>
            </div>
          </div>
        </main>

        {/* Bottom Footer */}
        <footer className="omniflow-bottom-bar">
          {config.footerText || 'Simple  |  Secure  |  Scalable'}
        </footer>
      </div>
    </div>
  );
}
