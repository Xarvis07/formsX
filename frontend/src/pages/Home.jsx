import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, AlertTriangle } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    studentName: '',
    studentId: '',
    university: '',
    semester: '1st Semester'
  });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const startExam = (e) => {
    e.preventDefault();
    localStorage.setItem('studentInfo', JSON.stringify(formData));
    navigate('/exam');
  };

  return (
    <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2 className="text-center mb-4">Programming Potential Research Assessment</h2>
      
      <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid var(--warning)', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' }}>
        <h4 style={{ color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <AlertTriangle size={18} /> Important Rules
        </h4>
        <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          <li>You can only take this exam <strong>once</strong>.</li>
          <li>Do not switch tabs or minimize the browser. Doing so will be recorded as a cheating attempt and may invalidate your score.</li>
          <li>Ensure a stable internet connection before starting.</li>
        </ul>
      </div>

      <form onSubmit={startExam}>
        <div className="input-group">
          <label>Full Name</label>
          <input type="text" className="form-control" name="studentName" required onChange={handleChange} />
        </div>
        <div className="input-group">
          <label>Student ID</label>
          <input type="text" className="form-control" name="studentId" required onChange={handleChange} />
        </div>
        <div className="input-group">
          <label>University (e.g., DIU CSE)</label>
          <input type="text" className="form-control" name="university" required onChange={handleChange} />
        </div>
        <div className="input-group">
          <label>Semester</label>
          <select className="form-control" name="semester" required onChange={handleChange}>
            <option value="1st Semester">1st Semester</option>
            <option value="2nd Semester">2nd Semester</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
          Start Assessment <ArrowRight size={18} />
        </button>
      </form>
    </div>
  );
}
