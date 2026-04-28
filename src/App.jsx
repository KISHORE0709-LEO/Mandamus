import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import FeaturesNavbar from './components/FeaturesNavbar';
import HowItWorksPage from './pages/HowItWorksPage';
import AboutPage from './pages/AboutPage';
import VirtualHearing from './components/virtual_hearing/VirtualHearing';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MandamusProvider } from './context/MandamusContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return null; 
  if (!user) return <Navigate to="/login" />;
  
  return children;
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

const Dashboard = () => {
  const [activeFeature, setActiveFeature] = React.useState('summariser');

  const renderContent = () => {
    switch (activeFeature) {
      case 'summariser':
        return <Summarizer onTabChange={setActiveFeature} />;
      case 'precedent':
        return <PrecedentFinder onTabChange={setActiveFeature} />;
      case 'draft':
        return <DraftGenerator />;
      case 'scheduler':
        return <Scheduler />;
      case 'profile':
        return <ProfilePage />;
      case 'virtual':
        return <VirtualHearing />;
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
      {/* hide landing orbs on dashboard */}
      <style>{`.dynamic-bg { display: none !important; }`}</style>
      <FeaturesNavbar onSelectFeature={setActiveFeature} activeFeature={activeFeature} />
      {renderContent()}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <MandamusProvider>
        <Router>
          <div className="app-container">
            {/* Global Fixed Background */}
            <div className="dynamic-bg" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0 }}>
              <div className="orb orb-1"></div>
              <div className="orb orb-2"></div>
              <div className="orb orb-3"></div>
              <div className="grid-overlay"></div>
            </div>

            <div style={{ position: 'relative', zIndex: 1 }}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/how-it-works" element={<HowItWorksPage />} />
                <Route path="/login" element={<AuthPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </div>
          </div>
        </Router>
      </MandamusProvider>
    </AuthProvider>
  );
}

export default App;
