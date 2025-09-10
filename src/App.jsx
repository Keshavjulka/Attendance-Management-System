import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Enrollment from './pages/Enrollment';
import Attendance from './pages/Attendance';
import Records from './pages/Records';
import TeacherPanel from './pages/TeacherPanel';
import ManualAttendance from './pages/ManualAttendance';
import BulkAttendance from './pages/BulkAttendance';

// Navigation Link Component
const NavLink = ({ to, icon, label, isActive }) => (
  <Link 
    to={to} 
    className={`nav-link ${isActive ? 'active' : ''}`}
    style={{
      display: 'flex',
      alignItems: 'center',
      padding: '12px 20px',
      color: isActive ? '#4361ee' : '#666',
      textDecoration: 'none',
      fontWeight: isActive ? '600' : '500',
      borderRadius: '8px',
      margin: '4px 0',
      transition: 'all 0.3s ease',
      backgroundColor: isActive ? 'rgba(67, 97, 238, 0.1)' : 'transparent',
    }}
  >
    <span style={{ marginRight: '10px', fontSize: '20px' }}>{icon}</span>
    <span>{label}</span>
  </Link>
);

// Navigation Component with Logout
const Navigation = ({ user, onLogout }) => {
  const location = useLocation();
  
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userInfo');
    onLogout();
  };

  return (
    <nav style={{
      width: '280px',
      backgroundColor: '#f8fafc',
      borderRight: '1px solid #e2e8f0',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0
    }}>
      {/* Header with User Info */}
      <div style={{ 
        padding: '20px',
        borderBottom: '1px solid #e2e8f0',
        marginBottom: '20px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '15px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: '#4361ee',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '18px',
            fontWeight: '600',
            marginRight: '12px'
          }}>
            {user.name ? user.name.charAt(0).toUpperCase() : '👤'}
          </div>
          <div>
            <h3 style={{
              margin: '0 0 4px 0',
              fontSize: '14px',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              {user.name}
            </h3>
            <p style={{
              margin: '0',
              fontSize: '12px',
              color: '#6b7280'
            }}>
              {user.email}
            </p>
          </div>
        </div>
        
        <h1 style={{ 
          fontSize: '24px', 
          margin: '0', 
          background: 'linear-gradient(45deg, #4361ee, #3a0ca3)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: '700'
        }}>
          FaceAttend Pro
        </h1>
        <p style={{ 
          fontSize: '14px', 
          margin: '5px 0 0 0', 
          color: '#666' 
        }}>
          Facial Recognition Attendance
        </p>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <NavLink 
          to="/" 
          icon="📝" 
          label="Student Enrollment" 
          isActive={location.pathname === '/'} 
        />
        <NavLink 
          to="/attendance" 
          icon="📱" 
          label="Mark Attendance" 
          isActive={location.pathname === '/attendance'} 
        />
        <NavLink 
          to="/records" 
          icon="📊" 
          label="Attendance Records" 
          isActive={location.pathname === '/records'} 
        />
        <NavLink 
          to="/teacher" 
          icon="👨‍🏫" 
          label="Teacher Panel" 
          isActive={location.pathname === '/teacher'} 
        />
        <NavLink 
          to="/manual-attendance" 
          icon="✏️" 
          label="Manual Attendance" 
          isActive={location.pathname === '/manual-attendance'} 
        />
        <NavLink 
          to="/bulk-attendance" 
          icon="📁" 
          label="Excel Upload" 
          isActive={location.pathname === '/bulk-attendance'} 
        />
      </div>
      
      {/* Logout Button */}
      <div style={{ 
        padding: '15px 20px', 
        borderTop: '1px solid #e2e8f0',
        marginTop: 'auto'
      }}>
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <span style={{ marginRight: '8px' }}>�</span>
          Logout
        </button>
      </div>
    </nav>
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('authToken');
    const userInfo = localStorage.getItem('userInfo');
    
    if (token && userInfo) {
      try {
        setUser(JSON.parse(userInfo));
      } catch (err) {
        // Clear invalid data
        localStorage.removeItem('authToken');
        localStorage.removeItem('userInfo');
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <Router>
      {!user ? (
        <Login onLogin={handleLogin} />
      ) : (
        <div style={{ 
          display: 'flex', 
          minHeight: '100vh',
          fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
        }}>
          <Navigation user={user} onLogout={handleLogout} />
          <main style={{ 
            flex: 1, 
            padding: '30px', 
            backgroundColor: '#ffffff', 
            overflowY: 'auto'
          }}>
            <Routes>
              <Route path="/" element={<Enrollment />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/records" element={<Records />} />
              <Route path="/teacher" element={<TeacherPanel />} />
              <Route path="/manual-attendance" element={<ManualAttendance />} />
              <Route path="/bulk-attendance" element={<BulkAttendance />} />
            </Routes>
          </main>
        </div>
      )}
    </Router>
  );
}

export default App;