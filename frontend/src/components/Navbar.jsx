import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BrainCircuit, LogOut } from 'lucide-react';

export default function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem('adminToken');

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <BrainCircuit size={28} className="text-primary" />
        Code<span>Quest</span>
      </Link>
      <div>
        {token ? (
          <button onClick={handleLogout} className="btn-outline">
            <LogOut size={18} /> Logout
          </button>
        ) : (
          <Link to="/admin" className="btn-outline" style={{ textDecoration: 'none' }}>
            Admin Login
          </Link>
        )}
      </div>
    </nav>
  );
}
