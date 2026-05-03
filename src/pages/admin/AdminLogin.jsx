import React, { useState } from 'react';
import { useStore } from '../../store';
import { Button } from '../../components/Button';
import { Loader2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import Footer from '../../components/Footer';

export default function AdminLogin() {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { isAdminAuthenticated, adminLogin } = useStore();

  if (isAdminAuthenticated) {
    return <Navigate to="/admin/dashboard" />;
  }

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Simulate short delay for professional feel
    setTimeout(() => {
      const success = adminLogin(id, password);
      if (!success) {
        setError('ID atau Kata Sandi salah.');
      }
      setLoading(false);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-bg-light flex flex-col items-center justify-center p-4">
      <div className="card w-full max-w-sm flex flex-col items-center animate-slide-up shadow-xl shadow-primary/5">
        <div className="mb-6 flex justify-center">
          <img src="/logo-square.svg" alt="SELF FINDER Logo" className="h-64 w-auto object-contain" />
        </div>
        <h1 className="text-2xl font-bold text-primary tracking-tight mb-2">Portal Admin</h1>
        <p className="text-sm text-text-dark mb-8 text-center">Silakan masuk untuk mengelola sistem.</p>
        
        <form onSubmit={handleLogin} className="w-full space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">ID Admin</label>
            <input 
              type="text" 
              value={id} 
              onChange={e => setId(e.target.value)}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Kata Sandi</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              className="input-field"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm font-medium text-center">{error}</p>}
          <Button type="submit" className="w-full h-12 flex justify-center items-center" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : 'Masuk'}
          </Button>
        </form>
        <Footer className="mt-8 pt-6 border-t border-gray-100" />
      </div>
    </div>
  );
}
