import React, { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './payroll.css'

import App from './App.jsx'

// Auto-reload when Vite detects a stale chunk after a new deployment
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', () => {
    console.warn('[Vite] Stale chunk detected after new deployment. Auto-reloading...');
    window.location.reload();
  });
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    const errStr = (error?.message || error || '').toString().toLowerCase();
    if (errStr.includes('failed to fetch dynamically imported module') || errStr.includes('error loading dynamically imported module')) {
      const lastReload = sessionStorage.getItem('vite_chunk_reload_ts');
      const now = Date.now();
      if (!lastReload || now - Number(lastReload) > 8000) {
        sessionStorage.setItem('vite_chunk_reload_ts', String(now));
        window.location.reload();
        return;
      }
    }
    console.error("App Crash Caught:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      const errStr = (this.state.error || '').toString().toLowerCase();
      const isSessionError = errStr.includes('session') || errStr.includes('unauthorized') || errStr.includes('jwt') || errStr.includes('token');

      return (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          fontFamily: 'sans-serif',
          background: '#0f2b26',
          color: 'white',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '10px', color: '#14d2cb' }}>
            {isSessionError ? '⚠️ Session Expired' : '⚠️ Application Error'}
          </h2>
          <p style={{ fontSize: '14px', color: '#94a3b8', maxWidth: '480px', marginBottom: '16px' }}>
            {isSessionError 
              ? 'Your active session has expired. Click below to sign in again.'
              : 'An unexpected application runtime error occurred.'}
          </p>

          {this.state.error && (
            <div style={{
              background: 'rgba(0,0,0,0.5)',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.2)',
              fontSize: '12px',
              color: '#f87171',
              maxWidth: '800px',
              maxHeight: '300px',
              overflowY: 'auto',
              textAlign: 'left',
              wordBreak: 'break-word',
              marginBottom: '20px',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>{this.state.error.toString()}</div>
              {this.state.error?.stack && (
                <div style={{ color: '#cbd5e1', fontSize: '10px', marginTop: '6px' }}>
                  {this.state.error.stack}
                </div>
              )}
              {this.state.errorInfo?.componentStack && (
                <div style={{ color: '#93c5fd', fontSize: '10px', marginTop: '6px' }}>
                  Component Stack:{this.state.errorInfo.componentStack}
                </div>
              )}
            </div>
          )}

          <button 
            onClick={() => {
              if (isSessionError) {
                try {
                  localStorage.removeItem('omnilflow_token');
                  localStorage.removeItem('omnilflow_user');
                } catch (e) {}
              }
              window.location.reload();
            }}
            style={{
              padding: '12px 28px',
              borderRadius: '8px',
              background: '#0db49e',
              color: 'white',
              border: 'none',
              fontWeight: '700',
              cursor: 'pointer',
              fontSize: '14px',
              boxShadow: '0 4px 14px rgba(13, 148, 136, 0.3)'
            }}>
            {isSessionError ? '🔄 Sign In Again' : '🔄 Reload Application'}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
