import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, updateDoc, doc, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { LogOut, Gavel, FileText, CheckCircle, ShieldAlert } from 'lucide-react';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('management'); // 'registration' | 'management'
  
  // Registration Form State
  const [formData, setFormData] = useState({
    title: '',
    type: 'civil',
    petitioner: '',
    respondent: '',
    filedDate: '',
    hearingDate: '',
    undertrial: false,
    file: null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState('');

  // Management State
  const [cases, setCases] = useState([]);
  const [judges, setJudges] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [assigningCaseId, setAssigningCaseId] = useState(null);
  const [selectedJudge, setSelectedJudge] = useState('');

  useEffect(() => {
    if (activeTab === 'management') {
      fetchCasesAndJudges();
    }
  }, [activeTab]);

  const fetchCasesAndJudges = async () => {
    setIsLoading(true);
    try {
      // Fetch all cases
      const casesQuery = query(collection(db, 'cases'), orderBy('createdAt', 'desc'));
      const casesSnapshot = await getDocs(casesQuery);
      const casesList = casesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCases(casesList);

      // Fetch all judges
      const judgesQuery = query(collection(db, 'users'), where('role', '==', 'judge'));
      const judgesSnapshot = await getDocs(judgesQuery);
      const judgesList = judgesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setJudges(judgesList);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (type === 'checkbox') {
      setFormData({ ...formData, [name]: checked });
    } else if (type === 'file') {
      setFormData({ ...formData, [name]: files[0] });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleRegistrationSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormMessage('');

    try {
      let fileUrl = '';
      if (formData.file) {
        // Upload file to Firebase Storage
        const fileRef = ref(storage, `case_documents/${Date.now()}_${formData.file.name}`);
        const snapshot = await uploadBytes(fileRef, formData.file);
        fileUrl = await getDownloadURL(snapshot.ref);
      } else {
        // Fallback for simulation if no file selected
        fileUrl = 'https://example.com/mock-document.pdf';
      }

      const caseData = {
        title: formData.title,
        type: formData.type,
        petitioner: formData.petitioner,
        respondent: formData.respondent,
        filedDate: formData.filedDate,
        hearingDate: formData.hearingDate,
        undertrial: formData.undertrial,
        documentUrl: fileUrl,
        status: 'pending', // or 'active'
        assigned_judge_email: null,
        assigned_judge_name: null,
        createdAt: serverTimestamp(),
        createdBy: user.email
      };

      await addDoc(collection(db, 'cases'), caseData);
      setFormMessage('Case registered successfully!');
      setFormData({
        title: '', type: 'civil', petitioner: '', respondent: '',
        filedDate: '', hearingDate: '', undertrial: false, file: null
      });
      e.target.reset(); // clear file input
    } catch (error) {
      console.error("Error adding case:", error);
      setFormMessage('Error registering case. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignJudge = async (caseId) => {
    if (!selectedJudge) return;
    
    setAssigningCaseId(caseId);
    try {
      const judgeObj = judges.find(j => j.email === selectedJudge);
      if (!judgeObj) throw new Error("Judge not found");

      const caseRef = doc(db, 'cases', caseId);
      await updateDoc(caseRef, {
        assigned_judge_email: judgeObj.email,
        assigned_judge_name: judgeObj.displayName || judgeObj.email,
        status: 'assigned'
      });

      // Update local state
      setCases(cases.map(c => 
        c.id === caseId 
          ? { ...c, assigned_judge_email: judgeObj.email, assigned_judge_name: judgeObj.displayName || judgeObj.email, status: 'assigned' } 
          : c
      ));
      setSelectedJudge('');
    } catch (error) {
      console.error("Error assigning judge:", error);
    } finally {
      setAssigningCaseId(null);
    }
  };

  return (
    <div className="admin-dashboard-container">
      <div className="admin-header">
        <div className="admin-title-section">
          <h1>Mandamus Admin Portal</h1>
          <p className="admin-subtitle">
            <ShieldAlert size={16} /> Secure Operations Center
          </p>
        </div>
        <button className="logout-btn" onClick={logout}>
          <LogOut size={18} /> Disconnect
        </button>
      </div>

      <div className="admin-tabs">
        <button 
          className={`admin-tab ${activeTab === 'management' ? 'active' : ''}`}
          onClick={() => setActiveTab('management')}
        >
          <Gavel size={18} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'text-bottom' }} />
          Case Management
        </button>
        <button 
          className={`admin-tab ${activeTab === 'registration' ? 'active' : ''}`}
          onClick={() => setActiveTab('registration')}
        >
          <FileText size={18} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'text-bottom' }} />
          Register New Case
        </button>
      </div>

      <div className="admin-content">
        {activeTab === 'registration' && (
          <form className="registration-form" onSubmit={handleRegistrationSubmit}>
            <div className="form-group full-width">
              <label>Case Title</label>
              <input type="text" name="title" required value={formData.title} onChange={handleInputChange} placeholder="e.g. State vs. Doe" />
            </div>
            <div className="form-group">
              <label>Case Type</label>
              <select name="type" value={formData.type} onChange={handleInputChange}>
                <option value="civil">Civil</option>
                <option value="criminal">Criminal</option>
              </select>
            </div>
            <div className="form-group">
              <label>Undertrial Prisoner Status</label>
              <div className="checkbox-group">
                <input type="checkbox" name="undertrial" checked={formData.undertrial} onChange={handleInputChange} />
                <span>Yes, involves an undertrial prisoner</span>
              </div>
            </div>
            <div className="form-group">
              <label>Petitioner Name</label>
              <input type="text" name="petitioner" required value={formData.petitioner} onChange={handleInputChange} />
            </div>
            <div className="form-group">
              <label>Respondent Name</label>
              <input type="text" name="respondent" required value={formData.respondent} onChange={handleInputChange} />
            </div>
            <div className="form-group">
              <label>Filed Date</label>
              <input type="date" name="filedDate" required value={formData.filedDate} onChange={handleInputChange} />
            </div>
            <div className="form-group">
              <label>Hearing Date</label>
              <input type="date" name="hearingDate" required value={formData.hearingDate} onChange={handleInputChange} />
            </div>
            <div className="form-group full-width">
              <label>Initial Case Document (PDF)</label>
              <input type="file" name="file" accept=".pdf" onChange={handleInputChange} />
            </div>
            
            {formMessage && <div style={{ color: formMessage.includes('Error') ? '#ea4335' : '#34a853', gridColumn: '1 / -1' }}>{formMessage}</div>}
            
            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Registering...' : 'Register Case File'}
            </button>
          </form>
        )}

        {activeTab === 'management' && (
          isLoading ? <div className="spinner"></div> : (
            <div className="cases-grid">
              {cases.length === 0 ? (
                <p style={{ color: '#888' }}>No cases found.</p>
              ) : cases.map((c) => (
                <div key={c.id} className="case-card">
                  <div className="case-card-header">
                    <h3 className="case-title">{c.title}</h3>
                    <span className={`case-type-badge ${c.type}`}>{c.type}</span>
                  </div>
                  <div className="case-details">
                    <div className="case-detail-row">
                      <span className="case-detail-label">Filed:</span>
                      <span className="case-detail-value">{c.filedDate}</span>
                    </div>
                    <div className="case-detail-row">
                      <span className="case-detail-label">Status:</span>
                      <span className="case-detail-value" style={{ textTransform: 'capitalize' }}>{c.status || 'Pending'}</span>
                    </div>
                  </div>
                  
                  <div className="case-assignment">
                    {c.assigned_judge_email ? (
                      <div className="assigned-judge">
                        <CheckCircle size={16} color="#34a853" />
                        Assigned to: {c.assigned_judge_name || c.assigned_judge_email}
                      </div>
                    ) : (
                      <div>
                        <select 
                          className="assign-judge-select"
                          value={selectedJudge}
                          onChange={(e) => setSelectedJudge(e.target.value)}
                        >
                          <option value="">Select Judge to Assign...</option>
                          {judges.map(j => (
                            <option key={j.id} value={j.email}>{j.displayName || j.email}</option>
                          ))}
                        </select>
                        <div className="assign-btn-wrapper">
                          <button 
                            className="assign-btn" 
                            onClick={() => handleAssignJudge(c.id)}
                            disabled={assigningCaseId === c.id || !selectedJudge}
                          >
                            {assigningCaseId === c.id ? 'Assigning...' : 'Confirm Assignment'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
