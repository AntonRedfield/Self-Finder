import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../store';
import { Button } from '../../components/Button';
import { Loader2 } from 'lucide-react';
import Footer from '../../components/Footer';

// Utility for Fisher-Yates shuffle
function shuffle(array) {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

export default function Assessment() {
  const navigate = useNavigate();
  const { token, userDetails, setAssessmentData } = useStore();
  
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token || !userDetails) {
      navigate('/');
      return;
    }
    fetchQuestions();
  }, [token, userDetails, navigate]);

  const fetchQuestions = async () => {
    const [{ data }, { data: tierData }] = await Promise.all([
      supabase.from('questions').select('*').eq('test_type', token.test_type).eq('is_active', true),
      supabase.from('tier_settings').select('question_percentage').eq('tier', token.tier).maybeSingle(),
    ]);

    // Resolve tier limit: DB setting → hardcoded fallback
    const tierPct = tierData?.question_percentage;
    const tierLimit = tierPct != null
      ? tierPct / 100
      : (token.tier === 'LITE' ? 0.2 : token.tier === 'ELITE' ? 0.6 : 1);
      
    if (data && data.length > 0) {
      let selected = [];

      if (token.test_type === 'modality' || token.test_type === 'multiple_intelligence') {
        // ── BALANCED CATEGORY SELECTION ──
        // Separate GENERAL questions from category-specific ones
        const generalQuestions = data.filter(q => q.category === 'GENERAL');
        const categoryQuestions = data.filter(q => q.category !== 'GENERAL');

        // 1. Group category questions by category
        const grouped = {};
        categoryQuestions.forEach(q => {
          if (!grouped[q.category]) grouped[q.category] = [];
          grouped[q.category].push(q);
        });

        // 2. Shuffle each category independently
        const categories = Object.keys(grouped);
        categories.forEach(cat => { grouped[cat] = shuffle([...grouped[cat]]); });

        // 3. Find the minimum category size → equal per category
        const minPerCat = categories.length > 0 ? Math.min(...categories.map(cat => grouped[cat].length)) : 0;

        // 4. Take equal amount from each category
        let balanced = [];
        categories.forEach(cat => {
          balanced.push(...grouped[cat].slice(0, minPerCat));
        });

        // 5. Apply tier limit on category questions
        let totalCount = Math.max(categories.length, Math.floor(balanced.length * tierLimit));
        // Ensure totalCount is divisible by number of categories
        const perCat = categories.length > 0 ? Math.max(1, Math.floor(totalCount / categories.length)) : 0;
        
        selected = [];
        categories.forEach(cat => {
          selected.push(...grouped[cat].slice(0, perCat));
        });

        // 6. Add GENERAL questions with same tier limit
        const shuffledGeneral = shuffle([...generalQuestions]);
        const generalCount = Math.max(0, Math.floor(shuffledGeneral.length * tierLimit));
        selected.push(...shuffledGeneral.slice(0, generalCount));

        // Final shuffle so categories are interleaved randomly
        selected = shuffle(selected);
      } else {
        // ── PERSONALITY: simple shuffle + tier limit ──
        selected = shuffle([...data]);
        const count = Math.max(1, Math.floor(selected.length * tierLimit));
        selected = selected.slice(0, count);
      }

      // Shuffle options within each question (except personality)
      selected = selected.map(q => {
        let opts = q.options ? [...q.options] : [];
        if (token.test_type !== 'personality') {
          opts = shuffle(opts);
        }
        return { ...q, options: opts };
      });
      
      setQuestions(selected);
    }
    setLoading(false);
  };

  const currentQ = questions[currentIndex];

  const handleOptionSelect = (option) => {
    // All test types use single selection
    setAnswers({ ...answers, [currentQ.id]: [option] });
  };

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      await submitAssessment();
    }
  };

  const submitAssessment = async () => {
    setSubmitting(true);

    // Calculate score
    const scores = {};
    Object.keys(answers).forEach(qId => {
      const q = questions.find(qu => qu.id === qId);
      if (!q) return;
      
      const qAnswers = answers[qId];
      if (token.test_type === 'personality') {
        // Personality: each option has its own category
        // The selected option's category gets +1
        qAnswers.forEach(ans => {
          const cat = ans.category || q.category;
          if (!scores[cat]) scores[cat] = 0;
          scores[cat] += 1;
        });
      } else if (q.category === 'GENERAL') {
        // GENERAL: each option specifies its own category and points
        qAnswers.forEach(ans => {
          const cat = ans.category;
          if (!cat) return;
          if (!scores[cat]) scores[cat] = 0;
          scores[cat] += (parseInt(ans.points, 10) || 0);
        });
      } else {
        // Other tests: use question-level category + option points
        if (!scores[q.category]) scores[q.category] = 0;
        const sum = qAnswers.reduce((acc, curr) => acc + (parseInt(curr.points, 10) || 0), 0);
        scores[q.category] += sum;
      }
    });

    // Calculate max possible score per category
    const max_scores = {};
    if (token.test_type === 'personality') {
      // Personality: each question contributes +1 to exactly one type
      // Max possible for any type = total number of questions
      const totalQ = questions.length;
      // Collect all personality categories that appear in options
      const allCats = new Set();
      questions.forEach(q => {
        (q.options || []).forEach(opt => {
          if (opt.category) allCats.add(opt.category);
        });
      });
      allCats.forEach(cat => { max_scores[cat] = totalQ; });
      // Also ensure scored categories are included
      Object.keys(scores).forEach(cat => { if (!max_scores[cat]) max_scores[cat] = totalQ; });
    } else {
      // Modality / MI: max = sum of highest-point option per question in each category
      questions.forEach(q => {
        if (q.category === 'GENERAL') {
          // GENERAL: the highest-point option determines max contribution
          // Add max points to that option's category
          const opts = q.options || [];
          if (opts.length > 0) {
            const maxOpt = opts.reduce((best, o) => {
              const pts = parseInt(o.points, 10) || 0;
              return pts > (best.pts || 0) ? { cat: o.category, pts } : best;
            }, { cat: null, pts: 0 });
            if (maxOpt.cat) {
              if (!max_scores[maxOpt.cat]) max_scores[maxOpt.cat] = 0;
              max_scores[maxOpt.cat] += maxOpt.pts;
            }
          }
        } else {
          if (!max_scores[q.category]) max_scores[q.category] = 0;
          const maxOpt = Math.max(...(q.options || []).map(o => parseInt(o.points, 10) || 0));
          max_scores[q.category] += maxOpt;
        }
      });
    }

    // Final marking - getting max score category
    let maxCategory = 'N/A';
    let maxVal = -1;
    for (const [key, val] of Object.entries(scores)) {
   if (val > maxVal) { maxVal = val; maxCategory = key; }
    }

    let resultMsg = "";
    if (token.test_type === 'modality') resultMsg = `Modalitas dominan Anda adalah ${maxCategory}`;
    else if (token.test_type === 'multiple_intelligence') resultMsg = `Kecerdasan utama Anda adalah ${maxCategory}`;
    else if (token.test_type === 'personality') resultMsg = `Kepribadian dominan Anda adalah ${maxCategory}`;

    // Increment Usage Atomically (using RPC is best, but for now we simply update)
    await supabase.from('tokens').update({ current_usage: token.current_usage + 1 }).eq('id', token.id);

    // Save Result
    const payload = {
      token_id: token.id,
      user_name: userDetails.name,
      user_birthdate: userDetails.birthdate,
      user_occupation: userDetails.occupation,
      tier: token.tier,
      test_type: token.test_type,
      scores: scores,
      max_scores: max_scores,
      final_marking: resultMsg
    };

    const { data: resData } = await supabase.from('assessment_results').insert([payload]).select().single();
    
    setAssessmentData(resData || payload);
    setSubmitting(false);
    navigate('/results');
  };

  // Convert Google Drive share links to direct embeddable image URLs
  const getImageSrc = (url) => {
    if (!url) return null;
    // Match Google Drive file ID from various URL patterns
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match) {
      return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`;
    }
    return url; // Return as-is if not a Drive link
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={48} /></div>;
  if (!questions.length) return <div className="p-8 text-center">Belum ada pertanyaan untuk jenis tes ini.</div>;

  const isPersonality = token.test_type === 'personality';
  const answeredCurrent = answers[currentQ.id] && answers[currentQ.id].length > 0;
  const canProceed = answeredCurrent;

  const imageSrc = getImageSrc(currentQ.image_url);

  return (
    <div className="min-h-screen bg-bg-light flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="card animate-fade-in">
          <h2 className="text-xl font-medium mb-4 leading-relaxed text-text-black">{currentQ.question_text}</h2>
          
          {imageSrc && (
            <div className="mb-6 flex justify-center">
              <img src={imageSrc} alt="Gambar soal" className="max-h-48 object-contain rounded-lg border border-gray-100" onError={(e) => { e.target.style.display = 'none'; }} />
            </div>
          )}

          <div className="space-y-3">
            {currentQ.options && currentQ.options.map((opt, idx) => {
              const acts = answers[currentQ.id] || [];
              const isSelected = acts.find(o => o.text === opt.text);
              return (
                <div 
                  key={idx}
                  onClick={() => handleOptionSelect(opt)}
                  className={`border-2 rounded-xl p-4 cursor-pointer transition-all duration-200 flex items-center gap-3
                    ${isSelected ? 'border-primary bg-sky/20' : 'border-[#E0E0E0] hover:border-wave hover:bg-gray-50'}`}
                >
                  <div className={`w-5 h-5 flex-shrink-0 flex items-center justify-center border-2 rounded-full ${isSelected ? 'border-primary bg-primary' : 'border-gray-300'}`}>
                    {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full"></div>}
                  </div>
                  <span className="text-text-dark font-medium">{opt.text}</span>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between items-center mt-8 pt-4 border-t border-[#E0E0E0]">
            <Button variant="secondary" onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0 || submitting}>Kembali</Button>
            <Button onClick={handleNext} disabled={!canProceed || submitting} className="min-w-[120px]">
              {submitting ? <Loader2 className="animate-spin mx-auto" /> : (currentIndex === questions.length - 1 ? 'Selesai' : 'Lanjut')}
            </Button>
          </div>
          <Footer className="mt-8 pt-4 border-t border-gray-100" />
        </div>
      </div>
    </div>
  );
}
