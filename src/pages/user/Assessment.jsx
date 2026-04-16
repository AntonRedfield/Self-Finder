import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../store';
import { Button } from '../../components/Button';
import { Loader2 } from 'lucide-react';

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
    const { data } = await supabase
      .from('questions')
      .select('*')
      .eq('test_type', token.test_type)
      .eq('is_active', true);
      
    if (data) {
      let shuffledData = shuffle([...data]);
      
      // Determine Tier limit
      const limit = token.tier === 'LITE' ? 0.2 : token.tier === 'ELITE' ? 0.6 : 1;
      const count = Math.max(1, Math.floor(shuffledData.length * limit));
      shuffledData = shuffledData.slice(0, count);

      // Shuffle options within each question
      shuffledData = shuffledData.map(q => {
        let opts = q.options ? [...q.options] : [];
        if (token.test_type !== 'personality') {
          // only shuffle if not simple true/false type checkboxes
          opts = shuffle(opts);
        }
        return { ...q, options: opts };
      });
      
      setQuestions(shuffledData);
    }
    setLoading(false);
  };

  const currentQ = questions[currentIndex];

  const handleOptionSelect = (option) => {
    if (token.test_type === 'personality') {
      // Allow multiple selection (binary summation)
      const currentArr = answers[currentQ.id] || [];
      const optionExists = currentArr.find(o => o.text === option.text);
      if (optionExists) {
        setAnswers({ ...answers, [currentQ.id]: currentArr.filter(o => o.text !== option.text) });
      } else {
        setAnswers({ ...answers, [currentQ.id]: [...currentArr, option] });
      }
    } else {
      // Single choice Likert
      setAnswers({ ...answers, [currentQ.id]: [option] });
    }
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
      
      if (!scores[q.category]) scores[q.category] = 0;
      
      const qAnswers = answers[qId];
      if (token.test_type === 'personality') {
         scores[q.category] += qAnswers.length; // +1 for each checked
      } else {
         // sum points for Likert (usually just 1 answer)
         const sum = qAnswers.reduce((acc, curr) => acc + (parseInt(curr.points, 10) || 0), 0);
         scores[q.category] += sum;
      }
    });

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
      final_marking: resultMsg
    };

    const { data: resData } = await supabase.from('assessment_results').insert([payload]).select().single();
    
    setAssessmentData(resData || payload);
    setSubmitting(false);
    navigate('/results');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={48} /></div>;
  if (!questions.length) return <div className="p-8 text-center">Belum ada pertanyaan untuk jenis tes ini.</div>;

  const isPersonality = token.test_type === 'personality';
  const answeredCurrent = answers[currentQ.id] && answers[currentQ.id].length > 0;
  const canProceed = isPersonality ? true : answeredCurrent; // For personality, they might select 0 options. For others, require 1.

  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-bg-light flex flex-col items-center p-4">
      <div className="w-full max-w-2xl mt-8">
        <div className="w-full bg-[#E0E0E0] rounded-full h-2 mb-6 overflow-hidden">
          <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
        </div>

        <div className="card animate-fade-in relative">
          <span className="text-xs font-bold text-gray-400 tracking-wider absolute top-4 right-6">
            PERTANYAAN {currentIndex + 1} DARI {questions.length}
          </span>
          <h2 className="text-xl font-medium mt-4 mb-4 leading-relaxed text-text-black">{currentQ.question_text}</h2>
          
          {currentQ.image_url && (
            <div className="mb-6 flex justify-center">
              <img src={currentQ.image_url} alt="Gambar soal" className="max-h-48 object-contain rounded-lg border border-gray-100" />
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
                  <div className={`w-5 h-5 flex-shrink-0 flex items-center justify-center border-2 rounded ${isPersonality ? 'rounded-md' : 'rounded-full'} ${isSelected ? 'border-primary bg-primary' : 'border-gray-300'}`}>
                    {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-sm"></div>}
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
        </div>
      </div>
    </div>
  );
}
