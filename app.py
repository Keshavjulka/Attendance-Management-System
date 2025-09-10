from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required, create_access_token, get_jwt_identity
from pymongo import MongoClient
from bson import ObjectId
import datetime
import os
import numpy as np
import base64
import cv2
from deepface import DeepFace
import pandas as pd
from openpyxl import Workbook
from io import BytesIO
import hashlib

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:5174", "http://localhost:5001", "http://127.0.0.1:5001"])

# JWT Configuration
app.config['JWT_SECRET_KEY'] = 'your-secret-key-change-in-production'  # Change this in production!
jwt = JWTManager(app)

# MongoDB connection
MONGO_URI = "mongodb+srv://flask_user:keshavjulka%40123@flask-cluster.rstc7gw.mongodb.net/attendance_system?retryWrites=true&w=majority&appName=flask-cluster"
client = MongoClient(MONGO_URI)
db = client['attendance_system']
students_col = db['students']
attendance_col = db['attendance']
lectures_col = db['lectures']
users_col = db['users']  # New collection for user authentication

# Current lecture state
current_lecture = None

# Authentication Routes
@app.route('/api/login', methods=['POST'])
def manual_login():
    try:
        email = request.json.get('email')
        password = request.json.get('password')
        
        if not email or not password:
            return jsonify({"message": "Email and password required"}), 400
        
        # Find user in database
        user = users_col.find_one({"email": email})
        
        if not user:
            return jsonify({"message": "Invalid credentials"}), 401
        
        # Check password (you should use proper hashing in production)
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        
        if user.get('password_hash') != password_hash:
            return jsonify({"message": "Invalid credentials"}), 401
        
        # Update last login
        users_col.update_one(
            {"email": email},
            {"$set": {"last_login": datetime.datetime.now()}}
        )
        
        # Create access token
        access_token = create_access_token(identity=email)
        
        return jsonify({
            "token": access_token,
            "user": {
                "id": str(user['_id']),
                "email": user['email'],
                "name": user['name'],
                "role": user.get('role', 'teacher')
            }
        }), 200
        
    except Exception as e:
        return jsonify({"message": "Login failed"}), 500

@app.route('/api/register', methods=['POST'])
def register():
    try:
        email = request.json.get('email')
        password = request.json.get('password')
        name = request.json.get('name')
        
        if not email or not password or not name:
            return jsonify({"message": "Email, password, and name required"}), 400
        
        # Check if user already exists
        if users_col.find_one({"email": email}):
            return jsonify({"message": "User already exists"}), 400
        
        # Hash password
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        
        # Create user
        user_data = {
            "email": email,
            "name": name,
            "password_hash": password_hash,
            "role": "teacher",
            "created_at": datetime.datetime.now(),
            "last_login": datetime.datetime.now()
        }
        
        result = users_col.insert_one(user_data)
        
        # Create access token
        access_token = create_access_token(identity=email)
        
        return jsonify({
            "token": access_token,
            "user": {
                "id": str(result.inserted_id),
                "email": email,
                "name": name,
                "role": "teacher"
            }
        }), 201
        
    except Exception as e:
        return jsonify({"message": "Registration failed"}), 500

@app.route('/api/logout', methods=['POST'])
@jwt_required()
def logout():
    return jsonify({"message": "Logged out successfully"}), 200

@app.route('/api/profile', methods=['GET'])
@jwt_required()
def get_profile():
    try:
        current_user_email = get_jwt_identity()
        user = users_col.find_one({"email": current_user_email})
        
        if not user:
            return jsonify({"message": "User not found"}), 404
        
        return jsonify({
            "user": {
                "id": str(user['_id']),
                "email": user['email'],
                "name": user['name'],
                "picture": user.get('picture', ''),
                "role": user.get('role', 'teacher'),
                "created_at": user.get('created_at'),
                "last_login": user.get('last_login')
            }
        }), 200
        
    except Exception as e:
        return jsonify({"message": "Failed to get profile"}), 500


@app.route('/api/set-lecture', methods=['POST'])
def set_lecture():
    global current_lecture
    data = request.json
    lecture_number = data.get("lectureNumber")
    lecture_date = data.get("date")
    
    # Check if lecture already exists for this date
    existing_lecture = lectures_col.find_one({
        "lectureNumber": lecture_number,
        "date": lecture_date
    })
    
    if existing_lecture:
        # Set this lecture as the current active lecture
        current_lecture = {
            "_id": str(existing_lecture["_id"]),
            "lectureNumber": lecture_number,
            "date": lecture_date,
            "startTime": existing_lecture.get("startTime", datetime.datetime.now().isoformat()),
            "isActive": True
        }
        
        # Update the lecture to be active
        lectures_col.update_one(
            {"_id": existing_lecture["_id"]},
            {"$set": {"isActive": True}}
        )
        
        return jsonify({
            "message": f"Lecture {lecture_number} is ready for attendance on {lecture_date}",
            "lecture": current_lecture
        })
    
    # Create new lecture
    lecture = {
        "lectureNumber": lecture_number,
        "startTime": datetime.datetime.now().isoformat(),
        "date": lecture_date,
        "isActive": True,
        "attendees": []
    }
    
    result = lectures_col.insert_one(lecture)
    current_lecture = {
        "_id": str(result.inserted_id),
        "lectureNumber": lecture_number,
        "date": lecture_date,
        "startTime": lecture["startTime"],
        "isActive": True
    }
    
    return jsonify({
        "message": f"Lecture {lecture_number} is ready for attendance on {lecture_date}",
        "lecture": current_lecture
    })

@app.route('/api/start-lecture', methods=['POST'])
def start_lecture():
    global current_lecture
    data = request.json
    lecture_number = data.get("lectureNumber")
    
    if current_lecture:
        return jsonify({"message": "Please end the current lecture first"}), 400
    
    # Create new lecture
    lecture = {
        "lectureNumber": lecture_number,
        "startTime": datetime.datetime.now().isoformat(),
        "date": datetime.datetime.now().strftime("%Y-%m-%d"),
        "isActive": True,
        "attendees": []
    }
    
    result = lectures_col.insert_one(lecture)
    current_lecture = {
        "_id": str(result.inserted_id),
        "lectureNumber": lecture_number,
        "startTime": lecture["startTime"],
        "date": lecture["date"]
    }
    
    print(f"Started lecture {lecture_number}")
    return jsonify({"message": f"Lecture {lecture_number} started successfully", "lecture": current_lecture}), 201

@app.route('/api/end-lecture', methods=['POST'])
def end_lecture():
    global current_lecture
    
    if not current_lecture:
        return jsonify({"message": "No active lecture to end"}), 400
    
    # Update lecture in database
    lectures_col.update_one(
        {"_id": ObjectId(current_lecture["_id"])},
        {
            "$set": {
                "endTime": datetime.datetime.now().isoformat(),
                "isActive": False
            }
        }
    )
    
    lecture_number = current_lecture["lectureNumber"]
    current_lecture = None
    
    print(f"Ended lecture {lecture_number}")
    return jsonify({"message": f"Lecture {lecture_number} ended successfully"}), 200

@app.route('/api/current-lecture', methods=['GET'])
def get_current_lecture():
    return jsonify({"lecture": current_lecture}), 200

@app.route('/api/students/<student_id>', methods=['DELETE'])
def delete_student_api(student_id):
    """Delete a student and all their attendance records"""
    try:
        # Find the student first
        student = students_col.find_one({"rollNo": student_id})
        if not student:
            return jsonify({"success": False, "error": "Student not found"}), 404
        
        student_name = student.get('name', 'Unknown')
        
        # Delete from students collection
        student_result = students_col.delete_one({"rollNo": student_id})
        if student_result.deleted_count == 0:
            return jsonify({"success": False, "error": "Failed to delete student"}), 500
        
        # Delete all attendance records for this student
        attendance_result = attendance_col.delete_many({"rollNo": student_id})
        
        return jsonify({
            "success": True,
            "message": f"Successfully deleted {student_name}",
            "student_deleted": True,
            "attendance_records_deleted": attendance_result.deleted_count
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/students', methods=['GET'])
def get_students():
    students = list(students_col.find({}, {"_id": 0}))
    return jsonify(students)

@app.route('/api/mark-attendance-safe', methods=['POST'])
def mark_attendance_safe():
    """Safe attendance marking with atomic upsert to prevent duplicates"""
    try:
        data = request.get_json()
        roll_no = data.get('rollNo')
        name = data.get('name')
        status = data.get('status')
        lecture_number = int(data.get('lectureNumber'))  # Ensure integer
        date = data.get('date')
        time = data.get('time')
        method = data.get('method', 'manual')
        
        if not all([roll_no, name, status, lecture_number, date, time]):
            return jsonify({"success": False, "error": "Missing required fields"}), 400
        
        # Use atomic upsert operation to prevent race conditions
        filter_query = {
            "rollNo": roll_no,
            "lectureNumber": lecture_number,
            "date": date
        }
        
        update_data = {
            "$set": {
                "name": name,
                "status": status,
                "time": time,
                "method": method
            },
            "$setOnInsert": {
                "rollNo": roll_no,
                "lectureNumber": lecture_number,
                "date": date
            }
        }
        
        # Check if record exists first to provide appropriate message
        existing = attendance_col.find_one(filter_query)
        
        result = attendance_col.update_one(
            filter_query,
            update_data,
            upsert=True
        )
        
        if existing:
            return jsonify({
                "success": True,
                "message": f"Updated attendance for {name} to {status}",
                "action": "updated",
                "previousStatus": existing.get("status"),
                "previousMethod": existing.get("method")
            })
        else:
            return jsonify({
                "success": True,
                "message": f"Marked attendance for {name} as {status}",
                "action": "created"
            })
            
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/mark-attendance-manual', methods=['POST'])
def mark_attendance_manual():
    try:
        data = request.get_json()
        roll_no = data.get('rollNo')
        name = data.get('name')
        status = data.get('status')
        lecture_number = data.get('lectureNumber')
        date = data.get('date')
        time = data.get('time')
        
        if not all([roll_no, name, status, lecture_number, date, time]):
            return jsonify({"success": False, "error": "Missing required fields"}), 400
        
        # Check if attendance already exists for this student, lecture and date
        existing = attendance_col.find_one({
            "rollNo": roll_no,
            "lectureNumber": int(lecture_number),  # Ensure integer comparison
            "date": date
        })
        
        if existing:
            # Always show what exists and ask for confirmation to edit
            existing_method = existing.get("method", "unknown")
            existing_status = existing.get("status")
            existing_time = existing.get("time", "unknown")
            
            # If trying to set the same status, inform user
            if status == existing_status:
                return jsonify({
                    "success": False, 
                    "message": f"Student {name} is already marked {status} for Lecture {lecture_number} at {existing_time} via {existing_method}",
                    "canEdit": True,
                    "currentStatus": existing_status,
                    "currentMethod": existing_method,
                    "currentTime": existing_time,
                    "action": "no_change_needed"
                })
            
            # Allow manual override with clear messaging
            update_message = f"Updated {name} from {existing_status} ({existing_method}) to {status} (manual)"
            
            # UPDATE existing record instead of creating new one
            result = attendance_col.update_one(
                {"_id": existing["_id"]},  # Use exact document ID to avoid any confusion
                {"$set": {
                    "status": status, 
                    "time": time,
                    "method": "manual"
                }}
            )
            
            if result.modified_count > 0:
                return jsonify({
                    "success": True, 
                    "message": update_message,
                    "action": "updated",
                    "previousStatus": existing_status,
                    "previousMethod": existing_method,
                    "previousTime": existing_time
                })
            else:
                return jsonify({
                    "success": False, 
                    "message": "Failed to update attendance record",
                    "action": "update_failed"
                })
        else:
            # Create new record only if none exists
            # Create new record
            attendance_record = {
                "rollNo": roll_no,
                "name": name,
                "status": status,
                "lectureNumber": int(lecture_number),  # Ensure integer type
                "date": date,
                "time": time,
                "method": "manual"
            }
            attendance_col.insert_one(attendance_record)
            return jsonify({"success": True, "message": "Attendance marked successfully"})
            
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/lectures', methods=['GET'])
def get_lectures():
    lectures = list(lectures_col.find({}, {"_id": 0}).sort("lectureNumber", -1))
    return jsonify(lectures), 200
def preprocess_image(img):
    """Preprocess image to improve face detection"""
    # Resize if image is too large
    height, width = img.shape[:2]
    if height > 800 or width > 800:
        scale = 800 / max(height, width)
        new_width = int(width * scale)
        new_height = int(height * scale)
        img = cv2.resize(img, (new_width, new_height), interpolation=cv2.INTER_AREA)
        print(f"Resized image to: {new_width}x{new_height}")
    
    # Improve contrast and brightness
    lab = cv2.cvtColor(img, cv2.COLOR_RGB2LAB)
    l_channel, a, b = cv2.split(lab)
    
    # Apply CLAHE to L channel
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
    cl = clahe.apply(l_channel)
    
    # Merge channels and convert back to RGB
    enhanced = cv2.merge((cl, a, b))
    enhanced = cv2.cvtColor(enhanced, cv2.COLOR_LAB2RGB)
    
    return enhanced

def get_embedding_from_base64(base64_img):
    try:
        # Decode the base64 image
        img_data = base64.b64decode(base64_img.split(',')[1])
        np_arr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        print(f"Original image shape: {img.shape}, dtype: {img.dtype}")
        
        if img is None:
            raise Exception("Failed to decode image")
        
        # Convert BGR to RGB for DeepFace
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Try a simpler approach first - just use OpenCV backend without enforcement
        try:
            print("Trying OpenCV backend without strict enforcement...")
            embedding = DeepFace.represent(
                img_rgb, 
                model_name='Facenet',
                detector_backend='opencv',
                enforce_detection=False
            )[0]['embedding']
            print("SUCCESS: Face embedding extracted with OpenCV")
            return embedding
        except Exception as e:
            print(f"OpenCV approach failed: {e}")
        
        # Try with MTCNN backend
        try:
            print("Trying MTCNN backend...")
            embedding = DeepFace.represent(
                img_rgb, 
                model_name='Facenet',
                detector_backend='mtcnn',
                enforce_detection=False
            )[0]['embedding']
            print("SUCCESS: Face embedding extracted with MTCNN")
            return embedding
        except Exception as e:
            print(f"MTCNN approach failed: {e}")
        
        # Last resort: try with basic settings
        try:
            print("Trying basic DeepFace settings...")
            embedding = DeepFace.represent(img_rgb, model_name='Facenet')[0]['embedding']
            print("SUCCESS: Face embedding extracted with basic settings")
            return embedding
        except Exception as e:
            print(f"Basic approach also failed: {e}")
            raise Exception(f"All face detection methods failed. Last error: {e}")
        
    except Exception as e:
        print(f"Error in get_embedding_from_base64: {e}")
        raise

@app.route('/api/enroll', methods=['POST'])
def enroll_student():
    data = request.json
    print(f"Received enrollment data: {data}")
    name = data.get("name")
    rollNo = data.get("rollNo")
    images = data.get("images", [])
    print(f"Name: {name}, RollNo: {rollNo}, Number of images: {len(images)}")
    
    # Debug: Check current database state
    all_students = list(students_col.find({}))
    print(f"DEBUG: Current students in database: {len(all_students)}")
    for s in all_students:
        print(f"DEBUG: - {s.get('name')} (Roll: {s.get('rollNo')})")
    
    # Check if roll number already exists
    existing_student = students_col.find_one({"rollNo": rollNo})
    if existing_student:
        print(f"DEBUG: Found existing student: {existing_student.get('name')} with roll {rollNo}")
        return jsonify({"message": f"Student with roll number {rollNo} already exists!"}), 400
    
    # Extract embeddings from new images
    new_embeddings = []
    for idx, img_b64 in enumerate(images):
        try:
            print(f"DEBUG: Processing image {idx+1}/{len(images)} for {name}")
            emb = get_embedding_from_base64(img_b64)
            new_embeddings.append(emb)
            print(f"DEBUG: Image {idx+1}: Embedding extracted successfully. Shape: {len(emb)}")
        except Exception as e:
            print(f"ERROR: Image {idx+1}: Failed to extract embedding. Error: {e}")
            continue
    
    if not new_embeddings:
        print(f"ERROR: No valid faces detected in any image for {name}")
        return jsonify({"message": "No valid face detected in any image! Please ensure the face is clearly visible and well-lit."}), 400
    
    print(f"DEBUG: Successfully extracted {len(new_embeddings)} embeddings for {name}")
    
    # Check for face similarity with existing students
    all_students = list(students_col.find({}))
    print(f"DEBUG: Checking face similarity against {len(all_students)} existing students")
    
    # Use stricter threshold for enrollment to prevent false duplicates
    # Lower threshold = stricter matching (only very similar faces are considered duplicates)
    enrollment_threshold = 8.0  # Much stricter than attendance matching (15)
    
    duplicate_found = False
    min_distance = float('inf')
    closest_student = None
    
    for student in all_students:
        student_name = student.get('name', 'Unknown')
        existing_embeddings = student.get('embeddings', [])
        
        for i, existing_emb in enumerate(existing_embeddings):
            for j, new_emb in enumerate(new_embeddings):
                dist = np.linalg.norm(np.array(new_emb) - np.array(existing_emb))
                
                # Track minimum distance for debugging
                if dist < min_distance:
                    min_distance = dist
                    closest_student = student_name
                
                if dist < enrollment_threshold:
                    print(f"ERROR: Duplicate face detected! {name} vs {student_name}: distance {dist:.2f} < {enrollment_threshold}")
                    return jsonify({
                        "message": f"Face already exists! Very similar to student {student_name} (Roll: {student['rollNo']}) - Distance: {dist:.2f}"
                    }), 400
    
    print(f"DEBUG: Face similarity check passed. Closest match: {closest_student} (distance: {min_distance:.2f})")
    
    # If no duplicates found, proceed with enrollment
    print(f"DEBUG: No face duplicates found. Proceeding with enrollment for {name}")
    student = {
        "name": name,
        "rollNo": rollNo,
        "embeddings": new_embeddings,
        "images": images
    }
    try:
        result = students_col.insert_one(student)
        print(f"Student inserted with _id: {result.inserted_id}")
    except Exception as e:
        print(f"Failed to insert student: {e}")
        return jsonify({"message": f"Failed to enroll student: {e}"}), 500
    return jsonify({"message": "Student enrolled successfully", "embeddings_saved": len(new_embeddings)}), 201


@app.route('/api/mark-attendance', methods=['POST'])
def mark_attendance():
    global current_lecture
    
    if not current_lecture:
        return jsonify({"message": "No active lecture. Please ask teacher to start a lecture first."}), 400
    
    data = request.json
    image_b64 = data.get("image")
    if not image_b64:
        return jsonify({"message": "No image provided"}), 400

    try:
        captured_embedding = get_embedding_from_base64(image_b64)
    except Exception as e:
        print(f"Face detection error: {e}")
        return jsonify({"message": f"Face not detected: {e}"}), 400

    # Find all students and compare embeddings
    students = list(students_col.find({}))
    min_dist = float('inf')
    matched_student = None
    for student in students:
        for emb in student.get('embeddings', []):
            dist = np.linalg.norm(np.array(captured_embedding) - np.array(emb))
            if dist < min_dist:
                min_dist = dist
                matched_student = student

    # Set a threshold for matching (tune as needed)
    threshold = 15  # Increased threshold for more tolerant matching
    if matched_student and min_dist < threshold:
        roll_no = matched_student['rollNo']
        
        # Check if student is already present in this lecture (either method)
        existing_attendance = attendance_col.find_one({
            "rollNo": roll_no,
            "lectureNumber": current_lecture["lectureNumber"],
            "date": current_lecture["date"]
        })
        
        if existing_attendance:
            existing_status = existing_attendance.get("status")
            existing_method = existing_attendance.get("method", "manual")
            
            if existing_status == "Present":
                return jsonify({
                    "message": f"{matched_student['name']} is already marked present for Lecture {current_lecture['lectureNumber']} via {existing_method}"
                }), 200
            elif existing_status == "Absent" and existing_method == "manual":
                # Don't override manual absent marking with face recognition
                return jsonify({
                    "message": f"{matched_student['name']} is manually marked absent for Lecture {current_lecture['lectureNumber']}. Cannot override with face recognition."
                }), 400
            else:
                # Update existing attendance from Absent to Present (only if not manually set to absent)
                attendance_col.update_one(
                    {"_id": existing_attendance["_id"]},
                    {"$set": {
                        "status": "Present",
                        "time": datetime.datetime.now().strftime("%H:%M:%S"),
                        "method": "face_recognition"
                    }}
                )
                return jsonify({
                    "message": f"Attendance updated to Present for {matched_student['name']} (Roll: {roll_no}) - Lecture {current_lecture['lectureNumber']}"
                }), 200
        
        # Mark attendance
        attendance_record = {
            "rollNo": roll_no,
            "name": matched_student['name'],
            "lectureNumber": current_lecture["lectureNumber"],
            "date": current_lecture["date"],
            "time": datetime.datetime.now().strftime("%H:%M:%S"),
            "status": "Present",
            "method": "face_recognition"
        }
        attendance_col.insert_one(attendance_record)
        
        # Add to lecture attendees
        lectures_col.update_one(
            {"_id": ObjectId(current_lecture["_id"])},
            {"$addToSet": {"attendees": roll_no}}
        )
        
        return jsonify({"message": f"Attendance marked for {matched_student['name']} (Roll: {roll_no}) - Lecture {current_lecture['lectureNumber']}"}), 200
    else:
        return jsonify({"message": "No matching student found"}), 404

@app.route('/api/attendance-records', methods=['GET'])
def get_attendance_records():
    lecture_number = request.args.get('lectureNumber')
    date_filter = request.args.get('date')
    query = {}
    
    if lecture_number:
        query["lectureNumber"] = int(lecture_number)
    if date_filter:
        query["date"] = date_filter
    
    records = list(attendance_col.find(query, {"_id": 0}).sort("lectureNumber", -1))
    return jsonify(records)

@app.route('/api/cleanup-attendance', methods=['DELETE'])
def cleanup_attendance():
    try:
        # Delete records with missing or invalid data
        result = attendance_col.delete_many({
            "$or": [
                {"name": {"$exists": False}},
                {"name": ""},
                {"name": None},
                {"lectureNumber": {"$exists": False}},
                {"lectureNumber": None},
                {"rollNo": {"$exists": False}},
                {"rollNo": ""},
                {"rollNo": None}
            ]
        })
        
        return jsonify({
            "success": True,
            "message": f"Cleaned up {result.deleted_count} invalid attendance records"
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/delete-attendance-record', methods=['DELETE'])
def delete_attendance_record():
    try:
        data = request.get_json()
        roll_no = data.get('rollNo')
        date = data.get('date')
        time = data.get('time')
        
        if not all([roll_no, date, time]):
            return jsonify({"success": False, "error": "Missing required fields"}), 400
        
        result = attendance_col.delete_one({
            "rollNo": roll_no,
            "date": date,
            "time": time
        })
        
        if result.deleted_count > 0:
            return jsonify({"success": True, "message": "Record deleted successfully"})
        else:
            return jsonify({"success": False, "error": "Record not found"}), 404
            
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/dashboard-stats', methods=['GET'])
def get_dashboard_stats():
    try:
        # Get total number of lectures
        total_lectures = lectures_col.count_documents({})
        
        # Get total attendance records
        total_attendance = attendance_col.count_documents({})
        
        # Get total enrolled students
        total_students = students_col.count_documents({})
        
        # Calculate average attendance per lecture
        if total_lectures > 0:
            average_attendance = total_attendance / total_lectures
        else:
            average_attendance = 0
        
        # Get today's attendance
        today = datetime.datetime.now().strftime('%Y-%m-%d')
        today_attendance = attendance_col.count_documents({"date": today})
        
        # Get this week's attendance
        week_ago = (datetime.datetime.now() - datetime.timedelta(days=7)).strftime('%Y-%m-%d')
        week_attendance = attendance_col.count_documents({
            "date": {"$gte": week_ago}
        })
        
        # Get active lectures count
        active_lectures = lectures_col.count_documents({"isActive": True})
        
        return jsonify({
            "totalLectures": total_lectures,
            "totalAttendance": total_attendance,
            "totalStudents": total_students,
            "averageAttendance": round(average_attendance, 1),
            "todayAttendance": today_attendance,
            "weekAttendance": week_attendance,
            "activeLectures": active_lectures
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/manual-attendance', methods=['POST'])
def mark_manual_attendance():
    try:
        data = request.json
        student_ids = data.get('studentIds', [])
        status = data.get('status', 'Present')  # Present, Absent, Late
        lecture_number = data.get('lectureNumber')
        date = data.get('date')
        
        if not student_ids or not lecture_number or not date:
            return jsonify({"success": False, "error": "Missing required fields"}), 400
        
        results = []
        
        for student_id in student_ids:
            # Get student details
            student = students_col.find_one({"rollNo": student_id})
            if not student:
                results.append({"studentId": student_id, "success": False, "error": "Student not found"})
                continue
            
            # Check if attendance already exists
            existing_attendance = attendance_col.find_one({
                "rollNo": student_id,
                "date": date,
                "lectureNumber": int(lecture_number)  # Ensure integer comparison
            })
            
            if existing_attendance:
                existing_status = existing_attendance.get('status')
                existing_method = existing_attendance.get('method', 'manual')
                
                # Allow manual override but provide informative feedback
                if status == existing_status:
                    results.append({
                        "studentId": student_id, 
                        "success": False, 
                        "action": "already_marked", 
                        "message": f"Already marked {status} via {existing_method}",
                        "currentStatus": existing_status,
                        "currentMethod": existing_method
                    })
                else:
                    # Update existing attendance with manual override
                    update_message = f"Updated from {existing_status} ({existing_method}) to {status} (manual)"
                    attendance_col.update_one(
                        {"_id": existing_attendance["_id"]},
                        {"$set": {
                            "status": status,
                            "time": datetime.datetime.now().strftime('%H:%M:%S'),
                            "method": "manual"
                        }}
                    )
                    results.append({
                        "studentId": student_id, 
                        "success": True, 
                        "action": "updated",
                        "message": update_message,
                        "previousStatus": existing_status,
                        "previousMethod": existing_method
                    })
            else:
                # Create new attendance record
                attendance_record = {
                    "name": student.get("name", "Unknown"),
                    "rollNo": student_id,
                    "lectureNumber": int(lecture_number),  # Ensure integer type
                    "date": date,
                    "time": datetime.datetime.now().strftime('%H:%M:%S'),
                    "status": status,
                    "method": "manual"
                }
                attendance_col.insert_one(attendance_record)
                results.append({"studentId": student_id, "success": True, "action": "created"})
        
        return jsonify({
            "success": True,
            "message": f"Manual attendance marked for {len([r for r in results if r['success']])} students",
            "results": results
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/bulk-attendance', methods=['POST'])
def bulk_attendance_upload():
    try:
        # Check if file is provided
        if 'file' not in request.files:
            return jsonify({"error": "No file uploaded"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        # Get lecture details from form data
        lecture_number = request.form.get('lectureNumber')
        date = request.form.get('date')
        
        if not lecture_number or not date:
            return jsonify({"error": "Missing lectureNumber or date"}), 400
        
        # Read Excel file
        try:
            # Read the Excel file into a pandas DataFrame
            df = pd.read_excel(BytesIO(file.read()))
            
            # Validate required columns
            required_columns = ['Roll No.', 'Name', 'Attendance']
            missing_columns = [col for col in required_columns if col not in df.columns]
            if missing_columns:
                return jsonify({
                    "error": f"Missing required columns: {', '.join(missing_columns)}. Required columns are: {', '.join(required_columns)}"
                }), 400
            
            # Clean and validate data
            df = df.dropna(subset=['Roll No.', 'Attendance'])  # Remove rows with missing roll no or attendance
            df['Roll No.'] = df['Roll No.'].astype(str)  # Ensure roll numbers are strings
            df['Attendance'] = df['Attendance'].str.upper()  # Convert to uppercase
            
            # Validate attendance values
            valid_attendance_values = ['P', 'A']
            invalid_attendance = df[~df['Attendance'].isin(valid_attendance_values)]
            if not invalid_attendance.empty:
                return jsonify({
                    "error": f"Invalid attendance values found. Use 'P' for Present or 'A' for Absent. Invalid rows: {invalid_attendance.index.tolist()}"
                }), 400
            
        except Exception as e:
            return jsonify({"error": f"Error reading Excel file: {str(e)}"}), 400
        
        # Process attendance records
        results = []
        processed_count = 0
        
        for index, row in df.iterrows():
            try:
                roll_no = str(row['Roll No.']).strip()
                student_name = str(row['Name']).strip() if pd.notna(row['Name']) else "Unknown"
                attendance_status = 'present' if row['Attendance'] == 'P' else 'absent'
                
                # Verify student exists in database
                student = students_col.find_one({"rollNo": roll_no})
                if not student:
                    results.append({
                        "rollNo": roll_no,
                        "name": student_name,
                        "success": False,
                        "message": f"Student with Roll No. {roll_no} not found in database"
                    })
                    continue
                
                # Check if attendance already exists
                existing_attendance = attendance_col.find_one({
                    "rollNo": roll_no,
                    "lectureNumber": int(lecture_number),
                    "date": date
                })
                
                if existing_attendance:
                    # Update existing attendance
                    attendance_col.update_one(
                        {"_id": existing_attendance["_id"]},
                        {"$set": {
                            "status": attendance_status,
                            "time": datetime.datetime.now().strftime('%H:%M:%S'),
                            "method": "bulk_upload"
                        }}
                    )
                    results.append({
                        "rollNo": roll_no,
                        "name": student_name,
                        "success": True,
                        "message": f"Updated attendance to {attendance_status}"
                    })
                else:
                    # Create new attendance record
                    attendance_record = {
                        "name": student.get("name", student_name),
                        "rollNo": roll_no,
                        "lectureNumber": int(lecture_number),
                        "date": date,
                        "time": datetime.datetime.now().strftime('%H:%M:%S'),
                        "status": attendance_status,
                        "method": "bulk_upload"
                    }
                    attendance_col.insert_one(attendance_record)
                    results.append({
                        "rollNo": roll_no,
                        "name": student_name,
                        "success": True,
                        "message": f"Marked {attendance_status}"
                    })
                
                processed_count += 1
                
            except Exception as e:
                results.append({
                    "rollNo": roll_no if 'roll_no' in locals() else f"Row {index + 1}",
                    "name": student_name if 'student_name' in locals() else "Unknown",
                    "success": False,
                    "message": f"Error processing row: {str(e)}"
                })
        
        successful_count = len([r for r in results if r['success']])
        
        return jsonify({
            "success": True,
            "message": f"Excel attendance processed. {successful_count} out of {len(results)} records processed successfully.",
            "processed": processed_count,
            "successful": successful_count,
            "total_rows": len(df),
            "results": results
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/students-attendance-status', methods=['GET'])
def get_students_attendance_status():
    try:
        lecture_number = request.args.get('lectureNumber')
        date = request.args.get('date')
        
        if not lecture_number or not date:
            return jsonify({"error": "Missing lectureNumber or date"}), 400
        
        # Get all students
        students = list(students_col.find({}, {"_id": 0, "name": 1, "rollNo": 1, "email": 1}))
        
        # Get attendance for this lecture and date
        attendance_records = list(attendance_col.find({
            "lectureNumber": lecture_number,
            "date": date
        }, {"_id": 0, "rollNo": 1, "status": 1, "method": 1}))
        
        # Create a map of attendance status
        attendance_map = {record['rollNo']: record for record in attendance_records}
        
        # Combine student data with attendance status
        students_with_status = []
        for student in students:
            attendance = attendance_map.get(student['rollNo'])
            students_with_status.append({
                "name": student['name'],
                "rollNo": student['rollNo'],
                "email": student.get('email', ''),
                "status": attendance['status'] if attendance else 'Not Marked',
                "method": attendance.get('method', '') if attendance else ''
            })
        
        return jsonify(students_with_status)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/debug-student-records', methods=['GET'])
def debug_student_records():
    """Debug specific student records"""
    try:
        roll_no = request.args.get('rollNo', '2310993858')
        lecture_number = request.args.get('lectureNumber', 15)
        date = request.args.get('date', '2025-09-08')
        
        # Search with both integer and string lecture numbers
        records1 = list(attendance_col.find({
            "rollNo": roll_no,
            "lectureNumber": int(lecture_number),
            "date": date
        }))
        
        records2 = list(attendance_col.find({
            "rollNo": roll_no,
            "lectureNumber": str(lecture_number),
            "date": date
        }))
        
        # Also search without lecture number constraint
        all_records = list(attendance_col.find({
            "rollNo": roll_no,
            "date": date
        }))
        
        # Convert ObjectId to string for JSON serialization
        for records in [records1, records2, all_records]:
            for record in records:
                record['_id'] = str(record['_id'])
            
        return jsonify({
            "success": True,
            "with_int_lecture": {"count": len(records1), "records": records1},
            "with_str_lecture": {"count": len(records2), "records": records2},
            "all_for_date": {"count": len(all_records), "records": all_records},
            "query": {
                "rollNo": roll_no,
                "lectureNumber": lecture_number,
                "date": date
            }
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/check-duplicates', methods=['GET'])
def check_duplicates():
    """Check for duplicate attendance records"""
    try:
        # Simple way to find potential duplicates
        pipeline = [
            {
                "$group": {
                    "_id": {
                        "rollNo": "$rollNo",
                        "lectureNumber": "$lectureNumber", 
                        "date": "$date"
                    },
                    "count": {"$sum": 1},
                    "docs": {"$push": {
                        "id": "$_id",
                        "name": "$name",
                        "status": "$status",
                        "time": "$time",
                        "method": "$method"
                    }}
                }
            },
            {
                "$match": {
                    "count": {"$gt": 1}
                }
            }
        ]
        
        duplicates = list(attendance_col.aggregate(pipeline))
        
        return jsonify({
            "success": True,
            "duplicates_found": len(duplicates),
            "duplicates": duplicates
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/cleanup-duplicate-attendance', methods=['POST'])
def cleanup_duplicate_attendance():
    """Remove duplicate attendance records for the same student, lecture, and date"""
    try:
        # First, normalize lectureNumber data types - convert all to integers
        attendance_col.update_many(
            {"lectureNumber": {"$type": "string"}},
            [{"$set": {"lectureNumber": {"$toInt": "$lectureNumber"}}}]
        )
        
        # Now find duplicates with normalized data
        pipeline = [
            {
                "$group": {
                    "_id": {
                        "rollNo": "$rollNo",
                        "lectureNumber": "$lectureNumber", 
                        "date": "$date"
                    },
                    "count": {"$sum": 1},
                    "docs": {"$push": "$$ROOT"}
                }
            },
            {
                "$match": {
                    "count": {"$gt": 1}
                }
            }
        ]
        
        duplicates = list(attendance_col.aggregate(pipeline))
        removed_count = 0
        
        for duplicate_group in duplicates:
            docs = duplicate_group["docs"]
            
            # Priority: Keep Present over Absent, face_recognition over manual
            best_record = None
            records_to_delete = []
            
            for doc in docs:
                if best_record is None:
                    best_record = doc
                else:
                    # Choose better record based on priority
                    current_better = False
                    
                    # Present status is better than Absent
                    if doc.get("status") == "Present" and best_record.get("status") != "Present":
                        current_better = True
                    # If both have same status, prefer face_recognition over manual
                    elif (doc.get("status") == best_record.get("status") and 
                          doc.get("method") == "face_recognition" and 
                          best_record.get("method") == "manual"):
                        current_better = True
                    
                    if current_better:
                        records_to_delete.append(best_record["_id"])
                        best_record = doc
                    else:
                        records_to_delete.append(doc["_id"])
            
            # Delete inferior records
            for record_id in records_to_delete:
                attendance_col.delete_one({"_id": record_id})
                removed_count += 1
        
        return jsonify({
            "success": True,
            "message": f"Cleaned up {removed_count} duplicate attendance records",
            "duplicates_found": len(duplicates),
            "data_normalization": "Converted all lectureNumber fields to integers"
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5001)