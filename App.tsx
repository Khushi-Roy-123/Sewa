import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Appointments from './pages/Appointments';
import Medications from './pages/Medications';
import Records from './pages/Records';
import Profile from './pages/Profile';
import Auth from './pages/Auth';
import SymptomInput from './pages/SymptomInput';
import Recommendations from './pages/Recommendations';
import UploadRecord from './pages/UploadRecord';
import TranslatedRecord from './pages/TranslatedRecord';
import VitalsMonitor from './pages/VitalsMonitor';
import MentalHealth from './pages/MentalHealth';
import DrugPrices from './pages/DrugPrices';
import { TranslationsProvider } from './lib/i18n';

const App: React.FC = () => {
  const [route, setRoute] = useState(window.location.hash);
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('authToken'));
  const [symptomsForRec, setSymptomsForRec] = useState('');
  const [extractedRecordText, setExtractedRecordText] = useState('');

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(window.location.hash);
    };

    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const handleLogin = () => {
    localStorage.setItem('authToken', 'mock-firebase-token');
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setIsAuthenticated(false);
    window.location.hash = '#/';
  };
  
  const handleSymptomSubmit = (symptoms: string) => {
    setSymptomsForRec(symptoms);
    window.location.hash = '#/recommendations';
  };

  const handleTextExtracted = (text: string) => {
    setExtractedRecordText(text);
    window.location.hash = '#/translated-record';
  };

  const renderPage = () => {
    switch (route) {
      case '#/appointments':
        return <Appointments />;
      case '#/medications':
        return <Medications />;
      case '#/records':
        return <Records />;
      case '#/upload-record':
        return <UploadRecord onTextExtracted={handleTextExtracted} />;
      case '#/translated-record':
        return <TranslatedRecord extractedText={extractedRecordText} />;
      case '#/profile':
        return <Profile />;
      case '#/symptoms':
        return <SymptomInput onSubmit={handleSymptomSubmit} />;
      case '#/recommendations':
        return <Recommendations symptoms={symptomsForRec} />;
      case '#/vitals':
        return <VitalsMonitor />;
      case '#/mental-health':
        return <MentalHealth />;
      case '#/drug-prices':
        return <DrugPrices />;
      case '#/':
      default:
        return <Dashboard />;
    }
  };

  return (
    <TranslationsProvider>
      {isAuthenticated ? (
        <Layout onLogout={handleLogout}>
          {renderPage()}
        </Layout>
      ) : (
        <Auth onLoginSuccess={handleLogin} />
      )}
    </TranslationsProvider>
  );
};

export default App;