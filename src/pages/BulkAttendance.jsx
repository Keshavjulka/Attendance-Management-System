import React, { useState } from 'react';
import '../App.css'; // Use the updated App.css
import { API_BASE_URL } from '../config.js';

const BulkAttendance = () => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedLecture, setSelectedLecture] = useState('');

    // Load current lecture and date from localStorage or API
    React.useEffect(() => {
        // Try to get from localStorage first
        const currentLecture = localStorage.getItem('currentLecture');
        if (currentLecture) {
            try {
                const lectureData = JSON.parse(currentLecture);
                setSelectedDate(lectureData.date || '');
                setSelectedLecture(lectureData.lectureNumber || '');
            } catch (error) {
                console.error('Error parsing current lecture:', error);
            }
        }
        
        // Also try to fetch from API
        fetchCurrentLecture();
    }, []);

    const fetchCurrentLecture = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/current-lecture`);
            const data = await response.json();
            if (data.lecture) {
                setSelectedDate(data.lecture.date || '');
                setSelectedLecture(data.lecture.lectureNumber || '');
            }
        } catch (error) {
            console.error('Error fetching current lecture:', error);
        }
    };

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        setSelectedFile(file);
        setUploadResult(null);
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            if (file.type.includes('sheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                setSelectedFile(file);
                setUploadResult(null);
            } else {
                alert('Please select an Excel file (.xlsx or .xls)');
            }
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            alert('Please select an Excel file first');
            return;
        }

        if (!selectedDate || !selectedLecture) {
            alert('Please select a date and lecture number first');
            return;
        }

        setUploading(true);
        setUploadResult(null);

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('date', selectedDate);
        formData.append('lectureNumber', selectedLecture);

        try {
            const response = await fetch(`${API_BASE_URL}/api/bulk-attendance`, {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();
            setUploadResult(result);

            if (result.success) {
                // Clear the file after successful upload
                setSelectedFile(null);
                // Reset file input
                const fileInput = document.getElementById('fileInput');
                if (fileInput) {
                    fileInput.value = '';
                }
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            setUploadResult({
                success: false,
                error: 'Network error: Failed to upload file'
            });
        } finally {
            setUploading(false);
        }
    };

    const downloadTemplate = () => {
        // Create a simple Excel template
        const csvContent = "Roll No.,Name,Attendance\n2021001,John Doe,P\n2021002,Jane Smith,A\n2021003,Mike Johnson,P";
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'attendance_template.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="attendance-container">
                        <div className="header">
                <h2>Excel Attendance Upload</h2>
                <p>Upload attendance data from Excel file</p>
            </div>

            {/* Date and Lecture Selection Info */}
            <div className="selection-info">
                <div className="info-item">
                    <strong>Date Selected:</strong> {selectedDate || 'Not selected'}
                </div>
                <div className="info-item">
                    <strong>Lecture No.:</strong> {selectedLecture || 'Not selected'}
                </div>
                {(!selectedDate || !selectedLecture) && (
                    <p className="warning">Please select date and lecture number from the main dashboard first.</p>
                )}
            </div>

            {/* Instructions */}
            <div className="instructions">
                <h3>Instructions:</h3>
                <p>Please ensure your Excel file follows the required format:</p>
                <ul>
                    <li>The file must include the following columns: <strong>Roll No.</strong>, <strong>Name</strong>, <strong>Attendance</strong>.</li>
                    <li>Use <strong>‘P’</strong> for Present and <strong>‘A’</strong> for Absent in the Attendance column.</li>
                    <li>Roll numbers must match exactly with those stored in the database.</li>
                    <li>The first row should contain the column headers.</li>
                </ul>
                <button className="download-template-btn" onClick={downloadTemplate}>
                    📄 Download Template
                </button>
            </div>

            {/* File Upload Area */}
            <div 
                className={`file-upload-area ${dragActive ? 'drag-active' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                <div className="upload-content">
                    <div className="upload-icon">📁</div>
                    <p className="upload-text">
                        {selectedFile ? (
                            <span className="selected-file">
                                Selected: <strong>{selectedFile.name}</strong>
                            </span>
                        ) : (
                            <>
                                Upload your Excel file by dragging it here, or click to{' '}
                                <label htmlFor="fileInput" className="file-input-label">
                                    browse files
                                </label>
                                .
                            </>
                        )}
                    </p>
                    <input
                        type="file"
                        id="fileInput"
                        accept=".xlsx,.xls"
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                    />
                </div>
            </div>

            {/* Upload Button */}
            <div className="upload-controls">
                <button 
                    className={`upload-btn ${(!selectedFile || !selectedDate || !selectedLecture) ? 'disabled' : ''}`}
                    onClick={handleUpload}
                    disabled={uploading || !selectedFile || !selectedDate || !selectedLecture}
                >
                    {uploading ? 'Uploading...' : 'Upload Attendance'}
                </button>
                {selectedFile && (
                    <button 
                        className="clear-file-btn"
                        onClick={() => {
                            setSelectedFile(null);
                            setUploadResult(null);
                            const fileInput = document.getElementById('fileInput');
                            if (fileInput) fileInput.value = '';
                        }}
                    >
                        Clear File
                    </button>
                )}
            </div>

            {/* Upload Results */}
            {uploadResult && (
                <div className={`upload-result ${uploadResult.success ? 'success' : 'error'}`}>
                    <h3>{uploadResult.success ? '✅ Upload Successful' : '❌ Upload Failed'}</h3>
                    <p><strong>Message:</strong> {uploadResult.message}</p>
                    
                    {uploadResult.success && (
                        <div className="upload-stats">
                            <p><strong>Total Rows:</strong> {uploadResult.total_rows}</p>
                            <p><strong>Processed:</strong> {uploadResult.processed}</p>
                            <p><strong>Successful:</strong> {uploadResult.successful}</p>
                        </div>
                    )}
                    
                    {uploadResult.error && (
                        <p className="error-details"><strong>Error:</strong> {uploadResult.error}</p>
                    )}
                    
                    {uploadResult.results && uploadResult.results.length > 0 && (
                        <div className="detailed-results">
                            <h4>Detailed Results:</h4>
                            <div className="results-table">
                                {uploadResult.results.map((result, index) => (
                                    <div key={index} className={`result-row ${result.success ? 'success' : 'error'}`}>
                                        <span className="roll-no">{result.rollNo}</span>
                                        <span className="student-name">{result.name}</span>
                                        <span className="result-message">{result.message}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default BulkAttendance;
