from pymongo import MongoClient
import hashlib
import datetime

# MongoDB connection
MONGO_URI = "mongodb+srv://flask_user:keshavjulka%40123@flask-cluster.rstc7gw.mongodb.net/attendance_system?retryWrites=true&w=majority&appName=flask-cluster"
client = MongoClient(MONGO_URI)
db = client['attendance_system']
users_col = db['users']

def setup_admin_user():
    """Create a default admin user for testing"""
    
    # Check if admin user already exists
    admin_email = "admin@faceattend.com"
    if users_col.find_one({"email": admin_email}):
        print("Admin user already exists!")
        return
    
    # Create admin user
    password = "admin123"  # Change this password!
    password_hash = hashlib.sha256(password.encode()).hexdigest()
    
    admin_user = {
        "email": admin_email,
        "name": "Admin User",
        "password_hash": password_hash,
        "role": "admin",
        "created_at": datetime.datetime.now(),
        "last_login": datetime.datetime.now()
    }
    
    result = users_col.insert_one(admin_user)
    print(f"Admin user created successfully!")
    print(f"Email: {admin_email}")
    print(f"Password: {password}")
    print(f"ID: {result.inserted_id}")

def setup_teacher_user():
    """Create a default teacher user for testing"""
    
    # Check if teacher user already exists
    teacher_email = "teacher@faceattend.com"
    if users_col.find_one({"email": teacher_email}):
        print("Teacher user already exists!")
        return
    
    # Create teacher user
    password = "teacher123"  # Change this password!
    password_hash = hashlib.sha256(password.encode()).hexdigest()
    
    teacher_user = {
        "email": teacher_email,
        "name": "Teacher User",
        "password_hash": password_hash,
        "role": "teacher",
        "created_at": datetime.datetime.now(),
        "last_login": datetime.datetime.now()
    }
    
    result = users_col.insert_one(teacher_user)
    print(f"Teacher user created successfully!")
    print(f"Email: {teacher_email}")
    print(f"Password: {password}")
    print(f"ID: {result.inserted_id}")

if __name__ == "__main__":
    print("Setting up FaceAttend Pro users...")
    setup_admin_user()
    setup_teacher_user()
    print("Setup complete!")
