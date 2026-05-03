import React, { useEffect, useState } from 'react';
import { useStore } from '../../store';
import { Navigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { CheckCircle, TrendingDown, Lightbulb, MessageSquareQuote, Loader2, Mail, Phone, MessageCircle, MapPin, Globe } from 'lucide-react';
import { supabase } from '../../lib/supabase';

import Footer from '../../components/Footer';
import { REPORT_DATA } from '../../lib/reportData';

// Shuffle array and return first N items
function shufflePick(arr, count) {
  if (!arr || arr.length === 0) return [];
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

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

export default function Results() {
  const { assessmentData, clearSession } = useStore();
  const [reportInfo, setReportInfo] = useState(null);
  const [contactData, setContactData] = useState({ banner: null, buttons: [] });
  const [loadingCaptions, setLoadingCaptions] = useState(true);

  const handlePrint = () => window.print();
  const handleFinish = () => clearSession();

  // Sort scores from highest to lowest
  const sortedScores = Object.entries(assessmentData?.scores || {}).sort(
    ([, a], [, b]) => b - a
  );

  const topCategory = sortedScores[0]?.[0] || 'N/A';
  const testType = assessmentData?.test_type || '';

  // Label for test type in Indonesian
  const testTypeLabel =
    testType === 'modality' ? 'Modalitas Belajar' :
    testType === 'multiple_intelligence' ? 'Multiple Intelligence' :
    'Personality';

  // Fetch captions from DB on mount
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
          supabase.from('tier_settings').select('*').eq('tier', assessmentData?.tier || 'ULTIMATE').maybeSingle(),
          supabase.from('caption_settings').select('*').eq('test_type', testType).eq('category', topCategory).eq('tier', assessmentData?.tier || 'ULTIMATE').maybeSingle(),
          supabase.from('contact_settings').select('*').eq('is_active', true).order('display_order', { ascending: true }),
        ]);

        // Resolve tier privileges
        const tierConfig = tierSettingsData || { default_saran_count: 5, show_description: true, show_kontekstual: true };
        const saranDisplayCount = captionSettingsData?.saran_display_count || tierConfig.default_saran_count || 5;

        const captions = captionsData || [];

        // Group captions by section
        const descriptions = captions.filter((c) => c.section === 'description');
        const saranItems = captions.filter((c) => c.section === 'saran');
        const kontekstualItems = captions.filter((c) => c.section === 'kontekstual');

        // Fallback to hardcoded REPORT_DATA only if DB has nothing at all for this category
        const fallback = REPORT_DATA[testType]?.[topCategory];
        const hasDbCaptions = descriptions.length > 0 || saranItems.length > 0 || kontekstualItems.length > 0;

        let finalReport;
        if (hasDbCaptions) {
          // Use DB captions — shuffle where applicable
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
          // Apply tier toggles to fallback data
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

        // Process contacts
        const bannerItem = (contactsData || []).find((d) => d.setting_type === 'banner_text');
        const buttonItems = (contactsData || []).filter((d) => d.setting_type !== 'banner_text');
        setContactData({ banner: bannerItem || null, buttons: buttonItems });

      } catch (err) {
        console.error('Failed to load captions:', err);
        // Fallback to hardcoded
        setReportInfo(REPORT_DATA[testType]?.[topCategory] || null);
      }
      setLoadingCaptions(false);
    }

    loadCaptions();
  }, [testType, topCategory]);

  if (!assessmentData) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-bg-light p-4 md:p-8 flex items-center justify-center print:bg-white print:p-0 print:block">
      <div className="w-full max-w-3xl animate-slide-up print:flex print:flex-col print:min-h-[95vh]">
        {/* Header Card */}
        <div className="card mb-6 print:shadow-none print:border print:border-gray-200">
          <div className="text-center border-b border-gray-100 pb-6 mb-6">
            <div className="flex justify-center mb-3 text-secondary">
              <CheckCircle size={44} />
            </div>
            <div className="flex justify-center mb-3">
              <img src="/logo-square.svg" alt="SELF FINDER Logo" className="h-64 print:h-32 w-auto object-contain transition-all" />
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
              // Scale to 0-100 if max_scores available
              const maxPossible = assessmentData.max_scores?.[category];
              const scaledScore = maxPossible ? Math.round((score / maxPossible) * 100) : score;
              const barWidth = maxPossible ? scaledScore : Math.round((score / (sortedScores[0]?.[1] || 1)) * 100);
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
                      <span className={`font-bold text-sm ${index === 0 ? 'text-accent' : 'text-gray-500'}`}>{scaledScore}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-500 ${
                          index === 0 ? 'bg-accent' : index === 1 ? 'bg-secondary' : 'bg-wave'
                        }`}
                        style={{ width: `${barWidth}%` }}
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
          <div className="card mb-6 flex justify-center py-12">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : reportInfo && (
          <div className="card mb-6 print:shadow-none print:border print:border-gray-200">
            <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
              <Lightbulb size={20} /> Analisis Hasil — {reportInfo.title}
            </h3>

            {/* Main Description */}
            <div className="bg-[#F5F7FA] rounded-xl p-5 mb-5 print:bg-white print:border print:border-gray-200">
              <p className="text-text-dark leading-relaxed">{reportInfo.description}</p>
            </div>

            {/* Saran Belajar */}
            {reportInfo.saran && reportInfo.saran.length > 0 && (
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
            )}

            {/* Kontekstual */}
            {reportInfo.kontekstual && (
              <div className="border-l-4 border-accent bg-accent/5 rounded-r-xl p-4">
                <h4 className="font-bold text-text-black mb-2 text-sm flex items-center gap-2">
                  <MessageSquareQuote size={16} /> Kontekstual
                </h4>
                <p className="text-text-dark text-sm leading-relaxed italic">{reportInfo.kontekstual}</p>
              </div>
            )}
          </div>
        )}

        {/* Contact Banner & Buttons */}
        {(contactData.banner || contactData.buttons.length > 0) && (
          <div className="card mb-6 print:shadow-none print:border print:border-gray-200 print:mt-auto print:pt-8 print:border-t-2">
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

        {/* Actions */}
        <div className="flex justify-center flex-col sm:flex-row gap-4 print:hidden">
          <Button variant="secondary" onClick={handlePrint} className="w-full sm:w-auto">
            Cetak Laporan (PDF)
          </Button>
          <Button onClick={handleFinish} className="w-full sm:w-auto">
            Selesai & Keluar
          </Button>
        </div>
        <Footer className="mt-12 pt-6 border-t border-[#E0E0E0]" />
      </div>
    </div>
  );
}
