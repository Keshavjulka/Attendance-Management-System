"""
Manual Attendance Management System
A Flask-based attendance system with MongoDB integration
"""

from flask import Flask, render_template, request, redirect, url_for, session, jsonify, flash, make_response
from flask_pymongo import PyMongo
from flask_cors import CORS
from dotenv import load_dotenv
import os
import csv
from datetime import datetime, date, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
from bson.objectid import ObjectId
from functools import wraps
import pandas as pd 
from io import BytesIO

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'attendance-system-secret-key-2024')

# Configure MongoDB with better error handling
try:
    # Try multiple MongoDB connection options
    connection_options = [
        # Primary MongoDB Atlas connection with URL encoded password
        'mongodb+srv://flask_user:keshavjulka%400123@flask-cluster.rstc7gw.mongodb.net/flask_app_db?retryWrites=true&w=majority&appName=flask-cluster',
        # Alternative with different encoding
        'mongodb+srv://flask_user:keshavjulka%40123@flask-cluster.rstc7gw.mongodb.net/flask_app_db?retryWrites=true&w=majority&appName=flask-cluster',
        # Local MongoDB fallback
        'mongodb://localhost:27017/attendance_system'
    ]
    
    MONGO_URI = os.getenv('MONGO_URI', connection_options[0])
    app.config['MONGO_URI'] = MONGO_URI
    
    print(f"📡 Attempting to connect to MongoDB...")
except Exception as e:
    print(f"❌ MongoDB configuration error: {e}")
    # Fallback to local MongoDB if available
    app.config['MONGO_URI'] = 'mongodb://localhost:27017/attendance_system'

# Initialize extensions
mongo = PyMongo(app)
CORS(app)

# Template filters
@app.template_filter('datetime')
def datetime_filter(dt):
    """Format datetime for display"""
    if dt:
        return dt.strftime('%Y-%m-%d %H:%M:%S')
    return 'N/A'

@app.template_filter('date_only')
def date_only_filter(dt):
    """Format date only"""
    if dt:
        return dt.strftime('%Y-%m-%d')
    return 'N/A'

@app.template_filter('time_only')
def time_only_filter(dt):
    """Format time only"""
    if dt:
        return dt.strftime('%H:%M:%S')
    return 'N/A'

@app.template_filter('year')
def year_filter(dt=None):
    """Get current year"""
    if dt:
        return dt.strftime('%Y')
    return datetime.now().strftime('%Y')

# Template context processors
@app.context_processor
def inject_current_year():
    """Inject current year into all templates"""
    return {'current_year': datetime.now().year}

# Helper Functions
def validate_mongodb_connection():
    """Validate MongoDB connection and collections"""
    try:
        # Test connection
        mongo.db.command('ping')
        
        # Ensure required collections exist
        collections = mongo.db.list_collection_names()
        required_collections = ['students', 'attendance', 'faculty', 'lectures']
        
        for collection in required_collections:
            if collection not in collections:
                print(f"📝 Creating collection: {collection}")
        
        # Test basic operations
        mongo.db.students.find_one()
        mongo.db.attendance.find_one()
        
        print("✅ MongoDB connection validated successfully!")
        return True
    except Exception as e:
        print(f"❌ MongoDB validation failed: {e}")
        return False

def sync_attendance_data():
    """Sync and validate attendance data consistency"""
    try:
        print("🔄 Syncing attendance data...")
        
        # Find attendance records without proper student references
        attendance_records = mongo.db.attendance.find()
        updated_count = 0
        
        for record in attendance_records:
            update_needed = False
            update_data = {}
            
            # Ensure we have both student_id and student_object_id
            if 'student_id' in record and not record.get('student_object_id'):
                student = mongo.db.students.find_one({'student_id': record['student_id']})
                if student:
                    update_data['student_object_id'] = str(student['_id'])
                    update_data['student_name'] = student['name']
                    update_needed = True
            
            # Ensure timestamp field exists
            if 'date' in record and not record.get('timestamp'):
                try:
                    if isinstance(record['date'], datetime):
                        update_data['timestamp'] = record['date']
                    else:
                        # Try to parse date string
                        parsed_date = datetime.strptime(str(record['date']), '%Y-%m-%d')
                        update_data['timestamp'] = parsed_date
                    update_needed = True
                except:
                    update_data['timestamp'] = datetime.now()
                    update_needed = True
            
            if update_needed:
                mongo.db.attendance.update_one(
                    {'_id': record['_id']},
                    {'$set': update_data}
                )
                updated_count += 1
        
        if updated_count > 0:
            print(f"✅ Updated {updated_count} attendance records")
        
        return True
    except Exception as e:
        print(f"❌ Error syncing attendance data: {e}")
        return False

def init_database():
    """Initialize database with default admin"""
    try:
        # Validate MongoDB connection first
        if not validate_mongodb_connection():
            return False
        
        # Test MongoDB connection
        mongo.db.command('ping')
        print("✅ MongoDB connection successful!")
        
        # Check if admin exists
        existing_admin = mongo.db.faculty.find_one({'faculty_id': 'admin'})
        if not existing_admin:
            admin_data = {
                'faculty_id': 'admin',
                'password_hash': generate_password_hash('admin123'),
                'name': 'System Administrator',
                'email': 'admin@attendance.com',
                'created_at': datetime.now()
            }
            mongo.db.faculty.insert_one(admin_data)
            print("✅ Default admin created (admin/admin123)")
        
        # Create indexes with error handling
        try:
            mongo.db.students.create_index('student_id', unique=True)
            print("✅ Student indexes created")
        except Exception as idx_error:
            print(f"⚠️ Student index creation warning: {idx_error}")
        
        try:
            mongo.db.faculty.create_index('faculty_id', unique=True)
            print("✅ Faculty indexes created")
        except Exception as idx_error:
            print(f"⚠️ Faculty index creation warning: {idx_error}")
        
        try:
            mongo.db.attendance.create_index([('student_id', 1), ('lecture_number', 1), ('date', 1)])
            print("✅ Attendance indexes created")
        except Exception as idx_error:
            print(f"⚠️ Attendance index creation warning: {idx_error}")
        
        # Sync existing data
        sync_attendance_data()
        
        print("✅ Database initialized successfully!")
        return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        print("💡 Suggestions:")
        print("   1. Check your internet connection")
        print("   2. Verify MongoDB Atlas credentials")
        print("   3. Try using local MongoDB instead")
        print("   4. Check if your IP is whitelisted in MongoDB Atlas")
        return False

def get_dashboard_stats():
    """Get dashboard statistics"""
    try:
        today = datetime.combine(date.today(), datetime.min.time())
        tomorrow = today + timedelta(days=1)
        
        total_students = mongo.db.students.count_documents({'is_active': True})
        today_attendance = mongo.db.attendance.count_documents({
            'timestamp': {'$gte': today, '$lt': tomorrow}
        })
        
        current_lecture = mongo.db.lectures.find_one({'is_active': True})
        current_lecture_num = current_lecture['lecture_number'] if current_lecture else session.get('current_lecture', 1)
        
        return {
            'total_students': total_students,
            'present_today': today_attendance,
            'absent_today': max(0, total_students - today_attendance),
            'current_lecture': current_lecture_num,
            'attendance_rate': round((today_attendance / total_students * 100) if total_students > 0 else 0, 2)
        }
    except Exception as e:
        print(f"Error getting dashboard stats: {e}")
        return {'total_students': 0, 'present_today': 0, 'absent_today': 0, 'current_lecture': 1, 'attendance_rate': 0}

# Authentication decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'faculty_id' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# Routes
@app.route('/')
def index():
    if 'faculty_id' in session:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        faculty_id = request.form['faculty_id']
        password = request.form['password']
        
        faculty = mongo.db.faculty.find_one({'faculty_id': faculty_id})
        if faculty and check_password_hash(faculty['password_hash'], password):
            session['faculty_id'] = faculty_id
            session['faculty_name'] = faculty['name']
            flash('Login successful!', 'success')
            return redirect(url_for('dashboard'))
        else:
            flash('Invalid faculty ID or password!', 'error')
    
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    session.clear()
    flash('Logged out successfully!', 'success')
    return redirect(url_for('login'))

@app.route('/dashboard')
@login_required
def dashboard():
    try:
        stats = get_dashboard_stats()
        recent_activity = []
        
        # Try to get recent attendance records safely
        try:
            recent_records = mongo.db.attendance.find().sort('timestamp', -1).limit(10)
            for record in recent_records:
                safe_record = {
                    'student_name': 'Unknown Student',
                    'student_id': 'N/A',
                    'time': record.get('timestamp', datetime.now()).strftime('%H:%M:%S') if record.get('timestamp') else 'N/A',
                    'lecture': record.get('lecture_number', 1)
                }
                try:
                    if 'student_object_id' in record and record['student_object_id']:
                        # Use ObjectId to find student
                        student = mongo.db.students.find_one({'_id': ObjectId(record['student_object_id'])})
                        if student:
                            safe_record['student_name'] = student.get('name', 'Unknown Student')
                            safe_record['student_id'] = student.get('student_id', 'N/A')
                    elif 'student_id' in record and record['student_id']:
                        # Fallback to student_id field search
                        student = mongo.db.students.find_one({'student_id': record['student_id']})
                        if student:
                            safe_record['student_name'] = student.get('name', 'Unknown Student')
                            safe_record['student_id'] = student.get('student_id', 'N/A')
                except Exception as e:
                    print(f"Error processing recent record: {e}")
                    pass
                recent_activity.append(safe_record)
        except:
            recent_activity = []
        
        return render_template('dashboard.html', **{'stats': stats, 'recent_activity': recent_activity})
    except Exception as e:
        flash(f'Error loading dashboard: {str(e)}', 'error')
        default_stats = {
            'total_students': 0, 
            'present_today': 0, 
            'absent_today': 0, 
            'current_lecture': 1, 
            'attendance_rate': 0
        }
        return render_template('dashboard.html', **{'stats': default_stats, 'recent_activity': []})

@app.route('/register_student', methods=['GET', 'POST'])
@login_required
def register_student():
    if request.method == 'POST':
        name = request.form['name']
        student_id = request.form['student_id']  # Changed from roll_number
        class_name = request.form.get('class', '')
        email = request.form.get('email', '')
        phone = request.form.get('phone', '')
        department = request.form.get('department', '')
        
        # Check if student exists
        existing = mongo.db.students.find_one({'student_id': student_id})
        if existing:
            flash('Student with this ID already exists!', 'error')
        else:
            student_data = {
                'name': name,
                'student_id': student_id,
                'class': class_name,
                'email': email,
                'phone': phone,
                'department': department,
                'created_at': datetime.now(),
                'is_active': True
            }
            mongo.db.students.insert_one(student_data)
            flash('Student registered successfully!', 'success')
        
        return redirect(url_for('register_student'))
    
    stats = get_dashboard_stats()
    return render_template('register_student.html', stats=stats)

@app.route('/manual_attendance')
@login_required
def manual_attendance():
    try:
        students = list(mongo.db.students.find({'is_active': True}).sort('student_id', 1))
        current_lecture = mongo.db.lectures.find_one({'is_active': True})
        
        # If no active lecture, create one
        if not current_lecture:
            lecture_data = {
                'lecture_number': 1,
                'date': datetime.now(),
                'is_active': True,
                'subject': 'General',
                'created_by': session.get('faculty_id')
            }
            mongo.db.lectures.insert_one(lecture_data)
            current_lecture = lecture_data
        
        stats = get_dashboard_stats()
        total_students = stats.get('total_students', 0)
        
        # Get today's attendance count for marked_count
        today = datetime.combine(date.today(), datetime.min.time())
        tomorrow = today + timedelta(days=1)
        marked_count = mongo.db.attendance.count_documents({
            'timestamp': {'$gte': today, '$lt': tomorrow}
        })
        
        return render_template('manual_attendance.html', 
                             students=students, 
                             current_lecture=current_lecture,
                             stats=stats,
                             total_students=total_students,
                             marked_count=marked_count)
    except Exception as e:
        flash(f'Error loading manual attendance: {str(e)}', 'error')
        return redirect(url_for('dashboard'))

@app.route('/reports')
@login_required
def reports():
    attendance_data = list(mongo.db.attendance.find().sort('date', -1).limit(100))
    stats = get_dashboard_stats()
    
    # Create summary for reports
    total_records = len(attendance_data)
    unique_students = len(set(record.get('student_object_id') or record.get('student_id') for record in attendance_data if record.get('student_object_id') or record.get('student_id')))
    
    summary = {
        'total_attendance_records': total_records,
        'unique_students_attended': unique_students,
        'total_students': stats.get('total_students', 0),
        'attendance_percentage': round((unique_students / stats.get('total_students', 1) * 100), 2) if stats.get('total_students', 0) > 0 else 0
    }
    
    # Create filters for the reports page
    filters = {
        'date_options': [
            {'value': 'today', 'label': 'Today'},
            {'value': 'week', 'label': 'This Week'},
            {'value': 'month', 'label': 'This Month'},
            {'value': 'custom', 'label': 'Custom Range'}
        ],
        'class_options': ['All Classes', 'Class A', 'Class B', 'Class C'],
        'status_options': ['All', 'Present', 'Absent']
    }
    
    return render_template('reports.html', 
                         attendance_data=attendance_data, 
                         stats=stats,
                         filters=filters,
                         summary=summary)

@app.route('/api/mark_attendance', methods=['POST'])
@login_required
def mark_attendance_api():
    try:
        data = request.get_json()
        student_id = data.get('student_id')
        
        if not student_id:
            return jsonify({'success': False, 'message': 'Student ID is required'})
        
        # Get current lecture
        current_lecture = mongo.db.lectures.find_one({'is_active': True})
        if not current_lecture:
            # Create a default active lecture if none exists
            lecture_data = {
                'lecture_number': 1,
                'date': datetime.now(),
                'is_active': True,
                'subject': 'General',
                'created_by': session.get('faculty_id')
            }
            mongo.db.lectures.insert_one(lecture_data)
            current_lecture = lecture_data
        
        lecture_number = current_lecture['lecture_number']
        
        # Find student by student_id
        student = mongo.db.students.find_one({'student_id': student_id})
        if not student:
            return jsonify({'success': False, 'message': f'Student with ID {student_id} not found'})
        
        # Check if attendance already marked today for this lecture
        today = datetime.combine(date.today(), datetime.min.time())
        tomorrow = today + timedelta(days=1)
        
        existing = mongo.db.attendance.find_one({
            'student_object_id': str(student['_id']),
            'lecture_number': lecture_number,
            'date': {'$gte': today, '$lt': tomorrow}
        })
        
        if existing:
            return jsonify({'success': False, 'message': f'Attendance already marked for {student["name"]} in lecture {lecture_number}'})
        
        # Mark attendance with proper references
        attendance_data = {
            'student_id': student['student_id'],  # Store student_id for easy querying
            'student_object_id': str(student['_id']),  # Store ObjectId as string for reference
            'student_name': student['name'],
            'lecture_number': lecture_number,
            'subject': current_lecture.get('subject', 'General'),
            'faculty_id': session.get('faculty_id'),
            'date': today,
            'time': datetime.now().strftime('%H:%M:%S'),
            'timestamp': datetime.now(),
            'status': 'present',
            'marked_by': 'manual'
        }
        
        result = mongo.db.attendance.insert_one(attendance_data)
        if result.inserted_id:
            return jsonify({
                'success': True, 
                'message': f'Attendance marked successfully for {student["name"]}',
                'student_name': student['name'],
                'time': attendance_data['time']
            })
        else:
            return jsonify({'success': False, 'message': 'Failed to save attendance record'})
        
    except Exception as e:
        print(f"Error marking attendance: {e}")
        return jsonify({'success': False, 'message': f'Error: {str(e)}'})

@app.route('/api/dashboard_stats')
@login_required
def dashboard_stats():
    stats = get_dashboard_stats()
    return jsonify(stats)

@app.route('/export_excel')
@login_required
def export_excel():
    try:
        attendance_data = list(mongo.db.attendance.find().sort('timestamp', -1))
        
        # Create CSV content with proper data extraction
        csv_content = "Student ID,Student Name,Date,Time,Lecture,Subject,Status\n"
        for record in attendance_data:
            # Get proper date formatting
            if 'timestamp' in record:
                date_str = record['timestamp'].strftime('%Y-%m-%d') if isinstance(record['timestamp'], datetime) else str(record.get('timestamp', ''))
                time_str = record['timestamp'].strftime('%H:%M:%S') if isinstance(record['timestamp'], datetime) else str(record.get('time', ''))
            else:
                date_str = record.get('date', '')
                time_str = record.get('time', '')
            
            # Extract student information
            student_id = record.get('student_id', 'N/A')
            student_name = record.get('student_name', 'Unknown')
            
            csv_content += f'"{student_id}","{student_name}","{date_str}","{time_str}","{record.get("lecture_number", "")}","{record.get("subject", "")}","{record.get("status", "present")}"\n'
        
        response = make_response(csv_content)
        response.headers["Content-Disposition"] = f"attachment; filename=attendance_report_{date.today().strftime('%Y-%m-%d')}.csv"
        response.headers["Content-Type"] = "text/csv"
        
        return response
    except Exception as e:
        flash(f'Export failed: {str(e)}', 'error')
        return redirect(url_for('reports'))

# API Endpoints
@app.route('/api/sync_data', methods=['POST'])
@login_required
def sync_data():
    """Manually trigger data synchronization"""
    try:
        success = sync_attendance_data()
        if success:
            return jsonify({'success': True, 'message': 'Data synchronized successfully'})
        else:
            return jsonify({'success': False, 'message': 'Data synchronization failed'})
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error: {str(e)}'})

@app.route('/api/bulk_attendance', methods=['POST'])
@login_required
def bulk_mark_attendance():
    """Mark attendance for multiple students"""
    try:
        data = request.get_json()
        student_ids = data.get('student_ids', [])
        
        if not student_ids:
            return jsonify({'success': False, 'message': 'No students selected'})
        
        # Get or create current lecture
        current_lecture = mongo.db.lectures.find_one({'is_active': True})
        if not current_lecture:
            lecture_data = {
                'lecture_number': 1,
                'date': datetime.now(),
                'is_active': True,
                'subject': 'General',
                'created_by': session.get('faculty_id')
            }
            mongo.db.lectures.insert_one(lecture_data)
            current_lecture = lecture_data
        
        lecture_number = current_lecture['lecture_number']
        today = datetime.combine(date.today(), datetime.min.time())
        tomorrow = today + timedelta(days=1)
        
        success_count = 0
        error_count = 0
        messages = []
        
        for student_id in student_ids:
            try:
                # Find student
                student = mongo.db.students.find_one({'student_id': student_id})
                if not student:
                    messages.append(f'Student {student_id} not found')
                    error_count += 1
                    continue
                
                # Check if already marked
                existing = mongo.db.attendance.find_one({
                    'student_object_id': str(student['_id']),
                    'lecture_number': lecture_number,
                    'timestamp': {'$gte': today, '$lt': tomorrow}
                })
                
                if existing:
                    messages.append(f'{student["name"]} already marked')
                    continue
                
                # Mark attendance
                attendance_data = {
                    'student_id': student['student_id'],
                    'student_object_id': str(student['_id']),
                    'student_name': student['name'],
                    'lecture_number': lecture_number,
                    'subject': current_lecture.get('subject', 'General'),
                    'faculty_id': session.get('faculty_id'),
                    'date': today,
                    'time': datetime.now().strftime('%H:%M:%S'),
                    'timestamp': datetime.now(),
                    'status': 'present',
                    'marked_by': 'bulk'
                }
                
                result = mongo.db.attendance.insert_one(attendance_data)
                if result.inserted_id:
                    success_count += 1
                    messages.append(f'{student["name"]} marked successfully')
                else:
                    error_count += 1
                    messages.append(f'Failed to mark {student["name"]}')
                    
            except Exception as e:
                error_count += 1
                messages.append(f'Error with {student_id}: {str(e)}')
        
        return jsonify({
            'success': success_count > 0,
            'message': f'Marked {success_count} students successfully, {error_count} errors',
            'details': messages,
            'success_count': success_count,
            'error_count': error_count
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Bulk operation failed: {str(e)}'})

@app.route('/api/set_lecture', methods=['POST'])
@login_required
def api_set_lecture():
    try:
        data = request.get_json()
        lecture_number = data.get('lecture_number', 1)
        
        # Store in session
        session['current_lecture'] = lecture_number
        
        # Optionally store in database
        mongo.db.lectures.update_one(
            {'is_active': True},
            {'$set': {'is_active': False}}
        )
        
        mongo.db.lectures.insert_one({
            'lecture_number': lecture_number,
            'date': datetime.now(),
            'is_active': True
        })
        
        return jsonify({'success': True, 'lecture_number': lecture_number})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/stats')
@login_required
def api_stats():
    stats = get_dashboard_stats()
    return jsonify(stats)

@app.route('/api/recent_attendance')
@login_required
def api_recent_attendance():
    try:
        recent_activity = list(mongo.db.attendance.find().sort('timestamp', -1).limit(10))
        
        # Add student names to recent activity
        for record in recent_activity:
            try:
                if 'student_object_id' in record and record['student_object_id']:
                    # Use ObjectId to find student
                    student = mongo.db.students.find_one({'_id': ObjectId(record['student_object_id'])})
                    if student:
                        record['student_name'] = student.get('name', 'Unknown Student')
                        record['display_student_id'] = student.get('student_id', 'N/A')
                    else:
                        record['student_name'] = record.get('student_name', 'Unknown Student')
                        record['display_student_id'] = record.get('student_id', 'N/A')
                elif 'student_id' in record:
                    # Fallback to student_id search
                    student = mongo.db.students.find_one({'student_id': record['student_id']})
                    if student:
                        record['student_name'] = student.get('name', 'Unknown Student')
                        record['display_student_id'] = student.get('student_id', 'N/A')
                    else:
                        record['student_name'] = record.get('student_name', 'Unknown Student')
                        record['display_student_id'] = record.get('student_id', 'N/A')
                
                # Convert timestamp to readable format
                if 'timestamp' in record:
                    record['time'] = record['timestamp'].strftime('%H:%M:%S')
                
                # Clean up the record for JSON serialization
                if '_id' in record:
                    record['_id'] = str(record['_id'])
                
            except Exception as e:
                print(f"Error processing attendance record: {e}")
                record['student_name'] = 'Unknown Student'
                record['display_student_id'] = 'N/A'
                record['time'] = 'N/A'
        
        return jsonify({'attendance': recent_activity})
    except Exception as e:
        print(f"Error fetching recent attendance: {e}")
        return jsonify({'attendance': [], 'error': str(e)})

@app.route('/api/export_today_attendance')
@login_required
def export_today_attendance():
    try:
        from io import StringIO
        import csv
        
        today = datetime.combine(date.today(), datetime.min.time())
        tomorrow = today + timedelta(days=1)
        
        # Get today's attendance using timestamp field
        attendance_records = list(mongo.db.attendance.find({
            'timestamp': {'$gte': today, '$lt': tomorrow}
        }))
        
        # Create CSV
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(['Student Name', 'Student ID', 'Time', 'Date', 'Lecture'])
        
        for record in attendance_records:
            # Try to get student info from the record first, then from database
            student_name = record.get('student_name', 'Unknown')
            student_id = record.get('student_id', 'N/A')
            
            # If we have object_id, try to get fresh student data
            if record.get('student_object_id') and (student_name == 'Unknown' or student_id == 'N/A'):
                try:
                    student = mongo.db.students.find_one({'_id': ObjectId(record['student_object_id'])})
                    if student:
                        student_name = student.get('name', student_name)
                        student_id = student.get('student_id', student_id)
                except:
                    pass
            
            timestamp = record.get('timestamp', datetime.now())
            writer.writerow([
                student_name,
                student_id,
                timestamp.strftime('%H:%M:%S') if isinstance(timestamp, datetime) else record.get('time', 'N/A'),
                timestamp.strftime('%Y-%m-%d') if isinstance(timestamp, datetime) else today.strftime('%Y-%m-%d'),
                record.get('lecture_number', 1)
            ])
        
        output.seek(0)
        
        from flask import Response
        return Response(
            output.getvalue(),
            mimetype='text/csv',
            headers={'Content-Disposition': f'attachment; filename=attendance_{date.today()}.csv'}
        )
    except Exception as e:
        flash(f'Error exporting attendance: {str(e)}', 'error')
        return redirect(url_for('dashboard'))

@app.route('/api/export_all_students')
@login_required
def export_all_students():
    try:
        from io import StringIO
        import csv
        
        # Get all students
        students = list(mongo.db.students.find())
        
        # Create CSV
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(['Name', 'Student ID', 'Class', 'Email', 'Phone', 'Department', 'Created Date'])
        
        for student in students:
            created_date = student.get('created_at', datetime.now())
            writer.writerow([
                student.get('name', ''),
                student.get('student_id', ''),
                student.get('class', ''),
                student.get('email', ''),
                student.get('phone', ''),
                student.get('department', ''),
                created_date.strftime('%Y-%m-%d') if isinstance(created_date, datetime) else str(created_date)
            ])
        
        output.seek(0)
        
        from flask import Response
        return Response(
            output.getvalue(),
            mimetype='text/csv',
            headers={'Content-Disposition': f'attachment; filename=all_students_{date.today()}.csv'}
        )
    except Exception as e:
        flash(f'Error exporting students: {str(e)}', 'error')
        return redirect(url_for('dashboard'))

@app.route('/api/export_monthly_report')
@login_required
def export_monthly_report():
    try:
        from io import StringIO
        import csv
        from datetime import datetime, timedelta
        
        # Get current month data
        now = datetime.now()
        month_start = datetime(now.year, now.month, 1)
        next_month = month_start + timedelta(days=32)
        month_end = datetime(next_month.year, next_month.month, 1)
        
        # Get monthly attendance using timestamp field
        attendance_records = list(mongo.db.attendance.find({
            'timestamp': {'$gte': month_start, '$lt': month_end}
        }))
        
        # Create CSV
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(['Student Name', 'Student ID', 'Date', 'Time', 'Lecture'])
        
        for record in attendance_records:
            # Try to get student info from the record first, then from database
            student_name = record.get('student_name', 'Unknown')
            student_id = record.get('student_id', 'N/A')
            
            # If we have object_id, try to get fresh student data
            if record.get('student_object_id'):
                try:
                    student = mongo.db.students.find_one({'_id': ObjectId(record['student_object_id'])})
                    if student:
                        student_name = student.get('name', student_name)
                        student_id = student.get('student_id', student_id)
                except:
                    pass
            
            timestamp = record.get('timestamp', datetime.now())
            writer.writerow([
                student_name,
                student_id,
                timestamp.strftime('%Y-%m-%d') if isinstance(timestamp, datetime) else 'N/A',
                timestamp.strftime('%H:%M:%S') if isinstance(timestamp, datetime) else 'N/A',
                record.get('lecture_number', 1)
            ])
        
        output.seek(0)
        
        from flask import Response
        return Response(
            output.getvalue(),
            mimetype='text/csv',
            headers={'Content-Disposition': f'attachment; filename=monthly_report_{now.strftime("%Y_%m")}.csv'}
        )
    except Exception as e:
        flash(f'Error exporting monthly report: {str(e)}', 'error')
        return redirect(url_for('dashboard'))

# Excel Export Routes
@app.route('/export/attendance_excel')
@login_required
def export_attendance_excel():
    """Export all attendance data to Excel"""
    try:
        # Get all attendance records
        attendance_records = list(mongo.db.attendance.find())
        
        # Prepare data for Excel
        data = []
        for record in attendance_records:
            # Get student details
            student = mongo.db.students.find_one({'_id': record.get('student_id')})
            
            data.append({
                'Date': record.get('date', ''),
                'Time': record.get('timestamp', '').strftime('%H:%M:%S') if record.get('timestamp') else '',
                'Student ID': student.get('student_id', 'Unknown') if student else 'Unknown',
                'Student Name': student.get('name', 'Unknown') if student else 'Unknown',
                'Department': student.get('department', 'N/A') if student else 'N/A',
                'Lecture Number': record.get('lecture_number', 1),
                'Status': 'Present'
            })
        
        # Create DataFrame
        df = pd.DataFrame(data)
        
        # Create Excel file in memory
        excel_buffer = BytesIO()
        with pd.ExcelWriter(excel_buffer, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Attendance Records', index=False)
            
            # Add summary sheet
            summary_data = {
                'Metric': ['Total Records', 'Unique Students', 'Date Range'],
                'Value': [
                    len(data),
                    len(set([d['Student ID'] for d in data])),
                    f"{min([d['Date'] for d in data])} to {max([d['Date'] for d in data])}" if data else "No data"
                ]
            }
            summary_df = pd.DataFrame(summary_data)
            summary_df.to_excel(writer, sheet_name='Summary', index=False)
        
        excel_buffer.seek(0)
        
        # Create response
        response = make_response(excel_buffer.getvalue())
        response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        response.headers['Content-Disposition'] = f'attachment; filename=attendance_records_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
        
        return response
        
    except Exception as e:
        flash(f'Error exporting to Excel: {str(e)}', 'error')
        return redirect(url_for('dashboard'))

@app.route('/export/students_excel')
@login_required
def export_students_excel():
    """Export all students data to Excel"""
    try:
        # Get all students
        students = list(mongo.db.students.find())
        
        # Prepare data for Excel
        data = []
        for student in students:
            data.append({
                'Student ID': student.get('student_id', ''),
                'Name': student.get('name', ''),
                'Email': student.get('email', ''),
                'Phone': student.get('phone', ''),
                'Department': student.get('department', ''),
                'Class': student.get('class', ''),
                'Registration Date': student.get('created_at', '').strftime('%Y-%m-%d') if student.get('created_at') else '',
                'Status': 'Active' if student.get('is_active', True) else 'Inactive'
            })
        
        # Create DataFrame
        df = pd.DataFrame(data)
        
        # Create Excel file in memory
        excel_buffer = BytesIO()
        with pd.ExcelWriter(excel_buffer, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Students', index=False)
        
        excel_buffer.seek(0)
        
        # Create response
        response = make_response(excel_buffer.getvalue())
        response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        response.headers['Content-Disposition'] = f'attachment; filename=students_list_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
        
        return response
        
    except Exception as e:
        flash(f'Error exporting students to Excel: {str(e)}', 'error')
        return redirect(url_for('dashboard'))

@app.route('/export/daily_report_excel')
@login_required
def export_daily_report_excel():
    """Export today's attendance report to Excel"""
    try:
        today = datetime.now().strftime('%Y-%m-%d')
        
        # Get today's attendance
        attendance_records = list(mongo.db.attendance.find({'date': {'$regex': today}}))
        all_students = list(mongo.db.students.find({'is_active': True}))
        
        # Create attendance report
        present_students = []
        absent_students = []
        
        attended_ids = set(record.get('student_id') for record in attendance_records)
        
        for student in all_students:
            student_data = {
                'Student ID': student.get('student_id', ''),
                'Name': student.get('name', ''),
                'Department': student.get('department', ''),
                'Class': student.get('class', '')
            }
            
            if student.get('_id') in attended_ids:
                # Find attendance time
                for record in attendance_records:
                    if record.get('student_id') == student.get('_id'):
                        student_data['Time'] = record.get('timestamp', '').strftime('%H:%M:%S') if record.get('timestamp') else ''
                        break
                present_students.append(student_data)
            else:
                student_data['Status'] = 'Absent'
                absent_students.append(student_data)
        
        # Create Excel file with multiple sheets
        excel_buffer = BytesIO()
        with pd.ExcelWriter(excel_buffer, engine='openpyxl') as writer:
            # Present students sheet
            if present_students:
                present_df = pd.DataFrame(present_students)
                present_df.to_excel(writer, sheet_name='Present Students', index=False)
            
            # Absent students sheet
            if absent_students:
                absent_df = pd.DataFrame(absent_students)
                absent_df.to_excel(writer, sheet_name='Absent Students', index=False)
            
            # Summary sheet
            summary_data = {
                'Metric': ['Date', 'Total Students', 'Present', 'Absent', 'Attendance Rate'],
                'Value': [
                    today,
                    len(all_students),
                    len(present_students),
                    len(absent_students),
                    f"{(len(present_students)/len(all_students)*100):.1f}%" if all_students else "0%"
                ]
            }
            summary_df = pd.DataFrame(summary_data)
            summary_df.to_excel(writer, sheet_name='Summary', index=False)
        
        excel_buffer.seek(0)
        
        # Create response
        response = make_response(excel_buffer.getvalue())
        response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        response.headers['Content-Disposition'] = f'attachment; filename=daily_attendance_report_{today}.xlsx'
        
        return response
        
    except Exception as e:
        flash(f'Error exporting daily report to Excel: {str(e)}', 'error')
        return redirect(url_for('dashboard'))

if __name__ == '__main__':
    print("\n" + "="*60)
    print("🚀 MANUAL ATTENDANCE MANAGEMENT SYSTEM")
    print("="*60)
    print("📊 Initializing database...")
    
    with app.app_context():
        init_database()
    
    print("\n🌟 SYSTEM FEATURES:")
    print("   ✅ Manual Attendance Marking")
    print("   ✅ Real-time Dashboard")
    print("   ✅ Attendance Reports")
    print("   ✅ Excel Export")
    print("   ✅ MongoDB Cloud Storage")
    print("-" * 60)
    print("🔗 Access URL: http://localhost:5000")
    print("👤 Default Login:")
    print("   Faculty ID: admin")
    print("   Password: admin123")
    print("="*60)
    
    # Run the Flask app
    app.run(debug=True, host='127.0.0.1', port=5000)
