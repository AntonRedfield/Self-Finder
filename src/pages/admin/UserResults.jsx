import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Table } from '../../components/Table';
import { Loader2 } from 'lucide-react';

export default function UserResults() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadResults() {
      const { data } = await supabase.from('assessment_results').select('*, tokens(token_text)').order('completed_at', { ascending: false });
      setResults(data || []);
      setLoading(false);
    }
    loadResults();
  }, []);

  const columns = [
    { key: 'user_name', label: 'Nama Peserta', sortable: true },
    { key: 'tier', label: 'Tingkat', sortable: true, render: r => <span className={`font-bold ${r.tier === 'ULTIMATE' ? 'text-accent' : 'text-primary'}`}>{r.tier}</span> },
    { key: 'test_type', label: 'Tes Diambil', sortable: true, render: r => <span className="capitalize">{r.test_type.replace('_', ' ')}</span> },
    { key: 'final_marking', label: 'Ringkasan Hasil', sortable: true },
    { key: 'completed_at', label: 'Tanggal', sortable: true, render: r => new Date(r.completed_at).toLocaleDateString('id-ID') }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl">Hasil Tes</h2>
      
      <div className="card">
        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" size={32} /></div>
        ) : (
          <Table columns={columns} data={results} />
        )}
      </div>
    </div>
  );
}
