import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../store';
import { Button } from '../../components/Button';
import { Loader2 } from 'lucide-react';

export default function TokenLogin() {
  const [tokenInput, setTokenInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setToken = useStore((state) => state.setToken);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error: dbError } = await supabase
      .from('tokens')
      .select('*')
      .eq('token_text', tokenInput)
      .single();

    if (dbError || !data) {
      setError('Token tidak valid. Silakan periksa dan coba lagi.');
      setLoading(false);
      return;
    }

    if (!data.is_active || data.current_usage >= data.max_usage) {
      setError('Token ini telah kedaluwarsa atau mencapai batas penggunaan.');
      setLoading(false);
      return;
    }

    setToken(data);
    navigate('/details');
  };

  return (
    <div className="min-h-screen bg-bg-light flex flex-col items-center justify-center p-4">
      <div className="card w-full max-w-sm flex flex-col items-center animate-slide-up shadow-xl shadow-primary/5">
        <div className="mb-4">
          <img src="/logo.svg" alt="SELF FINDER Logo" className="h-16 w-auto object-contain" />
        </div>
        <p className="text-sm text-text-dark mb-8 text-center">Buka potensi penuh Anda di sini. Masukkan token Anda untuk melanjutkan.</p>
        
        <form onSubmit={handleLogin} className="w-full space-y-4">
          <div>
            <input 
              type="text" 
              value={tokenInput} 
              onChange={e => setTokenInput(e.target.value.toUpperCase())}
              placeholder="MASUKKAN KUNCI TOKEN"
              className="input-field text-center tracking-widest uppercase py-3 font-semibold text-lg"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm font-medium text-center">{error}</p>}
          <Button type="submit" className="w-full h-12 flex justify-center items-center" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : 'Mulai Tes'}
          </Button>
        </form>
      </div>
    </div>
  );
}
