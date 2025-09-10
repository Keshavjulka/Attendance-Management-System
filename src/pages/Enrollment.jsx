import React, { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import { API_BASE_URL } from '../config';

const Enrollment = () => {
  const webcamRef = useRef(null);
  const [images, setImages] = useState([]);
  const [form, setForm] = useState({ name: '', rollNo: '' });
  const [capturing, setCapturing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch enrolled students on component mount
    fetchEnrolledStudents();
  }, []);

  const fetchEnrolledStudents = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/students`);
      if (response.ok) {
        const students = await response.json();
        setEnrolledStudents(students);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteStudent = async (student) => {
    if (!confirm(`Are you sure you want to delete ${student.name} (${student.rollNo})?\n\nThis will also delete all their attendance records and cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/students/${student.rollNo}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const data = await response.json();
        alert(`✅ ${data.message}\n\n📊 Deleted ${data.attendance_records_deleted} attendance records`);
        fetchEnrolledStudents(); // Refresh the list
      } else {
        const errorData = await response.json();
        alert(`❌ Failed to delete student: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error deleting student:', error);
      alert('❌ Error deleting student. Please try again.');
    }
  };

  const capture = () => {
    setCapturing(true);
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      setImages((prev) => [...prev, imageSrc]);
    }
    setTimeout(() => setCapturing(false), 500);
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (images.length < 3) {
      alert('Please capture at least 3 images');
      return;
    }
    
    try {
      setIsSubmitting(true);
      console.log('Sending enrollment data to backend...');
      const response = await fetch(`${API_BASE_URL}/api/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: form.name,
          rollNo: form.rollNo,
          images: images
        })
      });
      
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        setEnrolled(true);
        setImages([]);
        setForm({ name: '', rollNo: '' });
        fetchEnrolledStudents(); // Refresh the list
        
        // Reset enrolled status after 5 seconds
        setTimeout(() => setEnrolled(false), 5000);
      } else {
        const error = await response.json();
        alert(`Enrollment failed: ${error.message}`);
      }
    } catch (error) {
      console.error('Network error:', error);
      alert(`Network error: ${error.message}. Make sure Flask server is running on ${API_BASE_URL}`);
    } finally {
      setIsSubmitting(false);
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
            <span style={{ marginRight: '12px', fontSize: '32px' }}>📝</span>
            Student Enrollment
          </h2>
          <div className="badge" style={{ 
            backgroundColor: '#e7f3ff', 
            color: '#1e3a8a',
            padding: '8px 16px',
            borderRadius: '100px',
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center'
          }}>
            <span style={{ marginRight: '6px' }}>👥</span>
            {loading ? 'Loading...' : `${enrolledStudents.length} Students Enrolled`}
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: '32px',
        }}>
          {/* Enrollment Form Card */}
          <div className="card" style={{ 
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {enrolled ? (
              <div style={{ 
                padding: '30px', 
                textAlign: 'center',
                backgroundColor: '#f0fdf4',
                borderRadius: '12px',
                animation: 'fadeIn 0.5s ease'
              }}>
                <div style={{ 
                  width: '70px', 
                  height: '70px', 
                  borderRadius: '50%', 
                  backgroundColor: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px auto',
                  fontSize: '32px'
                }}>✓</div>
                <h3 style={{ color: '#10b981', margin: '0 0 10px 0' }}>Enrollment Successful!</h3>
                <p style={{ color: '#166534', margin: '0 0 20px 0' }}>
                  Student has been successfully enrolled in the system.
                </p>
                <button 
                  onClick={() => setEnrolled(false)}
                  style={{ 
                    backgroundColor: '#10b981', 
                    color: 'white',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  Enroll Another Student
                </button>
              </div>
            ) : (
              <>
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
                    👤 Student Information
                  </h3>
                </div>
                
                <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontWeight: '500',
                      color: '#4b5563'
                    }}>
                      Full Name
                    </label>
                    <input 
                      name="name" 
                      value={form.name} 
                      onChange={handleChange} 
                      required
                      placeholder="Enter student's full name"
                      style={{ 
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        fontSize: '16px'
                      }}
                    />
                  </div>
                  
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontWeight: '500',
                      color: '#4b5563'
                    }}>
                      Roll Number
                    </label>
                    <input 
                      name="rollNo" 
                      value={form.rollNo} 
                      onChange={handleChange} 
                      required
                      placeholder="Enter student's roll number"
                      style={{ 
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        fontSize: '16px'
                      }}
                    />
                  </div>
                  
                  <div style={{ 
                    marginBottom: '24px',
                    backgroundColor: '#f8fafc',
                    padding: '20px',
                    borderRadius: '8px'
                  }}>
                    <div style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '16px'
                    }}>
                      <h4 style={{ 
                        margin: '0', 
                        fontSize: '16px', 
                        color: '#4b5563' 
                      }}>
                        📷 Capture Face Images
                      </h4>
                      <span style={{ 
                        fontSize: '14px', 
                        color: images.length >= 3 ? '#10b981' : '#ef4444',
                        fontWeight: '500'
                      }}>
                        {images.length}/5 Images
                      </span>
                    </div>
                    
                    <div style={{ 
                      position: 'relative',
                      width: '100%',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      marginBottom: '16px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                      border: '1px solid #e2e8f0'
                    }}>
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
                      {capturing && (
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          backgroundColor: 'rgba(255,255,255,0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          animation: 'flash 0.3s'
                        }}>
                          <div style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            backgroundColor: 'white'
                          }}></div>
                        </div>
                      )}
                    </div>
                    
                    <button 
                      type="button" 
                      onClick={capture} 
                      disabled={images.length >= 5 || capturing}
                      style={{
                        width: '100%',
                        padding: '12px',
                        backgroundColor: images.length >= 5 ? '#6b7280' : '#4361ee',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: images.length >= 5 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {capturing ? (
                        <span>Capturing...</span>
                      ) : (
                        <>
                          <span style={{ marginRight: '8px' }}>📸</span>
                          <span>Capture Face Image</span>
                        </>
                      )}
                    </button>
                  </div>
                  
                  {images.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                      <h4 style={{ 
                        margin: '0 0 12px 0', 
                        fontSize: '16px', 
                        color: '#4b5563' 
                      }}>
                        Captured Images
                      </h4>
                      <div style={{ 
                        display: 'flex', 
                        flexWrap: 'wrap',
                        gap: '12px'
                      }}>
                        {images.map((img, idx) => (
                          <div 
                            key={idx} 
                            style={{ 
                              position: 'relative',
                              width: '80px',
                              height: '80px',
                              borderRadius: '8px',
                              overflow: 'hidden',
                              border: '1px solid #e2e8f0'
                            }}
                          >
                            <img 
                              src={img} 
                              alt={`face-${idx}`} 
                              style={{ 
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                              }} 
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(idx)}
                              style={{
                                position: 'absolute',
                                top: '4px',
                                right: '4px',
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                backgroundColor: 'rgba(239, 68, 68, 0.9)',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: 'none',
                                padding: 0,
                                cursor: 'pointer',
                                fontSize: '10px'
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <button 
                    type="submit" 
                    disabled={images.length < 3 || isSubmitting}
                    style={{
                      width: '100%',
                      padding: '14px',
                      backgroundColor: images.length < 3 ? '#6b7280' : '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: '600',
                      fontSize: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: images.length < 3 ? 'not-allowed' : 'pointer',
                      opacity: isSubmitting ? 0.7 : 1
                    }}
                  >
                    {isSubmitting ? (
                      <span>Enrolling Student...</span>
                    ) : (
                      <>
                        <span style={{ marginRight: '8px' }}>✅</span>
                        <span>Complete Enrollment</span>
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
          
          {/* Enrolled Students Card */}
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
                👥 Enrolled Students
              </h3>
              <button 
                onClick={fetchEnrolledStudents} 
                style={{
                  backgroundColor: 'transparent',
                  color: '#4361ee',
                  border: 'none',
                  padding: '6px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <span style={{ marginRight: '4px' }}>🔄</span>
                Refresh
              </button>
            </div>
            
            <div style={{ padding: '20px', maxHeight: '480px', overflowY: 'auto' }}>
              {loading ? (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  padding: '40px 0',
                  color: '#6b7280'
                }}>
                  <div style={{ marginRight: '12px' }}>🔄</div>
                  Loading students...
                </div>
              ) : enrolledStudents.length === 0 ? (
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
                    👤
                  </div>
                  <h4 style={{ margin: '0 0 8px 0', color: '#4b5563' }}>No Students Enrolled</h4>
                  <p style={{ margin: '0', color: '#6b7280', fontSize: '14px' }}>
                    Complete the enrollment form to register students
                  </p>
                </div>
              ) : (
                <div>
                  {enrolledStudents.map((student, index) => (
                    <div 
                      key={index}
                      style={{
                        padding: '16px',
                        borderRadius: '8px',
                        backgroundColor: index % 2 === 0 ? '#f9fafb' : 'white',
                        marginBottom: '10px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <div style={{ 
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: '#e0e7ff',
                        color: '#4338ca',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '600',
                        marginRight: '16px',
                        fontSize: '16px'
                      }}>
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 style={{ 
                          margin: '0 0 4px 0', 
                          fontSize: '16px', 
                          color: '#1f2937' 
                        }}>
                          {student.name}
                        </h4>
                        <p style={{ 
                          margin: '0', 
                          fontSize: '14px', 
                          color: '#6b7280' 
                        }}>
                          Roll No: {student.rollNo}
                        </p>
                      </div>
                      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div 
                          style={{ 
                            backgroundColor: '#f0fdf4',
                            color: '#10b981',
                            padding: '4px 12px',
                            borderRadius: '100px',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}
                        >
                          ✓ Enrolled
                        </div>
                        <button
                          onClick={() => deleteStudent(student)}
                          style={{
                            backgroundColor: '#fee2e2',
                            color: '#dc2626',
                            border: 'none',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={(e) => {
                            e.target.style.backgroundColor = '#fecaca';
                            e.target.style.transform = 'scale(1.05)';
                          }}
                          onMouseOut={(e) => {
                            e.target.style.backgroundColor = '#fee2e2';
                            e.target.style.transform = 'scale(1)';
                          }}
                          title={`Delete ${student.name}`}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Instructions */}
        <div style={{ 
          backgroundColor: '#e7f3ff',
          padding: '20px',
          borderRadius: '12px',
          marginTop: '8px',
          textAlign: 'left'
        }}>
          <h4 style={{ 
            margin: '0 0 16px 0',
            color: '#1e40af',
            fontSize: '16px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center'
          }}>
            <span style={{ marginRight: '8px' }}>💡</span>
            Tips for Better Enrollment
          </h4>
          <ul style={{ 
            margin: '0',
            paddingLeft: '20px',
            color: '#1e40af',
            fontSize: '14px',
            lineHeight: '1.6'
          }}>
            <li style={{ marginBottom: '8px' }}>Ensure good lighting on the face.</li>
            <li style={{ marginBottom: '8px' }}>Capture at least 3 images from slightly different angles.</li>
            <li style={{ marginBottom: '8px' }}>Remove glasses or other face coverings.</li>
            <li style={{ marginBottom: '0' }}>Keep a neutral expression for best recognition.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Enrollment;