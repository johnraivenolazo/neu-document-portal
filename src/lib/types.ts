
export type UserRole = 'admin' | 'student';
export type UserStatus = 'active' | 'blocked';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  status: UserStatus;
  program?: string; // e.g., 'BSCS', 'BSIT', 'BLIS'
  createdAt?: Date;
  lastLogin?: Date;
}

export interface CICSDocument {
  id: string;
  title: string;
  description: string;
  category: string; // e.g., 'Memo', 'Curriculum', 'Form'
  fileUrl: string;
  downloadUrl: string;
  fileType: string; // mime type
  extension: string; // e.g., 'pdf'
  uploadedBy: string; // admin uid
  createdAt: Date;
  downloadCount: number;
}

export interface DownloadLog {
  id: string;
  documentId: string;
  documentTitle: string;
  studentId: string;
  studentName: string;
  studentProgram?: string;
  timestamp: Date;
}

export interface LoginLog {
  id: string;
  userId: string;
  userName: string;
  role: UserRole;
  timestamp: Date;
}
