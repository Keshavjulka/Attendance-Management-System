import React, { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../config.js';

const Attendance = () => {
  const webcamRef = useRef(null);
  const [status, setStatus] = useState('Looking for faces...');
  const [loading, setLoading] = useState(false);
  const [lastProcessed, setLastProcessed] = useState(0);
  const [currentLecture, setCurrentLecture] = useState(null);
  const [recentAttendance, setRecentAttendance] = useState([]);
  const [scanActive, setScanActive] = useState(true);
  const [successMessage, setSuccessMessage] = useState(null);

  // Fetch current lecture and recent attendance on component mount
  useEffect(() => {
    fetchCurrentLecture();
    fetchRecentAttendance();
    
    return () => {
      // Cleanup function to stop scanning when component unmounts
      setScanActive(false);
    };
  }, []);

  const fetchCurrentLecture = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/current-lecture`);
      const data = await res.json();
      setCurrentLecture(data.lecture);
    } catch (err) {
      console.error('Error fetching current lecture:', err);
    }
  };

  const fetchRecentAttendance = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/attendance-records?limit=10`);
      if (res.ok) {
        const data = await res.json();
        // Transform the data to match the expected format
        const recentData = data.slice(0, 10).map(record => ({
          name: record.name || 'Unknown',
          rollNo: record.rollNo || 'N/A',
          time: record.time || 'N/A',
          success: record.status === 'Present'
        }));
        setRecentAttendance(recentData);
      }
    } catch (err) {
      console.error('Error fetching recent attendance:', err);
      // Keep empty array if API fails
      setRecentAttendance([]);
    }
  };

  // Auto-capture and process face every 3 seconds
  useEffect(() => {
    let interval;
    
    if (scanActive) {
      interval = setInterval(() => {
        if (!loading && webcamRef.current && currentLecture) {
          const now = Date.now();
          // Prevent too frequent processing (minimum 3 seconds between attempts)
          if (now - lastProcessed > 3000) {
            autoCapture();
          }
        }
      }, 3000);
    }
    
    return () => clearInterval(interval);
  }, [loading, lastProcessed, currentLecture, scanActive]);

  const autoCapture = async () => {
    if (!webcamRef.current || loading || !currentLecture) return;
    
    setLoading(true);
    setStatus('Processing face...');
    setLastProcessed(Date.now());
    
    try {
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) {
        setStatus('No image captured. Trying again...');
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_BASE_URL}/api/mark-attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageSrc })
      });
      
      const data = await res.json();
      if (res.ok) {
        // Success - attendance marked
        setStatus(`✅ ${data.message}`);
        setSuccessMessage({
          name: data.name || "Unknown",
          rollNo: data.rollNo || "Unknown",
          message: data.message
        });
        
        // Refresh recent attendance from server after successful marking
        if (!data.message.includes('already marked present')) {
          fetchRecentAttendance();
        }
        
        // Show success message for 5 seconds, then resume scanning
        setTimeout(() => {
          setStatus('Looking for faces...');
          setSuccessMessage(null);
        }, 5000);
      } else {
        if (data.message.includes('No matching student found')) {
          setStatus('No matching student found. Looking for faces...');
        } else if (data.message.includes('Face not detected')) {
          setStatus('Face not detected. Position yourself clearly...');
        } else if (data.message.includes('No active lecture')) {
          setStatus('No active lecture. Ask teacher to start a lecture.');
          fetchCurrentLecture(); // Refresh lecture status
        } else if (data.message.includes('already marked present')) {
          setStatus(`✅ ${data.message}`);
          setTimeout(() => {
            setStatus('Looking for faces...');
          }, 5000);
        } else {
          setStatus(data.message || 'Failed to mark attendance.');
        }
      }
    } catch (err) {
      setStatus('Error connecting to server. Retrying...');
    }
    setLoading(false);
  };

  const toggleScanning = () => {
    setScanActive(!scanActive);
    if (!scanActive) {
      setStatus('Looking for faces...');
    } else {
      setStatus('Scanning paused.');
    }
  };

  return (
    <div className="container slide-in">
      <div style={{ 
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px'
        }}>
          <h2 style={{ 
            fontSize: '28px', 
            margin: 0,
            display: 'flex',
            alignItems: 'center'
          }}>
            <span style={{ marginRight: '12px', fontSize: '32px' }}>📱</span>
            Mark Attendance
          </h2>
          
          <div className="badge" style={{ 
            backgroundColor: currentLecture ? '#ecfdf5' : '#fef2f2', 
            color: currentLecture ? '#047857' : '#b91c1c',
            padding: '8px 16px',
            borderRadius: '100px',
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center'
          }}>
            <span style={{ marginRight: '6px' }}>{currentLecture ? '🟢' : '🔴'}</span>
            {currentLecture ? 'Lecture Active' : 'No Active Lecture'}
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: '32px',
        }}>
          {/* Camera Card */}
          <div className="card" style={{ 
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
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
                📷 Face Recognition
              </h3>
              
              <button
                onClick={toggleScanning}
                style={{
                  backgroundColor: scanActive ? '#ef4444' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '100px',
                  padding: '6px 14px',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer'
                }}
              >
                <span style={{ marginRight: '6px' }}>{scanActive ? '⏹️' : '▶️'}</span>
                {scanActive ? 'Pause' : 'Resume'}
              </button>
            </div>
            
            <div style={{ padding: '24px' }}>
              {/* Current Lecture Info */}
              {currentLecture ? (
                <div style={{ 
                  padding: '16px', 
                  backgroundColor: '#ecfdf5', 
                  borderRadius: '8px',
                  marginBottom: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: '#10b981',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '16px',
                        fontWeight: '600'
                      }}>
                        {currentLecture.lectureNumber}
                      </div>
                      <h4 style={{
                        margin: '0',
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#047857'
                      }}>
                        Lecture {currentLecture.lectureNumber}
                      </h4>
                    </div>
                    
                    <div style={{
                      backgroundColor: 'white',
                      padding: '4px 10px',
                      borderRadius: '100px',
                      fontSize: '13px',
                      fontWeight: '500',
                      color: '#047857'
                    }}>
                      <span style={{ marginRight: '4px' }}>📅</span>
                      {currentLecture.date}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ 
                  padding: '16px', 
                  backgroundColor: '#fef2f2', 
                  borderRadius: '8px',
                  marginBottom: '24px',
                  textAlign: 'center'
                }}>
                  <h4 style={{
                    margin: '0 0 8px 0',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#b91c1c'
                  }}>
                    <span style={{ marginRight: '8px' }}>⚠️</span>
                    No Active Lecture
                  </h4>
                  <p style={{
                    margin: '0',
                    fontSize: '14px',
                    color: '#b91c1c'
                  }}>
                    Please ask your teacher to start a lecture before marking attendance.
                  </p>
                </div>
              )}
              
              {/* Webcam Container */}
              <div style={{ 
                position: 'relative',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                marginBottom: '24px',
                backgroundColor: '#f1f5f9',
                border: '1px solid #e2e8f0'
              }}>
                {!scanActive && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10,
                    color: 'white',
                    fontSize: '18px',
                    fontWeight: '600'
                  }}>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <span style={{ fontSize: '32px' }}>⏸️</span>
                      <span>Scanning Paused</span>
                      <button
                        onClick={toggleScanning}
                        style={{
                          backgroundColor: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '100px',
                          padding: '8px 16px',
                          fontSize: '14px',
                          fontWeight: '500',
                          marginTop: '8px',
                          cursor: 'pointer'
                        }}
                      >
                        Resume Scanning
                      </button>
                    </div>
                  </div>
                )}
                
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  width="100%"
                  height="auto"
                  videoConstraints={{ 
                    facingMode: 'user',
                    width: 720,
                    height: 480
                  }}
                  style={{ 
                    display: 'block',
                    backgroundColor: '#e2e8f0'
                  }}
                />
                
                {loading && (
                  <div style={{
                    position: 'absolute',
                    bottom: '16px',
                    left: '16px',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '100px',
                    fontSize: '14px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      borderTop: '2px solid white',
                      borderRight: '2px solid transparent',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    Processing...
                  </div>
                )}
                
                {successMessage && (
                  <div style={{
                    position: 'absolute',
                    top: '16px',
                    left: '16px',
                    right: '16px',
                    backgroundColor: 'rgba(16, 185, 129, 0.9)',
                    color: 'white',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    animation: 'fadeIn 0.3s ease-in'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span style={{ fontSize: '20px' }}>✅</span>
                      <span style={{ fontWeight: '600' }}>Attendance Marked!</span>
                    </div>
                    <div>
                      <strong>{successMessage.name}</strong> ({successMessage.rollNo})
                    </div>
                  </div>
                )}
              </div>
              
              {/* Status Display */}
              <div style={{ 
                padding: '16px', 
                backgroundColor: loading ? '#fff7ed' : scanActive ? '#f0f9ff' : '#f3f4f6', 
                border: '1px solid',
                borderColor: loading ? '#fdba74' : scanActive ? '#bae6fd' : '#e5e7eb',
                borderRadius: '8px',
                minHeight: '56px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease'
              }}>
                <p style={{ 
                  margin: 0, 
                  fontWeight: '500',
                  color: loading ? '#c2410c' : scanActive ? '#0369a1' : '#4b5563',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{ fontSize: '18px' }}>
                    {loading ? '🔄' : scanActive ? '🔍' : '⏸️'}
                  </span>
                  {status}
                </p>
              </div>
            </div>
          </div>
          
          {/* Recent Activity Card */}
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
                📋 Recent Activity
              </h3>
            </div>
            
            <div style={{ padding: '20px' }}>
              {recentAttendance.length === 0 ? (
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
                    📋
                  </div>
                  <h4 style={{ margin: '0 0 8px 0', color: '#4b5563' }}>No Recent Activity</h4>
                  <p style={{ margin: '0', color: '#6b7280', fontSize: '14px' }}>
                    Stand in front of the camera to mark your attendance
                  </p>
                </div>
              ) : (
                <div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px'
                  }}>
                    <h4 style={{
                      margin: '0',
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#4b5563'
                    }}>
                      Today's Attendance
                    </h4>
                    <div style={{
                      backgroundColor: '#f0f9ff',
                      color: '#0369a1',
                      padding: '4px 10px',
                      borderRadius: '100px',
                      fontSize: '13px',
                      fontWeight: '500'
                    }}>
                      {recentAttendance.length} Records
                    </div>
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    {recentAttendance.map((record, index) => (
                      <div 
                        key={index}
                        style={{
                          padding: '16px',
                          borderRadius: '8px',
                          backgroundColor: index % 2 === 0 ? '#f9fafb' : 'white',
                          border: '1px solid #e5e7eb',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px'
                        }}
                      >
                        <div style={{ 
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          backgroundColor: record.success ? '#ecfdf5' : '#fef2f2',
                          color: record.success ? '#10b981' : '#ef4444',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '600',
                          fontSize: '18px'
                        }}>
                          {record.success ? '✓' : '✗'}
                        </div>
                        <div style={{
                          flex: 1
                        }}>
                          <h5 style={{ 
                            margin: '0 0 4px 0', 
                            fontSize: '16px', 
                            color: '#1f2937' 
                          }}>
                            {record.name}
                          </h5>
                          <p style={{ 
                            margin: '0', 
                            fontSize: '14px', 
                            color: '#6b7280',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <span style={{ color: '#9ca3af' }}>Roll No:</span> {record.rollNo}
                          </p>
                        </div>
                        <div style={{
                          backgroundColor: '#f9fafb',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          fontSize: '14px',
                          color: '#4b5563',
                          fontWeight: '500'
                        }}>
                          {record.time}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div style={{
                marginTop: '24px',
                padding: '16px',
                backgroundColor: '#eff6ff',
                borderRadius: '8px',
                border: '1px solid #dbeafe'
              }}>
                <h4 style={{
                  margin: '0 0 12px 0',
                  fontSize: '16px',
                  color: '#1e40af',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>💡</span>
                  Tips for Better Recognition
                </h4>
                <ul style={{
                  margin: '0',
                  paddingLeft: '24px',
                  color: '#1e40af',
                  fontSize: '14px'
                }}>
                  <li>Position your face clearly in the camera</li>
                  <li>Ensure adequate lighting on your face</li>
                  <li>Remove any face coverings like masks or sunglasses</li>
                  <li>Maintain a neutral expression</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Manual Attendance Banner */}
      <div style={{
        backgroundColor: '#fff1f2',
        border: '1px solid #fee2e2',
        borderRadius: '12px',
        padding: '16px',
        marginTop: '24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'start'
      }}>
        <h3 style={{
          margin: '0 0 8px 0',
          color: '#e11d48',
          fontSize: '16px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center'
        }}>
          <span style={{ marginRight: '8px' }}>🛑</span>
          Face Recognition Not Working?
        </h3>
        <p style={{
          margin: '0 0 12px 0',
          color: '#9f1239',
          fontSize: '14px'
        }}>
          If you're having trouble with the face recognition system, you can use our new Manual Attendance feature.
        </p>
        <Link to="/manual-attendance" style={{
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
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default Attendance;