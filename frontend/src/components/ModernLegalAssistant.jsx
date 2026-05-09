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
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState(null);
  const [lastAnalysis, setLastAnalysis] = useState({ severity: 'Medium', domain: 'General Legal Assistance' });
  const [history, setHistory] = useState([]);
  const scrollRef = React.useRef(null);

  // Fetch history on mount
  React.useEffect(() => {
    const fetchHistory = async () => {
      if (!user?.uid) return;
      try {
        const response = await fetch(`http://127.0.0.1:8000/legal-assistant/history/${user.uid}`);
        const data = await response.json();
        if (data.history) setHistory(data.history);
      } catch (err) {
        console.error("Failed to fetch history:", err);
      }
    };
    fetchHistory();
  }, [user]);

  // Auto-scroll to bottom whenever messages change
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isLoading]);

  const handleLogout = async () => {
    await logout();
  };

  const handleQuery = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userQuery = input;
    setInput('');
    setIsLoading(true);

    // Add user message to chat history
    setMessages(prev => [...prev, { role: 'user', content: userQuery }]);

    try {
      const response = await fetch('http://127.0.0.1:8000/legal-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userQuery, user_id: user.uid, thread_id: threadId })
      });
      
      if (!response.ok) throw new Error('Failed to fetch legal advice');
      const data = await response.json();
      
      // Add assistant response to chat history
      setMessages(prev => [...prev, { role: 'assistant', data: data }]);
      setLastAnalysis({ 
        severity: data.severity || 'Medium', 
        domain: data.domain || 'General Legal Assistance' 
      });
      
      if (data.thread_id) {
        setThreadId(data.thread_id);
        // Refresh history after a successful query
        const histRes = await fetch(`http://127.0.0.1:8000/legal-assistant/history/${user.uid}`);
        const histData = await histRes.json();
        if (histData.history) setHistory(histData.history);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        data: {
          query: userQuery,
          explanation: "Sorry, the AI Legal Assistant is currently unavailable. Please try again later.",
          laws: [],
          rights: [],
          steps: []
        } 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedQuery = (query) => {
    setInput(query);
  };

  const handleLoadChat = async () => {
    if (!user?.uid) return;
    setIsLoading(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/legal-assistant/messages/${user.uid}`);
      const data = await response.json();
      if (data.messages && data.messages.length > 0) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error("Failed to load chat history:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePanicExit = () => {
    window.location.href = 'https://www.google.com';
  };

  const getSeverityColor = (sev) => {
    switch(sev) {
      case 'Critical': return '#ff0000';
      case 'High': return '#ff4d00';
      case 'Medium': return '#e02020';
      case 'Low': return '#00ff88';
      default: return '#e02020';
    }
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
              <div 
                ref={scrollRef}
                style={{ 
                  flex: 1, 
                  overflowY: 'auto', 
                  padding: '32px',
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#e02020 #1a1a1a'
                }} className="custom-scrollbar"
              >
                
                {messages.length === 0 && !isLoading ? (
                  // Empty State
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center' }}>
                    <div>
                      <p style={{ fontSize: '18px', color: '#888', lineHeight: '1.6' }}>
                        Describe your legal issue to get guidance
                      </p>
                    </div>
                  </div>
                ) : (
                  // Map through messages
                  <div>
                    {messages.map((msg, index) => (
                      <div key={index} style={{ marginBottom: '48px' }}>
                        {msg.role === 'user' ? (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                            <div style={{ maxWidth: '80%', padding: '16px 20px', background: '#1a1a1a', borderRadius: '16px 16px 0 16px', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
                              <p style={{ color: '#fff', fontSize: '15px', lineHeight: '1.6' }}>{msg.content}</p>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* Bot Intro */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#e02020', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(255,255,255,0.1)' }}>
                                  <MessageSquare size={20} color="#fff" />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#fff', letterSpacing: '1px' }}>MANDAMUS ADVISOR</span>
                                  <span style={{ fontSize: '11px', color: '#888', fontWeight: '600', textTransform: 'uppercase' }}>{msg.data.domain}</span>
                                </div>
                              </div>
                              <div style={{ padding: '4px 12px', background: 'rgba(0,0,0,0.5)', borderRadius: '20px', border: `1px solid ${getSeverityColor(msg.data.severity)}`, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: getSeverityColor(msg.data.severity), boxShadow: `0 0 10px ${getSeverityColor(msg.data.severity)}` }} />
                                <span style={{ fontSize: '11px', fontWeight: '800', color: getSeverityColor(msg.data.severity) }}>{msg.data.severity.toUpperCase()}</span>
                              </div>
                            </div>

                            {/* Response Card Inner */}
                            <div style={{ padding: '24px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                              {/* Explanation */}
                              <p style={{ color: '#ccc', lineHeight: '1.8', fontSize: '15px', marginBottom: '32px' }}>
                                {msg.data.explanation}
                              </p>

                              {/* Grid for Laws and Rights */}
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                                <div>
                                  <h4 style={{ fontSize: '12px', fontWeight: '800', color: '#e02020', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Applicable Laws</h4>
                                  <ul style={{ listStyle: 'none', padding: 0 }}>
                                    {msg.data.laws.map((law, idx) => (
                                      <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px', padding: '10px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                        <CheckCircle size={14} style={{ color: '#e02020', marginTop: '2px' }} />
                                        <span style={{ color: '#bbb', fontSize: '13px' }}>{law}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                <div>
                                  <h4 style={{ fontSize: '12px', fontWeight: '800', color: '#e02020', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Your Rights</h4>
                                  <ul style={{ listStyle: 'none', padding: 0 }}>
                                    {msg.data.rights.map((right, idx) => (
                                      <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px', padding: '10px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                        <CheckCircle size={14} style={{ color: '#e02020', marginTop: '2px' }} />
                                        <span style={{ color: '#bbb', fontSize: '13px' }}>{right}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>

                              {/* Step-by-Step */}
                              <div>
                                <h4 style={{ fontSize: '12px', fontWeight: '800', color: '#e02020', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>Step-by-Step Procedure</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                  {msg.data.steps.map((step, idx) => (
                                    <div key={idx} style={{ display: 'flex', gap: '16px', padding: '16px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                      <span style={{ width: '28px', height: '28px', background: '#e02020', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '800', flexShrink: 0 }}>
                                        {idx + 1}
                                      </span>
                                      <div>
                                        <strong style={{ color: '#fff', fontSize: '14px', display: 'block', marginBottom: '4px' }}>{step.title}</strong>
                                        <span style={{ color: '#999', fontSize: '13px', lineHeight: '1.5' }}>{step.content}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Suggested Questions */}
                              {msg.data.suggested_questions && msg.data.suggested_questions.length > 0 && (
                                <div style={{ marginTop: '24px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                  {msg.data.suggested_questions.map((q, qidx) => (
                                    <button 
                                      key={qidx}
                                      onClick={() => handleSuggestedQuery(q)}
                                      style={{ padding: '8px 16px', background: 'rgba(224, 32, 32, 0.1)', color: '#fff', border: '1px solid rgba(224, 32, 32, 0.3)', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s ease' }}
                                      onMouseEnter={(e) => { e.target.style.background = 'rgba(224, 32, 32, 0.2)'; e.target.style.borderColor = '#e02020'; }}
                                      onMouseLeave={(e) => { e.target.style.background = 'rgba(224, 32, 32, 0.1)'; e.target.style.borderColor = 'rgba(224, 32, 32, 0.3)'; }}
                                    >
                                      {q}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {isLoading && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px', background: 'rgba(224, 32, 32, 0.05)', borderRadius: '20px', border: '1px dashed #e02020' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div className="btn-spinner" style={{ width: '24px', height: '24px', border: '2px solid rgba(224, 32, 32, 0.3)', borderTopColor: '#e02020', borderRadius: '50%', animation: 'authSpin 1s linear infinite' }}></div>
                          <p style={{ fontSize: '14px', color: '#e02020', letterSpacing: '1.5px', fontWeight: '800' }}>ANALYZING LEGAL FRAMEWORK...</p>
                        </div>
                      </div>
                    )}
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
          
          {/* Consultation History - MOVED TO TOP */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '16px', padding: '24px', border: '1px solid rgba(255, 255, 255, 0.1)', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '13px', fontWeight: '800', color: '#e02020', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Save size={16} /> RECENT CONSULTATIONS
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
              {history.length > 0 ? history.map((item, idx) => (
                <div key={idx} 
                  onClick={handleLoadChat}
                  style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(224, 32, 32, 0.05)'; e.currentTarget.style.borderColor = 'rgba(224, 32, 32, 0.3)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <span style={{ fontSize: '10px', fontWeight: '800', color: '#e02020', background: 'rgba(224, 32, 32, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                      {item.domain.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '10px', color: '#555', fontWeight: '700' }}>{item.date}</span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#fff', fontWeight: '600', lineHeight: '1.4', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical' }}>
                    {item.query}
                  </p>
                </div>
              )) : (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.3, textAlign: 'center', padding: '20px' }}>
                  <MessageSquare size={32} style={{ marginBottom: '12px' }} />
                  <p style={{ fontSize: '12px', fontWeight: '600' }}>No previous consultations found.</p>
                </div>
              )}
            </div>
          </div>

          {/* Severity & Domain Indicators (Smaller, at bottom of sidebar) */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <div style={{ padding: '10px', background: 'rgba(224, 32, 32, 0.1)', color: getSeverityColor(lastAnalysis.severity), border: `1px solid ${getSeverityColor(lastAnalysis.severity)}`, borderRadius: '8px', textAlign: 'center', fontWeight: '800', fontSize: '11px', letterSpacing: '1px', marginBottom: '12px' }}>
              SEVERITY: {lastAnalysis.severity.toUpperCase()}
            </div>
            <div style={{ fontSize: '10px', color: '#888', textAlign: 'center', fontWeight: '600' }}>
              DOMAIN: <span style={{ color: '#fff' }}>{lastAnalysis.domain.toUpperCase()}</span>
            </div>
          </div>

          {/* Mode Toggle and Panic Exit */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
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

          {/* Consultation History */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '16px', padding: '24px', border: '1px solid rgba(255, 255, 255, 0.1)', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '13px', fontWeight: '800', color: '#e02020', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Save size={16} /> RECENT CONSULTATIONS
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
              {history.length > 0 ? history.map((item, idx) => (
                <div key={idx} style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(224, 32, 32, 0.05)'; e.currentTarget.style.borderColor = 'rgba(224, 32, 32, 0.3)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <span style={{ fontSize: '10px', fontWeight: '800', color: '#e02020', background: 'rgba(224, 32, 32, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                      {item.domain.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '10px', color: '#555', fontWeight: '700' }}>{item.date}</span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#fff', fontWeight: '600', lineHeight: '1.4', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical' }}>
                    {item.query}
                  </p>
                </div>
              )) : (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.3, textAlign: 'center', padding: '20px' }}>
                  <MessageSquare size={32} style={{ marginBottom: '12px' }} />
                  <p style={{ fontSize: '12px', fontWeight: '600' }}>No previous consultations found.</p>
                </div>
              )}
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
