import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../config.js';

const TeacherPanel = () => {
  const [lectureNumber, setLectureNumber] = useState('');
  const [lectureDate, setLectureDate] = useState('');
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAttendanceOptions, setShowAttendanceOptions] = useState(false);
  const [stats, setStats] = useState({
    totalLectures: 0,
    totalAttendance: 0,
    totalStudents: 0,
    averageAttendance: 0,
    todayAttendance: 0,
    weekAttendance: 0,
    activeLectures: 0
  });

  useEffect(() => {
    fetchLectures();
    fetchStats();
    
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    setLectureDate(today);
  }, []);

  const fetchLectures = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/lectures`);
      const data = await res.json();
      setLectures(data);
    } catch (err) {
      console.error('Error fetching lectures:', err);
    }
  };
  
  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/dashboard-stats`);
      if (res.ok) {
        const data = await res.json();
        setStats({
          totalLectures: data.totalLectures || 0,
          totalAttendance: data.totalAttendance || 0,
          totalStudents: data.totalStudents || 0,
          averageAttendance: data.averageAttendance || 0,
          todayAttendance: data.todayAttendance || 0,
          weekAttendance: data.weekAttendance || 0,
          activeLectures: data.activeLectures || 0
        });
      } else {
        console.error('Failed to fetch stats');
        // Fallback to zeros if API fails
        setStats({
          totalLectures: 0,
          totalAttendance: 0,
          totalStudents: 0,
          averageAttendance: 0,
          todayAttendance: 0,
          weekAttendance: 0,
          activeLectures: 0
        });
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
      // Fallback to zeros if API fails
      setStats({
        totalLectures: 0,
        totalAttendance: 0,
        totalStudents: 0,
        averageAttendance: 0,
        todayAttendance: 0,
        weekAttendance: 0,
        activeLectures: 0
      });
    }
  };

  const setLecture = async () => {
    if (!lectureNumber || !lectureDate) {
      alert('Please select both lecture number and date');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/set-lecture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          lectureNumber: parseInt(lectureNumber),
          date: lectureDate 
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        // Store the lecture info in localStorage so attendance pages can use it
        localStorage.setItem('currentLecture', JSON.stringify({
          lectureNumber: parseInt(lectureNumber),
          date: lectureDate
        }));
        fetchLectures();
        fetchStats();
        // Show attendance type options instead of auto-redirecting
        setShowAttendanceOptions(true);
      } else {
        alert(`❌ ${data.message}`);
      }
    } catch (err) {
      alert('❌ Error setting lecture. Please try again.');
    }
    setLoading(false);
  };

  const goToFaceAttendance = () => {
    window.location.href = '/attendance';
  };

  const goToManualAttendance = () => {
    window.location.href = '/manual-attendance';
  };

  const goToExcelUpload = () => {
    window.location.href = '/bulk-attendance';
  };

  const resetSelection = () => {
    setShowAttendanceOptions(false);
    setLectureNumber('');
  };

  return (
    <div className="container slide-in">
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px'
      }}>
        <h2 style={{ 
          fontSize: '28px', 
          margin: 0,
          display: 'flex',
          alignItems: 'center'
        }}>
          <span style={{ marginRight: '12px', fontSize: '32px' }}>👨‍🏫</span>
          Teacher Panel
        </h2>
        
        <div className="badge" style={{ 
          backgroundColor: '#f9fafb', 
          color: '#6b7280',
          padding: '8px 16px',
          borderRadius: '100px',
          fontSize: '14px',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center'
        }}>
          <span style={{ marginRight: '6px' }}> </span>
          Teacher Dashboard
        </div>
      </div>
      
      {/* Manual Attendance Feature Banner */}
      <div style={{
        backgroundColor: '#fff1f2',
        border: '1px solid #fee2e2',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <h3 style={{
            margin: '0 0 8px 0',
            color: '#e11d48',
            fontSize: '16px',
            fontWeight: '600'
          }}>
            <span style={{ marginRight: '8px' }}>✏️</span>
            New Feature: Manual Attendance
          </h3>
          <p style={{
            margin: '0',
            color: '#9f1239',
            fontSize: '14px'
          }}>
            If facial recognition doesn't work for a student, you can now mark attendance manually!
          </p>
        </div>
        <Link to="/manual-attendance" style={{
          backgroundColor: '#e11d48',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '6px',
          textDecoration: 'none',
          fontSize: '14px',
          fontWeight: '500',
          whiteSpace: 'nowrap',
          transition: 'all 0.2s ease',
        }}>
          Try Now
        </Link>
      </div>
      
      {/* Dashboard Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        <div className="card" style={{
          padding: '24px',
          borderRadius: '12px',
          backgroundColor: '#eff6ff',
          border: '1px solid #dbeafe',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center'
        }}>
          <div style={{ 
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            fontSize: '24px'
          }}>
            📚
          </div>
          <h3 style={{
            margin: '0 0 8px 0',
            fontSize: '28px',
            fontWeight: '700',
            color: '#1e40af'
          }}>
            {stats.totalLectures}
          </h3>
          <p style={{
            margin: '0',
            fontSize: '14px',
            color: '#1e40af',
            fontWeight: '500'
          }}>
            Total Lectures
          </p>
        </div>
        
        <div className="card" style={{
          padding: '24px',
          borderRadius: '12px',
          backgroundColor: '#f0fdf4',
          border: '1px solid #dcfce7',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center'
        }}>
          <div style={{ 
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            fontSize: '24px'
          }}>
            👥
          </div>
          <h3 style={{
            margin: '0 0 8px 0',
            fontSize: '28px',
            fontWeight: '700',
            color: '#047857'
          }}>
            {stats.totalAttendance}
          </h3>
          <p style={{
            margin: '0',
            fontSize: '14px',
            color: '#047857',
            fontWeight: '500'
          }}>
            Total Attendance
          </p>
        </div>
        
        <div className="card" style={{
          padding: '24px',
          borderRadius: '12px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fee2e2',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center'
        }}>
          <div style={{ 
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            fontSize: '24px'
          }}>
            📊
          </div>
          <h3 style={{
            margin: '0 0 8px 0',
            fontSize: '28px',
            fontWeight: '700',
            color: '#b91c1c'
          }}>
            {stats.averageAttendance}
          </h3>
          <p style={{
            margin: '0',
            fontSize: '14px',
            color: '#b91c1c',
            fontWeight: '500'
          }}>
            Avg. Attendance Per Lecture
          </p>
        </div>
        
        <div className="card" style={{
          padding: '24px',
          borderRadius: '12px',
          backgroundColor: '#fff7ed',
          border: '1px solid #fed7aa',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center'
        }}>
          <div style={{ 
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            fontSize: '24px'
          }}>
            🎓
          </div>
          <h3 style={{
            margin: '0 0 8px 0',
            fontSize: '28px',
            fontWeight: '700',
            color: '#c2410c'
          }}>
            {stats.totalStudents}
          </h3>
          <p style={{
            margin: '0',
            fontSize: '14px',
            color: '#c2410c',
            fontWeight: '500'
          }}>
            Enrolled Students
          </p>
        </div>
        
        <div className="card" style={{
          padding: '24px',
          borderRadius: '12px',
          backgroundColor: '#f0f9ff',
          border: '1px solid #c7d2fe',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center'
        }}>
          <div style={{ 
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            fontSize: '24px'
          }}>
            📅
          </div>
          <h3 style={{
            margin: '0 0 8px 0',
            fontSize: '28px',
            fontWeight: '700',
            color: '#3730a3'
          }}>
            {stats.todayAttendance}
          </h3>
          <p style={{
            margin: '0',
            fontSize: '14px',
            color: '#3730a3',
            fontWeight: '500'
          }}>
            Today's Attendance
          </p>
        </div>
        
        <div className="card" style={{
          padding: '24px',
          borderRadius: '12px',
          backgroundColor: '#ecfdf5',
          border: '1px solid #d1fae5',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center'
        }}>
          <div style={{ 
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            fontSize: '24px'
          }}>
            📈
          </div>
          <h3 style={{
            margin: '0 0 8px 0',
            fontSize: '28px',
            fontWeight: '700',
            color: '#065f46'
          }}>
            {stats.weekAttendance}
          </h3>
          <p style={{
            margin: '0',
            fontSize: '14px',
            color: '#065f46',
            fontWeight: '500'
          }}>
            This Week's Attendance
          </p>
        </div>
      </div>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: '32px'
      }}>
        {/* Lecture Control Card */}
        <div className="card" style={{ 
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          overflow: 'hidden'
        }}>
          <div style={{ 
            padding: '20px', 
            backgroundColor: '#f8fafc', 
            borderBottom: '1px solid #e2e8f0'
          }}>
            <h3 style={{ 
              margin: '0', 
              fontSize: '18px', 
              color: '#4361ee' 
            }}>
              ⚙️ Mark Attendance
            </h3>
          </div>
          
          <div style={{ padding: '24px' }}>
            <div>
              {!showAttendanceOptions ? (
                <div style={{
                  backgroundColor: '#f9fafb',
                  borderRadius: '12px',
                  padding: '24px',
                  marginBottom: '24px'
                }}>
                  <h4 style={{
                    margin: '0 0 16px 0',
                    fontSize: '18px',
                    color: '#4b5563',
                    textAlign: 'center'
                  }}>
                    Setup Attendance for Lecture
                  </h4>
                  
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#4b5563'
                    }}>
                      Lecture Number
                    </label>
                    <select
                      value={lectureNumber}
                      onChange={(e) => setLectureNumber(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        backgroundColor: 'white',
                        fontSize: '16px',
                        color: '#1f2937'
                      }}
                    >
                      <option value="">Select Lecture Number</option>
                      {[...Array(20)].map((_, i) => (
                        <option key={i+1} value={i+1}>Lecture {i+1}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#4b5563'
                    }}>
                      Lecture Date
                    </label>
                    <input
                      type="date"
                      value={lectureDate}
                      onChange={(e) => setLectureDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        backgroundColor: 'white',
                        fontSize: '16px',
                        color: '#1f2937'
                      }}
                    />
                  </div>
                  
                  <button
                    onClick={setLecture}
                    disabled={loading || !lectureNumber || !lectureDate}
                    style={{
                      width: '100%',
                      backgroundColor: loading || !lectureNumber || !lectureDate ? '#6b7280' : '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '14px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: loading || !lectureNumber || !lectureDate ? 'not-allowed' : 'pointer',
                      opacity: loading || !lectureNumber || !lectureDate ? 0.7 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <span>{loading ? '⏳' : '⚙️'}</span>
                    {loading ? 'Setting up...' : 'Setup Lecture'}
                  </button>
                </div>
              ) : (
                <div style={{
                  backgroundColor: '#f0fdf4',
                  borderRadius: '12px',
                  padding: '24px',
                  marginBottom: '24px',
                  border: '1px solid #bbf7d0'
                }}>
                  <div style={{
                    textAlign: 'center',
                    marginBottom: '20px'
                  }}>
                    <h4 style={{
                      margin: '0 0 8px 0',
                      fontSize: '18px',
                      color: '#047857'
                    }}>
                      ✅ Lecture {lectureNumber} - {lectureDate}
                    </h4>
                    <p style={{
                      margin: '0',
                      fontSize: '14px',
                      color: '#059669'
                    }}>
                      Lecture setup complete! Choose attendance method:
                    </p>
                  </div>
                  
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: '12px',
                    marginBottom: '16px'
                  }} className="attendance-options-grid">
                    <button
                      onClick={goToFaceAttendance}
                      className="attendance-option-btn"
                      style={{
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '16px 12px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.2s ease',
                        minHeight: '70px',
                        textAlign: 'center'
                      }}
                    >
                      <span style={{ fontSize: '20px' }}>📱</span>
                      <span>Face Recognition</span>
                    </button>
                    
                    <button
                      onClick={goToManualAttendance}
                      className="attendance-option-btn"
                      style={{
                        backgroundColor: '#e11d48',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '16px 12px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.2s ease',
                        minHeight: '70px',
                        textAlign: 'center'
                      }}
                    >
                      <span style={{ fontSize: '20px' }}>✏️</span>
                      <span>Manual Entry</span>
                    </button>

                    <button
                      onClick={goToExcelUpload}
                      className="attendance-option-btn"
                      style={{
                        backgroundColor: '#7c3aed',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '16px 12px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.2s ease',
                        minHeight: '70px',
                        textAlign: 'center'
                      }}
                    >
                      <span style={{ fontSize: '20px' }}>📁</span>
                      <span>Excel Upload</span>
                    </button>
                  </div>
                  
                  <button
                    onClick={resetSelection}
                    style={{
                      width: '100%',
                      backgroundColor: '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '10px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    ← Select Different Lecture
                  </button>
                </div>
              )}
              
              <div style={{
                backgroundColor: '#f0f9ff',
                borderRadius: '8px',
                padding: '16px',
                border: '1px solid #e0f2fe'
              }}>
                <h4 style={{
                  margin: '0 0 8px 0',
                  fontSize: '16px',
                  color: '#0369a1',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>💡</span>
                  Quick Tips
                </h4>
                <ul style={{
                  margin: '0',
                  paddingLeft: '20px',
                  fontSize: '14px',
                  color: '#0369a1'
                }}>
                  <li>Select the lecture number and date first</li>
                  <li>Choose between Face Recognition, Manual Entry, or Excel Upload</li>
                  <li>Face Recognition: Students scan their faces automatically</li>
                  <li>Manual Entry: Mark attendance manually for each student</li>
                  <li>Excel Upload: Upload attendance data from Excel file in bulk</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        {/* Lecture History Card */}
        <div className="card" style={{ 
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          overflow: 'hidden'
        }}>
          <div style={{ 
            padding: '20px', 
            backgroundColor: '#f8fafc', 
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <h3 style={{ 
              margin: '0', 
              fontSize: '18px', 
              color: '#4361ee' 
            }}>
              📋 Lecture History
            </h3>
            
            <button
              onClick={fetchLectures}
              style={{
                backgroundColor: 'transparent',
                color: '#4361ee',
                border: 'none',
                padding: '6px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>🔄</span>
              Refresh
            </button>
          </div>
          
          <div style={{ padding: '20px', maxHeight: '480px', overflowY: 'auto' }}>
            {lectures.length === 0 ? (
              <div style={{ 
                textAlign: 'center',
                padding: '40px 20px',
                color: '#6b7280',
                backgroundColor: '#f9fafb',
                borderRadius: '8px'
              }}>
                <div style={{ 
                  fontSize: '48px',
                  marginBottom: '16px'
                }}>
                  📚
                </div>
                <h4 style={{ margin: '0 0 8px 0', color: '#4b5563' }}>No Lectures Yet</h4>
                <p style={{ margin: '0', color: '#6b7280', fontSize: '14px' }}>
                  Start your first lecture to see it here
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse'
                }}>
                  <thead>
                    <tr>
                      <th style={{
                        textAlign: 'left',
                        padding: '12px 16px',
                        backgroundColor: '#f9fafb',
                        borderBottom: '1px solid #e5e7eb',
                        color: '#4b5563',
                        fontWeight: '600',
                        fontSize: '14px'
                      }}>
                        Lecture
                      </th>
                      <th style={{
                        textAlign: 'left',
                        padding: '12px 16px',
                        backgroundColor: '#f9fafb',
                        borderBottom: '1px solid #e5e7eb',
                        color: '#4b5563',
                        fontWeight: '600',
                        fontSize: '14px'
                      }}>
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lectures.sort((a, b) => b.lectureNumber - a.lectureNumber).map((lecture, index) => (
                      <tr key={index}>
                        <td style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid #e5e7eb',
                          color: '#1f2937',
                          fontSize: '14px'
                        }}>
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            backgroundColor: '#f3f4f6',
                            color: '#4b5563',
                            fontWeight: '600',
                            fontSize: '14px'
                          }}>
                            {lecture.lectureNumber}
                          </div>
                        </td>
                        <td style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid #e5e7eb',
                          color: '#1f2937',
                          fontSize: '14px'
                        }}>
                          {lecture.date}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Instructions */}
      <div style={{
        backgroundColor: '#eff6ff',
        borderRadius: '12px',
        padding: '24px',
        marginTop: '32px',
        border: '1px solid #dbeafe'
      }}>
        <h3 style={{
          margin: '0 0 16px 0',
          fontSize: '18px',
          color: '#1e40af',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>📖</span>
          How to Use the Teacher Panel
        </h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '16px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '16px',
            border: '1px solid #dbeafe'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1e40af',
                fontSize: '16px',
                fontWeight: '600'
              }}>
                1
              </div>
              <h4 style={{
                margin: '0',
                fontSize: '16px',
                color: '#1e40af'
              }}>
                Start a Lecture
              </h4>
            </div>
            
            <p style={{
              margin: '0',
              fontSize: '14px',
              color: '#1e40af'
            }}>
              Select the lecture number and date, then click "Mark Attendance" to begin attendance marking for that lecture.
            </p>
          </div>
          
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '16px',
            border: '1px solid #dbeafe'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1e40af',
                fontSize: '16px',
                fontWeight: '600'
              }}>
                2
              </div>
              <h4 style={{
                margin: '0',
                fontSize: '16px',
                color: '#1e40af'
              }}>
                Monitor Attendance
              </h4>
            </div>
            
            <p style={{
              margin: '0',
              fontSize: '14px',
              color: '#1e40af'
            }}>
              Direct students to the "Mark Attendance" page where they can scan their faces for automatic attendance.
            </p>
          </div>
          
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '16px',
            border: '1px solid #dbeafe'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1e40af',
                fontSize: '16px',
                fontWeight: '600'
              }}>
                3
              </div>
              <h4 style={{
                margin: '0',
                fontSize: '16px',
                color: '#1e40af'
              }}>
                End the Lecture
              </h4>
            </div>
            
            <p style={{
              margin: '0',
              fontSize: '14px',
              color: '#1e40af'
            }}>
              When the session is complete, click "End Lecture" to finalize attendance and stop further marking.
            </p>
          </div>
          
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '16px',
            border: '1px solid #dbeafe'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1e40af',
                fontSize: '16px',
                fontWeight: '600'
              }}>
                4
              </div>
              <h4 style={{
                margin: '0',
                fontSize: '16px',
                color: '#1e40af'
              }}>
                Review Records
              </h4>
            </div>
            
            <p style={{
              margin: '0',
              fontSize: '14px',
              color: '#1e40af'
            }}>
              Visit the "Attendance Records" page to view, filter, and manage all attendance data.
            </p>
          </div>
          
          <div style={{
            backgroundColor: '#fef2f2',
            borderRadius: '8px',
            padding: '16px',
            border: '1px solid #fee2e2'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#fff1f2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#e11d48',
                fontSize: '16px',
                fontWeight: '600'
              }}>
                5
              </div>
              <h4 style={{
                margin: '0',
                fontSize: '16px',
                color: '#e11d48'
              }}>
                Manual Attendance
              </h4>
            </div>
            
            <p style={{
              margin: '0 0 12px 0',
              fontSize: '14px',
              color: '#e11d48'
            }}>
              If face recognition fails for any student, use the Manual Attendance feature to mark their attendance directly.
            </p>
            
            <Link to="/manual-attendance" style={{
              display: 'inline-block',
              backgroundColor: '#e11d48',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
            }}>
              Go to Manual Attendance
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherPanel;