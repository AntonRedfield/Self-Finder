import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/Button';
import { useNavigate } from 'react-router-dom';
import {
  Loader2, Plus, Trash2, Pencil, X, Save, Phone, Mail, MapPin, MessageCircle, Globe,
  MessageSquareQuote, Settings2, Contact2, GripVertical, ToggleLeft, ToggleRight, ArrowRight
} from 'lucide-react';

const CATEGORIES = {
  modality: ['Visual', 'Auditory', 'Kinesthetic'],
  multiple_intelligence: ['Linguistic', 'Logic-Mathematic', 'Spatial-Visual', 'Bodily-Kinesthetic', 'Musical', 'Interpersonal', 'Intrapersonal', 'Naturalist'],
  personality: ['Sanguine', 'Choleric', 'Melancholy', 'Phlegmatic'],
};

const SECTION_LABELS = {
  description: 'Deskripsi Utama',
  saran: 'Saran Pengembangan',
  kontekstual: 'Kontekstual',
};

const CONTACT_ICONS = {
  email: <Mail size={18} />,
  phone: <Phone size={18} />,
  whatsapp: <MessageCircle size={18} />,
  address: <MapPin size={18} />,
  other: <Globe size={18} />,
};

const CONTACT_TYPE_LABELS = {
  email: 'Email',
  phone: 'Telepon',
  whatsapp: 'WhatsApp',
  address: 'Alamat',
  other: 'Lainnya',
};

export default function CaptionManager() {
  const [activeTab, setActiveTab] = useState('captions');
  const tabs = [
    { id: 'captions', label: 'Keterangan Hasil', icon: <MessageSquareQuote size={16} /> },
    { id: 'contact', label: 'Kontak & Banner', icon: <Contact2 size={16} /> },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl">Kontak & Keterangan</h2>

      {/* Tab Switcher */}
      <div className="flex space-x-1 bg-white p-1 rounded-xl shadow-sm border border-gray-100 w-full overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 px-3 rounded-lg font-semibold text-sm transition-all duration-200 whitespace-nowrap flex items-center justify-center gap-2 ${activeTab === tab.id ? 'bg-primary text-white shadow' : 'text-gray-500 hover:text-primary hover:bg-gray-50'
              }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'captions' && <CaptionsPanel />}
      {activeTab === 'contact' && <ContactPanel />}
    </div>
  );
}

/* ================================================================
   CAPTIONS PANEL — manage description, saran, kontekstual per category
   ================================================================ */
function CaptionsPanel() {
  const [testType, setTestType] = useState('modality');
  const [category, setCategory] = useState(CATEGORIES.modality[0]);
  const [section, setSection] = useState('description');
  const [captions, setCaptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCaption, setEditingCaption] = useState(null);
  const [captionText, setCaptionText] = useState('');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setCategory(CATEGORIES[testType]?.[0] || '');
  }, [testType]);

  useEffect(() => {
    if (category) fetchCaptions();
  }, [testType, category, section]);

  const fetchCaptions = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('captions')
      .select('*')
      .eq('test_type', testType)
      .eq('category', category)
      .eq('section', section)
      .order('created_at', { ascending: true });
    setCaptions(data || []);
    setLoading(false);
  };



  const openAdd = () => {
    setEditingCaption(null);
    setCaptionText('');
    setShowModal(true);
  };

  const openEdit = (c) => {
    setEditingCaption(c);
    setCaptionText(c.caption_text);
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!captionText.trim()) return;
    setSaving(true);

    if (editingCaption) {
      await supabase.from('captions').update({ caption_text: captionText.trim() }).eq('id', editingCaption.id);
    } else {
      await supabase.from('captions').insert([{
        test_type: testType,
        category,
        section,
        caption_text: captionText.trim(),
      }]);
    }
    setSaving(false);
    setShowModal(false);
    fetchCaptions();
  };

  const handleDelete = async (id) => {
    if (!confirm('Yakin ingin menghapus keterangan ini?')) return;
    await supabase.from('captions').delete().eq('id', id);
    fetchCaptions();
  };

  const handleToggle = async (c) => {
    await supabase.from('captions').update({ is_active: !c.is_active }).eq('id', c.id);
    fetchCaptions();
  };



  const testTypeTabs = [
    { id: 'modality', label: 'Modalitas' },
    { id: 'multiple_intelligence', label: 'Multiple Intel.' },
    { id: 'personality', label: 'Personality' },
  ];

  const sectionTabs = [
    { id: 'description', label: 'Deskripsi' },
    { id: 'saran', label: 'Saran' },
    { id: 'kontekstual', label: 'Kontekstual' },
  ];

  return (
    <div className="space-y-5">
      {/* Test Type Selector */}
      <div className="flex space-x-1 bg-white p-1 rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        {testTypeTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTestType(t.id)}
            className={`flex-1 py-2 px-3 rounded-lg font-semibold text-sm transition-all duration-200 whitespace-nowrap ${testType === t.id ? 'bg-secondary text-white shadow' : 'text-gray-500 hover:text-secondary hover:bg-gray-50'
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Category & Section selectors */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Kategori</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-field">
            {(CATEGORIES[testType] || []).map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Bagian</label>
          <div className="flex space-x-1 bg-gray-50 p-1 rounded-lg">
            {sectionTabs.map((s) => (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className={`flex-1 py-1.5 px-2 rounded-md font-medium text-xs transition-all ${section === s.id ? 'bg-accent text-white shadow-sm' : 'text-gray-500 hover:text-accent'
                  }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Saran settings redirect */}
      {section === 'saran' && (
        <button
          onClick={() => navigate('/admin/settings')}
          className="w-full card bg-blue-50 border border-blue-100 flex items-center gap-3 group hover:bg-blue-100/50 transition-colors cursor-pointer text-left"
        >
          <Settings2 size={18} className="text-blue-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-800">Pengaturan Jumlah Saran</p>
            <p className="text-xs text-blue-600 mt-0.5">Jumlah saran yang ditampilkan kini diatur per tingkat (tier) di menu Pengaturan.</p>
          </div>
          <ArrowRight size={16} className="text-blue-400 group-hover:text-blue-600 transition-colors shrink-0" />
        </button>
      )}

      {/* Info banner */}
      <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-xs text-gray-500">
        {section === 'description' && '💡 Deskripsi utama yang muncul di hasil tes. Jika ada lebih dari satu, sistem akan mengacak dan memilih salah satu.'}
        {section === 'saran' && '💡 Setiap item = satu saran/rekomendasi. Sistem akan mengacak dan menampilkan sesuai jumlah yang diatur di atas.'}
        {section === 'kontekstual' && '💡 Paragraf kontekstual di akhir analisis. Jika lebih dari satu, sistem akan mengacak dan memilih salah satu.'}
      </div>

      {/* Caption list */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-primary">
          {SECTION_LABELS[section]} — {category}
          <span className="text-sm font-normal text-gray-400 ml-2">({captions.length} item)</span>
        </h3>
        <Button onClick={openAdd} className="flex items-center gap-1.5 text-sm">
          <Plus size={16} /> Tambah
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" size={32} /></div>
      ) : captions.length === 0 ? (
        <div className="card text-center text-gray-400 py-10">
          <MessageSquareQuote size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-semibold">Belum ada keterangan</p>
          <p className="text-sm mt-1">Klik tombol "Tambah" untuk menambahkan keterangan pertama.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {captions.map((c, idx) => (
            <div key={c.id} className={`card flex items-start gap-3 group transition-all duration-200 ${!c.is_active ? 'opacity-50' : ''}`}>
              <span className="w-7 h-7 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-dark leading-relaxed whitespace-pre-wrap">{c.caption_text}</p>
                {!c.is_active && (
                  <span className="inline-block mt-1 text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-full font-semibold">Nonaktif</span>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleToggle(c)} className="text-gray-400 hover:text-secondary transition-colors p-1" title={c.is_active ? 'Nonaktifkan' : 'Aktifkan'}>
                  {c.is_active ? <ToggleRight size={18} className="text-secondary" /> : <ToggleLeft size={18} />}
                </button>
                <button onClick={() => openEdit(c)} className="text-gray-400 hover:text-wave transition-colors p-1" title="Edit">
                  <Pencil size={15} />
                </button>
                <button onClick={() => handleDelete(c.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1" title="Hapus">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white rounded-xl p-6 md:p-8 max-w-lg w-full shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold">{editingCaption ? 'Edit Keterangan' : 'Tambah Keterangan Baru'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={22} /></button>
            </div>
            <div className="mb-4 bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-1">
              <p><span className="font-semibold text-gray-700">Tes:</span> {testType.replace('_', ' ')}</p>
              <p><span className="font-semibold text-gray-700">Kategori:</span> {category}</p>
              <p><span className="font-semibold text-gray-700">Bagian:</span> {SECTION_LABELS[section]}</p>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {section === 'saran' ? 'Satu item saran/rekomendasi' : 'Teks keterangan'}
                </label>
                <textarea
                  required
                  rows={section === 'saran' ? 3 : 5}
                  value={captionText}
                  onChange={(e) => setCaptionText(e.target.value)}
                  className="input-field resize-none"
                  placeholder={
                    section === 'saran'
                      ? 'Tulis satu saran, misal: Gunakan mind map untuk...'
                      : section === 'description'
                        ? 'Tulis deskripsi lengkap untuk kategori ini...'
                        : 'Tulis paragraf kontekstual...'
                  }
                />
              </div>
              <div className="flex justify-end space-x-3 pt-3 border-t border-gray-100">
                <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Batal</Button>
                <Button type="submit" disabled={saving} className="min-w-[100px] flex justify-center items-center">
                  {saving ? <Loader2 className="animate-spin" size={18} /> : (editingCaption ? 'Perbarui' : 'Simpan')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   CONTACT PANEL — manage banner text + contact buttons
   ================================================================ */
function ContactPanel() {
  const [contacts, setContacts] = useState([]);
  const [banner, setBanner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formType, setFormType] = useState('email');
  const [formLabel, setFormLabel] = useState('');
  const [formValue, setFormValue] = useState('');
  const [formLinkUrl, setFormLinkUrl] = useState('');

  // Banner state
  const [bannerText, setBannerText] = useState('');
  const [bannerActive, setBannerActive] = useState(true);
  const [savingBanner, setSavingBanner] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('contact_settings')
      .select('*')
      .order('display_order', { ascending: true });

    const bannerItem = (data || []).find((d) => d.setting_type === 'banner_text');
    const contactItems = (data || []).filter((d) => d.setting_type !== 'banner_text');

    setBanner(bannerItem || null);
    setBannerText(bannerItem?.value || '');
    setBannerActive(bannerItem?.is_active ?? true);
    setContacts(contactItems);
    setLoading(false);
  };

  const handleSaveBanner = async () => {
    setSavingBanner(true);
    if (banner) {
      await supabase.from('contact_settings').update({ value: bannerText, is_active: bannerActive }).eq('id', banner.id);
    } else {
      await supabase.from('contact_settings').insert([{
        setting_type: 'banner_text',
        label: 'Banner Konsultasi',
        value: bannerText,
        is_active: bannerActive,
        display_order: 0,
      }]);
    }
    setSavingBanner(false);
    fetchAll();
  };

  const openAddContact = () => {
    setEditingContact(null);
    setFormType('email');
    setFormLabel('');
    setFormValue('');
    setFormLinkUrl('');
    setShowModal(true);
  };

  const openEditContact = (c) => {
    setEditingContact(c);
    setFormType(c.setting_type);
    setFormLabel(c.label);
    setFormValue(c.value);
    setFormLinkUrl(c.link_url || '');
    setShowModal(true);
  };

  const handleSaveContact = async (e) => {
    e.preventDefault();
    setSaving(true);
    if (editingContact) {
      await supabase.from('contact_settings').update({
        setting_type: formType,
        label: formLabel,
        value: formValue,
        link_url: formLinkUrl,
      }).eq('id', editingContact.id);
    } else {
      await supabase.from('contact_settings').insert([{
        setting_type: formType,
        label: formLabel,
        value: formValue,
        link_url: formLinkUrl,
        is_active: true,
        display_order: contacts.length + 1,
      }]);
    }
    setSaving(false);
    setShowModal(false);
    fetchAll();
  };

  const handleDeleteContact = async (id) => {
    if (!confirm('Yakin ingin menghapus kontak ini?')) return;
    await supabase.from('contact_settings').delete().eq('id', id);
    fetchAll();
  };

  const handleToggleContact = async (c) => {
    await supabase.from('contact_settings').update({ is_active: !c.is_active }).eq('id', c.id);
    fetchAll();
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" size={32} /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Banner Section */}
      <div className="card space-y-4">
        <h3 className="text-lg font-bold text-primary flex items-center gap-2">
          <MessageSquareQuote size={20} /> Teks Banner Konsultasi
        </h3>
        <p className="text-xs text-gray-500">
          Teks ini muncul di bagian bawah laporan hasil tes pengguna, di atas tombol kontak.
        </p>
        <textarea
          rows={3}
          value={bannerText}
          onChange={(e) => setBannerText(e.target.value)}
          className="input-field resize-none"
          placeholder="Untuk analisis lebih mendalam, silakan hubungi pakar kami..."
        />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <button
              type="button"
              onClick={() => setBannerActive(!bannerActive)}
              className="text-gray-400"
            >
              {bannerActive ? <ToggleRight size={24} className="text-secondary" /> : <ToggleLeft size={24} />}
            </button>
            <span className={bannerActive ? 'text-secondary font-semibold' : 'text-gray-400'}>
              {bannerActive ? 'Aktif' : 'Nonaktif'}
            </span>
          </label>
          <button
            onClick={handleSaveBanner}
            disabled={savingBanner}
            className="btn-primary text-sm py-2 px-4 flex items-center gap-1.5"
          >
            {savingBanner ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
            Simpan Banner
          </button>
        </div>
      </div>

      {/* Contact Buttons Section */}
      <div className="card space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-primary flex items-center gap-2">
            <Contact2 size={20} /> Tombol Kontak
          </h3>
          <Button onClick={openAddContact} className="flex items-center gap-1.5 text-sm">
            <Plus size={16} /> Tambah
          </Button>
        </div>
        <p className="text-xs text-gray-500">
          Tombol kontak yang muncul di bawah banner pada laporan hasil. Anda bisa menambahkan email, telepon, WhatsApp, alamat, atau lainnya.
        </p>

        {contacts.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <Contact2 size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold">Belum ada tombol kontak</p>
            <p className="text-sm mt-1">Klik "Tambah" untuk menambahkan kontak pertama.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {contacts.map((c) => (
              <div key={c.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all group ${c.is_active ? 'border-gray-100 bg-white' : 'border-gray-100 bg-gray-50 opacity-50'}`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${c.setting_type === 'email' ? 'bg-blue-50 text-blue-500' :
                    c.setting_type === 'phone' ? 'bg-green-50 text-green-500' :
                      c.setting_type === 'whatsapp' ? 'bg-emerald-50 text-emerald-500' :
                        c.setting_type === 'address' ? 'bg-orange-50 text-orange-500' :
                          'bg-purple-50 text-purple-500'
                  }`}>
                  {CONTACT_ICONS[c.setting_type] || <Globe size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-text-dark truncate">{c.label || CONTACT_TYPE_LABELS[c.setting_type]}</p>
                  <p className="text-xs text-gray-400 truncate">Teks: {c.value}</p>
                  {c.link_url && <p className="text-[10px] text-blue-500 truncate mt-0.5">Link: {c.link_url}</p>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${c.is_active ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
                  }`}>
                  {CONTACT_TYPE_LABELS[c.setting_type]}
                </span>
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleToggleContact(c)} className="p-1 text-gray-400 hover:text-secondary transition-colors" title={c.is_active ? 'Nonaktifkan' : 'Aktifkan'}>
                    {c.is_active ? <ToggleRight size={18} className="text-secondary" /> : <ToggleLeft size={18} />}
                  </button>
                  <button onClick={() => openEditContact(c)} className="p-1 text-gray-400 hover:text-wave transition-colors" title="Edit">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => handleDeleteContact(c.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors" title="Hapus">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Contact Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white rounded-xl p-6 md:p-8 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold">{editingContact ? 'Edit Kontak' : 'Tambah Kontak Baru'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={22} /></button>
            </div>
            <form onSubmit={handleSaveContact} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Jenis Kontak</label>
                <select value={formType} onChange={(e) => setFormType(e.target.value)} className="input-field">
                  <option value="email">Email</option>
                  <option value="phone">Telepon</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="address">Alamat</option>
                  <option value="other">Lainnya</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Label</label>
                <input
                  required
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  className="input-field"
                  placeholder={formType === 'email' ? 'Email Konsultasi' : formType === 'phone' ? 'Telepon Kantor' : 'Label kontak'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {formType === 'email' ? 'Teks Singkat (Alamat Email)' :
                    formType === 'phone' ? 'Teks Singkat (Nomor Telepon)' :
                      formType === 'whatsapp' ? 'Teks Singkat (Nomor WhatsApp)' :
                        formType === 'address' ? 'Alamat Lengkap' : 'Teks Info'}
                </label>
                <input
                  required
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                  className="input-field"
                  placeholder={
                    formType === 'email' ? 'info@selffinder.com' :
                      formType === 'phone' ? '+62 812-3456-7890' :
                        formType === 'whatsapp' ? '+62 812-3456-7890' :
                          formType === 'address' ? 'Jl. Contoh No. 1, Kota' : 'Username / Info'
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Link Tautan Aktual (Opsional)</label>
                <p className="text-[10px] text-gray-500 mb-1.5 leading-snug">
                  Secara default sistem akan membuat link dari "Teks Singkat" di atas. Namun jika Anda memiliki format link khusus (misal: <strong>wa.me/62812...</strong> atau <strong>t.me/username</strong>), masukkan di sini.
                </p>
                <input
                  value={formLinkUrl}
                  onChange={(e) => setFormLinkUrl(e.target.value)}
                  className="input-field"
                  placeholder="https://wa.me/6281234567890"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-3 border-t border-gray-100">
                <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Batal</Button>
                <Button type="submit" disabled={saving} className="min-w-[100px] flex justify-center items-center">
                  {saving ? <Loader2 className="animate-spin" size={18} /> : (editingContact ? 'Perbarui' : 'Simpan')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
