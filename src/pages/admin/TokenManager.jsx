import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Table } from '../../components/Table';
import { Button } from '../../components/Button';
import { Plus, Loader2, Trash2, RotateCcw } from 'lucide-react';

export default function TokenManager() {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [tokenText, setTokenText] = useState('');
  const [tier, setTier] = useState('LITE');
  const [testType, setTestType] = useState('modality');
  const [maxUsage, setMaxUsage] = useState(1);

  useEffect(() => {
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('tokens').select('*').order('created_at', { ascending: false });
    if (!error) setTokens(data || []);
    setLoading(false);
  };

  const handleCreateToken = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('tokens').insert([
      { token_text: tokenText.toUpperCase(), tier, test_type: testType, max_usage: parseInt(maxUsage, 10) }
    ]);
    if (!error) {
      setShowModal(false);
      setTokenText('');
      setMaxUsage(1);
      fetchTokens();
    } else {
      alert(error.message);
    }
  };

  const handleResetToken = async (id) => {
    if (!confirm('Yakin ingin mengatur ulang penggunaan token ini ke 0?')) return;
    const { error } = await supabase.from('tokens').update({ current_usage: 0 }).eq('id', id);
    if (!error) fetchTokens();
    else alert(error.message);
  };

  const handleDeleteToken = async (id) => {
    if (!confirm('Yakin ingin menghapus token ini secara permanen?')) return;
    const { error } = await supabase.from('tokens').delete().eq('id', id);
    if (!error) fetchTokens();
    else alert(error.message);
  };

  const columns = [
    { key: 'token_text', label: 'Kunci Token', sortable: true },
    { key: 'test_type', label: 'Jenis Tes', sortable: true, render: (r) => <span className="capitalize">{r.test_type.replace('_', ' ')}</span> },
    { key: 'tier', label: 'Tingkat', sortable: true, render: (r) => <span className={`font-bold ${r.tier === 'ULTIMATE' ? 'text-accent' : 'text-primary'}`}>{r.tier}</span> },
    { key: 'usage', label: 'Penggunaan', sortable: true, render: (r) => `${r.current_usage} / ${r.max_usage}` },
    { key: 'is_active', label: 'Status', sortable: true, render: (r) => (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${r.is_active ? 'bg-green-50 text-green-700' : 'bg-red-100 text-red-600'}`}>
        {r.is_active ? 'Aktif' : 'Tidak Aktif'}
      </span>
    )},
    {
      key: 'actions',
      label: 'Aksi',
      sortable: false,
      render: (r) => (
        <div className="flex items-center gap-2">
          <button onClick={() => handleResetToken(r.id)} className="text-wave hover:text-primary transition-colors" title="Reset penggunaan">
            <RotateCcw size={16} />
          </button>
          <button onClick={() => handleDeleteToken(r.id)} className="text-red-400 hover:text-red-600 transition-colors" title="Hapus token">
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="text-2xl">Manajemen Token</h2>
        <Button onClick={() => setShowModal(true)} className="flex items-center gap-2 w-full sm:w-auto justify-center">
          <Plus size={18} /> Buat Token
        </Button>
      </div>

      <div className="card overflow-x-auto">
        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" size={32} /></div>
        ) : (
          <Table columns={columns} data={tokens} />
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white rounded-xl p-6 md:p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl mb-4 font-bold">Buat Token Baru</h3>
            <form onSubmit={handleCreateToken} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Kunci Token</label>
                <input required value={tokenText} onChange={e => setTokenText(e.target.value)} className="input-field" placeholder="Cth: SEKOLAH-2026-X" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Jenis Tes</label>
                <select value={testType} onChange={e => setTestType(e.target.value)} className="input-field">
                  <option value="modality">Modalitas Belajar</option>
                  <option value="multiple_intelligence">Kecerdasan Majemuk</option>
                  <option value="personality">Kepribadian</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tingkat</label>
                <select value={tier} onChange={e => setTier(e.target.value)} className="input-field">
                  <option value="LITE">LITE</option>
                  <option value="ELITE">ELITE</option>
                  <option value="ULTIMATE">ULTIMATE</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Batas Penggunaan</label>
                <input type="number" required min="1" value={maxUsage} onChange={e => setMaxUsage(e.target.value)} className="input-field" />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Batal</Button>
                <Button type="submit">Buat</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
