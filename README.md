# CICS Document Portal

A streamlined document hub for CICS students and faculty to access official files in one place.

## Live Website

https://neu-document-portal.vercel.app/

![Student Dashboard](public/student_dashboard.png)

## Overview

This portal is the official digital channel for forms, memos, and curriculum references. It helps students quickly find the latest approved documents without going to the office.

## Features

### For Students
*   **Single Sign-On (SSO)**: Sign in using your official `@neu.edu.ph` account.
*   **Smart Search**: Find documents by title or category in seconds.
*   **Personalized Access**: Set your program on first login to view relevant content.

### For Admins
*   **Document Management**: Upload PDFs and organize them by category.
*   **Download Insights**: See which files are accessed most often.
*   **Audit Trail**: Review who downloaded what and when.

## Screenshots

| Login Page | Student Dashboard |
|:---:|:---:|
| ![Login](public/login_page.png) | ![Dashboard](public/student_dashboard.png) |

| Document Search | Admin Panel |
|:---:|:---:|
| ![Search](public/document_search.png) | ![Admin](public/admin_panel.png) |

## Tech Stack

*   **Frontend**: Next.js 14, TypeScript, Tailwind CSS
*   **Backend**: Firebase (Firestore, Storage, Auth)
*   **Styling**: shadcn/ui components

## Setup & Installation

1.  **Clone the repo**
    ```bash
    git clone https://github.com/johnraivenolazo/neu-document-portal.git
    cd neu-document-portal
    ```

2.  **Install dependencies**
    ```bash
    pnpm install
    ```

3.  **Configure Environment**
    Set up your `.env.local` with Firebase credentials (API Key, Project ID, etc.).

4.  **Run locally**
    ```bash
    pnpm dev
    ```

## Admin Access

To promote a user to **Admin**:
1.  Go to your Firestore database.
2.  Find or create the `roles_admin` collection.
3.  Add a document with the user's **UID**.
4.  Set the field `active` to `true`.
