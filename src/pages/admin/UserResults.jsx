import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Table } from '../../components/Table';
import { Button } from '../../components/Button';
import { Loader2, Eye, Trash2, TrendingDown, Lightbulb, MessageSquareQuote, ArrowLeft, Mail, Phone, MessageCircle, MapPin, Globe } from 'lucide-react';
import { REPORT_DATA } from '../../lib/reportData';

const CONTACT_ICONS = {
  email: <Mail size={16} />,
  phone: <Phone size={16} />,
  whatsapp: <MessageCircle size={16} />,
  address: <MapPin size={16} />,
  other: <Globe size={16} />,
};

function getContactHref(type, value, link_url) {
  if (link_url && link_url.trim() !== '') {
    return link_url.startsWith('http') || link_url.startsWith('mailto:') || link_url.startsWith('tel:') 
      ? link_url 
      : `https://${link_url}`;
  }
  switch (type) {
    case 'email': return `mailto:${value}`;
    case 'phone': return `tel:${value}`;
    case 'whatsapp': return `https://wa.me/${value.replace(/[^0-9]/g, '')}`;
    case 'address': return `https://maps.google.com/?q=${encodeURIComponent(value)}`;
    default: return value.startsWith('http') ? value : `https://${value}`;
  }
}

export default function UserResults() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState(null);

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('assessment_results')
      .select('*')
      .order('completed_at', { ascending: false });
    setResults(data || []);
    setLoading(false);
  };

  const handleDeleteResult = async (id) => {
    if (!confirm('Yakin ingin menghapus laporan ini secara permanen?')) return;
    const { error } = await supabase.from('assessment_results').delete().eq('id', id);
    if (!error) loadResults();
    else alert(error.message);
  };

  const columns = [
    { key: 'user_name', label: 'Nama', sortable: true },
    {
      key: 'tier',
      label: 'Tingkat',
      sortable: true,
      render: (r) => (
        <span className={`font-bold ${r.tier === 'ULTIMATE' ? 'text-accent' : 'text-primary'}`}>
          {r.tier}
        </span>
      ),
    },
    {
      key: 'test_type',
      label: 'Tes',
      sortable: true,
      render: (r) => <span className="capitalize">{r.test_type.replace('_', ' ')}</span>,
    },
    { key: 'final_marking', label: 'Hasil', sortable: true },
    {
      key: 'completed_at',
      label: 'Tanggal',
      sortable: true,
      render: (r) => new Date(r.completed_at).toLocaleDateString('id-ID'),
    },
    {
      key: 'actions',
      label: 'Aksi',
      sortable: false,
      render: (r) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedResult(r)}
            className="text-wave hover:text-primary transition-colors"
            title="Lihat detail"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => handleDeleteResult(r.id)}
            className="text-red-400 hover:text-red-600 transition-colors"
            title="Hapus laporan"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  if (selectedResult) {
    return <ResultDetail result={selectedResult} onBack={() => setSelectedResult(null)} />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl">Hasil Tes</h2>
      <div className="card overflow-x-auto">
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : (
          <Table columns={columns} data={results} />
        )}
      </div>
    </div>
  );
}

// ==================== DETAIL VIEW ====================
// Shuffle array and return first N items
function shufflePick(arr, count) {
  if (!arr || arr.length === 0) return [];
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function ResultDetail({ result, onBack }) {
  const [reportInfo, setReportInfo] = useState(null);
  const [contactData, setContactData] = useState({ banner: null, buttons: [] });
  const [loadingCaptions, setLoadingCaptions] = useState(true);

  const sortedScores = Object.entries(result.scores || {}).sort(([, a], [, b]) => b - a);
  const topCategory = sortedScores[0]?.[0] || 'N/A';
  const testType = result.test_type;

  useEffect(() => {
    if (!testType) return;
    async function loadCaptions() {
      setLoadingCaptions(true);
      try {
        // Fetch all data in parallel
        const [
          { data: captionsData },
          { data: tierSettingsData },
          { data: captionSettingsData },
          { data: contactsData },
        ] = await Promise.all([
          supabase.from('captions').select('*').eq('test_type', testType).eq('category', topCategory).eq('is_active', true),
          supabase.from('tier_settings').select('*').eq('tier', result.tier || 'ULTIMATE').maybeSingle(),
          supabase.from('caption_settings').select('*').eq('test_type', testType).eq('category', topCategory).eq('tier', result.tier || 'ULTIMATE').maybeSingle(),
          supabase.from('contact_settings').select('*').eq('is_active', true).order('display_order', { ascending: true }),
        ]);

        const bannerItem = (contactsData || []).find((d) => d.setting_type === 'banner_text');
        const buttonItems = (contactsData || []).filter((d) => d.setting_type !== 'banner_text');
        setContactData({ banner: bannerItem || null, buttons: buttonItems });

        // Resolve tier privileges
        const tierConfig = tierSettingsData || { default_saran_count: 5, show_description: true, show_kontekstual: true };
        const saranDisplayCount = captionSettingsData?.saran_display_count || tierConfig.default_saran_count || 5;

        const captions = captionsData || [];

        const descriptions = captions.filter((c) => c.section === 'description');
        const saranItems = captions.filter((c) => c.section === 'saran');
        const kontekstualItems = captions.filter((c) => c.section === 'kontekstual');

        const fallback = REPORT_DATA[testType]?.[topCategory];
        const hasDbCaptions = descriptions.length > 0 || saranItems.length > 0 || kontekstualItems.length > 0;

        let finalReport;
        if (hasDbCaptions) {
          const pickedDescription = (tierConfig.show_description !== false && descriptions.length > 0)
            ? shufflePick(descriptions, 1)[0].caption_text
            : (tierConfig.show_description !== false ? (fallback?.description || '') : '');

          const pickedSaran = saranItems.length > saranDisplayCount
            ? shufflePick(saranItems, saranDisplayCount).map((c) => c.caption_text)
            : saranItems.map((c) => c.caption_text);

          const pickedKontekstual = (tierConfig.show_kontekstual !== false && kontekstualItems.length > 0)
            ? shufflePick(kontekstualItems, 1)[0].caption_text
            : (tierConfig.show_kontekstual !== false ? (fallback?.kontekstual || '') : '');

          finalReport = {
            title: fallback?.title || topCategory,
            description: pickedDescription,
            saran: pickedSaran,
            kontekstual: pickedKontekstual,
          };
        } else if (fallback) {
          finalReport = {
            ...fallback,
            description: tierConfig.show_description !== false ? fallback.description : '',
            kontekstual: tierConfig.show_kontekstual !== false ? fallback.kontekstual : '',
            saran: fallback.saran ? fallback.saran.slice(0, saranDisplayCount) : [],
          };
        } else {
          finalReport = null;
        }
        setReportInfo(finalReport);
      } catch (err) {
        console.error('Failed to load captions:', err);
        setReportInfo(REPORT_DATA[testType]?.[topCategory] || null);
      }
      setLoadingCaptions(false);
    }
    loadCaptions();
  }, [testType, topCategory]);

  const testTypeLabel =
    testType === 'modality' ? 'Modalitas Belajar' :
    testType === 'multiple_intelligence' ? 'Multiple Intelligence' : 'Personality';

  const handlePrint = () => window.print();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back + Print buttons — hidden during print */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 print:hidden">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-wave hover:text-primary transition-colors font-semibold text-sm"
        >
          <ArrowLeft size={18} /> Kembali ke Daftar
        </button>
        <Button onClick={handlePrint} className="w-full sm:w-auto justify-center">
          Cetak Laporan
        </Button>
      </div>

      {/* ========== PRINTABLE CONTENT ========== */}
      <div id="printable-report" className="print:flex print:flex-col print:min-h-screen">
        {/* Header */}
        <div className="card print:shadow-none print:border print:border-gray-300">
          <div className="text-center mb-4 print:mb-6">
            <img src="/logo-square.svg" alt="SELF FINDER" className="h-52 mx-auto mb-2 hidden print:block" />
            <h2 className="text-xl md:text-2xl font-bold text-primary">Laporan Hasil Tes — {testTypeLabel}</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 bg-[#F5F7FA] p-3 md:p-4 rounded-xl print:bg-white print:border print:border-gray-200">
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold">Peserta</p>
              <p className="font-bold text-text-dark text-sm">{result.user_name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold">Tanggal Lahir</p>
              <p className="font-bold text-text-dark text-sm">{new Date(result.user_birthdate).toLocaleDateString('id-ID')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold">Jenis Tes</p>
              <p className="font-bold text-text-dark text-sm">{testTypeLabel}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold">Diselesaikan</p>
              <p className="font-bold text-text-dark text-sm">{new Date(result.completed_at).toLocaleDateString('id-ID')}</p>
            </div>
          </div>
        </div>

        {/* Score Ranking */}
        <div className="card mt-6 print:shadow-none print:border print:border-gray-300 print:mt-4">
          <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
            <TrendingDown size={20} className="print:hidden" /> Peringkat Skor
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
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-1">
                      <span className="font-semibold text-text-dark text-sm truncate">{category}</span>
                      <span className={`font-bold text-sm shrink-0 ml-2 ${index === 0 ? 'text-accent' : 'text-gray-500'}`}>{score} poin</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-2.5 rounded-full ${index === 0 ? 'bg-accent' : index === 1 ? 'bg-secondary' : 'bg-wave'}`}
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
        {loadingCaptions ? (
          <div className="card mt-6 flex justify-center py-12">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : reportInfo && (
          <div className="card mt-6 print:shadow-none print:border print:border-gray-300 print:mt-4">
            <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
              <Lightbulb size={20} className="print:hidden" /> Analisis — {reportInfo.title}
            </h3>

            <div className="bg-[#F5F7FA] rounded-xl p-4 md:p-5 mb-5 print:bg-white print:border print:border-gray-200">
              <p className="text-text-dark leading-relaxed text-sm md:text-base">{reportInfo.description}</p>
            </div>

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

            <div className="border-l-4 border-accent bg-accent/5 rounded-r-xl p-4">
              <h4 className="font-bold text-text-black mb-2 text-sm flex items-center gap-2">
                <MessageSquareQuote size={16} className="print:hidden" /> Kontekstual
              </h4>
              <p className="text-text-dark text-sm leading-relaxed italic">{reportInfo.kontekstual}</p>
            </div>
          </div>
        )}

        {/* Conclusion */}
        <div className="card mt-6 bg-primary text-white text-center py-6 print:bg-white print:text-primary print:border print:border-gray-300 print:mt-4">
          <p className="text-xs uppercase tracking-widest text-black mb-2 print:text-gray-400">Kesimpulan</p>
          <h3 className="text-lg md:text-xl font-bold">{result.final_marking}</h3>
        </div>

        {/* Contact Banner & Buttons */}
        {(contactData.banner || contactData.buttons.length > 0) && (
          <div className="card mt-6 print:shadow-none print:border print:border-gray-300 print:mt-auto print:pt-8 print:border-t-2">
            {contactData.banner && (
              <div className="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl p-5 mb-4 border border-primary/10">
                <p className="text-text-dark text-sm leading-relaxed text-center font-medium">
                  {contactData.banner.value}
                </p>
              </div>
            )}
            {contactData.buttons.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {contactData.buttons.map((btn) => (
                  <a
                    key={btn.id}
                    href={getContactHref(btn.setting_type, btn.value, btn.link_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md no-underline ${
                      btn.setting_type === 'email' ? 'border-blue-100 bg-blue-50/50 hover:bg-blue-50 text-blue-700' :
                      btn.setting_type === 'phone' ? 'border-green-100 bg-green-50/50 hover:bg-green-50 text-green-700' :
                      btn.setting_type === 'whatsapp' ? 'border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-700' :
                      btn.setting_type === 'address' ? 'border-orange-100 bg-orange-50/50 hover:bg-orange-50 text-orange-700' :
                      'border-purple-100 bg-purple-50/50 hover:bg-purple-50 text-purple-700'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      btn.setting_type === 'email' ? 'bg-blue-100' :
                      btn.setting_type === 'phone' ? 'bg-green-100' :
                      btn.setting_type === 'whatsapp' ? 'bg-emerald-100' :
                      btn.setting_type === 'address' ? 'bg-orange-100' :
                      'bg-purple-100'
                    }`}>
                      {CONTACT_ICONS[btn.setting_type] || <Globe size={16} />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{btn.label}</p>
                      <p className="text-xs opacity-70 truncate">{btn.value}</p>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
