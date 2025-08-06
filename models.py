"""
Database models for the Attendance Management System
"""
from datetime import datetime
from typing import Dict, List, Optional, Any

class User:
    """User model for authentication and authorization"""
    
    def __init__(self, username: str, password_hash: str, role: str = 'admin', 
                 full_name: str = '', email: str = ''):
        self.username = username
        self.password_hash = password_hash
        self.role = role
        self.full_name = full_name
        self.email = email
        self.created_at = datetime.utcnow()
        self.last_login = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert user object to dictionary for MongoDB storage"""
        return {
            'username': self.username,
            'password_hash': self.password_hash,
            'role': self.role,
            'full_name': self.full_name,
            'email': self.email,
            'created_at': self.created_at,
            'last_login': self.last_login
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'User':
        """Create User object from MongoDB document"""
        user = cls(
            username=data['username'],
            password_hash=data['password_hash'],
            role=data.get('role', 'admin'),
            full_name=data.get('full_name', ''),
            email=data.get('email', '')
        )
        user.created_at = data.get('created_at', datetime.utcnow())
        user.last_login = data.get('last_login')
        return user

class Student:
    """Student model for student information"""
    
    def __init__(self, student_id: str, name: str, email: str = '', 
                 phone: str = '', department: str = '', year: str = ''):
        self.student_id = student_id
        self.name = name
        self.email = email
        self.phone = phone
        self.department = department
        self.year = year
        self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
        self.is_active = True
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert student object to dictionary for MongoDB storage"""
        return {
            'student_id': self.student_id,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'department': self.department,
            'year': self.year,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
            'is_active': self.is_active
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Student':
        """Create Student object from MongoDB document"""
        student = cls(
            student_id=data['student_id'],
            name=data['name'],
            email=data.get('email', ''),
            phone=data.get('phone', ''),
            department=data.get('department', ''),
            year=data.get('year', '')
        )
        student.created_at = data.get('created_at', datetime.utcnow())
        student.updated_at = data.get('updated_at', datetime.utcnow())
        student.is_active = data.get('is_active', True)
        return student
    
    def update(self, **kwargs) -> None:
        """Update student information"""
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
        self.updated_at = datetime.utcnow()

class AttendanceRecord:
    """Attendance record model"""
    
    def __init__(self, student_id: str, date: datetime = None, 
                 status: str = 'present', marked_by: str = '', 
                 notes: str = '', method: str = 'manual'):
        self.student_id = student_id
        self.date = date or datetime.utcnow()
        self.status = status  # 'present', 'absent', 'late'
        self.marked_by = marked_by
        self.notes = notes
        self.method = method  # 'manual', 'face_recognition', 'auto'
        self.timestamp = datetime.utcnow()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert attendance record to dictionary for MongoDB storage"""
        return {
            'student_id': self.student_id,
            'date': self.date,
            'status': self.status,
            'marked_by': self.marked_by,
            'notes': self.notes,
            'method': self.method,
            'timestamp': self.timestamp
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'AttendanceRecord':
        """Create AttendanceRecord object from MongoDB document"""
        record = cls(
            student_id=data['student_id'],
            date=data.get('date', datetime.utcnow()),
            status=data.get('status', 'present'),
            marked_by=data.get('marked_by', ''),
            notes=data.get('notes', ''),
            method=data.get('method', 'manual')
        )
        record.timestamp = data.get('timestamp', datetime.utcnow())
        return record

class AttendanceSession:
    """Attendance session model for tracking attendance sessions"""
    
    def __init__(self, session_name: str, date: datetime = None, 
                 created_by: str = '', description: str = ''):
        self.session_name = session_name
        self.date = date or datetime.utcnow()
        self.created_by = created_by
        self.description = description
        self.created_at = datetime.utcnow()
        self.is_active = True
        self.total_students = 0
        self.present_count = 0
        self.absent_count = 0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert session to dictionary for MongoDB storage"""
        return {
            'session_name': self.session_name,
            'date': self.date,
            'created_by': self.created_by,
            'description': self.description,
            'created_at': self.created_at,
            'is_active': self.is_active,
            'total_students': self.total_students,
            'present_count': self.present_count,
            'absent_count': self.absent_count
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'AttendanceSession':
        """Create AttendanceSession object from MongoDB document"""
        session = cls(
            session_name=data['session_name'],
            date=data.get('date', datetime.utcnow()),
            created_by=data.get('created_by', ''),
            description=data.get('description', '')
        )
        session.created_at = data.get('created_at', datetime.utcnow())
        session.is_active = data.get('is_active', True)
        session.total_students = data.get('total_students', 0)
        session.present_count = data.get('present_count', 0)
        session.absent_count = data.get('absent_count', 0)
        return session
    
    def update_counts(self, total: int, present: int, absent: int) -> None:
        """Update attendance counts for the session"""
        self.total_students = total
        self.present_count = present
        self.absent_count = absent

# Helper functions for data validation and formatting

def validate_student_id(student_id: str) -> bool:
    """Validate student ID format"""
    if not student_id or not isinstance(student_id, str):
        return False
    return len(student_id.strip()) > 0

def validate_email(email: str) -> bool:
    """Basic email validation"""
    if not email:
        return True  # Email is optional
    return '@' in email and '.' in email.split('@')[-1]

def format_date_for_display(date: datetime) -> str:
    """Format datetime for display in templates"""
    if not date:
        return 'N/A'
    return date.strftime('%Y-%m-%d %H:%M:%S')

def format_date_only(date: datetime) -> str:
    """Format datetime to date only"""
    if not date:
        return 'N/A'
    return date.strftime('%Y-%m-%d')

def get_date_range_query(start_date: str, end_date: str) -> Dict[str, Any]:
    """Generate MongoDB query for date range"""
    query = {}
    if start_date:
        try:
            start_dt = datetime.strptime(start_date, '%Y-%m-%d')
            query['$gte'] = start_dt
        except ValueError:
            pass
    
    if end_date:
        try:
            end_dt = datetime.strptime(end_date, '%Y-%m-%d')
            # Add 23:59:59 to include the entire end date
            end_dt = end_dt.replace(hour=23, minute=59, second=59)
            if '$gte' in query:
                query = {'$gte': query['$gte'], '$lte': end_dt}
            else:
                query['$lte'] = end_dt
        except ValueError:
            pass
    
    return {'date': query} if query else {}

# Database collection names
COLLECTIONS = {
    'users': 'users',
    'students': 'students', 
    'attendance': 'attendance_records',
    'sessions': 'attendance_sessions'
}

# Status constants
ATTENDANCE_STATUS = {
    'PRESENT': 'present',
    'ABSENT': 'absent', 
    'LATE': 'late'
}

USER_ROLES = {
    'ADMIN': 'admin',
    'TEACHER': 'teacher',
    'VIEWER': 'viewer'
}

ATTENDANCE_METHODS = {
    'MANUAL': 'manual',
    'FACE_RECOGNITION': 'face_recognition',
    'AUTO': 'auto'
}
