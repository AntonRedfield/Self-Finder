import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/Button';
import {
  Loader2, Save, Settings2, Layers, BookOpen, Brain, Puzzle,
  ToggleLeft, ToggleRight, ChevronDown, ChevronUp, Info, ShieldCheck, Trash2, Fingerprint
} from 'lucide-react';
import {
  isPWA, isWebAuthnSupported, hasFastLogin, clearFastLoginWithDB,
  getAuthMethodLabel, registerCredential, authenticateCredential,
  getDiagnostics, checkWebAuthnCapability, WebAuthnStatus, getWebAuthnErrorMessage,
} from '../../lib/webauthn';

const TIERS = ['LITE', 'ELITE', 'ULTIMATE'];

const TIER_META = {
  LITE: { color: 'bg-blue-500', lightBg: 'bg-blue-50', textColor: 'text-blue-600', borderColor: 'border-blue-200', label: 'LITE' },
  ELITE: { color: 'bg-purple-500', lightBg: 'bg-purple-50', textColor: 'text-purple-600', borderColor: 'border-purple-200', label: 'ELITE' },
  ULTIMATE: { color: 'bg-amber-500', lightBg: 'bg-amber-50', textColor: 'text-amber-600', borderColor: 'border-amber-200', label: 'ULTIMATE' },
};

const TEST_TYPES = [
  { id: 'modality', label: 'Modalitas Belajar', icon: BookOpen },
  { id: 'multiple_intelligence', label: 'Multiple Intelligence', icon: Brain },
  { id: 'personality', label: 'Personality', icon: Puzzle },
];

const CATEGORIES = {
  modality: ['Visual', 'Auditory', 'Kinesthetic'],
  multiple_intelligence: ['Linguistic', 'Logic-Mathematic', 'Spatial-Visual', 'Bodily-Kinesthetic', 'Musical', 'Interpersonal', 'Intrapersonal', 'Naturalist'],
  personality: ['Sanguine', 'Choleric', 'Melancholy', 'Phlegmatic'],
};

export default function Settings() {
  const [activeTab, setActiveTab] = useState('tiers');
  const tabs = [
    { id: 'tiers', label: 'Tingkat & Soal', icon: <Layers size={16} /> },
    { id: 'saran', label: 'Saran per Kategori', icon: <Settings2 size={16} /> },
    { id: 'security', label: 'Keamanan', icon: <ShieldCheck size={16} /> },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl mb-1">Pengaturan</h2>
        <p className="text-sm text-gray-400">Konfigurasi tingkat akses dan hak laporan peserta</p>
      </div>

      {/* Tab Switcher */}
      <div className="flex space-x-1 bg-white p-1 rounded-xl shadow-sm border border-gray-100 w-full overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 px-3 rounded-lg font-semibold text-sm transition-all duration-200 whitespace-nowrap flex items-center justify-center gap-2 ${
              activeTab === tab.id ? 'bg-primary text-white shadow' : 'text-gray-500 hover:text-primary hover:bg-gray-50'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'tiers' && <TierSettingsPanel />}
      {activeTab === 'saran' && <SaranSettingsPanel />}
      {activeTab === 'security' && <SecurityPanel />}
    </div>
  );
}

/* ================================================================
   TIER SETTINGS PANEL — question %, report toggles per tier
   ================================================================ */
function TierSettingsPanel() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);

  useEffect(() => {
    fetchSettings();
    fetchQuestionCount();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('tier_settings')
      .select('*')
      .order('question_percentage', { ascending: true });

    const map = {};
    (data || []).forEach(d => { map[d.tier] = d; });

    // Ensure all tiers have entries
    TIERS.forEach(tier => {
      if (!map[tier]) {
        map[tier] = {
          tier,
          question_percentage: tier === 'LITE' ? 20 : tier === 'ELITE' ? 60 : 100,
          default_saran_count: tier === 'LITE' ? 3 : tier === 'ELITE' ? 5 : 8,
          show_description: true,
          show_kontekstual: tier !== 'LITE',
        };
      }
    });
    setSettings(map);
    setLoading(false);
  };

  const fetchQuestionCount = async () => {
    const { count } = await supabase.from('questions').select('*', { count: 'exact', head: true }).eq('is_active', true);
    setQuestionCount(count || 0);
  };

  const updateField = (tier, field, value) => {
    setSettings(prev => ({
      ...prev,
      [tier]: { ...prev[tier], [field]: value },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    for (const tier of TIERS) {
      const s = settings[tier];
      if (s.id) {
        await supabase.from('tier_settings').update({
          question_percentage: s.question_percentage,
          default_saran_count: s.default_saran_count,
          show_description: s.show_description,
          show_kontekstual: s.show_kontekstual,
          updated_at: new Date().toISOString(),
        }).eq('id', s.id);
      } else {
        const { data } = await supabase.from('tier_settings').insert([{
          tier,
          question_percentage: s.question_percentage,
          default_saran_count: s.default_saran_count,
          show_description: s.show_description,
          show_kontekstual: s.show_kontekstual,
        }]).select().single();
        if (data) updateField(tier, 'id', data.id);
      }
    }
    setSaving(false);
    fetchSettings();
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700 flex items-start gap-2">
        <Info size={18} className="shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold mb-1">Cara Kerja Tingkat</p>
          <p>Setiap tingkat (tier) menentukan berapa persen soal yang diberikan ke peserta dan apa saja yang ditampilkan di laporan hasil. Saat ini ada <strong>{questionCount} soal aktif</strong> di pustaka pertanyaan.</p>
        </div>
      </div>

      {/* Tier Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {TIERS.map((tier) => {
          const s = settings[tier];
          const meta = TIER_META[tier];
          const approxQuestions = Math.max(1, Math.floor(questionCount * (s.question_percentage / 100)));
          return (
            <div key={tier} className={`card border-2 ${meta.borderColor} relative`}>
              {/* Header */}
              <div className="flex items-center gap-3 mb-5">
                <div className={`w-10 h-10 ${meta.color} text-white rounded-xl flex items-center justify-center font-bold text-sm`}>
                  {tier[0]}
                </div>
                <div>
                  <h3 className={`font-bold text-lg ${meta.textColor}`}>{meta.label}</h3>
                  <p className="text-[10px] text-gray-400">Konfigurasi tingkat akses</p>
                </div>
              </div>

              <div className="space-y-5">
                {/* Question Percentage */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Persentase Soal
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={s.question_percentage}
                      onChange={(e) => updateField(tier, 'question_percentage', parseInt(e.target.value, 10))}
                      className="flex-1 accent-primary"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={s.question_percentage}
                        onChange={(e) => updateField(tier, 'question_percentage', Math.min(100, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                        className="input-field w-16 text-center text-sm font-bold"
                      />
                      <span className="text-sm text-gray-400">%</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1.5">
                    ≈ <span className={`font-bold ${meta.textColor}`}>{approxQuestions}</span> soal dari {questionCount} total
                  </p>
                </div>

                {/* Default Saran Count */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Jumlah Saran Default
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={s.default_saran_count}
                      onChange={(e) => updateField(tier, 'default_saran_count', Math.min(50, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                      className="input-field w-20 text-center font-bold"
                    />
                    <span className="text-xs text-gray-400">saran ditampilkan</span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Berlaku jika tidak ada pengaturan per-kategori</p>
                </div>

                {/* Report toggles */}
                <div className="space-y-3 pt-3 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Bagian Laporan</p>

                  <ToggleRow
                    label="Deskripsi Utama"
                    enabled={s.show_description}
                    onChange={(v) => updateField(tier, 'show_description', v)}
                  />
                  <ToggleRow
                    label="Analisis Kontekstual"
                    enabled={s.show_kontekstual}
                    onChange={(v) => updateField(tier, 'show_kontekstual', v)}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2 min-w-[160px] justify-center">
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          Simpan Pengaturan
        </Button>
      </div>
    </div>
  );
}

/* ================================================================
   SARAN SETTINGS PANEL — per tier + test_type + category saran count
   ================================================================ */
function SaranSettingsPanel() {
  const [tierSettings, setTierSettings] = useState({});
  const [saranSettings, setSaranSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedTier, setExpandedTier] = useState('ULTIMATE');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: tierData }, { data: captionData }] = await Promise.all([
      supabase.from('tier_settings').select('*'),
      supabase.from('caption_settings').select('*'),
    ]);

    // Build tier defaults map
    const tierMap = {};
    (tierData || []).forEach(d => { tierMap[d.tier] = d; });
    setTierSettings(tierMap);

    // Build saran settings map: key = `${tier}|${test_type}|${category}`
    const saranMap = {};
    (captionData || []).forEach(d => {
      const key = `${d.tier || 'ULTIMATE'}|${d.test_type}|${d.category}`;
      saranMap[key] = d;
    });
    setSaranSettings(saranMap);
    setLoading(false);
  };

  const getKey = (tier, testType, category) => `${tier}|${testType}|${category}`;

  const getSaranCount = (tier, testType, category) => {
    const key = getKey(tier, testType, category);
    if (saranSettings[key]) return saranSettings[key].saran_display_count;
    return null; // null = using default
  };

  const setSaranCount = (tier, testType, category, value) => {
    const key = getKey(tier, testType, category);
    const existing = saranSettings[key];
    setSaranSettings(prev => ({
      ...prev,
      [key]: {
        ...existing,
        tier,
        test_type: testType,
        category,
        saran_display_count: value,
        _dirty: true,
      },
    }));
  };

  const clearOverride = (tier, testType, category) => {
    const key = getKey(tier, testType, category);
    setSaranSettings(prev => ({
      ...prev,
      [key]: { ...prev[key], _deleted: true, _dirty: true },
    }));
  };

  const getDefaultCount = (tier) => {
    return tierSettings[tier]?.default_saran_count || 5;
  };

  const handleSave = async () => {
    setSaving(true);
    for (const [key, value] of Object.entries(saranSettings)) {
      if (!value._dirty) continue;

      if (value._deleted && value.id) {
        // Delete the override
        await supabase.from('caption_settings').delete().eq('id', value.id);
      } else if (value._deleted && !value.id) {
        // Nothing to delete, it was never persisted
        continue;
      } else if (value.id) {
        // Update existing
        await supabase.from('caption_settings').update({
          saran_display_count: value.saran_display_count,
          tier: value.tier,
        }).eq('id', value.id);
      } else {
        // Insert new
        await supabase.from('caption_settings').insert([{
          tier: value.tier,
          test_type: value.test_type,
          category: value.category,
          saran_display_count: value.saran_display_count,
        }]);
      }
    }
    setSaving(false);
    fetchAll();
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info */}
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-700 flex items-start gap-2">
        <Info size={18} className="shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold mb-1">Pengaturan Saran per Kategori</p>
          <p>Di sini Anda dapat mengatur jumlah saran yang ditampilkan per <strong>tingkat + jenis tes + kategori</strong>. Jika tidak diatur, sistem akan menggunakan jumlah default dari pengaturan tingkat di tab sebelumnya.</p>
        </div>
      </div>

      {/* Tier Accordion */}
      {TIERS.map(tier => {
        const meta = TIER_META[tier];
        const isExpanded = expandedTier === tier;
        const defaultCount = getDefaultCount(tier);

        return (
          <div key={tier} className={`card border-2 ${meta.borderColor} overflow-hidden`}>
            {/* Accordion Header */}
            <button
              onClick={() => setExpandedTier(isExpanded ? null : tier)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 ${meta.color} text-white rounded-lg flex items-center justify-center font-bold text-xs`}>
                  {tier[0]}
                </div>
                <div className="text-left">
                  <h3 className={`font-bold ${meta.textColor}`}>{meta.label}</h3>
                  <p className="text-[10px] text-gray-400">Default: {defaultCount} saran</p>
                </div>
              </div>
              {isExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
            </button>

            {/* Accordion Body */}
            {isExpanded && (
              <div className="mt-5 space-y-5 pt-5 border-t border-gray-100">
                {TEST_TYPES.map(testType => {
                  const IconComp = testType.icon;
                  const categories = CATEGORIES[testType.id] || [];

                  return (
                    <div key={testType.id}>
                      <div className="flex items-center gap-2 mb-3">
                        <IconComp size={16} className={meta.textColor} />
                        <p className="font-semibold text-sm text-text-black">{testType.label}</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {categories.map(cat => {
                          const count = getSaranCount(tier, testType.id, cat);
                          const isOverridden = count !== null;

                          return (
                            <div key={cat} className={`rounded-xl border p-3 transition-all ${
                              isOverridden ? `${meta.lightBg} ${meta.borderColor}` : 'border-gray-100 bg-gray-50'
                            }`}>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-text-dark truncate">{cat}</span>
                                {isOverridden && (
                                  <button
                                    onClick={() => clearOverride(tier, testType.id, cat)}
                                    className="text-[9px] text-red-400 hover:text-red-600 font-semibold transition-colors"
                                    title="Hapus override, gunakan default"
                                  >
                                    Reset
                                  </button>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="1"
                                  max="50"
                                  value={isOverridden ? count : ''}
                                  placeholder={String(defaultCount)}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    if (val && val >= 1) setSaranCount(tier, testType.id, cat, val);
                                  }}
                                  className={`input-field w-16 text-center text-sm ${isOverridden ? 'font-bold' : 'text-gray-400'}`}
                                />
                                <span className="text-[10px] text-gray-400">
                                  {isOverridden ? 'custom' : 'default'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2 min-w-[160px] justify-center">
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          Simpan Pengaturan
        </Button>
      </div>
    </div>
  );
}

/* ================================================================
   SECURITY PANEL — full fast login device management console
   ================================================================ */
function SecurityPanel() {
  const [supported, setSupported] = useState(false);
  const [authMethod, setAuthMethod] = useState('');
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // device id or 'register' or 'reset' or 'test'
  const [localCredentialId, setLocalCredentialId] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [diagnostics, setDiagnostics] = useState(null);
  const [capabilityStatus, setCapabilityStatus] = useState(null);

  const STORAGE_KEY = 'sf_fast_login_credential';

  useEffect(() => {
    const init = async () => {
      const ok = await isWebAuthnSupported();
      setSupported(ok);
      if (ok) setAuthMethod(getAuthMethodLabel());
      setLocalCredentialId(localStorage.getItem(STORAGE_KEY));

      // Load diagnostics & capability
      const [diag, cap] = await Promise.all([
        getDiagnostics(),
        checkWebAuthnCapability(),
      ]);
      setDiagnostics(diag);
      setCapabilityStatus(cap);

      await fetchDevices();
    };
    init();
  }, []);

  const fetchDevices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('fast_login_devices')
      .select('*')
      .order('registered_at', { ascending: false });
    setDevices(data || []);
    setLoading(false);
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  const handleToggleActive = async (device) => {
    setActionLoading(device.id);
    const newStatus = !device.is_active;
    await supabase
      .from('fast_login_devices')
      .update({ is_active: newStatus })
      .eq('id', device.id);

    // If deactivating the current device's credential, clear local storage
    if (!newStatus && device.credential_id === localCredentialId) {
      localStorage.removeItem(STORAGE_KEY);
      setLocalCredentialId(null);
    }

    showMessage('success', newStatus ? 'Perangkat diaktifkan.' : 'Perangkat dinonaktifkan.');
    setActionLoading(null);
    fetchDevices();
  };

  const handleDelete = async (device) => {
    if (!window.confirm(`Hapus perangkat "${device.device_name}"? Fast Login di perangkat tersebut akan berhenti bekerja.`)) return;
    setActionLoading(device.id);
    await supabase
      .from('fast_login_devices')
      .delete()
      .eq('id', device.id);

    // If deleting the current device's credential
    if (device.credential_id === localCredentialId) {
      localStorage.removeItem(STORAGE_KEY);
      setLocalCredentialId(null);
    }

    showMessage('success', 'Perangkat berhasil dihapus.');
    setActionLoading(null);
    fetchDevices();
  };

  const handleResetAll = async () => {
    if (!window.confirm('Hapus SEMUA perangkat Fast Login? Semua admin harus mendaftar ulang.')) return;
    setActionLoading('reset');
    await supabase
      .from('fast_login_devices')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all rows
    localStorage.removeItem(STORAGE_KEY);
    setLocalCredentialId(null);
    showMessage('success', 'Semua perangkat Fast Login telah dihapus.');
    setActionLoading(null);
    fetchDevices();
  };

  const handleRegisterThis = async () => {
    setActionLoading('register');
    try {
      await registerCredential();
      setLocalCredentialId(localStorage.getItem(STORAGE_KEY));
      showMessage('success', 'Perangkat ini berhasil didaftarkan untuk Fast Login.');
    } catch (err) {
      if (err.name !== 'NotAllowedError') {
        const errInfo = getWebAuthnErrorMessage(err);
        showMessage('error', errInfo.message);
      }
    }
    setActionLoading(null);
    fetchDevices();
  };

  const handleTestAuth = async () => {
    setActionLoading('test');
    try {
      await authenticateCredential();
      showMessage('success', '✓ Fast Login berhasil! Autentikasi perangkat berfungsi dengan baik.');
    } catch (err) {
      const errInfo = getWebAuthnErrorMessage(err);
      showMessage('error', `Tes gagal: ${errInfo.message}`);
    }
    setActionLoading(null);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const getCapabilityBadge = () => {
    if (!capabilityStatus) return null;
    switch (capabilityStatus.status) {
      case WebAuthnStatus.READY:
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Siap</span>;
      case WebAuthnStatus.NO_PLATFORM_AUTHENTICATOR:
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Tidak Ada Autentikator</span>;
      case WebAuthnStatus.UNSUPPORTED:
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">Tidak Didukung</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-5">
      {/* Info */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700 flex items-start gap-2">
        <Info size={18} className="shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold mb-1">Manajemen Fast Login</p>
          <p>Kelola semua perangkat yang terdaftar untuk Fast Login. Anda dapat mengaktifkan, menonaktifkan, atau menghapus perangkat dari sini.</p>
        </div>
      </div>

      {/* Device Diagnostics Card */}
      {diagnostics && (
        <div className="card border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-gray-600 flex items-center gap-2">
              <Info size={14} />
              Perangkat Ini
            </h3>
            {getCapabilityBadge()}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Browser', value: diagnostics.browser },
              { label: 'OS', value: diagnostics.os },
              { label: 'Mode', value: diagnostics.isPWA ? 'PWA' : 'Browser' },
              { label: 'WebAuthn', value: diagnostics.webAuthnAPI ? '✓ Didukung' : '✗ Tidak' },
              { label: 'Autentikator', value: diagnostics.platformAuthenticator ? '✓ Tersedia' : '✗ Tidak ada' },
              { label: 'Secure Context', value: diagnostics.isSecureContext ? '✓ Ya' : '✗ Tidak' },
              { label: 'Metode', value: supported ? authMethod : '—' },
              { label: 'Kredensial Lokal', value: diagnostics.localCredentialStored ? diagnostics.localCredentialId : 'Tidak ada' },
            ].map((item, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-2">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">{item.label}</p>
                <p className="text-xs font-semibold text-text-dark mt-0.5 truncate">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status Message */}
      {message.text && (
        <div className={`rounded-xl p-3 text-sm text-center font-medium animate-fade-in ${
          message.type === 'success' ? 'bg-green-50 border border-green-100 text-green-700' : 'bg-red-50 border border-red-100 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        {supported && (
          <button
            onClick={handleRegisterThis}
            disabled={actionLoading === 'register'}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {actionLoading === 'register' ? <Loader2 size={16} className="animate-spin" /> : <Fingerprint size={16} />}
            Daftarkan Perangkat Ini
          </button>
        )}
        {supported && localCredentialId && (
          <button
            onClick={handleTestAuth}
            disabled={actionLoading === 'test'}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary/10 text-secondary font-semibold text-sm hover:bg-secondary/20 transition-colors border border-secondary/20 disabled:opacity-50"
          >
            {actionLoading === 'test' ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
            Tes Fast Login
          </button>
        )}
        {devices.length > 0 && (
          <button
            onClick={handleResetAll}
            disabled={actionLoading === 'reset'}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 text-red-600 font-semibold text-sm hover:bg-red-100 transition-colors border border-red-200 disabled:opacity-50"
          >
            {actionLoading === 'reset' ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            Reset Semua
          </button>
        )}
      </div>

      {!supported && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-700 flex items-start gap-2">
          <Info size={16} className="shrink-0 mt-0.5" />
          <p>Browser ini tidak mendukung WebAuthn. Anda tetap dapat mengelola perangkat lain yang sudah terdaftar, tetapi tidak dapat mendaftarkan perangkat ini.</p>
        </div>
      )}

      {/* Device List */}
      <div className="space-y-3">
        <h3 className="font-bold text-sm text-gray-600 uppercase tracking-wide flex items-center gap-2">
          <ShieldCheck size={16} />
          Perangkat Terdaftar ({devices.length})
        </h3>

        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="animate-spin text-primary" size={28} />
          </div>
        ) : devices.length === 0 ? (
          <div className="card border-2 border-dashed border-gray-200 text-center py-10">
            <Fingerprint size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400 font-semibold mb-1">Belum ada perangkat terdaftar</p>
            <p className="text-xs text-gray-400">
              {supported
                ? 'Klik "Daftarkan Perangkat Ini" untuk memulai, atau login dengan kata sandi untuk mendapat tawaran aktivasi.'
                : 'Login dengan kata sandi dari perangkat yang mendukung WebAuthn untuk mendaftarkan Fast Login.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {devices.map(device => {
              const isThisDevice = device.credential_id === localCredentialId;
              const isLoading = actionLoading === device.id;

              return (
                <div key={device.id} className={`card border-2 transition-all ${
                  isThisDevice ? 'border-primary/30 bg-primary/[0.02]' : 'border-gray-100'
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    {/* Device info */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        device.is_active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                      }`}>
                        <Fingerprint size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm truncate">{device.device_name}</p>
                          {isThisDevice && (
                            <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full shrink-0">
                              Perangkat ini
                            </span>
                          )}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                            device.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                          }`}>
                            {device.is_active ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                          <p className="text-[11px] text-gray-400">
                            Didaftarkan: {formatDate(device.registered_at)}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            Terakhir digunakan: {formatDate(device.last_used_at)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {isLoading ? (
                        <Loader2 size={18} className="animate-spin text-gray-400" />
                      ) : (
                        <>
                          <button
                            onClick={() => handleToggleActive(device)}
                            className="text-gray-400 hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-gray-50"
                            title={device.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                          >
                            {device.is_active
                              ? <ToggleRight size={22} className="text-secondary" />
                              : <ToggleLeft size={22} />
                            }
                          </button>
                          <button
                            onClick={() => handleDelete(device)}
                            className="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50"
                            title="Hapus"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Shared Toggle Component ─── */
function ToggleRow({ label, enabled, onChange }) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-sm text-text-dark font-medium">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className="text-gray-400"
      >
        {enabled ? <ToggleRight size={24} className="text-secondary" /> : <ToggleLeft size={24} />}
      </button>
    </label>
  );
}
