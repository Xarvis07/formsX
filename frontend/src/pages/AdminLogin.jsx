import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Lock } from 'lucide-react';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  const handleChange = (e) => setCredentials({ ...credentials, [e.target.name]: e.target.value });

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/login', credentials);
      localStorage.setItem('adminToken', res.data.token);
      navigate('/admin/dashboard');
    } catch (err) {
      if (!err.response) {
        setError('Server is offline! Please start the backend server.');
      } else {
        setError('Invalid username or password');
      }
    }
  };



  return (
    <div className="glass-panel" style={{ maxWidth: '400px', margin: '10vh auto', textAlign: 'center' }}>
      <Lock size={48} color="var(--primary-color)" style={{ margin: '0 auto 1rem auto' }} />
      <h2 className="mb-4">Admin Login</h2>
      
      {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</div>}

      <form onSubmit={handleLogin} style={{ textAlign: 'left' }}>
        <div className="input-group">
          <label>Username</label>
          <input type="text" name="username" className="form-control" required onChange={handleChange} />
        </div>
        <div className="input-group">
          <label>Password</label>
          <input type="password" name="password" className="form-control" required onChange={handleChange} />
        </div>
        <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Login</button>
      </form>


    </div>
  );
}
