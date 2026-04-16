import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { Button } from '../../components/Button';

export default function UserDetails() {
  const navigate = useNavigate();
  const { token, setUserDetails } = useStore();
  const [details, setDetails] = useState({ name: '', birthdate: '', occupation: '' });

  if (!token) {
    navigate('/');
    return null;
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    setUserDetails(details);
    navigate('/assessment');
  };

  return (
    <div className="min-h-screen bg-bg-light flex flex-col items-center justify-center p-4">
      <div className="card w-full max-w-md animate-slide-up">
        <div className="flex justify-center mb-4">
          <img src="/logo.svg" alt="SELF FINDER Logo" className="h-12 w-auto object-contain" />
        </div>
        <h2 className="text-2xl font-bold text-primary mb-2 text-center">Detail Anda</h2>
        <p className="text-sm text-text-dark text-center mb-6">Silakan isi data diri Anda untuk memulai tes.</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nama Lengkap</label>
            <input required type="text" value={details.name} onChange={e => setDetails({...details, name: e.target.value})} className="input-field" placeholder="Cth: Budi Santoso" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tanggal Lahir</label>
            <input required type="date" value={details.birthdate} onChange={e => setDetails({...details, birthdate: e.target.value})} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Pekerjaan</label>
            <input required type="text" value={details.occupation} onChange={e => setDetails({...details, occupation: e.target.value})} className="input-field" placeholder="Cth: Mahasiswa, Karyawan, dll." />
          </div>
          <Button type="submit" className="w-full mt-4">Lanjutkan ke Tes</Button>
        </form>
      </div>
    </div>
  );
}
