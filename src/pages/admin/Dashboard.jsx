import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  Loader2, KeyRound, ListTodo, Users, MessageSquareQuote, Settings2,
  ChevronRight, TrendingUp, CheckCircle2, XCircle, Clock,
  BookOpen, Brain, Puzzle, Sparkles, ArrowUpRight
} from 'lucide-react';

const TEST_TYPE_META = {
  modality: { label: 'Modalitas Belajar', icon: BookOpen, color: 'bg-blue-500', lightBg: 'bg-blue-50', textColor: 'text-blue-600', borderColor: 'border-blue-100' },
  multiple_intelligence: { label: 'Multiple Intelligence', icon: Brain, color: 'bg-purple-500', lightBg: 'bg-purple-50', textColor: 'text-purple-600', borderColor: 'border-purple-100' },
  personality: { label: 'Personality', icon: Puzzle, color: 'bg-amber-500', lightBg: 'bg-amber-50', textColor: 'text-amber-600', borderColor: 'border-amber-100' },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadAllStats();
  }, []);

  async function loadAllStats() {
    try {
      const [
        { data: tokens },
        { data: questions },
        { data: results },
        { data: captions },
      ] = await Promise.all([
        supabase.from('tokens').select('id, is_active, current_usage, max_usage, tier, test_type'),
        supabase.from('questions').select('id, test_type, category, is_active'),
        supabase.from('assessment_results').select('id, test_type, completed_at, final_marking'),
        supabase.from('captions').select('id, test_type, category, section, is_active'),
      ]);

      // Token stats
      const tokenList = tokens || [];
      const activeTokens = tokenList.filter(t => t.is_active);
      const inactiveTokens = tokenList.filter(t => !t.is_active);
      const totalUsage = tokenList.reduce((sum, t) => sum + (t.current_usage || 0), 0);
      const tokensByTier = { LITE: 0, ELITE: 0, ULTIMATE: 0 };
      tokenList.forEach(t => { if (tokensByTier[t.tier] !== undefined) tokensByTier[t.tier]++; });

      // Question stats
      const questionList = questions || [];
      const activeQuestions = questionList.filter(q => q.is_active);
      const questionsByType = {};
      Object.keys(TEST_TYPE_META).forEach(type => {
        const typeQuestions = questionList.filter(q => q.test_type === type);
        const categories = {};
        typeQuestions.forEach(q => {
          categories[q.category] = (categories[q.category] || 0) + 1;
        });
        questionsByType[type] = { total: typeQuestions.length, categories };
      });

      // Results stats
      const resultList = results || [];
      const resultsByType = {};
      Object.keys(TEST_TYPE_META).forEach(type => {
        resultsByType[type] = resultList.filter(r => r.test_type === type).length;
      });
      // Recent results (last 5)
      const recentResults = resultList
        .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
        .slice(0, 5);

      // Captions coverage
      const captionList = captions || [];
      const captionCoverage = {};
      Object.keys(TEST_TYPE_META).forEach(type => {
        const typeCaptions = captionList.filter(c => c.test_type === type && c.is_active);
        const sections = { description: 0, saran: 0, kontekstual: 0 };
        typeCaptions.forEach(c => { if (sections[c.section] !== undefined) sections[c.section]++; });
        captionCoverage[type] = { total: typeCaptions.length, sections };
      });

      setStats({
        tokens: {
          total: tokenList.length,
          active: activeTokens.length,
          inactive: inactiveTokens.length,
          totalUsage,
          byTier: tokensByTier,
        },
        questions: {
          total: questionList.length,
          active: activeQuestions.length,
          byType: questionsByType,
        },
        results: {
          total: resultList.length,
          byType: resultsByType,
          recent: recentResults,
        },
        captions: {
          total: captionList.length,
          coverage: captionCoverage,
        },
      });
    } catch (err) {
      console.error('Dashboard load error:', err);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 animate-fade-in">
        <Loader2 className="animate-spin text-primary" size={36} />
        <p className="text-sm text-gray-400 font-medium">Memuat data dasbor...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="font-semibold">Gagal memuat data dasbor.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl mb-1">Ringkasan Dasbor</h2>
        <p className="text-sm text-gray-400">Gambaran umum seluruh data sistem SELF FINDER</p>
      </div>

      {/* ─── Primary Stats Row ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={KeyRound}
          label="Total Token"
          value={stats.tokens.total}
          sub={`${stats.tokens.active} aktif`}
          color="bg-primary"
          lightColor="bg-primary/5"
        />
        <StatCard
          icon={ListTodo}
          label="Bank Soal"
          value={stats.questions.total}
          sub={`${stats.questions.active} aktif`}
          color="bg-secondary"
          lightColor="bg-secondary/5"
        />
        <StatCard
          icon={Users}
          label="Tes Selesai"
          value={stats.results.total}
          sub={`${Object.keys(stats.results.byType).length} jenis tes`}
          color="bg-accent"
          lightColor="bg-accent/5"
        />
        <StatCard
          icon={MessageSquareQuote}
          label="Keterangan"
          value={stats.captions.total}
          sub="deskripsi & saran"
          color="bg-wave"
          lightColor="bg-wave/5"
        />
      </div>

      {/* ─── Token Breakdown ─── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-primary flex items-center gap-2">
            <KeyRound size={20} /> Ringkasan Token
          </h3>
          <QuickLinkButton onClick={() => navigate('/admin/tokens')} label="Kelola Token" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <MiniStat label="Aktif" value={stats.tokens.active} icon={CheckCircle2} iconColor="text-green-500" />
          <MiniStat label="Tidak Aktif" value={stats.tokens.inactive} icon={XCircle} iconColor="text-red-400" />
          <MiniStat label="Total Penggunaan" value={stats.tokens.totalUsage} icon={TrendingUp} iconColor="text-wave" />
          <MiniStat label="Tier LITE" value={stats.tokens.byTier.LITE} icon={Sparkles} iconColor="text-primary" />
          <MiniStat label="Tier ULTIMATE" value={stats.tokens.byTier.ELITE + stats.tokens.byTier.ULTIMATE} icon={Sparkles} iconColor="text-accent" sublabel={`${stats.tokens.byTier.ELITE} Elite · ${stats.tokens.byTier.ULTIMATE} Ultimate`} />
        </div>
      </div>

      {/* ─── Question Bank Breakdown ─── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-primary flex items-center gap-2">
            <ListTodo size={20} /> Pustaka Pertanyaan
          </h3>
          <QuickLinkButton onClick={() => navigate('/admin/questions')} label="Kelola Soal" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(TEST_TYPE_META).map(([type, meta]) => {
            const data = stats.questions.byType[type];
            const IconComp = meta.icon;
            const catEntries = Object.entries(data.categories).sort(([, a], [, b]) => b - a);
            return (
              <div key={type} className={`rounded-xl border ${meta.borderColor} ${meta.lightBg} p-4`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-8 h-8 rounded-lg ${meta.color} text-white flex items-center justify-center`}>
                    <IconComp size={16} />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-text-black">{meta.label}</p>
                    <p className="text-xs text-gray-400">{data.total} pertanyaan</p>
                  </div>
                </div>
                {catEntries.length > 0 ? (
                  <div className="space-y-1.5">
                    {catEntries.map(([cat, count]) => (
                      <div key={cat} className="flex items-center justify-between text-xs">
                        <span className="text-text-dark truncate">{cat}</span>
                        <span className={`font-bold ${meta.textColor}`}>{count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">Belum ada pertanyaan</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Results & Captions Row ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Results Summary */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-primary flex items-center gap-2">
              <Users size={20} /> Hasil Asesmen
            </h3>
            <QuickLinkButton onClick={() => navigate('/admin/results')} label="Lihat Semua" />
          </div>

          {/* By type */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {Object.entries(TEST_TYPE_META).map(([type, meta]) => {
              const IconComp = meta.icon;
              return (
                <div key={type} className={`rounded-xl ${meta.lightBg} border ${meta.borderColor} p-3 text-center`}>
                  <IconComp size={16} className={`mx-auto mb-1 ${meta.textColor}`} />
                  <p className="text-xl font-extrabold text-text-black">{stats.results.byType[type] || 0}</p>
                  <p className="text-[10px] text-gray-400 font-medium mt-0.5 leading-tight">{meta.label}</p>
                </div>
              );
            })}
          </div>

          {/* Recent results */}
          {stats.results.recent.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                <Clock size={12} /> Hasil Terbaru
              </p>
              <div className="space-y-2">
                {stats.results.recent.map((r) => {
                  const meta = TEST_TYPE_META[r.test_type] || {};
                  return (
                    <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${meta.color || 'bg-gray-300'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text-black truncate">{r.final_marking || 'N/A'}</p>
                        <p className="text-[10px] text-gray-400">{meta.label || r.test_type}</p>
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0">
                        {new Date(r.completed_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Captions Coverage */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-primary flex items-center gap-2">
              <MessageSquareQuote size={20} /> Cakupan Keterangan
            </h3>
            <QuickLinkButton onClick={() => navigate('/admin/captions')} label="Kelola" />
          </div>
          <div className="space-y-4">
            {Object.entries(TEST_TYPE_META).map(([type, meta]) => {
              const cov = stats.captions.coverage[type];
              const IconComp = meta.icon;
              const sections = [
                { key: 'description', label: 'Deskripsi', count: cov.sections.description },
                { key: 'saran', label: 'Saran', count: cov.sections.saran },
                { key: 'kontekstual', label: 'Kontekstual', count: cov.sections.kontekstual },
              ];
              return (
                <div key={type} className={`rounded-xl border ${meta.borderColor} p-4`}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-7 h-7 rounded-lg ${meta.color} text-white flex items-center justify-center`}>
                      <IconComp size={14} />
                    </div>
                    <p className="font-bold text-sm text-text-black">{meta.label}</p>
                    <span className={`ml-auto text-xs font-bold ${meta.textColor}`}>{cov.total} item</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {sections.map((s) => (
                      <div key={s.key} className={`${meta.lightBg} rounded-lg p-2 text-center`}>
                        <p className="text-lg font-extrabold text-text-black">{s.count}</p>
                        <p className="text-[10px] text-gray-400 font-medium">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Quick Links ─── */}
      <div>
        <h3 className="text-lg font-bold text-text-black mb-3">Akses Cepat</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickLinkCard
            icon={KeyRound}
            title="Manajemen Token"
            description="Buat, atur ulang, dan kelola token akses"
            onClick={() => navigate('/admin/tokens')}
            color="bg-primary"
          />
          <QuickLinkCard
            icon={ListTodo}
            title="Pustaka Pertanyaan"
            description="Tambah dan edit soal untuk semua jenis tes"
            onClick={() => navigate('/admin/questions')}
            color="bg-secondary"
          />
          <QuickLinkCard
            icon={Users}
            title="Hasil Asesmen"
            description="Lihat dan cetak laporan hasil tes peserta"
            onClick={() => navigate('/admin/results')}
            color="bg-accent"
          />
          <QuickLinkCard
            icon={MessageSquareQuote}
            title="Kontak & Keterangan"
            description="Kelola deskripsi, saran, dan info kontak"
            onClick={() => navigate('/admin/captions')}
            color="bg-wave"
          />
          <QuickLinkCard
            icon={Settings2}
            title="Pengaturan"
            description="Atur tingkat akses dan hak laporan per tier"
            onClick={() => navigate('/admin/settings')}
            color="bg-purple-500"
          />
        </div>
      </div>
    </div>
  );
}

/* ─── Sub Components ─── */

function StatCard({ icon: Icon, label, value, sub, color, lightColor }) {
  return (
    <div className={`${lightColor} rounded-xl border border-gray-100 p-4 flex flex-col items-center justify-center text-center transition-transform duration-200 hover:-translate-y-0.5`}>
      <div className={`w-10 h-10 ${color} text-white rounded-xl flex items-center justify-center mb-3`}>
        <Icon size={20} />
      </div>
      <span className="text-3xl font-extrabold text-text-black">{value}</span>
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-1">{label}</span>
      {sub && <span className="text-[10px] text-gray-400 mt-0.5">{sub}</span>}
    </div>
  );
}

function MiniStat({ label, value, icon: Icon, iconColor, sublabel }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3 flex flex-col items-center text-center border border-gray-100">
      <Icon size={16} className={`${iconColor} mb-1.5`} />
      <span className="text-xl font-extrabold text-text-black">{value}</span>
      <span className="text-[10px] text-gray-400 font-medium leading-tight mt-0.5">{label}</span>
      {sublabel && <span className="text-[9px] text-gray-300 mt-0.5">{sublabel}</span>}
    </div>
  );
}

function QuickLinkButton({ onClick, label }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-xs font-semibold text-wave hover:text-primary transition-colors"
    >
      {label} <ChevronRight size={14} />
    </button>
  );
}

function QuickLinkCard({ icon: Icon, title, description, onClick, color }) {
  return (
    <button
      onClick={onClick}
      className="card text-left flex flex-col gap-3 group hover:-translate-y-1 transition-all duration-200 hover:shadow-lg cursor-pointer border border-transparent hover:border-gray-200"
    >
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 ${color} text-white rounded-xl flex items-center justify-center`}>
          <Icon size={20} />
        </div>
        <ArrowUpRight size={16} className="text-gray-300 group-hover:text-primary transition-colors" />
      </div>
      <div>
        <p className="font-bold text-text-black text-sm">{title}</p>
        <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{description}</p>
      </div>
    </button>
  );
}
