import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../config.js';

const TeacherPanel = () => {
  const [lectureNumber, setLectureNumber] = useState('');
  const [lectureDate, setLectureDate] = useState('');
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(false);
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
        alert(`✅ ${data.message}`);
        localStorage.setItem('currentLecture', JSON.stringify({
          lectureNumber: parseInt(lectureNumber),
          date: lectureDate
        }));
        setLectureNumber('');
        fetchLectures();
        fetchStats();
        window.location.href = '/attendance';
      } else {
        alert(`❌ ${data.message}`);
      }
    } catch (err) {
      alert('❌ Error setting lecture. Please try again.');
    }
    setLoading(false);
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
          <span style={{ marginRight: '6px' }}>📚</span>
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
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '24px',
        marginBottom: '32px'
      }}>
        <div className="card" style={{
          padding: '24px',
          borderRadius: '12px',
          backgroundColor: '#f0f9ff',
          border: '1px solid #bae6fd',
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
            color: '#0369a1'
          }}>
            {stats.totalLectures}
          </h3>
          <p style={{
            margin: '0',
            fontSize: '14px',
            color: '#0369a1',
            fontWeight: '500'
          }}>
            Total Lectures
          </p>
        </div>
        
        <div className="card" style={{
          padding: '24px',
          borderRadius: '12px',
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
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
            ✅
          </div>
          <h3 style={{
            margin: '0 0 8px 0',
            fontSize: '28px',
            fontWeight: '700',
            color: '#065f46'
          }}>
            {stats.totalAttendance}
          </h3>
          <p style={{
            margin: '0',
            fontSize: '14px',
            color: '#065f46',
            fontWeight: '500'
          }}>
            Total Attendance Records
          </p>
        </div>
        
        <div className="card" style={{
          padding: '24px',
          borderRadius: '12px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
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
                  Mark Attendance for Lecture
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
                  <span>{loading ? '⏳' : '📱'}</span>
                  {loading ? 'Setting up...' : 'Mark Attendance'}
                </button>
              </div>
              
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
                  <li>Select the lecture number and date</li>
                  <li>Click "Mark Attendance" to start the attendance process</li>
                  <li>Students can now mark their attendance using face recognition</li>
                  <li>Use Manual Attendance if face recognition fails</li>
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
            borderBottom: '1px solid #e2e8f0'
          }}>
            <h3 style={{ 
              margin: '0', 
              fontSize: '18px', 
              color: '#4361ee' 
            }}>
              📋 Recent Lectures
            </h3>
          </div>
          
          <div style={{ padding: '24px' }}>
            {lectures.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#6b7280'
              }}>
                <span style={{ fontSize: '48px', marginBottom: '16px', display: 'block' }}>📚</span>
                <p style={{ margin: '0', fontSize: '16px' }}>No lectures created yet</p>
                <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>Start by creating your first lecture above</p>
              </div>
            ) : (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{
                        textAlign: 'left',
                        padding: '12px 8px',
                        borderBottom: '2px solid #f1f5f9',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#475569'
                      }}>
                        Lecture
                      </th>
                      <th style={{
                        textAlign: 'left',
                        padding: '12px 8px',
                        borderBottom: '2px solid #f1f5f9',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#475569'
                      }}>
                        Date
                      </th>
                      <th style={{
                        textAlign: 'center',
                        padding: '12px 8px',
                        borderBottom: '2px solid #f1f5f9',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#475569'
                      }}>
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lectures.slice(0, 10).map((lecture, index) => (
                      <tr key={index}>
                        <td style={{
                          padding: '12px 8px',
                          borderBottom: '1px solid #f1f5f9',
                          fontSize: '14px',
                          color: '#1f2937'
                        }}>
                          Lecture {lecture.lectureNumber}
                        </td>
                        <td style={{
                          padding: '12px 8px',
                          borderBottom: '1px solid #f1f5f9',
                          fontSize: '14px',
                          color: '#6b7280'
                        }}>
                          {lecture.date}
                        </td>
                        <td style={{
                          padding: '12px 8px',
                          borderBottom: '1px solid #f1f5f9',
                          textAlign: 'center'
                        }}>
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '4px 8px',
                            borderRadius: '100px',
                            fontSize: '12px',
                            fontWeight: '500',
                            backgroundColor: lecture.isActive ? '#ecfdf5' : '#f3f4f6',
                            color: lecture.isActive ? '#047857' : '#6b7280'
                          }}>
                            <span style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: lecture.isActive ? '#10b981' : '#9ca3af',
                              marginRight: '6px',
                              display: 'inline-block'
                            }}></span>
                            {lecture.isActive ? 'Active' : 'Completed'}
                          </div>
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
                Select Lecture
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
                Face Recognition
              </h4>
            </div>
            
            <p style={{
              margin: '0',
              fontSize: '14px',
              color: '#1e40af'
            }}>
              Students can use the "Mark Attendance" page to scan their faces and automatically record their attendance.
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
                Monitor Progress
              </h4>
            </div>
            
            <p style={{
              margin: '0',
              fontSize: '14px',
              color: '#1e40af'
            }}>
              Check the dashboard statistics and recent lectures to monitor attendance progress in real-time.
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
        
      {/* Excel Attendance Upload Step */}
      <div style={{
        backgroundColor: '#fdf4ff',
        borderRadius: '8px',
        padding: '16px',
        marginTop: '24px',
        border: '1px solid #f3e8ff'
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
              backgroundColor: '#f3e8ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#7c3aed',
              fontSize: '16px',
              fontWeight: '600'
            }}>
              5
            </div>
            <h4 style={{
              margin: '0',
              fontSize: '16px',
              color: '#7c3aed'
            }}>
              Excel Attendance Upload
            </h4>
          </div>
          
          <p style={{
            margin: '0 0 12px 0',
            fontSize: '14px',
            color: '#7c3aed'
          }}>
            Upload attendance data in bulk using an Excel file. Perfect for marking attendance for multiple students at once.
          </p>
          
          <Link to="/bulk-attendance" style={{
            display: 'inline-block',
            backgroundColor: '#7c3aed',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '6px',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'all 0.2s ease',
          }}>
            Upload Excel File
          </Link>
        </div>
    </div>
  );
};

export default TeacherPanel;