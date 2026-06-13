import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Timer, CheckCircle, AlertOctagon } from 'lucide-react';

export default function Exam() {
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState(0);

  const [timeTaken, setTimeTaken] = useState(0);
  const [tabSwitches, setTabSwitches] = useState(0);
  const timerRef = useRef(null);

  const studentInfo = JSON.parse(localStorage.getItem('studentInfo') || '{}');

  useEffect(() => {
    if (!studentInfo.studentId) {
      navigate('/');
      return;
    }

    const fetchQuestions = async () => {
      try {
        const res = await api.get('/active-exam');
        setExam(res.data.exam);
        setQuestions(res.data.questions);
        setLoading(false);
        startTimer();
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load exam. Please check server connection.');
        setLoading(false);
      }
    };
    fetchQuestions();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitches(prev => prev + 1);
        alert('Warning: You switched tabs! This has been recorded.');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(timerRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [navigate]);

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setTimeTaken(prev => prev + 1);
    }, 1000);
  };

  const handleSelect = (option) => {
    const currentQ = questions[currentIdx];
    const existingAnsIdx = answers.findIndex(a => a.questionId === currentQ._id);
    
    let newAnswers = [...answers];
    if (existingAnsIdx >= 0) {
      newAnswers[existingAnsIdx].selectedOption = option;
    } else {
      newAnswers.push({ questionId: currentQ._id, selectedOption: option });
    }
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    clearInterval(timerRef.current);
    try {
      const payload = {
        ...studentInfo,
        examId: exam._id,
        answers,
        timeTakenSeconds: timeTaken,
        tabSwitches
      };
      const res = await api.post('/submit', payload);
      setScore(res.data.score);
      setFinished(true);
      localStorage.removeItem('studentInfo');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit exam');
    }
    setSubmitting(false);
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (loading) return <div className="text-center mt-4">Loading questions...</div>;
  if (error) return <div className="glass-panel text-center"><AlertOctagon color="var(--danger)" size={48} style={{margin:'0 auto'}} /><h3 className="mt-2 text-danger">{error}</h3></div>;
  if (questions.length === 0) return <div className="text-center mt-4">No questions available currently.</div>;

  if (finished) {
    return (
      <div className="glass-panel text-center" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <CheckCircle color="var(--accent)" size={64} style={{ margin: '0 auto' }} />
        <h2 className="mt-2">Exam Submitted Successfully!</h2>
        <p className="mt-2" style={{ color: 'var(--text-muted)' }}>Thank you for participating in our research.</p>
        <div className="mt-4" style={{ fontSize: '1.2rem' }}>
          <div>Score: <strong style={{ color: 'var(--accent)' }}>{score}</strong></div>
          <div>Time Taken: <strong>{formatTime(timeTaken)}</strong></div>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIdx];
  const currentAns = answers.find(a => a.questionId === currentQ._id)?.selectedOption;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', position: 'relative' }}>
      <div className="text-center mb-4">
        <h2>{exam.title}</h2>
        {exam.topic && <p style={{color: 'var(--text-muted)'}}>{exam.topic}</p>}
      </div>

      <div className="timer-box">
        <Timer size={18} /> {formatTime(timeTaken)}
      </div>

      <div className="glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '1rem', fontWeight: 600 }}>
          <span>Question {currentIdx + 1} of {questions.length}</span>
          {currentQ.topic && <span style={{ background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>{currentQ.topic}</span>}
        </div>
        
        {currentQ.text && <h3 style={{marginBottom: '1rem'}}>{currentQ.text}</h3>}
        {currentQ.imageUrl && (
          <div style={{ textAlign: 'center', marginBottom: '1.5rem', width: '100%' }}>
            <img src={`${import.meta.env.VITE_API_URL || ''}${currentQ.imageUrl}`} alt="Question" style={{ width: '100%', objectFit: 'contain', borderRadius: '8px', imageRendering: 'high-quality', background: 'rgba(255,255,255,0.02)' }} />
          </div>
        )}

        <div className="options-grid">
          {currentQ.questionType === 'Multiple-choice grid' ? (
            <div style={{ overflowX: 'auto', marginBottom: '1rem', width: '100%', gridColumn: '1 / -1' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '0.5rem' }}></th>
                    {currentQ.options.map((col, i) => <th key={i} style={{ padding: '0.5rem', color: 'var(--text-muted)' }}>{col}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {(currentQ.rows || []).map((row, i) => {
                    let currentGridObj = {};
                    try { if (currentAns) currentGridObj = JSON.parse(currentAns); } catch(e){}
                    const isAnswered = currentGridObj[row] !== undefined;
                    
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: isAnswered ? 'rgba(15,157,88,0.1)' : (i % 2 === 0 ? 'rgba(0,0,0,0.1)' : 'transparent') }}>
                        <td style={{ padding: '1rem', textAlign: 'left', color: 'var(--text)', fontWeight: 500 }}>{row}</td>
                        {currentQ.options.map((col, j) => (
                          <td key={j} style={{ padding: '1rem' }}>
                            <input 
                              type="radio" 
                              name={`${currentQ._id}-${row}`}
                              checked={currentGridObj[row] === col}
                              onChange={() => {
                                const newObj = { ...currentGridObj, [row]: col };
                                handleSelect(JSON.stringify(newObj));
                              }}
                              style={{ cursor: 'pointer', width: '20px', height: '20px', accentColor: 'var(--accent)' }}
                            />
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (currentQ.questionType === 'Multiple choice' || currentQ.questionType === 'Checkboxes' || currentQ.questionType === 'Drop-down' || currentQ.questionType === 'Linear scale' || !currentQ.questionType) ? (
            currentQ.options.map((opt, i) => (
              <button
                key={i}
                className={`option-btn ${currentAns === opt ? 'selected' : ''}`}
                onClick={() => handleSelect(opt)}
              >
                {opt}
              </button>
            ))
          ) : (
            <textarea
              placeholder="Type your answer here..."
              value={currentAns || ''}
              onChange={(e) => handleSelect(e.target.value)}
              style={{ width: '100%', minHeight: '120px', padding: '1rem', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text)', fontSize: '1rem', resize: 'vertical', gridColumn: '1 / -1' }}
            />
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
          <button 
            className="btn-primary" 
            onClick={handleNext}
            disabled={!currentAns || submitting}
          >
            {currentIdx === questions.length - 1 ? (submitting ? 'Submitting...' : 'Submit Exam') : 'Next Question'}
          </button>
        </div>
      </div>
    </div>
  );
}
