import React from 'react';
import { useStore } from '../../store';
import { Navigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { CheckCircle } from 'lucide-react';

export default function Results() {
  const { assessmentData, userDetails, clearSession } = useStore();

  if (!assessmentData) {
    return <Navigate to="/" />;
  }

  const handlePrint = () => {
    window.print();
  };

  const handleFinish = () => {
    clearSession();
  };

  return (
    <div className="min-h-screen bg-bg-light p-4 md:p-8 flex items-center justify-center print:bg-white print:p-0">
      <div className="card max-w-2xl w-full animate-slide-up print:shadow-none print:border-none">
        
        <div className="text-center border-b border-gray-100 pb-6 mb-6">
          <div className="flex justify-center mb-4 text-secondary">
            <CheckCircle size={48} />
          </div>
          <div className="flex justify-center mb-4">
            <img src="/logo.svg" alt="SELF FINDER Logo" className="h-16 w-auto object-contain print:h-20" />
          </div>
          <p className="text-sm text-gray-500 uppercase tracking-widest mb-4">Laporan Resmi Hasil Tes</p>
          <h2 className="text-xl font-bold text-text-black">{assessmentData.final_marking}</h2>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8 bg-[#F5F7FA] p-4 rounded-xl print:bg-white print:border">
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold">Peserta</p>
            <p className="font-bold text-text-dark">{assessmentData.user_name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold">Tanggal Lahir</p>
            <p className="font-bold text-text-dark">{new Date(assessmentData.user_birthdate).toLocaleDateString('id-ID')}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold">Diselesaikan Pada</p>
            <p className="font-bold text-text-dark">{new Date(assessmentData.completed_at || Date.now()).toLocaleDateString('id-ID')}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold">Tingkat / Jenis Tes</p>
            <p className="font-bold text-text-dark">{assessmentData.tier} - <span className="capitalize">{assessmentData.test_type.replace('_', ' ')}</span></p>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-bold text-primary mb-4 border-b border-gray-100 pb-2">Rincian Skor</h3>
          <div className="space-y-3">
            {Object.entries(assessmentData.scores || {}).map(([category, score]) => (
              <div key={category} className="flex justify-between items-center bg-white border border-gray-100 rounded-lg p-3">
                <span className="font-medium text-text-dark">{category}</span>
                <span className="font-bold text-accent text-lg">{score} poin</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-center flex-col sm:flex-row gap-4 print:hidden">
          <Button variant="secondary" onClick={handlePrint} className="w-full sm:w-auto">Cetak Laporan (PDF)</Button>
          <Button onClick={handleFinish} className="w-full sm:w-auto">Selesai & Keluar</Button>
        </div>
      </div>
    </div>
  );
}
