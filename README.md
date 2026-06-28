# Classroom Management App

Classroom Management App is a full-stack web application built for managing classrooms. The system allows instructors to manage students, assign lessons, and communicate with students in real time. Students can view assigned lessons, update their profile, and chat with their instructor.

## Features

### Authentication
- Login with phone number using OTP
- OTP delivery via Twilio SMS
- Email OTP support using Nodemailer
- Role-based access (Instructor / Student)

### Instructor
- Add new students
- Edit student information
- Delete students
- Assign lessons
- View student details
- Real-time chat with students

### Student
- View assigned lessons
- Mark lessons as completed
- Edit personal profile
- Real-time chat with instructor

---

## Tech Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Socket.IO Client

### Backend

- Node.js
- Express.js
- TypeScript
- Firebase Firestore
- Firebase Admin SDK
- Socket.IO
- Twilio
- Nodemailer

---

## Environment Variables

Create a `.env` file inside the `server` folder.

```env
PORT=5000

TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
TWILIO_VERIFY_SERVICE_SID=

EMAIL_USER=
EMAIL_PASS=

FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

---

## Installation

### Clone the repository

```bash
git clone https://github.com/your-username/classroom-management-app.git
```

### Install dependencies

Backend

```bash
cd server
npm install
```

Frontend

```bash
cd client
npm install
```

---

## Run the project

Start backend

```bash
cd server
npm run dev
```

Start frontend

```bash
cd client
npm run dev
```

Application URLs

Frontend

```
http://localhost:3000
```

Backend

```
http://localhost:5000
```

---

## API

### Authentication

```
POST /createAccessCode

POST /validateAccessCode
```

### Instructor

```
GET /students

GET /student/:phone

POST /addStudent

PUT /editStudent/:phone

DELETE /student/:phone

POST /assignLesson
```

### Student

```
GET /myLessons

POST /markLessonDone

PUT /editProfile
```

---

## Screenshots

The repository includes screenshots of:

- Login Page
- Instructor Dashboard
- Student Dashboard
- Add Student
- Assign Lesson
- Chat
- Lesson Management

Screenshots are available in the `screenshots` folder.

---

## Notes

- Firebase Firestore is used as the primary database.
- Socket.IO is used for real-time messaging.
- Twilio is used to send SMS OTP.
- Nodemailer is used to send email notifications.

```
