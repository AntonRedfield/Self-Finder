import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Table } from '../../components/Table';
import { Button } from '../../components/Button';
import { Plus, Loader2, Trash2, Image, X } from 'lucide-react';

const CATEGORIES = {
  modality: ['Visual', 'Auditory', 'Kinesthetic'],
  multiple_intelligence: ['Linguistic', 'Logic-Mathematic', 'Spatial-Visual', 'Bodily-Kinesthetic', 'Musical', 'Interpersonal', 'Intrapersonal', 'Naturalist'],
  personality: ['Sanguine', 'Choleric', 'Melancholy', 'Phlegmatic'],
};

export default function QuestionManager() {
  const [activeTab, setActiveTab] = useState('modality');
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [questionText, setQuestionText] = useState('');
  const [category, setCategory] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [options, setOptions] = useState([
    { text: '', points: 0 },
    { text: '', points: 0 },
  ]);

  const tabs = [
    { id: 'modality', label: 'Modalitas Belajar' },
    { id: 'multiple_intelligence', label: 'Multiple Intelligence' },
    { id: 'personality', label: 'Personality' },
  ];

  useEffect(() => {
    fetchQuestions(activeTab);
  }, [activeTab]);

  useEffect(() => {
    // Reset category when tab changes
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

  const openAddModal = () => {
    setQuestionText('');
    setCategory(CATEGORIES[activeTab]?.[0] || '');
    setImageUrl('');
    setOptions([
      { text: '', points: 0 },
      { text: '', points: 0 },
    ]);
    setShowModal(true);
  };

  const addOption = () => {
    setOptions([...options, { text: '', points: 0 }]);
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

    const payload = {
      test_type: activeTab,
      category,
      question_text: questionText,
      options: filteredOptions,
      image_url: imageUrl || null,
      is_active: true,
    };

    const { error } = await supabase.from('questions').insert([payload]);
    if (error) {
      alert(error.message);
    } else {
      setShowModal(false);
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
      label: 'Jumlah Opsi',
      sortable: false,
      render: (r) => <span>{r.options?.length || 0} opsi</span>,
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
      label: '',
      sortable: false,
      render: (r) => (
        <button onClick={() => handleDeleteQuestion(r.id)} className="text-red-400 hover:text-red-600 transition-colors" title="Hapus">
          <Trash2 size={16} />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl">Pustaka Pertanyaan</h2>
        <Button onClick={openAddModal} className="flex items-center gap-2">
          <Plus size={18} /> Tambah Pertanyaan
        </Button>
      </div>

      {/* Tab Switcher */}
      <div className="flex space-x-1 bg-white p-1 rounded-xl shadow-sm border border-gray-100 w-full">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition-all duration-200 ${
              activeTab === tab.id ? 'bg-primary text-white shadow' : 'text-gray-500 hover:text-primary hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : (
          <Table columns={columns} data={questions} />
        )}
      </div>

      {/* Add Question Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white rounded-xl p-6 md:p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Tambah Pertanyaan Baru</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-5">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium mb-1">Kategori</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-field" required>
                  {(CATEGORIES[activeTab] || []).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

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
                      src={imageUrl}
                      alt="Preview"
                      className="max-h-32 object-contain rounded"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                    <p className="text-xs text-gray-400 mt-1 truncate">{imageUrl}</p>
                  </div>
                )}
              </div>

              {/* Options */}
              <div>
                <label className="block text-sm font-medium mb-2">Opsi Jawaban & Poin</label>
                <div className="space-y-3">
                  {options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 font-bold w-6 shrink-0">{i + 1}.</span>
                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) => updateOption(i, 'text', e.target.value)}
                        className="input-field flex-1"
                        placeholder={`Opsi ${i + 1}`}
                        required
                      />
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
                <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={saving} className="min-w-[120px] flex justify-center items-center">
                  {saving ? <Loader2 className="animate-spin" size={18} /> : 'Simpan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
