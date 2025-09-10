import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config.js';

const Records = () => {
  const [records, setRecords] = useState([]);
  const [lectures, setLectures] = useState([]);
  const [selectedLecture, setSelectedLecture] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [stats, setStats] = useState({
    totalRecords: 0,
    presentCount: 0,
    absentCount: 0
  });

  useEffect(() => {
    fetchLectures();
    fetchRecords();
  }, []);

  const fetchLectures = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/lectures`);
      if (!res.ok) throw new Error('Failed to fetch lectures');
      const data = await res.json();
      setLectures(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchRecords = async (lectureNumber = '', date = '') => {
    try {
      setLoading(true);
      let url = `${API_BASE_URL}/api/attendance-records?`;
      const params = new URLSearchParams();
      
      if (lectureNumber) params.append('lectureNumber', lectureNumber);
      if (date) params.append('date', date);
      
      url += params.toString();
      
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch records');
      const data = await res.json();
      setRecords(data);
      
      // Update stats
      const present = data.filter(r => r.status === 'Present' || r.status === 'present').length;
      setStats({
        totalRecords: data.length,
        presentCount: present,
        absentCount: data.length - present
      });
      
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleLectureFilter = (lectureNum) => {
    setSelectedLecture(lectureNum);
    fetchRecords(lectureNum, selectedDate);
  };

  const handleDateFilter = (date) => {
    setSelectedDate(date);
    fetchRecords(selectedLecture, date);
  };

  const cleanupInvalidRecords = async () => {
    setCleanupLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/cleanup-attendance`, {
        method: 'DELETE'
      });
      const data = await res.json();
      
      if (data.success) {
        alert(`✅ ${data.message}`);
        fetchRecords(selectedLecture, selectedDate); // Refresh records
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      alert(`❌ Error: ${err.message}`);
    }
    setCleanupLoading(false);
  };

  const cleanupDuplicateRecords = async () => {
    setCleanupLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/cleanup-duplicate-attendance`, {
        method: 'POST'
      });
      const data = await res.json();
      
      if (data.success) {
        alert(`✅ ${data.message}\n\nDuplicate groups found: ${data.duplicates_found}`);
        fetchRecords(selectedLecture, selectedDate); // Refresh records
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      alert(`❌ Error: ${err.message}`);
    }
    setCleanupLoading(false);
  };

  const deleteRecord = async (record) => {
    if (!confirm(`Are you sure you want to delete this attendance record?\n\nStudent: ${record.name || 'Unknown'}\nRoll: ${record.rollNo}\nDate: ${record.date}\nTime: ${record.time}`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/delete-attendance-record`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          rollNo: record.rollNo,
          date: record.date,
          time: record.time
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        alert('✅ Record deleted successfully');
        fetchRecords(selectedLecture, selectedDate); // Refresh records
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      alert(`❌ Error: ${err.message}`);
    }
  };

  // Get unique dates from records for date filter
  const uniqueDates = [...new Set(records.map(record => record.date))].sort().reverse();

  // Group records by lecture for better organization
  const groupedRecords = records.reduce((acc, record) => {
    const lectureKey = record.lectureNumber || 'No Lecture';
    if (!acc[lectureKey]) {
      acc[lectureKey] = [];
    }
    acc[lectureKey].push(record);
    return acc;
  }, {});

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
            <span style={{ marginRight: '12px', fontSize: '32px' }}>📊</span>
            Attendance Records
          </h2>
          
          <div className="badge" style={{ 
            backgroundColor: '#f0f9ff', 
            color: '#0369a1',
            padding: '8px 16px',
            borderRadius: '100px',
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center'
          }}>
            <span style={{ marginRight: '6px' }}>📝</span>
            {loading ? 'Loading...' : `${records.length} Records`}
          </div>
        </div>
        
        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '8px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center'
          }}>
            <div style={{ 
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#f0f9ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px',
              fontSize: '20px'
            }}>
              📝
            </div>
            <h3 style={{
              margin: '0 0 4px 0',
              fontSize: '24px',
              fontWeight: '700',
              color: '#0369a1'
            }}>
              {stats.totalRecords}
            </h3>
            <p style={{
              margin: '0',
              fontSize: '14px',
              color: '#64748b',
              fontWeight: '500'
            }}>
              Total Records
            </p>
          </div>
          
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center'
          }}>
            <div style={{ 
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#f0fdf4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px',
              fontSize: '20px'
            }}>
              ✅
            </div>
            <h3 style={{
              margin: '0 0 4px 0',
              fontSize: '24px',
              fontWeight: '700',
              color: '#10b981'
            }}>
              {stats.presentCount}
            </h3>
            <p style={{
              margin: '0',
              fontSize: '14px',
              color: '#64748b',
              fontWeight: '500'
            }}>
              Present
            </p>
          </div>
          
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center'
          }}>
            <div style={{ 
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#fef2f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px',
              fontSize: '20px'
            }}>
              ❌
            </div>
            <h3 style={{
              margin: '0 0 4px 0',
              fontSize: '24px',
              fontWeight: '700',
              color: '#ef4444'
            }}>
              {stats.absentCount}
            </h3>
            <p style={{
              margin: '0',
              fontSize: '14px',
              color: '#64748b',
              fontWeight: '500'
            }}>
              Absent
            </p>
          </div>
          
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center'
          }}>
            <div style={{ 
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#fff7ed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px',
              fontSize: '20px'
            }}>
              📊
            </div>
            <h3 style={{
              margin: '0 0 4px 0',
              fontSize: '24px',
              fontWeight: '700',
              color: '#f59e0b'
            }}>
              {stats.totalRecords > 0 
                ? Math.round((stats.presentCount / stats.totalRecords) * 100) 
                : 0}%
            </h3>
            <p style={{
              margin: '0',
              fontSize: '14px',
              color: '#64748b',
              fontWeight: '500'
            }}>
              Attendance Rate
            </p>
          </div>
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: '24px'
        }}>
          {/* Filters Card */}
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
                Filter Records
              </h3>
            </div>
            
            <div style={{ padding: '24px' }}>
              {/* Date Filter */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{
                  margin: '0 0 12px 0',
                  fontSize: '16px',
                  color: '#1f2937',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>📅</span>
                  Filter by Date
                </h4>
                
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  <button 
                    onClick={() => handleDateFilter('')}
                    style={{ 
                      padding: '8px 12px', 
                      backgroundColor: selectedDate === '' ? '#4361ee' : '#f1f5f9',
                      color: selectedDate === '' ? 'white' : '#64748b',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    All Dates
                  </button>
                  
                  {uniqueDates.map(date => (
                    <button
                      key={date}
                      onClick={() => handleDateFilter(date)}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: selectedDate === date ? '#4361ee' : '#f1f5f9',
                        color: selectedDate === date ? 'white' : '#64748b',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      {date}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Lecture Filter */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{
                  margin: '0 0 12px 0',
                  fontSize: '16px',
                  color: '#1f2937',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>📚</span>
                  Filter by Lecture
                </h4>
                
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  <button 
                    onClick={() => handleLectureFilter('')}
                    style={{ 
                      padding: '8px 12px', 
                      backgroundColor: selectedLecture === '' ? '#4361ee' : '#f1f5f9',
                      color: selectedLecture === '' ? 'white' : '#64748b',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    All Lectures
                  </button>
                  
                  {lectures.map(lecture => (
                    <button
                      key={lecture.lectureNumber}
                      onClick={() => handleLectureFilter(lecture.lectureNumber.toString())}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: selectedLecture === lecture.lectureNumber.toString() ? '#4361ee' : '#f1f5f9',
                        color: selectedLecture === lecture.lectureNumber.toString() ? 'white' : '#64748b',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>📘</span>
                      Lecture {lecture.lectureNumber}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Cleanup Records */}
              <div style={{
                backgroundColor: '#fff7ed',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #fed7aa'
              }}>
                <h4 style={{
                  margin: '0 0 8px 0',
                  fontSize: '16px',
                  color: '#9a3412',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>🧹</span>
                  Database Cleanup
                </h4>
                
                <p style={{
                  margin: '0 0 12px 0',
                  fontSize: '14px',
                  color: '#9a3412'
                }}>
                  Remove invalid records (missing data) or duplicate attendance entries for the same student, lecture, and date.
                </p>
                
                <button 
                  onClick={cleanupInvalidRecords}
                  disabled={cleanupLoading}
                  style={{ 
                    width: '100%',
                    padding: '10px 16px', 
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: cleanupLoading ? 'not-allowed' : 'pointer',
                    opacity: cleanupLoading ? 0.6 : 1,
                    fontWeight: '500',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    marginBottom: '8px'
                  }}
                >
                  <span>{cleanupLoading ? '⏳' : '🗑️'}</span>
                  {cleanupLoading ? 'Cleaning...' : 'Cleanup Invalid Records'}
                </button>
                
                <button 
                  onClick={cleanupDuplicateRecords}
                  disabled={cleanupLoading}
                  style={{ 
                    width: '100%',
                    padding: '10px 16px', 
                    backgroundColor: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: cleanupLoading ? 'not-allowed' : 'pointer',
                    opacity: cleanupLoading ? 0.6 : 1,
                    fontWeight: '500',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <span>{cleanupLoading ? '⏳' : '🔄'}</span>
                  {cleanupLoading ? 'Cleaning...' : 'Remove Duplicates'}
                </button>
              </div>
            </div>
          </div>
          
          {/* Applied Filters Summary */}
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
                <span>📋</span>
                Applied Filters
              </h3>
            </div>
            
            <div style={{ padding: '24px' }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    backgroundColor: '#f0f9ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    color: '#0369a1'
                  }}>
                    📅
                  </div>
                  <div>
                    <h4 style={{
                      margin: '0 0 4px 0',
                      fontSize: '16px',
                      color: '#1f2937'
                    }}>
                      Date Filter
                    </h4>
                    <p style={{
                      margin: '0',
                      fontSize: '14px',
                      color: '#64748b'
                    }}>
                      {selectedDate ? selectedDate : 'All dates'}
                    </p>
                  </div>
                </div>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    backgroundColor: '#eff6ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    color: '#1e40af'
                  }}>
                    📚
                  </div>
                  <div>
                    <h4 style={{
                      margin: '0 0 4px 0',
                      fontSize: '16px',
                      color: '#1f2937'
                    }}>
                      Lecture Filter
                    </h4>
                    <p style={{
                      margin: '0',
                      fontSize: '14px',
                      color: '#64748b'
                    }}>
                      {selectedLecture ? `Lecture ${selectedLecture}` : 'All lectures'}
                    </p>
                  </div>
                </div>
                
                <div style={{
                  backgroundColor: '#f0f9ff',
                  borderRadius: '8px',
                  padding: '16px',
                  marginTop: '8px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '8px'
                  }}>
                    <span style={{
                      fontSize: '20px'
                    }}>📊</span>
                    <h4 style={{
                      margin: '0',
                      fontSize: '16px',
                      color: '#0369a1'
                    }}>
                      Results
                    </h4>
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '14px',
                      color: '#0369a1'
                    }}>
                      <span>Total Records:</span>
                      <strong>{stats.totalRecords}</strong>
                    </div>
                    
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '14px',
                      color: '#0369a1'
                    }}>
                      <span>Date Range:</span>
                      <strong>
                        {uniqueDates.length > 0 
                          ? `${uniqueDates[uniqueDates.length-1]} to ${uniqueDates[0]}` 
                          : 'No dates'}
                      </strong>
                    </div>
                    
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '14px',
                      color: '#0369a1'
                    }}>
                      <span>Lectures with Attendance:</span>
                      <strong>{Object.keys(groupedRecords).length}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Records Table */}
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
              📝 Attendance Data
            </h3>
            
            <div style={{
              backgroundColor: '#f1f5f9',
              color: '#64748b',
              padding: '6px 12px',
              borderRadius: '100px',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span>{loading ? '⏳' : '📊'}</span>
              {loading ? 'Loading...' : `${records.length} Records`}
            </div>
          </div>
          
          <div style={{ padding: '20px' }}>
            {loading ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 0',
                color: '#64748b'
              }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  borderTop: '2px solid #4361ee',
                  borderRight: '2px solid transparent',
                  animation: 'spin 1s linear infinite',
                  marginRight: '12px'
                }}></div>
                Loading attendance records...
              </div>
            ) : error ? (
              <div style={{
                textAlign: 'center',
                padding: '40px 0',
                color: '#ef4444'
              }}>
                <div style={{
                  fontSize: '40px',
                  marginBottom: '16px'
                }}>
                  ⚠️
                </div>
                <h4 style={{
                  margin: '0 0 8px 0',
                  color: '#b91c1c'
                }}>
                  Error Loading Records
                </h4>
                <p style={{
                  margin: '0',
                  color: '#ef4444',
                  fontSize: '14px'
                }}>
                  {error}
                </p>
              </div>
            ) : records.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px 0',
                color: '#64748b'
              }}>
                <div style={{
                  fontSize: '40px',
                  marginBottom: '16px'
                }}>
                  📋
                </div>
                <h4 style={{
                  margin: '0 0 8px 0',
                  color: '#4b5563'
                }}>
                  No Records Found
                </h4>
                <p style={{
                  margin: '0',
                  color: '#64748b',
                  fontSize: '14px'
                }}>
                  {(selectedLecture || selectedDate) 
                    ? 'Try adjusting your filters or clean up invalid records.' 
                    : 'No attendance records have been created yet.'}
                </p>
              </div>
            ) : (
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
                        Lecture #
                      </th>
                      <th style={{ 
                        padding: '12px 16px', 
                        textAlign: 'left',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#4b5563',
                        borderBottom: '1px solid #e5e7eb'
                      }}>
                        Student Name
                      </th>
                      <th style={{ 
                        padding: '12px 16px', 
                        textAlign: 'left',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#4b5563',
                        borderBottom: '1px solid #e5e7eb'
                      }}>
                        Roll Number
                      </th>
                      <th style={{ 
                        padding: '12px 16px', 
                        textAlign: 'left',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#4b5563',
                        borderBottom: '1px solid #e5e7eb'
                      }}>
                        Date
                      </th>
                      <th style={{ 
                        padding: '12px 16px', 
                        textAlign: 'left',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#4b5563',
                        borderBottom: '1px solid #e5e7eb'
                      }}>
                        Time
                      </th>
                      <th style={{ 
                        padding: '12px 16px', 
                        textAlign: 'left',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#4b5563',
                        borderBottom: '1px solid #e5e7eb'
                      }}>
                        Status
                      </th>
                      <th style={{ 
                        padding: '12px 16px', 
                        textAlign: 'left',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#4b5563',
                        borderBottom: '1px solid #e5e7eb'
                      }}>
                        Method
                      </th>
                      <th style={{ 
                        padding: '12px 16px', 
                        textAlign: 'left',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#4b5563',
                        borderBottom: '1px solid #e5e7eb'
                      }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record, index) => {
                      const isInvalid = !record.name || !record.lectureNumber || !record.rollNo;
                      return (
                        <tr 
                          key={index} 
                          style={{ 
                            backgroundColor: isInvalid 
                              ? '#fef2f2' 
                              : (index % 2 === 0 ? '#f8fafc' : 'white'),
                            opacity: isInvalid ? 0.8 : 1
                          }}
                        >
                          <td style={{ 
                            padding: '12px 16px',
                            fontSize: '14px',
                            color: '#1f2937',
                            borderBottom: '1px solid #e5e7eb'
                          }}>
                            <div style={{ 
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '4px 10px',
                              borderRadius: '100px',
                              backgroundColor: record.lectureNumber ? '#eff6ff' : '#fef2f2',
                              color: record.lectureNumber ? '#1e40af' : '#b91c1c',
                              fontWeight: '600',
                              fontSize: '13px'
                            }}>
                              {record.lectureNumber || 'N/A'}
                            </div>
                          </td>
                          <td style={{ 
                            padding: '12px 16px',
                            fontSize: '14px',
                            fontWeight: '500',
                            color: record.name ? '#1f2937' : '#b91c1c',
                            borderBottom: '1px solid #e5e7eb'
                          }}>
                            {record.name || '❌ Missing Name'}
                          </td>
                          <td style={{ 
                            padding: '12px 16px',
                            fontSize: '14px',
                            color: record.rollNo ? '#1f2937' : '#b91c1c',
                            borderBottom: '1px solid #e5e7eb'
                          }}>
                            {record.rollNo || '❌ Missing'}
                          </td>
                          <td style={{ 
                            padding: '12px 16px',
                            fontSize: '14px',
                            color: '#1f2937',
                            borderBottom: '1px solid #e5e7eb'
                          }}>
                            {record.date}
                          </td>
                          <td style={{ 
                            padding: '12px 16px',
                            fontSize: '14px',
                            color: '#1f2937',
                            borderBottom: '1px solid #e5e7eb'
                          }}>
                            {record.time}
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
                              backgroundColor: (record.status === 'Present' || record.status === 'present') ? '#ecfdf5' : '#fef2f2',
                              color: (record.status === 'Present' || record.status === 'present') ? '#047857' : '#b91c1c',
                              fontWeight: '500',
                              fontSize: '13px'
                            }}>
                              <span style={{ 
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                backgroundColor: (record.status === 'Present' || record.status === 'present') ? '#10b981' : '#ef4444',
                                marginRight: '6px'
                              }}></span>
                              {(record.status === 'Present' || record.status === 'present') ? 'Present' : 'Absent'}
                            </div>
                          </td>
                          <td style={{ 
                            padding: '12px 16px',
                            fontSize: '14px',
                            borderBottom: '1px solid #e5e7eb'
                          }}>
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              backgroundColor: 
                                record.method === 'bulk_upload' ? '#f0f9ff' :
                                record.method === 'manual' ? '#fef3c7' :
                                record.method === 'face_recognition' ? '#f0fdf4' :
                                '#f3f4f6',
                              color: 
                                record.method === 'bulk_upload' ? '#1e40af' :
                                record.method === 'manual' ? '#92400e' :
                                record.method === 'face_recognition' ? '#047857' :
                                '#4b5563',
                              fontWeight: '500',
                              fontSize: '12px'
                            }}>
                              <span style={{ marginRight: '4px' }}>
                                {record.method === 'bulk_upload' ? '📁' :
                                 record.method === 'manual' ? '✏️' :
                                 record.method === 'face_recognition' ? '📱' :
                                 '❓'}
                              </span>
                              {record.method === 'bulk_upload' ? 'Excel Upload' :
                               record.method === 'manual' ? 'Manual' :
                               record.method === 'face_recognition' ? 'Face Recognition' :
                               record.method || 'Unknown'}
                            </div>
                          </td>
                          <td style={{ 
                            padding: '12px 16px',
                            fontSize: '14px',
                            borderBottom: '1px solid #e5e7eb'
                          }}>
                            <button
                              onClick={() => deleteRecord(record)}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#fef2f2',
                                color: '#b91c1c',
                                border: '1px solid #fecaca',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: '500',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              title="Delete this record"
                            >
                              <span>🗑️</span>
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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

export default Records;