# CICS Document Portal

An official document repository for **College of Information and Computing Sciences (CICS)** students and faculty at New Era University. This portal allows students to securely access and download college documents, memos, and forms.

## 🚀 Key Features

### For Students
*   **Secure Access**: Single Sign-On (SSO) with official `@neu.edu.ph` email.
*   **Onboarding**: One-time setup to select your undergraduate program (BSCS, BSIT, etc.).
*   **Document Search**: Quickly find memos, forms, and curriculum guides.
*   **Downloads**: Securely download PDF documents.

### For Administrators
*   **Document Management**: Upload, categorize, and manage files.
*   **User Management**: Monitor student roster and block/unblock accounts.
*   **Analytics**: Track daily login stats and document download activity.
*   **Audit Logs**: Detailed history of who downloaded what and when.

## 🛠 Tech Stack

*   **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
*   **Language**: TypeScript
*   **Database**: Firebase Firestore
*   **Storage**: Firebase Storage
*   **Auth**: Firebase Authentication (Google Workspace)
*   **Styling**: Tailwind CSS + [shadcn/ui](https://ui.shadcn.com/)

## ⚙️ Setup & Installation

### 1. Clone the Repository
```bash
git clone https://github.com/johnraivenolazo/laboratory-log-management.git
cd laboratory-log-management
```

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Firebase Configuration
1.  Create a Firebase Project.
2.  Enable **Authentication** (Google Sign-In).
3.  Enable **Firestore Database**.
4.  Enable **Storage**.
5.  Copy `firestore.rules` content to Firebase Console > Firestore > Rules.
6.  Set up your `.env.local` or update `src/firebase/config.ts`.

### 4. Run Locally
```bash
pnpm dev
# Open http://localhost:3000
```

## 🔐 Admin Access
To promote a user to **Admin**, create a document in the `roles_admin` collection in Firestore with the user's UID and field `active: true`.

---
**Developed for New Era University - CICS**
