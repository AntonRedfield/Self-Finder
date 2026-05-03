import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './components/AdminLayout';
import AdminLogin from './pages/admin/AdminLogin';
import Dashboard from './pages/admin/Dashboard';
import QuestionManager from './pages/admin/QuestionManager';
import TokenManager from './pages/admin/TokenManager';
import UserResults from './pages/admin/UserResults';
import CaptionManager from './pages/admin/CaptionManager';
import Settings from './pages/admin/Settings';
import TokenLogin from './pages/user/TokenLogin';
import UserDetails from './pages/user/UserDetails';
import Assessment from './pages/user/Assessment';
import Results from './pages/user/Results';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<TokenLogin />} />
        <Route path="/details" element={<UserDetails />} />
        <Route path="/assessment" element={<Assessment />} />
        <Route path="/results" element={<Results />} />
        
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="questions" element={<QuestionManager />} />
          <Route path="tokens" element={<TokenManager />} />
          <Route path="results" element={<UserResults />} />
          <Route path="captions" element={<CaptionManager />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
