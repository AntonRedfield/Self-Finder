import React from 'react';
import { useStore } from '../../store';
import { Navigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { CheckCircle, TrendingDown, Lightbulb, MessageSquareQuote } from 'lucide-react';
import { REPORT_DATA } from '../../lib/reportData';

export default function Results() {
  const { assessmentData, clearSession } = useStore();

  if (!assessmentData) {
    return <Navigate to="/" />;
  }

  const handlePrint = () => window.print();
  const handleFinish = () => clearSession();

  // Sort scores from highest to lowest
  const sortedScores = Object.entries(assessmentData.scores || {}).sort(
    ([, a], [, b]) => b - a
  );

  const topCategory = sortedScores[0]?.[0] || 'N/A';
  const testType = assessmentData.test_type;
  const reportInfo = REPORT_DATA[testType]?.[topCategory];

  // Label for test type in Indonesian
  const testTypeLabel =
    testType === 'modality' ? 'Modalitas Belajar' :
    testType === 'multiple_intelligence' ? 'Multiple Intelligence' :
    'Personality';

  return (
    <div className="min-h-screen bg-bg-light p-4 md:p-8 flex items-center justify-center print:bg-white print:p-0">
      <div className="w-full max-w-3xl animate-slide-up">
        {/* Header Card */}
        <div className="card mb-6 print:shadow-none print:border print:border-gray-200">
          <div className="text-center border-b border-gray-100 pb-6 mb-6">
            <div className="flex justify-center mb-3 text-secondary">
              <CheckCircle size={44} />
            </div>
            <div className="flex justify-center mb-3">
              <img src="/logo.svg" alt="SELF FINDER Logo" className="h-14 w-auto object-contain" />
            </div>
            <p className="text-xs text-gray-400 uppercase tracking-[0.2em] mb-1 font-semibold">Laporan Resmi Hasil Tes</p>
            <h1 className="text-2xl font-bold text-primary">{testTypeLabel}</h1>
          </div>

          {/* Participant Info */}
          <div className="grid grid-cols-2 gap-4 bg-[#F5F7FA] p-4 rounded-xl print:bg-white print:border print:border-gray-200">
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold">Peserta</p>
              <p className="font-bold text-text-dark">{assessmentData.user_name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold">Tanggal Lahir</p>
              <p className="font-bold text-text-dark">{new Date(assessmentData.user_birthdate).toLocaleDateString('id-ID')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold">Diselesaikan Pada</p>
              <p className="font-bold text-text-dark">{new Date(assessmentData.completed_at || Date.now()).toLocaleDateString('id-ID')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold">Tingkat</p>
              <p className="font-bold text-text-dark">{assessmentData.tier}</p>
            </div>
          </div>
        </div>

        {/* Score Ranking */}
        <div className="card mb-6 print:shadow-none print:border print:border-gray-200">
          <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
            <TrendingDown size={20} /> Peringkat Skor
          </h3>
          <div className="space-y-3">
            {sortedScores.map(([category, score], index) => {
              const maxScore = sortedScores[0]?.[1] || 1;
              const pct = Math.round((score / maxScore) * 100);
              return (
                <div key={category} className="flex items-center gap-3">
                  <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold shrink-0 ${
                    index === 0 ? 'bg-accent text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="font-semibold text-text-dark text-sm">{category}</span>
                      <span className={`font-bold text-sm ${index === 0 ? 'text-accent' : 'text-gray-500'}`}>{score} poin</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-500 ${
                          index === 0 ? 'bg-accent' : index === 1 ? 'bg-secondary' : 'bg-wave'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Auto-Generated Report */}
        {reportInfo && (
          <div className="card mb-6 print:shadow-none print:border print:border-gray-200">
            <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
              <Lightbulb size={20} /> Analisis Hasil — {reportInfo.title}
            </h3>

            {/* Main Description */}
            <div className="bg-[#F5F7FA] rounded-xl p-5 mb-5 print:bg-white print:border print:border-gray-200">
              <p className="text-text-dark leading-relaxed">{reportInfo.description}</p>
            </div>

            {/* Saran Belajar */}
            <div className="mb-5">
              <h4 className="font-bold text-text-black mb-3 text-sm uppercase tracking-wide">💡 Saran Pengembangan</h4>
              <ul className="space-y-2">
                {reportInfo.saran.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-text-dark text-sm">
                    <span className="w-5 h-5 bg-secondary/10 text-secondary rounded-full flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">{i + 1}</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Kontekstual */}
            <div className="border-l-4 border-accent bg-accent/5 rounded-r-xl p-4">
              <h4 className="font-bold text-text-black mb-2 text-sm flex items-center gap-2">
                <MessageSquareQuote size={16} /> Kontekstual
              </h4>
              <p className="text-text-dark text-sm leading-relaxed italic">{reportInfo.kontekstual}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-center flex-col sm:flex-row gap-4 print:hidden">
          <Button variant="secondary" onClick={handlePrint} className="w-full sm:w-auto">
            Cetak Laporan (PDF)
          </Button>
          <Button onClick={handleFinish} className="w-full sm:w-auto">
            Selesai & Keluar
          </Button>
        </div>
      </div>
    </div>
  );
}
