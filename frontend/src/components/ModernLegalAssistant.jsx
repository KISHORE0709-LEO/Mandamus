import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth } from '../lib/firebase';
import Spline from '@splinetool/react-spline';
import { 
  Send, 
  FileText, 
  MessageSquare, 
  Save,
  CheckCircle,
  Eye,
  EyeOff,
  LogOut,
  User,
  AlertTriangle
} from 'lucide-react';

const ModernLegalAssistant = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [silentMode, setSilentMode] = useState(false);
  const [input, setInput] = useState('');
  const [currentResponse, setCurrentResponse] = useState(null);

  const handleLogout = async () => {
    await logout();
  };

  const handleQuery = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const response = {
      query: input,
      explanation: "Based on your situation, you are experiencing harassment which is a serious offense under Indian law. You have multiple legal protections available, and there are immediate steps you can take to ensure your safety and build a strong case.",
      laws: [
        "IPC Section 354A - Sexual Harassment and punishment for sexual harassment",
        "IPC Section 509 - Word, gesture or act intended to insult the modesty of a woman",
        "Protection of Women from Domestic Violence Act, 2005 (if applicable)",
        "IT Act Section 67 - Publishing or transmitting obscene material in electronic form"
      ],
      rights: [
        "Right to full protection under law against any form of harassment",
        "Right to file FIR at any police station regardless of jurisdiction",
        "Right to request police protection if you feel threatened",
        "Right to legal aid if you cannot afford a lawyer"
      ],
      steps: [
        { title: "Document Everything", content: "Keep detailed records of all incidents with dates, times, and any evidence like screenshots, messages, or witness statements." },
        { title: "File Police Complaint", content: "Visit your nearest police station and file a written complaint. You can also file an online FIR through the state police portal." },
        { title: "Seek Legal Counsel", content: "Consult with a lawyer specializing in harassment cases. Many legal aid organizations offer free consultations." },
        { title: "Apply for Protection Order", content: "If needed, apply for a restraining order through the court to legally prevent the harasser from contacting you." }
      ]
    };
    setCurrentResponse(response);
    setInput('');
  };

  const handlePanicExit = () => {
    window.location.href = 'https://www.google.com';
  };

  return (
    <div style={{ minHeight: '100vh', height: '100vh', background: '#000', fontFamily: 'Inter, system-ui, sans-serif', position: 'relative', overflow: 'hidden' }}>
      {/* Background - Hidden for complete black aesthetic */}


      {/* Navbar */}
      <nav style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100px', background: 'transparent', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 5%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer' }} onClick={() => navigate('/public-dashboard')}>
          <img src="/Logo.png" alt="Logo" style={{ height: '40px' }} />
          <span style={{ fontSize: '28px', fontWeight: '800', color: '#fff', letterSpacing: '1px' }}>MANDAMUS</span>
        </div>

        {/* Central Capsule Navigation */}
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: '2.5rem', padding: '0 2rem', height: '64px', background: 'rgba(20, 20, 20, 0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '32px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)' }}>
          <button 
            onClick={() => navigate('/public-dashboard')}
            style={{ background: 'transparent', color: '#fff', border: 'none', fontSize: '16px', fontWeight: '500', cursor: 'pointer', transition: 'color 0.25s ease', padding: 0 }}
            onMouseEnter={(e) => e.target.style.color = '#e02020'}
            onMouseLeave={(e) => e.target.style.color = '#fff'}
          >
            Public Dashboard
          </button>
          <button 
            onClick={() => navigate('/modern-advisor')}
            style={{ background: 'transparent', color: '#e02020', border: 'none', fontSize: '16px', fontWeight: '500', cursor: 'pointer', transition: 'color 0.25s ease', padding: 0 }}
          >
            Legal Assistant
          </button>
          <button 
            onClick={() => navigate('/vault')}
            style={{ background: 'transparent', color: '#fff', border: 'none', fontSize: '16px', fontWeight: '500', cursor: 'pointer', transition: 'color 0.25s ease', padding: 0 }}
            onMouseEnter={(e) => e.target.style.color = '#e02020'}
            onMouseLeave={(e) => e.target.style.color = '#fff'}
          >
            Silent Justice
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 16px', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '100px' }}>
            <span style={{ fontSize: '16px', fontWeight: '500', color: '#fff' }}>{user?.displayName || 'User'}</span>
            <div style={{ width: '32px', height: '32px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <User size={18} />
            </div>
          </div>

          <button onClick={handleLogout} style={{ padding: '8px 20px', background: 'transparent', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', borderRadius: '24px', fontSize: '16px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content - Two Column Layout */}
      <div style={{ position: 'relative', zIndex: 1, height: 'calc(100vh - 100px)', marginTop: '100px', display: 'grid', gridTemplateColumns: '65% 35%', gap: '24px', maxWidth: '1800px', margin: '100px auto 0', padding: '0 40px', overflow: 'hidden' }}>
        
        {/* LEFT SECTION - AI Response Card */}
        <div style={{ height: '100%', overflow: 'hidden' }}>
          <div style={{ height: '100%', background: '#111', borderRadius: '24px', border: '2px solid #e02020', boxShadow: '0 0 20px rgba(224, 32, 32, 0.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            {/* Header */}
            <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#fff', marginBottom: '4px' }}>AI Legal Assistant</h2>
              <p style={{ fontSize: '14px', color: '#888' }}>Get instant legal guidance and understand your rights</p>
            </div>

            {/* Body - Content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              
              {/* Scrollable Content Area */}
              <div style={{ 
                flex: 1, 
                overflowY: 'auto', 
                padding: '32px',
                scrollbarWidth: 'thin',
                scrollbarColor: '#e02020 #1a1a1a'
              }} className="custom-scrollbar">
                
                {!currentResponse ? (
                  // Empty State
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center' }}>
                    <div>
                      <p style={{ fontSize: '18px', color: '#888', lineHeight: '1.6' }}>
                        Describe your legal issue to get guidance
                      </p>
                    </div>
                  </div>
                ) : (
                  // Response Content
                  <div>
                    {/* Query Row: Bot + Question */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '32px' }}>
                      {/* Bot */}
                      <div style={{ width: '160px', height: '160px', flexShrink: 0 }}>
                        <Spline 
                          scene="https://prod.spline.design/rU2-Ks0SC0T5od9B/scene.splinecode"
                          style={{ width: '100%', height: '100%' }}
                        />
                      </div>
                      
                      {/* User Query */}
                      <div style={{ flex: 1, padding: '16px 20px', background: '#1a1a1a', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                        <p style={{ color: '#ccc', fontSize: '15px', lineHeight: '1.6' }}>{currentResponse.query}</p>
                      </div>
                    </div>

                    {/* Full Width Response Content */}
                    <div>
                      {/* Explanation */}
                      <p style={{ color: '#ccc', lineHeight: '1.8', fontSize: '15px', marginBottom: '32px' }}>
                        {currentResponse.explanation}
                      </p>

                      {/* Applicable Laws */}
                      <div style={{ marginBottom: '32px' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#e02020', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Applicable Laws</h4>
                        <ul style={{ listStyle: 'none', padding: 0 }}>
                          {currentResponse.laws.map((law, idx) => (
                            <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px', padding: '12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                              <CheckCircle size={18} style={{ color: '#e02020', marginTop: '2px', flexShrink: 0 }} />
                              <span style={{ color: '#ddd', fontSize: '14px' }}>{law}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Your Rights */}
                      <div style={{ marginBottom: '32px' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#e02020', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Your Rights</h4>
                        <ul style={{ listStyle: 'none', padding: 0 }}>
                          {currentResponse.rights.map((right, idx) => (
                            <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px', padding: '12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                              <CheckCircle size={18} style={{ color: '#e02020', marginTop: '2px', flexShrink: 0 }} />
                              <span style={{ color: '#ddd', fontSize: '14px' }}>{right}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Step-by-Step Procedure */}
                      <div>
                        <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#e02020', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Step-by-Step Procedure</h4>
                        <ol style={{ listStyle: 'none', padding: 0 }}>
                          {currentResponse.steps.map((step, idx) => (
                            <li key={idx} style={{ display: 'flex', gap: '16px', marginBottom: '20px', padding: '16px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                              <span style={{ width: '32px', height: '32px', background: '#e02020', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '700', flexShrink: 0 }}>
                                {idx + 1}
                              </span>
                              <div>
                                <strong style={{ color: '#fff', fontSize: '15px', display: 'block', marginBottom: '6px' }}>{step.title}</strong>
                                <span style={{ color: '#aaa', fontSize: '14px', lineHeight: '1.6' }}>{step.content}</span>
                              </div>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input Box (INSIDE CARD - STICKY BOTTOM) */}
              <div style={{ padding: '20px 32px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(0, 0, 0, 0.3)' }}>
                <form onSubmit={handleQuery}>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Describe your situation or ask a follow-up question..."
                      style={{ width: '100%', padding: '14px 60px 14px 20px', fontSize: '15px', color: '#fff', background: '#1a1a1a', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', outline: 'none' }}
                    />
                    <button type="submit" style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', padding: '10px', background: '#e02020', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Send size={18} />
                    </button>
                  </div>
                </form>
              </div>

            </div>
          </div>
        </div>

        {/* RIGHT SECTION - Sidebar */}
        <div style={{ height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '20px', scrollbarWidth: 'thin', scrollbarColor: '#e02020 #1a1a1a' }} className="custom-scrollbar">
          
          {/* User Card */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '16px', padding: '24px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <div style={{ width: '48px', height: '48px', background: 'rgba(224, 32, 32, 0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(224, 32, 32, 0.4)' }}>
                <User size={24} style={{ color: '#e02020' }} />
              </div>
              <div>
                <p style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>{user?.displayName || 'User'}</p>
                <p style={{ fontSize: '13px', color: '#888' }}>Legal Consultation</p>
              </div>
            </div>
            
            <div style={{ padding: '12px', background: 'rgba(224, 32, 32, 0.15)', color: '#e02020', border: '2px solid rgba(224, 32, 32, 0.3)', borderRadius: '12px', textAlign: 'center', fontWeight: '800', fontSize: '14px', letterSpacing: '1px', marginBottom: '16px' }}>
              CASE STRENGTH: MEDIUM
            </div>

            {/* Mode Toggle and Panic Exit */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button onClick={() => setSilentMode(!silentMode)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: 'rgba(255, 255, 255, 0.05)', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', width: '100%' }}>
                {silentMode ? <EyeOff size={18} /> : <Eye size={18} />}
                {silentMode ? 'Silent Mode' : 'Normal Mode'}
              </button>

              <button onClick={handlePanicExit} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: 'rgba(224, 32, 32, 0.1)', color: '#e02020', border: '1px solid rgba(224, 32, 32, 0.3)', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', width: '100%' }}>
                <AlertTriangle size={18} />
                Panic Exit
              </button>
            </div>
          </div>

          {/* Suggested Actions */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '16px', padding: '24px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <h3 style={{ fontSize: '12px', fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '16px' }}>
              Suggested Actions
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: 'rgba(255, 255, 255, 0.05)', border: 'none', borderRadius: '12px', cursor: 'pointer', textAlign: 'left' }}>
                <FileText size={18} style={{ color: '#e02020' }} />
                <span style={{ fontSize: '15px', fontWeight: '600', color: '#fff' }}>File Complaint</span>
              </button>
              <button style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: 'rgba(255, 255, 255, 0.05)', border: 'none', borderRadius: '12px', cursor: 'pointer', textAlign: 'left' }}>
                <MessageSquare size={18} style={{ color: '#e02020' }} />
                <span style={{ fontSize: '15px', fontWeight: '600', color: '#fff' }}>Talk to Advisor</span>
              </button>
              <button style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: 'rgba(255, 255, 255, 0.05)', border: 'none', borderRadius: '12px', cursor: 'pointer', textAlign: 'left' }}>
                <Save size={18} style={{ color: '#e02020' }} />
                <span style={{ fontSize: '15px', fontWeight: '600', color: '#fff' }}>Save Evidence</span>
              </button>
            </div>
          </div>

          {/* Relevant Laws */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '16px', padding: '24px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <h3 style={{ fontSize: '12px', fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '16px' }}>
              Relevant Laws
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { code: 'IPC 498A', desc: 'Cruelty by husband or relatives' },
                { code: 'IPC 354A', desc: 'Sexual harassment' },
                { code: 'DV Act 2005', desc: 'Domestic Violence Protection' }
              ].map((law, idx) => (
                <div key={idx} style={{ padding: '14px', background: 'rgba(224, 32, 32, 0.1)', borderRadius: '12px', border: '1px solid rgba(224, 32, 32, 0.2)' }}>
                  <p style={{ fontSize: '15px', fontWeight: '700', color: '#e02020' }}>{law.code}</p>
                  <p style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>{law.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Custom Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1a1a1a;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e02020;
          border-radius: 4px;
          transition: background 0.3s ease;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #ff3030;
        }
      `}</style>
    </div>
  );
};

export default ModernLegalAssistant;
