import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2 } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({ activeTokens: 0, completedAssessments: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      const { count: tokenCount } = await supabase.from('tokens').select('*', { count: 'exact', head: true });
      const { count: resultCount } = await supabase.from('assessment_results').select('*', { count: 'exact', head: true });
      
      setStats({ activeTokens: tokenCount || 0, completedAssessments: resultCount || 0 });
      setLoading(false);
    }
    loadStats();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl mb-4">Ringkasan Dasbor</h2>
      
      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" size={32} /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card flex flex-col justify-center items-center py-8 hover:-translate-y-1 transition-transform duration-300">
            <span className="text-sm font-medium text-text-dark uppercase tracking-wide">Total Token</span>
            <span className="text-4xl font-extrabold text-primary mt-2">{stats.activeTokens}</span>
          </div>
          <div className="card flex flex-col justify-center items-center py-8 hover:-translate-y-1 transition-transform duration-300">
            <span className="text-sm font-medium text-text-dark uppercase tracking-wide">Tes Selesai</span>
            <span className="text-4xl font-extrabold text-secondary mt-2">{stats.completedAssessments}</span>
          </div>
        </div>
      )}
    </div>
  );
}
