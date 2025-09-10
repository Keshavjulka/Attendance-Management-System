# FaceAttend Pro - Entity Relationship Diagram

## Database Design for Face Recognition Attendance System

### Entities and ### MongoDB Collections

### Collection Names
- `users` - User authentication and management
- `students` - Student master data
- `attendance` - Daily attendance records
- `lectures` - Lecture schedule and management

### Indexes Recommended
```javascript
// Users collection
db.users.createIndex({"email": 1}, {unique: true})
db.users.createIndex({"role": 1})
db.users.createIndex({"login_method": 1})

// Students collectionips

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│      USER       │       │     STUDENT     │       │    ATTENDANCE   │       │     LECTURE     │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ _id (PK)        │       │ _id (PK)        │◄──────┤ rollNo (FK)     │       │ _id (PK)        │
│ email (Unique)  │       │ name            │       │ name            │       │ lectureNumber   │
│ name            │       │ rollNo (Unique) │       │ status          │       │ date            │
│ password_hash   │       │ embeddings[]    │       │ lectureNumber───┼──────►│ startTime       │
│ picture         │       │ images[]        │       │ date            │       │ endTime         │
│ login_method    │       │ createdAt       │       │ time            │       │ isActive        │
│ role            │       └─────────────────┘       │ method          │       │ totalStudents   │
│ created_at      │                                 │ confidenceScore │       │ created_by──────┼──────┐
│ last_login      │                                 │ recorded_by─────┼───────┘                 │      │
└─────────────────┘                                 └─────────────────┘                         │      │
         │                                                                                       │      │
         └───────────────────────────────────────────────────────────────────────────────────────────┘
```

## Detailed Entity Descriptions

### 1. USER Entity
**Purpose**: Stores authentication and user management data

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| _id | ObjectId | Primary Key | Auto-generated |
| email | String | User email address | Required, Unique |
| name | String | User full name | Required |
| password_hash | String | Hashed password | Required |
| role | String | admin/teacher | Required, Default: teacher |
| created_at | Date | Account creation timestamp | Auto-generated |
| last_login | Date | Last login timestamp | Updated on login |

### 2. STUDENT Entity
**Purpose**: Stores student information and face recognition data

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| _id | ObjectId | Primary Key | Auto-generated |
| name | String | Student full name | Required |
| rollNo | String | Roll number/Student ID | Required, Unique |
| embeddings | Array | Face embeddings for recognition | Required (multiple faces) |
| images | Array | Base64 encoded face images | Required |
| createdAt | Date | Registration timestamp | Auto-generated |

### 3. ATTENDANCE Entity
**Purpose**: Records attendance data for each student per lecture

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| _id | ObjectId | Primary Key | Auto-generated |
| rollNo | String | Foreign Key to Student | Required |
| name | String | Student name (denormalized) | Required |
| status | String | Present/Absent | Required |
| lectureNumber | Integer | Lecture identifier | Required |
| date | String | Attendance date (YYYY-MM-DD) | Required |
| time | String | Attendance marking time | Required |
| method | String | Recognition method (auto/manual) | Required |
| confidenceScore | Float | Face recognition confidence | Optional |
| recorded_by | String | User email who recorded attendance | Optional |

### 4. LECTURE Entity
**Purpose**: Manages lecture sessions and scheduling

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| _id | ObjectId | Primary Key | Auto-generated |
| lectureNumber | Integer | Lecture sequence number | Required |
| date | String | Lecture date (YYYY-MM-DD) | Required |
| startTime | String | Session start time | Required |
| endTime | String | Session end time | Optional |
| isActive | Boolean | Current active status | Default: false |
| totalStudents | Integer | Total enrolled students | Optional |
| created_by | String | User email who created lecture | Optional |

## Relationships

### 1. User → Attendance (1:N)
- **Type**: One-to-Many
- **Description**: One user can record multiple attendance records
- **Foreign Key**: `attendance.recorded_by` references `user.email`
- **Cardinality**: One teacher can record attendance for multiple students

### 2. User → Lecture (1:N)
- **Type**: One-to-Many
- **Description**: One user can create multiple lectures
- **Foreign Key**: `lecture.created_by` references `user.email`
- **Cardinality**: One teacher can create multiple lecture sessions

### 3. Student → Attendance (1:N)
- **Type**: One-to-Many
- **Description**: One student can have multiple attendance records
- **Foreign Key**: `attendance.rollNo` references `student.rollNo`
- **Cardinality**: One student can attend multiple lectures

### 4. Lecture → Attendance (1:N)
- **Type**: One-to-Many
- **Description**: One lecture can have multiple attendance records
- **Foreign Key**: `attendance.lectureNumber` references `lecture.lectureNumber`
- **Cardinality**: One lecture session can have attendance from multiple students

## Database Constraints

### Primary Keys
- Each entity has an `_id` field as the primary key (MongoDB ObjectId)

### Unique Constraints
- `student.rollNo` must be unique across all students
- Composite unique constraint on `(rollNo, lectureNumber, date)` in attendance

### Foreign Key Constraints
- `attendance.rollNo` must exist in `student.rollNo`
- `attendance.lectureNumber` must exist in `lecture.lectureNumber`

### Data Validation
- Face embeddings array must contain at least 3 face encodings
- Status field accepts only "Present" or "Absent"
- Method field accepts only "auto" or "manual"
- Confidence score must be between 0.0 and 1.0

## MongoDB Collections

### Collection Names
- `students` - Student master data
- `attendance` - Daily attendance records
- `lectures` - Lecture schedule and management

### Indexes Recommended
```javascript
// Students collection
db.students.createIndex({"rollNo": 1}, {unique: true})

// Attendance collection
db.attendance.createIndex({"rollNo": 1})
db.attendance.createIndex({"lectureNumber": 1})
db.attendance.createIndex({"date": 1})
db.attendance.createIndex({"rollNo": 1, "lectureNumber": 1, "date": 1}, {unique: true})

// Lectures collection
db.lectures.createIndex({"lectureNumber": 1})
db.lectures.createIndex({"date": 1})
db.lectures.createIndex({"isActive": 1})
```

## Business Rules

1. **Student Enrollment**: Students must be enrolled before marking attendance
2. **Face Recognition**: Minimum 3 face images required for accurate recognition
3. **Duplicate Prevention**: One attendance record per student per lecture per date
4. **Active Lecture**: Only one lecture can be active at a time
5. **Confidence Threshold**: Automatic attendance requires confidence > 0.6
6. **Manual Override**: Teachers can manually mark/correct attendance

## Sample Data Structure

### Student Document
```json
{
  "_id": "ObjectId('...')",
  "name": "Shubhangi Mishra",
  "rollNo": "2310993934",
  "embeddings": [
    [0.123, -0.456, 0.789, ...],
    [0.124, -0.457, 0.788, ...],
    [0.122, -0.455, 0.790, ...]
  ],
  "images": ["base64_image_1", "base64_image_2", "base64_image_3"],
  "createdAt": "2025-09-10T10:30:00Z"
}
```

### Attendance Document
```json
{
  "_id": "ObjectId('...')",
  "rollNo": "2310993934",
  "name": "Shubhangi Mishra",
  "status": "Present",
  "lectureNumber": 1,
  "date": "2025-09-10",
  "time": "15:30:11",
  "method": "auto",
  "confidenceScore": 0.87
}
```

### Lecture Document
```json
{
  "_id": "ObjectId('...')",
  "lectureNumber": 1,
  "date": "2025-09-10",
  "startTime": "15:00:00",
  "endTime": "16:00:00",
  "isActive": true,
  "totalStudents": 45
}
```

---

**System**: FaceAttend Pro v1.0.0  
**Database**: MongoDB  
**Technology**: Flask + React + Face Recognition AI  
**Created**: September 10, 2025
