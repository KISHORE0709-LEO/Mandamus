import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useMandamus } from '../context/MandamusContext';
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
  const { updateState } = useMandamus();
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
      
      // Intelligent sorting: Undertrial first, then criminal, then by date
      fetchedCases.sort((a, b) => {
        if (a.undertrial && !b.undertrial) return -1;
        if (!a.undertrial && b.undertrial) return 1;
        if (a.type === 'criminal' && b.type !== 'criminal') return -1;
        if (a.type !== 'criminal' && b.type === 'criminal') return 1;
        return b.createdAt?.toMillis() - a.createdAt?.toMillis();
      });
      
      setCases(fetchedCases);
    } catch (error) {
      console.error("Error fetching cases:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToCaseDetail = (c) => {
    updateState({ active_case: c });
    if (setActiveFeature) {
      setActiveFeature('case-detail');
    } else {
      navigate(`/dashboard?feature=case-detail&caseId=${c.id}`);
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
          <div className="jd-docket-list">
            {filteredCases.map(c => (
              <div key={c.id} className={`jd-case-row ${c.undertrial ? 'jd-case-urgent' : ''}`}>
                <div className="jd-row-main">
                  <div className="jd-row-header">
                    <span className="jd-case-id-badge">{c.id || 'CASE'}</span>
                    <h3 className="jd-case-title">{c.title}</h3>
                  </div>
                  <div className="jd-case-badges">
                    <span className={`badge ${c.type}`}>{c.type}</span>
                    {c.undertrial && <span className="badge undertrial">HIGH PRIORITY (UNDERTRIAL)</span>}
                    <span className="badge pipeline-stage">STAGE: {c.pipeline_stage ? c.pipeline_stage.toUpperCase() : 'PENDING'}</span>
                  </div>
                </div>

                <div className="jd-row-details">
                  <div className="jd-cell">
                    <span className="jd-cell-lbl">VS</span>
                    <span className="jd-cell-val">{c.petitioner} <br/> {c.respondent}</span>
                  </div>
                  <div className="jd-cell">
                    <span className="jd-cell-lbl">Dates</span>
                    <span className="jd-cell-val">Filed: {c.filedDate || 'N/A'}<br/>Hearing: {c.hearingDate || 'TBD'}</span>
                  </div>
                </div>

                <div className="jd-row-action">
                  <button 
                    className="jd-btn jd-btn-primary"
                    onClick={() => navigateToCaseDetail(c)}
                  >
                    OPEN CASE <Search size={16} />
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
