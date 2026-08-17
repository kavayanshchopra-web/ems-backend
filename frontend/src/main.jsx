import React, { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './payroll.css'

import App from './App.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("App Crash Caught:", error, errorInfo);
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
              background: 'rgba(0,0,0,0.3)',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)',
              fontSize: '11px',
              color: '#f87171',
              maxWidth: '500px',
              wordBreak: 'break-word',
              marginBottom: '20px',
              fontFamily: 'monospace'
            }}>
              {this.state.error.toString()}
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
