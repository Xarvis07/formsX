import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { PlusCircle, CheckCircle, FileSpreadsheet, Trash2, Trophy, AlertTriangle, Image as ImageIcon, Copy, Play } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#673ab7', '#0f9d58', '#4285f4', '#f4b400', '#db4437', '#00bcd4', '#9c27b0', '#e91e63', '#ff9800', '#795548'];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('questions'); // 'questions', 'responses', 'rankings', 'settings'
  const [responseTab, setResponseTab] = useState('summary'); // 'summary', 'individual'

  const [exams, setExams] = useState([]);
  const [editingExamId, setEditingExamId] = useState(null); // Which exam's questions are we currently editing
  const [filterExamId, setFilterExamId] = useState('overall'); // For Responses/Rankings

  const [questions, setQuestions] = useState([]);
  const [stats, setStats] = useState({ submissions: [], totalStats: null });
  const [loading, setLoading] = useState(true);

  const [expandedSubId, setExpandedSubId] = useState(null);
  const [activeQuestionId, setActiveQuestionId] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin');
      return;
    }
    fetchDashboardData();
  }, [navigate]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/dashboard');
      setExams(res.data.exams);
      setStats({ submissions: res.data.submissions, totalStats: res.data.totalStats });

      // Automatically select the active exam for editing, or the first one
      const active = res.data.exams.find(e => e.isActive) || res.data.exams[0];
      if (active) {
        setEditingExamId(active._id);
        fetchQuestionsForExam(active._id);
      } else {
        setLoading(false);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('adminToken');
        navigate('/admin');
      }
    }
  };

  const fetchQuestionsForExam = async (examId) => {
    try {
      const qsRes = await api.get(`/admin/exams/${examId}/questions`);
      setQuestions(qsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Switch which exam we are editing in the Questions tab
  const handleEditExamChange = (e) => {
    const id = e.target.value;
    setEditingExamId(id);
    fetchQuestionsForExam(id);
  };

// Settings Tab Actions
  const handleActivateExam = async (id) => {
    try {
      await api.put(`/admin/exams/${id}/active`);
      fetchDashboardData();
    } catch (err) { alert('Failed to activate exam'); }
  };

  const handleDeleteExam = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("WARNING: This will permanently delete this exam and ALL of its responses/submissions. Proceed?")) return;
    try {
      await api.delete(`/admin/exams/${id}`);
      fetchDashboardData();
    } catch (err) { alert('Failed to delete exam'); }
  };

  const handleDuplicateExam = async (id) => {
    try {
      await api.post(`/admin/exams/${id}/duplicate`);
      fetchDashboardData();
    } catch (err) { alert('Failed to duplicate exam'); }
  };

  const handleCreateNewExam = async () => {
    try {
      const title = prompt("Enter new exam name (e.g., 'Class B Test'):");
      if (!title) return;
      await api.post('/admin/exams', { title, topic: 'General' });
      fetchDashboardData();
    } catch (err) { alert('Failed to create exam'); }
  };

  // Export Data
  const handleExportAll = async () => {
    try {
      const res = await api.get(`/admin/export-all`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'overall_exam_responses.xlsx');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) { alert('Failed to export overall data'); }
  };

  const handleExportSpecific = async () => {
    if (filterExamId === 'overall') return handleExportAll();
    try {
      const res = await api.get(`/admin/export/${filterExamId}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'exam_responses.xlsx');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) { alert('Failed to export specific data'); }
  };

  const handleDeleteSubmission = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this response?")) return;
    try {
      await api.delete(`/admin/submissions/${id}`);
      fetchDashboardData();
    } catch (err) { alert("Failed to delete submission"); }
  };

  const handleUploadImage = async (qId, file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    try {
      await api.put(`/admin/questions/${qId}/image`, formData);
      fetchQuestionsForExam(editingExamId);
    } catch (err) { alert('Failed to upload image.'); }
  };

  const addBlankQuestion = async () => {
    if (!editingExamId) return;
    try {
      const res = await api.post('/admin/questions', {
        examId: editingExamId,
        text: 'Untitled Question',
        questionType: 'Multiple choice',
        options: ['Option 1'],
        correctAnswer: '',
        topic: ''
      });
      setQuestions([...questions, res.data]);
      setActiveQuestionId(res.data._id);
    } catch (err) { alert('Failed to add question'); }
  };

  const updateQuestionState = (qId, field, value) => {
    setQuestions(questions.map(q => q._id === qId ? { ...q, [field]: value } : q));
  };

  const saveQuestion = async (q) => {
    try {
      await api.put(`/admin/questions/${q._id}`, {
        text: q.text, options: q.options, questionType: q.questionType, correctAnswer: q.correctAnswer, topic: q.topic
      });
    } catch (err) { console.error('Failed to save question'); }
  };

  if (loading) return <div style={{textAlign:'center', marginTop:'50px', color: 'var(--text)'}}>Loading Editor...</div>;

  // Filter Submissions based on Selected Exam Tab (Overall vs Specific)
  const filteredSubmissions = filterExamId === 'overall' 
    ? stats.submissions 
    : stats.submissions.filter(s => s.examId && s.examId._id === filterExamId);

  // Derive Analytics from FILTERED submissions
  const editingExam = exams.find(e => e._id === editingExamId);
  const filterExam = exams.find(e => e._id === filterExamId);

  const questionAnalytics = questions.map(q => {
    const totalResponses = filteredSubmissions.length;
    let counts = {};
    if (q.options) {
      q.options.forEach(opt => counts[opt] = 0);
    }
    
    let textAnswers = [];
    let gridCounts = {};
    if (q.questionType === 'Multiple-choice grid') {
      (q.rows || []).forEach(r => {
        gridCounts[r] = {};
        q.options.forEach(opt => gridCounts[r][opt] = 0);
      });
    }

    filteredSubmissions.forEach(sub => {
      // Find answer where question text matches (since in 'overall' questions might have diff IDs but same text)
      const ans = sub.answers.find(a => a.questionId && a.questionId.text === q.text);
      if (ans && ans.selectedOption) {
        if (q.questionType === 'Multiple-choice grid') {
          try {
            const parsed = JSON.parse(ans.selectedOption);
            Object.keys(parsed).forEach(row => {
              if (gridCounts[row] && gridCounts[row][parsed[row]] !== undefined) {
                gridCounts[row][parsed[row]]++;
              }
            });
          } catch(e) {}
        } else if (q.questionType === 'Short answer' || q.questionType === 'Paragraph') {
          textAnswers.push({ student: sub.studentName, exam: sub.examId?.title, answer: ans.selectedOption });
        } else {
          if (counts[ans.selectedOption] === undefined) counts[ans.selectedOption] = 0;
          counts[ans.selectedOption]++;
        }
      }
    });

    // Format for Recharts (standard)
    const chartData = Object.keys(counts).map(key => ({
      name: key,
      value: counts[key]
    }));

    return { ...q, counts, totalResponses, textAnswers, chartData, gridCounts };
  });

  const renderChart = (q) => {
    if (q.questionType === 'Short answer' || q.questionType === 'Paragraph') {
      return (
        <div style={{ maxHeight: '300px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
          {q.textAnswers.length === 0 ? <p style={{color:'var(--text-muted)'}}>No answers yet.</p> : q.textAnswers.map((ans, idx) => (
            <div key={idx} style={{ padding: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ color: 'var(--text)', marginBottom: '0.3rem' }}>{ans.answer}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>- {ans.student} <span style={{opacity:0.5}}>({ans.exam})</span></div>
            </div>
          ))}
        </div>
      );
    }
    
    if (q.questionType === 'Multiple-choice grid') {
      return (
        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {Object.keys(q.gridCounts).map((row, idx) => {
            const rowData = Object.keys(q.gridCounts[row]).map(opt => ({ name: opt, value: q.gridCounts[row][opt] }));
            return (
              <div key={idx} style={{ background: 'rgba(0,0,0,0.1)', padding: '1rem', borderRadius: '8px' }}>
                <div style={{ marginBottom: '1rem', color: 'var(--text)', fontWeight: 500 }}>{row}</div>
                <div style={{ height: '200px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rowData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                      <XAxis dataKey="name" stroke="var(--text-muted)" tick={{fontSize: 10}} interval={0} angle={-45} textAnchor="end" height={60} />
                      <YAxis allowDecimals={false} stroke="var(--text-muted)" />
                      <RechartsTooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: '#fff' }} />
                      <Bar dataKey="value" fill={COLORS[idx % COLORS.length]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    if (q.questionType === 'Linear scale') {
      return (
        <div style={{ height: '300px', width: '100%', marginTop: '1rem' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={q.chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <XAxis dataKey="name" stroke="var(--text-muted)" />
              <YAxis allowDecimals={false} stroke="var(--text-muted)" />
              <RechartsTooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: '#fff' }} />
              <Bar dataKey="value" fill="var(--accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }
  
    if (q.questionType === 'Drop-down' || q.questionType === 'Multiple choice' || !q.questionType) {
      // Pie Chart
      return (
        <div style={{ height: '300px', width: '100%', marginTop: '1rem', display: 'flex', alignItems: 'center' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={q.chartData}
                cx="50%"
                cy="50%"
                labelLine={true}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => percent > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
              >
                {q.chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: '#fff' }} />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      );
    }
  
    // Checkboxes (Horizontal Bar Chart)
    return (
      <div style={{ height: `${q.chartData.length * 40 + 50}px`, width: '100%', marginTop: '1rem' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={q.chartData} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
            <XAxis type="number" allowDecimals={false} stroke="var(--text-muted)" />
            <YAxis dataKey="name" type="category" stroke="var(--text-muted)" width={120} />
            <RechartsTooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: '#fff' }} />
            <Bar dataKey="value" fill="var(--primary-color)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const sortedRankings = [...filteredSubmissions].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.timeTakenSeconds - b.timeTakenSeconds;
  });

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '100px' }}>
      {/* Top Header Tabs */}
      <div className="glass-panel" style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '2rem', padding: '1rem', position: 'sticky', top: '1rem', zIndex: 10 }}>
        <div onClick={() => setActiveTab('questions')} style={{ cursor: 'pointer', color: activeTab === 'questions' ? 'var(--accent)' : 'var(--text-muted)', fontWeight: activeTab === 'questions' ? 600 : 400, borderBottom: activeTab === 'questions' ? '2px solid var(--accent)' : 'none', paddingBottom: '0.5rem' }}>Questions</div>
        <div onClick={() => setActiveTab('responses')} style={{ cursor: 'pointer', color: activeTab === 'responses' ? 'var(--accent)' : 'var(--text-muted)', fontWeight: activeTab === 'responses' ? 600 : 400, borderBottom: activeTab === 'responses' ? '2px solid var(--accent)' : 'none', paddingBottom: '0.5rem' }}>
          Responses <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: '12px', padding: '2px 8px', fontSize: '12px', marginLeft: '5px' }}>{filteredSubmissions.length}</span>
        </div>
        <div onClick={() => setActiveTab('rankings')} style={{ cursor: 'pointer', color: activeTab === 'rankings' ? 'var(--accent)' : 'var(--text-muted)', fontWeight: activeTab === 'rankings' ? 600 : 400, borderBottom: activeTab === 'rankings' ? '2px solid var(--accent)' : 'none', paddingBottom: '0.5rem' }}>Rankings</div>
        <div onClick={() => setActiveTab('settings')} style={{ cursor: 'pointer', color: activeTab === 'settings' ? 'var(--accent)' : 'var(--text-muted)', fontWeight: activeTab === 'settings' ? 600 : 400, borderBottom: activeTab === 'settings' ? '2px solid var(--accent)' : 'none', paddingBottom: '0.5rem' }}>Exam Settings</div>
      </div>

      <div>
        {/* QUESTIONS TAB */}
        {activeTab === 'questions' && (
          <div>
            <div className="glass-panel" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 500, color: 'var(--text-muted)' }}>Editing Exam Questions:</div>
              <select value={editingExamId || ''} onChange={handleEditExamChange} style={{ padding: '0.8rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--accent)', color: 'var(--text)', borderRadius: '8px', fontSize: '1rem', outline: 'none' }}>
                {exams.map(e => (
                  <option key={e._id} value={e._id}>{e.title} {e.isActive ? '(Active)' : ''}</option>
                ))}
              </select>
            </div>

            {editingExam && (
              <div className="glass-panel" style={{ borderTop: '4px solid var(--accent)', marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '2rem', margin: '0 0 10px 0', fontWeight: 600, color: 'var(--text)' }}>{editingExam.title}</h1>
                <p style={{ color: 'var(--text-muted)', margin: 0 }}>{editingExam.topic}</p>
              </div>
            )}

            {questions.map((q, idx) => {
              const isEditing = activeQuestionId === q._id;
              
              return (
                <div key={q._id} className="glass-panel" onClick={() => setActiveQuestionId(q._id)} style={{ marginBottom: '1.5rem', transition: 'all 0.2s', borderLeft: isEditing ? '4px solid var(--accent)' : '4px solid transparent', cursor: isEditing ? 'default' : 'pointer' }}>
                  
                  {isEditing ? (
                    // EDIT MODE
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <input 
                          type="text" 
                          value={q.text} 
                          onChange={(e) => updateQuestionState(q._id, 'text', e.target.value)}
                          onBlur={() => saveQuestion(q)}
                          style={{ flex: 1, minWidth: '200px', padding: '1rem', fontSize: '1.1rem', background: 'rgba(0,0,0,0.2)', border: 'none', borderBottom: '1px solid var(--text-muted)', color: 'var(--text)' }}
                        />
                        <label style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '8px', transition: '0.3s' }} className="hover-lift" title="Upload Image">
                          <ImageIcon size={20} color="var(--accent)" />
                          <input type="file" style={{ display: 'none' }} accept="image/*" onChange={(e) => handleUploadImage(q._id, e.target.files[0])} />
                        </label>
                        <select 
                          value={q.questionType || 'Multiple choice'} 
                          onChange={(e) => {
                            updateQuestionState(q._id, 'questionType', e.target.value);
                            saveQuestion({...q, questionType: e.target.value});
                          }}
                          style={{ padding: '1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text)', borderRadius: '4px' }}
                        >
                          <option value="Short answer">Short answer</option>
                          <option value="Paragraph">Paragraph</option>
                          <option value="Multiple choice">Multiple choice</option>
                          <option value="Checkboxes">Checkboxes</option>
                          <option value="Drop-down">Drop-down</option>
                          <option value="Linear scale">Linear scale</option>
                          <option value="Multiple-choice grid">Multiple-choice grid</option>
                        </select>
                      </div>

                      {q.imageUrl && <img src={`${import.meta.env.VITE_API_URL || ''}${q.imageUrl}`} alt="Question visual" style={{ maxWidth: '100%', objectFit: 'contain', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', imageRendering: 'high-quality' }} />}

                      {/* Options Editor */}
                      {(q.questionType === 'Multiple choice' || q.questionType === 'Checkboxes' || q.questionType === 'Drop-down' || q.questionType === 'Linear scale' || q.questionType === 'Multiple-choice grid' || !q.questionType) && (
                        <div style={{ display: 'flex', flexDirection: q.questionType === 'Multiple-choice grid' ? 'row' : 'column', gap: '2rem', marginTop: '1rem' }}>
                          
                          {/* ROWS (for grid) */}
                          {q.questionType === 'Multiple-choice grid' && (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              <h4 style={{ margin: 0, color: 'var(--text-muted)' }}>Rows</h4>
                              {(q.rows || []).map((row, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <div style={{ color: 'var(--text-muted)' }}>{i+1}.</div>
                                  <input 
                                    type="text" value={row}
                                    onChange={(e) => {
                                      const newRows = [...(q.rows || [])]; newRows[i] = e.target.value;
                                      updateQuestionState(q._id, 'rows', newRows);
                                    }}
                                    onBlur={() => saveQuestion(q)}
                                    style={{ flex: 1, padding: '0.5rem', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text)' }}
                                  />
                                </div>
                              ))}
                              <div style={{ color: 'var(--text-muted)', cursor: 'pointer', padding: '0.5rem' }} onClick={() => {
                                const newRows = [...(q.rows || []), `Row ${(q.rows || []).length + 1}`];
                                updateQuestionState(q._id, 'rows', newRows); saveQuestion({...q, rows: newRows});
                              }}>Add row</div>
                            </div>
                          )}

                          {/* COLUMNS / OPTIONS */}
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {q.questionType === 'Multiple-choice grid' && <h4 style={{ margin: 0, color: 'var(--text-muted)' }}>Columns</h4>}
                            {q.options.map((opt, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '16px', height: '16px', borderRadius: q.questionType === 'Checkboxes' ? '2px' : '50%', border: '2px solid var(--text-muted)' }}></div>
                                <input 
                                  type="text" 
                                  value={opt}
                                  onChange={(e) => {
                                    const newOpts = [...q.options];
                                    newOpts[i] = e.target.value;
                                    updateQuestionState(q._id, 'options', newOpts);
                                  }}
                                  onBlur={() => saveQuestion(q)}
                                  style={{ flex: 1, padding: '0.5rem', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text)' }}
                                />
                              </div>
                            ))}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '0.5rem' }}>
                              <div style={{ width: '16px', height: '16px', borderRadius: q.questionType === 'Checkboxes' ? '2px' : '50%', border: '2px solid rgba(255,255,255,0.2)' }}></div>
                              <span 
                                style={{ color: 'var(--text-muted)', cursor: 'pointer', padding: '0.5rem' }}
                                onClick={() => {
                                  const newOpts = [...q.options, `Option ${q.options.length + 1}`];
                                  updateQuestionState(q._id, 'options', newOpts);
                                  saveQuestion({...q, options: newOpts});
                                }}
                              >
                                Add option
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {(q.questionType === 'Short answer' || q.questionType === 'Paragraph') && (
                        <div style={{ marginTop: '1rem', padding: '1rem', borderBottom: '1px dotted var(--text-muted)', color: 'var(--text-muted)' }}>
                          {q.questionType === 'Short answer' ? 'Short answer text' : 'Long answer text'}
                        </div>
                      )}

                    </div>
                  ) : (
                    // VIEW MODE
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 500, marginBottom: '1.5rem', width: '100%', color: 'var(--text)' }}>
                          {q.text} {q.imageUrl && <span style={{color:'var(--accent)', fontSize:'0.8rem', marginLeft:'10px'}}>(Image Attached)</span>}
                        </div>
                      </div>

                      {q.imageUrl && <img src={`${import.meta.env.VITE_API_URL || ''}${q.imageUrl}`} alt="Question visual" style={{ maxWidth: '100%', objectFit: 'contain', borderRadius: '8px', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.05)', imageRendering: 'high-quality' }} />}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        {q.questionType === 'Multiple-choice grid' && (
                          <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
                              <thead>
                                <tr>
                                  <th style={{ padding: '0.5rem' }}></th>
                                  {q.options.map((col, i) => <th key={i} style={{ padding: '0.5rem', color: 'var(--text-muted)' }}>{col}</th>)}
                                </tr>
                              </thead>
                              <tbody>
                                {(q.rows || []).map((row, i) => (
                                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: i % 2 === 0 ? 'rgba(0,0,0,0.1)' : 'transparent' }}>
                                    <td style={{ padding: '1rem', textAlign: 'left', color: 'var(--text)' }}>{row}</td>
                                    {q.options.map((_, j) => (
                                      <td key={j} style={{ padding: '1rem' }}>
                                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid var(--text-muted)', margin: '0 auto' }}></div>
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {(q.questionType === 'Multiple choice' || q.questionType === 'Checkboxes' || q.questionType === 'Drop-down' || q.questionType === 'Linear scale' || !q.questionType) && q.options.map((opt, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '16px', height: '16px', borderRadius: q.questionType === 'Checkboxes' ? '2px' : '50%', border: '2px solid var(--text-muted)' }}></div>
                            <span style={{ color: 'var(--text-muted)' }}>{opt}</span>
                            {opt === q.correctAnswer && <span style={{ color: 'var(--success)', fontSize: '0.8rem', marginLeft: '10px' }}><CheckCircle size={14} style={{verticalAlign:'middle'}}/> Correct Answer</span>}
                          </div>
                        ))}

                        {(q.questionType === 'Short answer' || q.questionType === 'Paragraph') && (
                          <div style={{ borderBottom: '1px dotted var(--text-muted)', width: '60%', paddingBottom: '0.5rem', color: 'var(--text-muted)' }}>
                            {q.questionType === 'Short answer' ? 'Short answer text' : 'Long answer text'}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 100 }}>
              <button onClick={addBlankQuestion} style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--accent)', color: '#fff', border: 'none', boxShadow: '0 4px 10px rgba(0,0,0,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="hover-lift">
                <PlusCircle size={30} />
              </button>
            </div>
          </div>
        )}

        {/* RESPONSES TAB */}
        {activeTab === 'responses' && (
          <div>
            <div className="glass-panel" style={{ padding: '0', marginBottom: '1.5rem', overflow: 'hidden' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', flexWrap: 'wrap', gap: '1rem' }}>
                <h2 style={{ fontSize: '1.8rem', margin: 0, fontWeight: 500 }}>{filteredSubmissions.length} responses</h2>
                
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <select value={filterExamId} onChange={(e) => setFilterExamId(e.target.value)} style={{ padding: '0.6rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--text-muted)', color: 'var(--text)', borderRadius: '8px', outline: 'none' }}>
                    <option value="overall">All Exams (Overall)</option>
                    {exams.map(e => (
                      <option key={e._id} value={e._id}>{e.title}</option>
                    ))}
                  </select>
                  <button onClick={handleExportSpecific} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--success)' }}>
                    <FileSpreadsheet size={18} /> Download Excel
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', padding: '1rem 0', background: 'rgba(0,0,0,0.1)' }}>
                <div onClick={() => setResponseTab('summary')} style={{ cursor: 'pointer', paddingBottom: '5px', borderBottom: responseTab === 'summary' ? '2px solid var(--accent)' : 'none', color: responseTab === 'summary' ? 'var(--accent)' : 'var(--text-muted)', fontWeight: 500 }}>Summary</div>
                <div onClick={() => setResponseTab('individual')} style={{ cursor: 'pointer', paddingBottom: '5px', borderBottom: responseTab === 'individual' ? '2px solid var(--accent)' : 'none', color: responseTab === 'individual' ? 'var(--accent)' : 'var(--text-muted)', fontWeight: 500 }}>Individual</div>
              </div>

            </div>

            {responseTab === 'summary' && (
              <div>
                <div className="glass-panel text-center" style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ margin: '0 0 1rem 0', fontWeight: 500, color: 'var(--text-muted)' }}>Average Score ({filterExamId === 'overall' ? 'Overall' : filterExam?.title})</h3>
                  <div style={{ fontSize: '2.5rem', color: 'var(--accent)', fontWeight: 'bold' }}>
                    {filteredSubmissions.length > 0 ? (filteredSubmissions.reduce((acc, sub) => acc + sub.score, 0) / filteredSubmissions.length).toFixed(2) : 0}
                  </div>
                </div>

                {questionAnalytics.map((q, i) => (
                  <div key={q._id} className="glass-panel" style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>{q.text}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{q.totalResponses} responses</div>
                    {renderChart(q)}
                  </div>
                ))}
              </div>
            )}

            {responseTab === 'individual' && (
              <div className="glass-panel" style={{ marginBottom: '1.5rem' }}>
                {filteredSubmissions.length === 0 ? <p>No responses yet.</p> : (
                  <div>
                    {filteredSubmissions.map((sub, i) => (
                      <div key={sub._id} style={{ marginBottom: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', overflow: 'hidden' }}>
                        <div 
                          style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: expandedSubId === sub._id ? 'rgba(0,0,0,0.2)' : 'transparent' }}
                          onClick={() => setExpandedSubId(expandedSubId === sub._id ? null : sub._id)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div style={{ backgroundColor: 'var(--accent)', color: '#fff', width: '35px', height: '35px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{i+1}</div>
                            <div>
                              <strong style={{ fontSize: '1.1rem' }}>{sub.studentName}</strong> <span style={{ color: 'var(--text-muted)' }}>({sub.studentId})</span>
                              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Score: <span style={{color: 'var(--accent)'}}>{sub.score}</span> | Time: {sub.timeTakenSeconds}s | Exam: {sub.examId?.title} | Tab Switches: <span style={{color: sub.tabSwitches > 0 ? 'var(--danger)' : 'var(--success)'}}>{sub.tabSwitches}</span></div>
                            </div>
                          </div>
                          
                          <button onClick={(e) => handleDeleteSubmission(sub._id, e)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--danger)' }} title="Delete Response">
                            <Trash2 size={20} />
                          </button>
                        </div>

                        {expandedSubId === sub._id && (
                          <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.1)' }}>
                            {questions.map((q, idx) => {
                              const ans = sub.answers.find(a => a.questionId && a.questionId.text === q.text);
                              return (
                                <div key={q._id} style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                  <div style={{ marginBottom: '0.5rem', fontSize: '1rem', color: 'var(--text)' }}>{q.text}</div>
                                  <div style={{ color: ans ? (ans.isCorrect || q.isSurvey ? 'var(--success)' : 'var(--text)') : 'var(--text-muted)', fontWeight: 500, fontSize: '0.9rem' }}>
                                    {ans ? ans.selectedOption : 'Not Answered'}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* RANKINGS TAB */}
        {activeTab === 'rankings' && (
          <div className="glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}><Trophy color="var(--warning)" /> Leaderboard / Rankings</h2>
              <select value={filterExamId} onChange={(e) => setFilterExamId(e.target.value)} style={{ padding: '0.6rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--text-muted)', color: 'var(--text)', borderRadius: '8px', outline: 'none' }}>
                <option value="overall">All Exams (Overall)</option>
                {exams.map(e => (
                  <option key={e._id} value={e._id}>{e.title}</option>
                ))}
              </select>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.2)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '1rem' }}>Rank</th>
                    <th style={{ padding: '1rem' }}>Student</th>
                    <th style={{ padding: '1rem' }}>Exam</th>
                    <th style={{ padding: '1rem' }}>Score</th>
                    <th style={{ padding: '1rem' }}>Time Taken</th>
                    <th style={{ padding: '1rem' }}>Integrity Flag</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRankings.map((sub, i) => (
                    <tr key={sub._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: sub.tabSwitches > 0 ? 'rgba(255,0,0,0.05)' : 'transparent' }}>
                      <td style={{ padding: '1rem', fontWeight: 'bold', color: i < 3 ? 'var(--warning)' : 'var(--text)' }}>#{i + 1}</td>
                      <td style={{ padding: '1rem' }}>{sub.studentName} <div style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>{sub.studentId}</div></td>
                      <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{sub.examId?.title}</td>
                      <td style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--accent)' }}>{sub.score}</td>
                      <td style={{ padding: '1rem' }}>{Math.floor(sub.timeTakenSeconds / 60)}m {sub.timeTakenSeconds % 60}s</td>
                      <td style={{ padding: '1rem' }}>
                        {sub.tabSwitches > 0 ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--danger)', fontSize: '0.8rem', background: 'rgba(255,0,0,0.1)', padding: '4px 8px', borderRadius: '4px' }}>
                            <AlertTriangle size={14} /> Switched Tabs ({sub.tabSwitches})
                          </span>
                        ) : (
                          <span style={{ color: 'var(--success)', fontSize: '0.8rem' }}>Clean Record</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {sortedRankings.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No rankings available.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div>
            <div className="glass-panel" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: 500 }}>Exam Management</h3>
                <p style={{ color: 'var(--text-muted)', margin: 0 }}>Create new exams, copy questions, and set which exam is currently active for students.</p>
              </div>
              <button onClick={handleCreateNewExam} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PlusCircle size={18} /> New Empty Exam
              </button>
            </div>

            {exams.map(e => (
              <div key={e._id} className="glass-panel" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: e.isActive ? '4px solid var(--success)' : '4px solid transparent' }}>
                <div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 500, color: 'var(--text)' }}>{e.title} {e.isActive && <span style={{ color: 'var(--success)', fontSize: '0.8rem', marginLeft: '10px', padding: '2px 8px', background: 'rgba(15,157,88,0.1)', borderRadius: '12px' }}>Live / Active</span>}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>{e.topic}</div>
                </div>
                
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button onClick={(event) => handleDeleteExam(e._id, event)} style={{ padding: '0.5rem 1rem', background: 'rgba(255,0,0,0.1)', color: 'var(--danger)', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }} className="hover-lift">
                    <Trash2 size={16} />
                  </button>
                  <button onClick={() => handleDuplicateExam(e._id)} style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', color: 'var(--text)', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }} className="hover-lift">
                    <Copy size={16} /> Duplicate
                  </button>
                  {!e.isActive && (
                    <button onClick={() => handleActivateExam(e._id)} style={{ padding: '0.5rem 1rem', background: 'var(--success)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }} className="hover-lift">
                      <Play size={16} /> Make Live
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
