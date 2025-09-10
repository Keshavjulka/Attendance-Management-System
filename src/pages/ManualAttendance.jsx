import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config.js';

const ManualAttendance = () => {
  const [students, setStudents] = useState([]);
  const [selectedLecture, setSelectedLecture] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState({});
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    // Set today's date as default
    setSelectedDate(new Date().toISOString().split('T')[0]);
  }, []);

  // Fetch students with their attendance status for selected lecture and date
  const fetchStudentsWithStatus = async () => {
    if (!selectedLecture || !selectedDate) {
      setMessage({ text: 'Please select both lecture and date', type: 'warning' });
      return;
    }
    
    try {
      setLoading(true);
      setMessage({ text: 'Loading student data...', type: 'info' });
      
      const res = await fetch(`${API_BASE_URL}/api/students-attendance-status?lectureNumber=${selectedLecture}&date=${selectedDate}`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data);
        
        // Initialize attendance status from fetched data
        const statusMap = {};
        data.forEach(student => {
          statusMap[student.rollNo] = student.status !== 'Not Marked' ? student.status : 'Present';
        });
        setAttendanceStatus(statusMap);
        
        if (data.length === 0) {
          setMessage({ text: 'No students found', type: 'warning' });
        } else {
          setMessage({ text: `${data.length} students loaded successfully`, type: 'success' });
        }
      } else {
        setMessage({ text: 'Failed to load students', type: 'error' });
      }
    } catch (err) {
      console.error('Error fetching students:', err);
      setMessage({ text: 'Error loading student data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Handle status change for a student
  const handleStatusChange = (rollNo, status) => {
    setAttendanceStatus(prev => ({
      ...prev,
      [rollNo]: status
    }));
  };

  // Submit manual attendance for selected students
  const submitManualAttendance = async () => {
    if (!selectedLecture || !selectedDate) {
      setMessage({ text: 'Please select both lecture and date', type: 'warning' });
      return;
    }
    
    try {
      setLoading(true);
      setMessage({ text: 'Submitting attendance...', type: 'info' });
      
      // For each status, create a separate API call
      const statuses = ['Present', 'Absent', 'Late'];
      let successCount = 0;
      
      for (const status of statuses) {
        // Find students with this status
        const studentIds = Object.keys(attendanceStatus).filter(
          id => attendanceStatus[id] === status
        );
        
        if (studentIds.length === 0) continue;
        
        // Submit the attendance for this group
        const res = await fetch(`${API_BASE_URL}/api/manual-attendance`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            studentIds,
            status,
            lectureNumber: selectedLecture,
            date: selectedDate
          })
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.results) {
            const successful = data.results.filter(r => r.success);
            const failed = data.results.filter(r => !r.success);
            const alreadyMarked = failed.filter(r => r.action === 'already_marked');
            const updated = successful.filter(r => r.action === 'updated');
            
            successCount += successful.length;
            
            // Show detailed feedback for complex cases
            if (updated.length > 0) {
              console.log(`Updated ${updated.length} students:`, updated.map(u => 
                `${u.studentId}: ${u.message}`
              ));
            }
            
            if (alreadyMarked.length > 0) {
              console.log(`Already marked ${alreadyMarked.length} students:`, alreadyMarked.map(a => 
                `${a.studentId}: ${a.message}`
              ));
            }
          }
        } else {
          console.error('Failed to submit attendance for status:', status);
        }
      }
      
      setMessage({ 
        text: `Successfully marked attendance for ${successCount} students`, 
        type: 'success' 
      });
      
      // Refresh the student list with new statuses
      fetchStudentsWithStatus();
    } catch (err) {
      console.error('Error submitting attendance:', err);
      setMessage({ text: 'Error submitting attendance', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Mark all visible students with the same status
  const markAllAs = (status) => {
    const newStatus = {...attendanceStatus};
    students.forEach(student => {
      newStatus[student.rollNo] = status;
    });
    setAttendanceStatus(newStatus);
  };

  return (
    <div className="container slide-in">
      <div style={{ 
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        {/* Header */}
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
            <span style={{ marginRight: '12px', fontSize: '32px' }}>📝</span>
            Manual Attendance
          </h2>
        </div>
        
        {/* Filter & Control Card */}
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
              color: '#4361ee',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>🔍</span>
              Select Lecture & Date
            </h3>
          </div>
          
          <div style={{ padding: '24px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '20px',
              marginBottom: '24px'
            }}>
              {/* Lecture Selector */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#1f2937'
                }}>
                  Select Lecture:
                </label>
                <select
                  value={selectedLecture}
                  onChange={(e) => setSelectedLecture(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    backgroundColor: '#f9fafb',
                    fontSize: '14px'
                  }}
                >
                  <option value="">-- Select Lecture --</option>
                  {[...Array(20)].map((_, i) => (
                    <option key={i+1} value={i+1}>
                      Lecture {i+1}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Date Selector */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#1f2937'
                }}>
                  Select Date:
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    backgroundColor: '#f9fafb',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>
            
            {/* Load Students Button */}
            <button 
              onClick={fetchStudentsWithStatus}
              disabled={loading || !selectedLecture || !selectedDate}
              style={{
                backgroundColor: loading || !selectedLecture || !selectedDate ? '#94a3b8' : '#4361ee',
                color: 'white',
                padding: '12px 24px',
                border: 'none',
                borderRadius: '6px',
                cursor: loading || !selectedLecture || !selectedDate ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%'
              }}
            >
              {loading ? (
                <>
                  <span style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    border: '2px solid white',
                    borderTopColor: 'transparent',
                    animation: 'spin 1s linear infinite'
                  }}></span>
                  Loading Students...
                </>
              ) : (
                <>
                  <span>🔄</span>
                  Load Students
                </>
              )}
            </button>
          </div>
        </div>
        
        {/* Message Display */}
        {message.text && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '6px',
            backgroundColor: 
              message.type === 'success' ? '#ecfdf5' :
              message.type === 'error' ? '#fef2f2' :
              message.type === 'warning' ? '#fff7ed' : '#f0f9ff',
            color: 
              message.type === 'success' ? '#047857' :
              message.type === 'error' ? '#b91c1c' :
              message.type === 'warning' ? '#c2410c' : '#0369a1',
            border: 
              message.type === 'success' ? '1px solid #d1fae5' :
              message.type === 'error' ? '1px solid #fee2e2' :
              message.type === 'warning' ? '1px solid #fed7aa' : '1px solid #e0f2fe'
          }}>
            {message.type === 'success' && <span style={{ marginRight: '8px' }}>✅</span>}
            {message.type === 'error' && <span style={{ marginRight: '8px' }}>❌</span>}
            {message.type === 'warning' && <span style={{ marginRight: '8px' }}>⚠️</span>}
            {message.type === 'info' && <span style={{ marginRight: '8px' }}>ℹ️</span>}
            {message.text}
          </div>
        )}
        
        {/* Students List */}
        {students.length > 0 && (
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
                👨‍🎓 Student List
              </h3>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{
                  backgroundColor: '#f1f5f9',
                  color: '#64748b',
                  padding: '6px 12px',
                  borderRadius: '100px',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  {students.length} Students
                </div>
                
                <div style={{
                  display: 'flex',
                  gap: '4px'
                }}>
                  <button 
                    onClick={() => markAllAs('Present')}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#ecfdf5',
                      color: '#047857',
                      border: '1px solid #d1fae5',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                    title="Mark all students as Present"
                  >
                    ✅ Mark All Present
                  </button>
                  
                  <button 
                    onClick={() => markAllAs('Absent')}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#fef2f2',
                      color: '#b91c1c',
                      border: '1px solid #fee2e2',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                    title="Mark all students as Absent"
                  >
                    ❌ Mark All Absent
                  </button>
                </div>
              </div>
            </div>
            
            <div style={{ padding: '20px' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f9fafb' }}>
                      <th style={{ 
                        padding: '12px 16px', 
                        textAlign: 'left',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#4b5563',
                        borderBottom: '1px solid #e5e7eb'
                      }}>
                        Roll No
                      </th>
                      <th style={{ 
                        padding: '12px 16px', 
                        textAlign: 'left',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#4b5563',
                        borderBottom: '1px solid #e5e7eb'
                      }}>
                        Name
                      </th>
                      <th style={{ 
                        padding: '12px 16px', 
                        textAlign: 'left',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#4b5563',
                        borderBottom: '1px solid #e5e7eb',
                        width: '200px'
                      }}>
                        Current Status
                      </th>
                      <th style={{ 
                        padding: '12px 16px', 
                        textAlign: 'left',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#4b5563',
                        borderBottom: '1px solid #e5e7eb',
                        width: '250px'
                      }}>
                        Attendance
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student, index) => (
                      <tr key={student.rollNo} style={{ backgroundColor: index % 2 === 0 ? '#f8fafc' : 'white' }}>
                        <td style={{ 
                          padding: '12px 16px',
                          fontSize: '14px',
                          color: '#1f2937',
                          borderBottom: '1px solid #e5e7eb'
                        }}>
                          {student.rollNo}
                        </td>
                        <td style={{ 
                          padding: '12px 16px',
                          fontSize: '14px',
                          fontWeight: '500',
                          color: '#1f2937',
                          borderBottom: '1px solid #e5e7eb'
                        }}>
                          {student.name}
                        </td>
                        <td style={{ 
                          padding: '12px 16px',
                          fontSize: '14px',
                          borderBottom: '1px solid #e5e7eb'
                        }}>
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '4px 10px',
                            borderRadius: '100px',
                            backgroundColor: 
                              student.status === 'Present' ? '#ecfdf5' :
                              student.status === 'Absent' ? '#fef2f2' :
                              student.status === 'Late' ? '#fff7ed' : '#f3f4f6',
                            color: 
                              student.status === 'Present' ? '#047857' :
                              student.status === 'Absent' ? '#b91c1c' :
                              student.status === 'Late' ? '#c2410c' : '#6b7280',
                            fontWeight: '500',
                            fontSize: '13px'
                          }}>
                            <span style={{ 
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor:
                                student.status === 'Present' ? '#10b981' :
                                student.status === 'Absent' ? '#ef4444' :
                                student.status === 'Late' ? '#f59e0b' : '#9ca3af',
                              marginRight: '6px'
                            }}></span>
                            {student.status}
                            {student.method && (
                              <span style={{
                                marginLeft: '4px',
                                fontSize: '11px',
                                opacity: 0.7
                              }}>
                                ({student.method})
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ 
                          padding: '12px 16px',
                          fontSize: '14px',
                          borderBottom: '1px solid #e5e7eb'
                        }}>
                          <div style={{
                            display: 'flex',
                            gap: '4px'
                          }}>
                            <button
                              onClick={() => handleStatusChange(student.rollNo, 'Present')}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: attendanceStatus[student.rollNo] === 'Present' ? '#10b981' : '#ecfdf5',
                                color: attendanceStatus[student.rollNo] === 'Present' ? 'white' : '#047857',
                                border: '1px solid #d1fae5',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '500',
                                cursor: 'pointer'
                              }}
                            >
                              Present
                            </button>
                            
                            <button
                              onClick={() => handleStatusChange(student.rollNo, 'Absent')}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: attendanceStatus[student.rollNo] === 'Absent' ? '#ef4444' : '#fef2f2',
                                color: attendanceStatus[student.rollNo] === 'Absent' ? 'white' : '#b91c1c',
                                border: '1px solid #fee2e2',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '500',
                                cursor: 'pointer'
                              }}
                            >
                              Absent
                            </button>
                            
                            <button
                              onClick={() => handleStatusChange(student.rollNo, 'Late')}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: attendanceStatus[student.rollNo] === 'Late' ? '#f59e0b' : '#fff7ed',
                                color: attendanceStatus[student.rollNo] === 'Late' ? 'white' : '#c2410c',
                                border: '1px solid #fed7aa',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '500',
                                cursor: 'pointer'
                              }}
                            >
                              Late
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Submit Button */}
              <div style={{
                marginTop: '24px',
                display: 'flex',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={submitManualAttendance}
                  disabled={loading || students.length === 0}
                  style={{
                    backgroundColor: loading || students.length === 0 ? '#94a3b8' : '#4361ee',
                    color: 'white',
                    padding: '12px 24px',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: loading || students.length === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  {loading ? (
                    <>
                      <span style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        border: '2px solid white',
                        borderTopColor: 'transparent',
                        animation: 'spin 1s linear infinite'
                      }}></span>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <span>💾</span>
                      Save Attendance
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Instructions */}
        <div style={{ 
          marginTop: '8px',
          padding: '20px', 
          backgroundColor: '#f0f9ff', 
          border: '1px solid #e0f2fe', 
          borderRadius: '12px'
        }}>
          <h4 style={{ 
            margin: '0 0 12px 0', 
            color: '#0369a1',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>📝</span>
            How to Use Manual Attendance
          </h4>
          <ol style={{ 
            margin: 0, 
            paddingLeft: '24px',
            color: '#0369a1',
            fontSize: '14px'
          }}>
            <li style={{ marginBottom: '8px' }}>
              Select the lecture number and date
            </li>
            <li style={{ marginBottom: '8px' }}>
              Click "Load Students" to view all enrolled students with their current attendance status
            </li>
            <li style={{ marginBottom: '8px' }}>
              Mark each student as Present, Absent, or Late
            </li>
            <li style={{ marginBottom: '8px' }}>
              Use "Mark All" buttons to quickly set all students to the same status
            </li>
            <li>
              Click "Save Attendance" to submit the manual attendance records
            </li>
          </ol>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ManualAttendance;