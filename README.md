# Job Portal - A Full-Stack LinkedIn Clone

This is a full-stack web application designed to be a simplified, portfolio-ready clone of LinkedIn. It includes features for user authentication, company and user profiles, job postings, applications, and real-time messaging.

## Tech Stack

*   **Frontend:** Next.js, React, TypeScript, Tailwind CSS
*   **Backend:** Node.js, Express.js, MongoDB (with Mongoose), Socket.IO
*   **Authentication:** JSON Web Tokens (JWT)

## Features

*   **User Authentication:** Secure user registration and login system.
*   **Profiles:** Create and manage detailed profiles for both users (job seekers) and companies.
*   **Job Board:** Companies can post jobs, and users can search, view, and apply for them.
*   **Resume Upload:** Users can upload their resumes during the application process.
*   **Real-time Messaging:** A simple real-time chat system for users.
*   **Notifications:** Users receive notifications for important events.
*   **Admin Features:** Special administrative privileges for managing the platform.

## Getting Started

To get a local copy up and running, follow these steps.

### Prerequisites

*   Node.js and npm (or yarn)
*   MongoDB (a local instance or a cloud-based one like MongoDB Atlas)

### Installation & Setup

1.  **Clone the repository:**
    ```sh
    git clone <your-repository-url>
    cd <repository-folder>
    ```

2.  **Setup Backend:**
    *   Navigate to the backend directory: `cd backend`
    *   Install dependencies: `npm install`
    *   Create a `.env` file in this directory. Copy the contents of `.env.example` below and fill in your details.
    *   Start the server: `npm start`

3.  **Setup Frontend:**
    *   Navigate to the frontend directory: `cd ../frontend`
    *   Install dependencies: `npm install`
    *   Create a `.env.local` file in this directory. Copy the contents of `.env.local.example` below.
    *   Start the development server: `npm run dev`

The application should now be running, with the frontend on `http://localhost:3000` and the backend on `http://localhost:5000`.

---

## Environment Variables

You will need to create the following `.env` files. Do not commit them to your repository.

### Backend (`/backend/.env`)

```env
# MongoDB Connection String
MONGO_URI=<your_mongodb_connection_string>

# JWT Secret for signing tokens
JWT_SECRET=<your_super_secret_jwt_key>

# Email Configuration (using a service like Gmail with an App Password)
EMAIL_SERVICE=gmail
EMAIL_USER=<your_email@example.com>
EMAIL_PASSWORD=<your_email_app_password>

# Comma-separated list of emails with admin privileges
ADMIN_EMAILS=<admin1@example.com,admin2@example.com>

# Default support email
SUPPORT_EMAIL=<support@example.com>

# Frontend URL (for CORS and other links)
APP_URL=http://localhost:3000

# Optional: Admin panel URL if different
ADMIN_URL=http://localhost:3000
```

### Frontend (`/frontend/.env.local`)

```env
# The full base URL for the backend API
NEXT_PUBLIC_API_URL=http://localhost:5000
```
