import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldCheck, 
  FileText, 
  Calendar,
  AlertTriangle,
  Gavel,
  Briefcase,
  Users,
  Search,
  BookOpen
} from 'lucide-react';
import './JudgeDashboard.css';

export default function JudgeDashboard({ setActiveFeature }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    if (user?.email) {
      fetchJudgeCases();
    }
  }, [user]);

  const fetchJudgeCases = async () => {
    setIsLoading(true);
    try {
      // Query cases where assigned_judge_email matches the logged in user
      const casesQuery = query(
        collection(db, 'cases'),
        where('assigned_judge_email', '==', user.email)
      );
      
      const snapshot = await getDocs(casesQuery);
      const fetchedCases = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort in memory by createdAt descending (Firestore index requirement avoidance for now)
      fetchedCases.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
      
      setCases(fetchedCases);
    } catch (error) {
      console.error("Error fetching cases:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToWorkspace = (feature, caseId) => {
    if (setActiveFeature) {
      setActiveFeature(feature);
    } else {
      navigate(`/dashboard?feature=${feature}&caseId=${caseId}`);
    }
  };

  const filteredCases = filterType === 'all' 
    ? cases 
    : cases.filter(c => c.type === filterType);

  const urgentCount = cases.filter(c => c.undertrial).length;
  const civilCount = cases.filter(c => c.type === 'civil').length;
  const criminalCount = cases.filter(c => c.type === 'criminal').length;

  return (
    <div className="jd-page">
      {/* HEADER */}
      <div className="jd-header">
        <div className="jd-title-group">
          <h1>Judicial Chambers</h1>
          <span className="jd-sub">Presiding Officer: {user?.displayName || user?.email}</span>
        </div>
        <div className="jd-user-badge">
          <ShieldCheck size={18} />
          SECURE SESSION ENCLAVE
        </div>
      </div>

      {/* METRICS */}
      <div className="jd-metrics">
        <div className="jd-metric-card">
          <Briefcase size={24} className="jd-metric-icon" />
          <span className="jd-metric-val">{cases.length < 10 ? `0${cases.length}` : cases.length}</span>
          <span className="jd-metric-lbl">Total Active Cases</span>
        </div>
        <div className="jd-metric-card">
          <AlertTriangle size={24} className="jd-metric-icon" />
          <span className="jd-metric-val">{urgentCount < 10 ? `0${urgentCount}` : urgentCount}</span>
          <span className="jd-metric-lbl">Undertrial / Urgent</span>
        </div>
        <div className="jd-metric-card">
          <Users size={24} className="jd-metric-icon" />
          <span className="jd-metric-val">{civilCount < 10 ? `0${civilCount}` : civilCount}</span>
          <span className="jd-metric-lbl">Civil Disputes</span>
        </div>
        <div className="jd-metric-card">
          <Gavel size={24} className="jd-metric-icon" />
          <span className="jd-metric-val">{criminalCount < 10 ? `0${criminalCount}` : criminalCount}</span>
          <span className="jd-metric-lbl">Criminal Matters</span>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="jd-main-content">
        <div className="jd-section-header">
          <h2 className="jd-section-title">
            <BookOpen size={24} color="#e02020" />
            Active Docket
          </h2>
          <div className="jd-filters">
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="all">All Cases</option>
              <option value="civil">Civil Only</option>
              <option value="criminal">Criminal Only</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="jd-loading">
            <div className="spinner"></div>
            <p>Loading assigned cases...</p>
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="jd-empty">
            <FileText size={48} opacity={0.5} />
            <p>No cases are currently assigned to your docket.</p>
          </div>
        ) : (
          <div className="jd-docket-grid">
            {filteredCases.map(c => (
              <div key={c.id} className="jd-case-card">
                <div className="jd-case-header">
                  <div>
                    <h3 className="jd-case-title">{c.title}</h3>
                    <div className="jd-case-badges">
                      <span className={`badge ${c.type}`}>{c.type}</span>
                      {c.undertrial && <span className="badge undertrial">UNDERTRIAL</span>}
                    </div>
                  </div>
                </div>
                
                <div className="jd-case-details">
                  <div className="detail-item">
                    <span className="detail-label">Petitioner</span>
                    <span className="detail-value">{c.petitioner}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Respondent</span>
                    <span className="detail-value">{c.respondent}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Filed Date</span>
                    <span className="detail-value">
                      <Calendar size={14} /> {c.filedDate || 'N/A'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Next Hearing</span>
                    <span className="detail-value">
                      <Calendar size={14} /> {c.hearingDate || 'Unscheduled'}
                    </span>
                  </div>
                </div>

                <div className="jd-case-actions">
                  <button 
                    className="jd-btn jd-btn-primary"
                    onClick={() => navigateToWorkspace('summariser', c.id)}
                  >
                    <Search size={16} /> Analyze Case
                  </button>
                  <button 
                    className="jd-btn jd-btn-secondary"
                    onClick={() => navigateToWorkspace('draft', c.id)}
                  >
                    <FileText size={16} /> Draft Orders
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
