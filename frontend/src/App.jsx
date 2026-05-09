import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import ProblemStatement from './components/ProblemStatement';
import Features from './components/Features';
import HowItWorks from './components/HowItWorks';
import Footer from './components/Footer';
import AuthPage from './components/AuthPage';
import Summarizer from './components/Summarizer';
import PrecedentFinder from './components/PrecedentFinder';
import DraftGenerator from './components/DraftGenerator';
import Scheduler from './components/Scheduler';
import ProfilePage from './components/ProfilePage';
import MandamusGuide from './components/MandamusGuide';
import FeaturesNavbar from './components/FeaturesNavbar';
import HowItWorksPage from './pages/HowItWorksPage';
import AboutPage from './pages/AboutPage';
import VirtualHearing from './components/virtual_hearing/VirtualHearing';
import PublicDashboard from './components/PublicDashboard';
import LegalAdvisor from './components/LegalAdvisor';
import ModernLegalAssistant from './components/ModernLegalAssistant';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MandamusProvider } from './context/MandamusContext';
import { HistoryProvider } from './context/HistoryContext';
import SilentJustice from './components/SilentJustice';
import JudgeDashboard from './components/JudgeDashboard';
import AdminDashboard from './pages/AdminDashboard';
import CaseDetailPage from './components/CaseDetailPage';


const GlobalBackground = () => {
  const location = useLocation();
  const isFeatureRoute = ['/dashboard', '/public-dashboard', '/advisor', '/modern-advisor', '/vault'].some(path => location.pathname.startsWith(path));
  
  if (isFeatureRoute) return null;
  
  return (
    <div className="dynamic-bg" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0 }}>
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>
      <div className="orb orb-3"></div>
      <div className="grid-overlay"></div>
    </div>
  );
};

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return null; 
  if (!user) return <Navigate to="/login" />;
  
  return children;
};

const AdminRoute = ({ children }) => {
  const { user, loading, role } = useAuth();
  
  if (loading) return null;
  if (!user || role !== 'admin') return <Navigate to="/" />;
  
  return children;
};

// Direct hearing join route wrapper
const HearingJoinPage = () => {
  const { roomId } = useParams();
  return <VirtualHearing initialRoomId={roomId} />;
};

const LandingPage = () => (
  <>
    <Navbar />
    <HeroSection />
    <ProblemStatement />
    <Features />
    <HowItWorks />
    <Footer />
  </>
);

const Dashboard = ({ activeFeature, setActiveFeature }) => {
  const renderContent = () => {
    switch (activeFeature) {
      case 'judge-dashboard':
        return <JudgeDashboard setActiveFeature={setActiveFeature} />;
      case 'summariser':
        return <Summarizer onTabChange={setActiveFeature} />;
      case 'precedent':
        return <PrecedentFinder onTabChange={setActiveFeature} />;
      case 'draft':
        return <DraftGenerator onTabChange={setActiveFeature} />;
      case 'scheduler':
        return <Scheduler onTabChange={setActiveFeature} />;
      case 'profile':
        return <ProfilePage />;
      case 'virtual':
        return <VirtualHearing />;
      case 'case-detail':
        return <CaseDetailPage onTabChange={setActiveFeature} />;
      default:
        return (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <h1 style={{ color: 'var(--primary-red)', fontSize: '3rem', fontWeight: '800' }}>Welcome to the Digital Courtroom</h1>
            <p style={{ color: 'var(--text-grey)', fontSize: '1.2rem', marginTop: '1rem' }}>Module "{activeFeature}" is under development.</p>
          </div>
        );
    }
  };

  return (
    <div className="dashboard-container" style={{ paddingTop: '100px', minHeight: '100vh', background: '#000' }}>
      <FeaturesNavbar onSelectFeature={setActiveFeature} activeFeature={activeFeature} />
      {renderContent()}
    </div>
  );
};

function App() {
  const defaultRole = localStorage.getItem('userRole');
  const [activeFeature, setActiveFeature] = React.useState(defaultRole === 'judge' ? 'judge-dashboard' : 'summariser');

  React.useEffect(() => {
    const handleStorageChange = () => {
      const role = localStorage.getItem('userRole');
      if (role === 'judge') {
        setActiveFeature('judge-dashboard');
      } else {
        setActiveFeature('summariser');
      }
    };
    window.addEventListener('storage', handleStorageChange);
    // Also listen to a custom event for role change within the same tab
    window.addEventListener('roleChanged', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('roleChanged', handleStorageChange);
    };
  }, []);

  return (
    <AuthProvider>
      <HistoryProvider>
        <MandamusProvider>
        <Router>
          <div className="app-container">
            <GlobalBackground />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/how-it-works" element={<HowItWorksPage />} />
                <Route path="/login" element={<AuthPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Dashboard activeFeature={activeFeature} setActiveFeature={setActiveFeature} />
                  </ProtectedRoute>
                } />
                <Route path="/admin-dashboard" element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                } />
                <Route path="/hearing/:roomId" element={
                  <ProtectedRoute>
                    <HearingJoinPage />
                  </ProtectedRoute>
                } />
                <Route path="/public-dashboard" element={
                  <ProtectedRoute>
                    <PublicDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/advisor" element={
                  <ProtectedRoute>
                    <LegalAdvisor />
                  </ProtectedRoute>
                } />
                <Route path="/modern-advisor" element={
                  <ProtectedRoute>
                    <ModernLegalAssistant />
                  </ProtectedRoute>
                } />
                <Route path="/vault" element={
                  <ProtectedRoute>
                    <SilentJustice />
                  </ProtectedRoute>
                } />
                <Route path="*" element={<Navigate to="/" />} />

              </Routes>
            </div>
            
            <MandamusGuide activeFeature={activeFeature} />
          </div>
        </Router>
      </MandamusProvider>
      </HistoryProvider>
    </AuthProvider>
  );
}

export default App;
