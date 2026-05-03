import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Table } from '../../components/Table';
import { Button } from '../../components/Button';
import { Plus, Loader2, Trash2, Pencil, Image, X } from 'lucide-react';

const CATEGORIES = {
  modality: ['Visual', 'Auditory', 'Kinesthetic', 'GENERAL'],
  multiple_intelligence: ['Linguistic', 'Logic-Mathematic', 'Spatial-Visual', 'Bodily-Kinesthetic', 'Musical', 'Interpersonal', 'Intrapersonal', 'Naturalist', 'GENERAL'],
  personality: ['Sanguine', 'Choleric', 'Melancholy', 'Phlegmatic'],
};

// Real scoring categories (excludes GENERAL which is a question mode, not a scoring category)
const SCORING_CATEGORIES = {
  modality: ['Visual', 'Auditory', 'Kinesthetic'],
  multiple_intelligence: ['Linguistic', 'Logic-Mathematic', 'Spatial-Visual', 'Bodily-Kinesthetic', 'Musical', 'Interpersonal', 'Intrapersonal', 'Naturalist'],
};

export default function QuestionManager() {
  const [activeTab, setActiveTab] = useState('modality');
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null); // null = adding, string = editing

  // Form state
  const [questionText, setQuestionText] = useState('');
  const [category, setCategory] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [options, setOptions] = useState([
    { text: '', points: 0, category: '' },
    { text: '', points: 0, category: '' },
  ]);

  const isPersonalityTab = activeTab === 'personality';
  const isGeneralType = !isPersonalityTab && category === 'GENERAL';

  const tabs = [
    { id: 'modality', label: 'Modalitas Belajar' },
    { id: 'multiple_intelligence', label: 'Multiple Intelligence' },
    { id: 'personality', label: 'Personality' },
  ];

  useEffect(() => {
    fetchQuestions(activeTab);
  }, [activeTab]);

  useEffect(() => {
    setCategory(CATEGORIES[activeTab]?.[0] || '');
  }, [activeTab]);

  const fetchQuestions = async (type) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('test_type', type)
      .order('created_at', { ascending: false });
    if (!error) setQuestions(data || []);
    setLoading(false);
  };

  // ── Open modal for ADD ──
  const openAddModal = () => {
    setEditingId(null);
    setQuestionText('');
    const defaultCat = activeTab === 'personality' ? 'Personality' : (CATEGORIES[activeTab]?.[0] || '');
    setCategory(defaultCat);
    setImageUrl('');
    if (activeTab === 'personality') {
      setOptions([
        { text: '', points: 1, category: CATEGORIES.personality[0] },
        { text: '', points: 1, category: CATEGORIES.personality[1] },
        { text: '', points: 1, category: CATEGORIES.personality[2] },
        { text: '', points: 1, category: CATEGORIES.personality[3] },
      ]);
    } else {
      setOptions([
        { text: '', points: 0 },
        { text: '', points: 0 },
      ]);
    }
    setShowModal(true);
  };

  // ── Open modal for EDIT ──
  const openEditModal = (q) => {
    setEditingId(q.id);
    setQuestionText(q.question_text);
    setCategory(q.category);
    setImageUrl(q.image_url || '');
    setOptions(
      q.options && q.options.length >= 2
        ? q.options.map((o) => ({ text: o.text, points: o.points || 0, category: o.category || '' }))
        : [{ text: '', points: 0, category: '' }, { text: '', points: 0, category: '' }]
    );
    setShowModal(true);
  };

  const addOption = () => {
    if (isPersonalityTab) {
      setOptions([...options, { text: '', points: 1, category: CATEGORIES.personality[0] }]);
    } else if (isGeneralType) {
      const scoringCats = SCORING_CATEGORIES[activeTab] || [];
      setOptions([...options, { text: '', points: 1, category: scoringCats[0] || '' }]);
    } else {
      setOptions([...options, { text: '', points: 0, category: '' }]);
    }
  };

  const removeOption = (index) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  };

  const updateOption = (index, field, value) => {
    const updated = [...options];
    updated[index] = { ...updated[index], [field]: field === 'points' ? parseInt(value, 10) || 0 : value };
    setOptions(updated);
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    setSaving(true);

    const filteredOptions = options.filter((o) => o.text.trim() !== '');
    if (filteredOptions.length < 2) {
      alert('Minimal 2 opsi jawaban diperlukan.');
      setSaving(false);
      return;
    }

    let finalOptions = filteredOptions;

    // For personality & GENERAL, ensure each option has a category and point default
    if (isPersonalityTab || isGeneralType) {
      const defaultCat = isPersonalityTab 
        ? CATEGORIES.personality[0] 
        : (SCORING_CATEGORIES[activeTab]?.[0] || '');

      finalOptions = filteredOptions.map(o => ({
        ...o,
        category: o.category || defaultCat,
        points: isGeneralType ? (o.points || 1) : o.points
      }));

      const missingCat = finalOptions.some(o => !o.category);
      if (missingCat) {
        alert(isPersonalityTab ? 'Setiap opsi harus memiliki tipe kepribadian yang dipilih.' : 'Setiap opsi harus memiliki kategori yang dipilih.');
        setSaving(false);
        return;
      }
    }

    const payload = {
      test_type: activeTab,
      category: isPersonalityTab ? 'Personality' : category,
      question_text: questionText,
      options: finalOptions,
      image_url: imageUrl || null,
      is_active: true,
    };

    let error;
    if (editingId) {
      // UPDATE existing question
      ({ error } = await supabase.from('questions').update(payload).eq('id', editingId));
    } else {
      // INSERT new question
      ({ error } = await supabase.from('questions').insert([payload]));
    }

    if (error) {
      alert(error.message);
    } else {
      setShowModal(false);
      setEditingId(null);
      fetchQuestions(activeTab);
    }
    setSaving(false);
  };

  const handleDeleteQuestion = async (id) => {
    if (!confirm('Yakin ingin menghapus pertanyaan ini?')) return;
    await supabase.from('questions').delete().eq('id', id);
    fetchQuestions(activeTab);
  };

  const columns = [
    { key: 'category', label: 'Kategori', sortable: true },
    {
      key: 'question_text',
      label: 'Pertanyaan',
      sortable: true,
      render: (r) => (
        <div>
          <p className="font-medium">{r.question_text}</p>
          {r.image_url && (
            <a href={r.image_url} target="_blank" rel="noopener noreferrer" className="text-xs text-wave underline mt-1 inline-block">
              Lihat Gambar
            </a>
          )}
        </div>
      ),
    },
    {
      key: 'options',
      label: 'Opsi',
      sortable: false,
      render: (r) => {
        const count = r.options?.length || 0;
        if ((activeTab === 'personality' || r.category === 'GENERAL') && r.options) {
          const cats = r.options.map(o => {
            const catLabel = (o.category || '?').substring(0, 3);
            const pts = o.points || (activeTab === 'personality' ? 1 : 0);
            return r.category === 'GENERAL' ? `${catLabel}+${pts}` : catLabel;
          }).join(', ');
          return <span className="text-sm">{count} opsi <span className="text-gray-400">({cats})</span></span>;
        }
        return <span>{count} opsi</span>;
      },
    },
    {
      key: 'is_active',
      label: 'Status',
      sortable: true,
      render: (r) => (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${r.is_active ? 'bg-green-50 text-green-700' : 'bg-red-100 text-red-600'}`}>
          {r.is_active ? 'Aktif' : 'Draf'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Aksi',
      sortable: false,
      render: (r) => (
        <div className="flex items-center gap-2">
          <button onClick={() => openEditModal(r)} className="text-wave hover:text-primary transition-colors" title="Edit">
            <Pencil size={16} />
          </button>
          <button onClick={() => handleDeleteQuestion(r.id)} className="text-red-400 hover:text-red-600 transition-colors" title="Hapus">
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  // Drive URL to thumbnail helper
  const getPreviewSrc = (url) => {
    if (!url) return null;
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return match ? `https://drive.google.com/thumbnail?id=${match[1]}&sz=w400` : url;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="text-2xl">Pustaka Pertanyaan</h2>
        <Button onClick={openAddModal} className="flex items-center gap-2 w-full sm:w-auto justify-center">
          <Plus size={18} /> Tambah Pertanyaan
        </Button>
      </div>

      {/* Tab Switcher */}
      <div className="flex space-x-1 bg-white p-1 rounded-xl shadow-sm border border-gray-100 w-full overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 px-3 rounded-lg font-semibold text-sm transition-all duration-200 whitespace-nowrap ${
              activeTab === tab.id ? 'bg-primary text-white shadow' : 'text-gray-500 hover:text-primary hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stats Bar */}
      {!loading && (
        <div className="flex flex-wrap gap-3">
          {activeTab === 'personality' ? (
            <div className="bg-white px-4 py-3 rounded-xl border border-gray-100 shadow-sm text-sm flex-1 min-w-[140px] flex flex-col items-center justify-center">
              <span className="text-gray-500 font-medium mb-1 text-center">Total Pertanyaan</span>
              <span className="font-bold text-primary text-2xl">{questions.length}</span>
            </div>
          ) : (
            CATEGORIES[activeTab]?.map(cat => {
              const count = questions.filter(q => q.category === cat).length;
              return (
                <div key={cat} className="bg-white px-4 py-3 rounded-xl border border-gray-100 shadow-sm text-sm flex-1 min-w-[140px] flex flex-col items-center justify-center">
                  <span className="text-gray-500 font-medium mb-1 text-center">{cat}</span>
                  <span className="font-bold text-primary text-2xl">{count}</span>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Table */}
      <div className="card overflow-x-auto">
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : (
          <Table columns={columns} data={questions} />
        )}
      </div>

      {/* Add / Edit Question Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white rounded-xl p-6 md:p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">{editingId ? 'Edit Pertanyaan' : 'Tambah Pertanyaan Baru'}</h3>
              <button onClick={() => { setShowModal(false); setEditingId(null); }} className="text-gray-400 hover:text-gray-600">
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-5">
              {/* Category - hidden for personality since each option has its own category */}
              {!isPersonalityTab && (
                <div>
                  <label className="block text-sm font-medium mb-1">Kategori</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-field" required>
                    {(CATEGORIES[activeTab] || []).map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Personality info banner */}
              {isPersonalityTab && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
                  <p className="font-semibold mb-1">ℹ️ Mode Tes Kepribadian</p>
                  <p>Setiap opsi jawaban menentukan tipe kepribadian. Siswa memilih pernyataan yang paling sesuai — tidak ada jawaban benar/salah.</p>
                </div>
              )}

              {/* GENERAL type info banner */}
              {isGeneralType && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
                  <p className="font-semibold mb-1">🎯 Mode GENERAL</p>
                  <p>Setiap opsi jawaban dapat menambahkan poin ke kategori yang berbeda. Atur kategori dan poin untuk setiap opsi di bawah.</p>
                </div>
              )}

              {/* Question Text */}
              <div>
                <label className="block text-sm font-medium mb-1">Pertanyaan</label>
                <textarea
                  required
                  rows={3}
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  className="input-field resize-none"
                  placeholder="Tulis pertanyaan di sini..."
                />
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  <span className="flex items-center gap-1">
                    <Image size={14} /> Tautan Gambar (opsional)
                  </span>
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="input-field"
                  placeholder="https://drive.google.com/... atau URL gambar lainnya"
                />
                {imageUrl && (
                  <div className="mt-2 p-2 border border-gray-200 rounded-lg">
                    <img
                      src={getPreviewSrc(imageUrl)}
                      alt="Preview"
                      className="max-h-32 object-contain rounded"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <p className="text-xs text-gray-400 mt-1 truncate">{imageUrl}</p>
                  </div>
                )}
              </div>

              {/* Options */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {isPersonalityTab ? 'Opsi Pernyataan & Tipe Kepribadian' : isGeneralType ? 'Opsi Jawaban — Kategori & Poin' : 'Opsi Jawaban & Poin'}
                </label>
                <div className="space-y-3">
                  {options.map((opt, i) => (
                    <div key={i} className={`flex items-center gap-2 ${(isPersonalityTab || isGeneralType) ? 'flex-wrap sm:flex-nowrap' : ''}`}>
                      <span className="text-xs text-gray-400 font-bold w-6 shrink-0">{i + 1}.</span>
                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) => updateOption(i, 'text', e.target.value)}
                        className="input-field flex-1"
                        placeholder={isPersonalityTab ? `Pernyataan ${i + 1}` : `Opsi ${i + 1}`}
                        required
                      />
                      {isPersonalityTab ? (
                        /* Personality: category dropdown per option */
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-xs text-gray-400 hidden sm:inline">→</span>
                          <select
                            value={opt.category || CATEGORIES.personality[0]}
                            onChange={(e) => updateOption(i, 'category', e.target.value)}
                            className="input-field w-32 text-sm font-semibold"
                          >
                            {CATEGORIES.personality.map((cat) => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                          <span className="text-xs text-green-600 font-bold">+1</span>
                        </div>
                      ) : isGeneralType ? (
                        /* GENERAL: category dropdown + configurable points per option */
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-xs text-gray-400 hidden sm:inline">→</span>
                          <select
                            value={opt.category || (SCORING_CATEGORIES[activeTab] || [])[0] || ''}
                            onChange={(e) => updateOption(i, 'category', e.target.value)}
                            className="input-field w-36 text-sm font-semibold"
                          >
                            {(SCORING_CATEGORIES[activeTab] || []).map((cat) => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                          <span className="text-xs text-gray-400">+</span>
                          <input
                            type="number"
                            value={opt.points}
                            onChange={(e) => updateOption(i, 'points', e.target.value)}
                            className="input-field w-16 text-center"
                            min="1"
                            max="10"
                          />
                        </div>
                      ) : (
                        /* Other tests: plain points input */
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-xs text-gray-400">Poin:</span>
                          <input
                            type="number"
                            value={opt.points}
                            onChange={(e) => updateOption(i, 'points', e.target.value)}
                            className="input-field w-20 text-center"
                            min="0"
                            max="10"
                          />
                        </div>
                      )}
                      {options.length > 2 && (
                        <button type="button" onClick={() => removeOption(i)} className="text-red-400 hover:text-red-600 shrink-0">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addOption}
                  className="mt-3 text-sm text-wave hover:text-primary font-semibold flex items-center gap-1 transition-colors"
                >
                  <Plus size={14} /> Tambah Opsi
                </button>
              </div>

              {/* Submit */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <Button type="button" variant="secondary" onClick={() => { setShowModal(false); setEditingId(null); }}>
                  Batal
                </Button>
                <Button type="submit" disabled={saving} className="min-w-[120px] flex justify-center items-center">
                  {saving ? <Loader2 className="animate-spin" size={18} /> : (editingId ? 'Perbarui' : 'Simpan')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
