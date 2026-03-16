import {
    Firestore,
    collection,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    getDocs,
    query,
    where,
    Timestamp,
    runTransaction,
    addDoc,
    serverTimestamp,
    orderBy,
    limit
} from 'firebase/firestore';
import {
    CICSDocument,
    UserProfile,
    UserStatus,
    DownloadLog,
    UserRole
} from '@/lib/types';

// --- User Management ---

export async function getActiveUser(firestore: Firestore, uid: string): Promise<UserProfile | null> {
    const docRef = doc(firestore, 'users', uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
        return snap.data() as UserProfile;
    }
    return null;
}

export async function createOrUpdateStudentProfile(
    firestore: Firestore,
    uid: string,
    data: Partial<UserProfile>
): Promise<void> {
    const docRef = doc(firestore, 'users', uid);
    // Merge: true is safer. If doc exists, it updates. If not, it creates.
    // We assume role 'student' by default unless role is already set.
    // We don't overwrite role if it exists.

    const snap = await getDoc(docRef);
    if (!snap.exists()) {
        // New user
        await setDoc(docRef, {
            uid,
            role: 'student',
            status: 'active',
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
            ...data
        });
    } else {
        // Existing user
        await updateDoc(docRef, {
            lastLogin: serverTimestamp(),
            ...data
        });
    }
}

const PRIMARY_ADMIN_EMAIL = 'jcesperanza@neu.edu.ph';

export async function checkIsAdmin(firestore: Firestore, uid: string, email?: string): Promise<boolean> {
    // 1. Check if email is the primary admin email
    if (email === PRIMARY_ADMIN_EMAIL) return true;

    // 2. Check active admin role in roles_admin collection
    const docRef = doc(firestore, 'roles_admin', uid);
    const snap = await getDoc(docRef);
    return snap.exists() && snap.data().active === true;
}

/**
 * Ensures the primary admin has an entry in roles_admin.
 * This can be called during login.
 */
export async function ensurePrimaryAdmin(firestore: Firestore, uid: string, email: string): Promise<void> {
    if (email !== PRIMARY_ADMIN_EMAIL) return;

    const docRef = doc(firestore, 'roles_admin', uid);
    const snap = await getDoc(docRef);
    
    if (!snap.exists()) {
        await setDoc(docRef, {
            email: PRIMARY_ADMIN_EMAIL,
            active: true,
            updatedAt: serverTimestamp()
        });
    }
}

export async function updateStudentStatus(firestore: Firestore, uid: string, status: UserStatus): Promise<void> {
    const docRef = doc(firestore, 'users', uid);
    await updateDoc(docRef, { status });
}

export async function getAllStudents(firestore: Firestore): Promise<UserProfile[]> {
    const q = query(collection(firestore, 'users'), where('role', '==', 'student'));
    const snap = await getDocs(q);
    return snap.docs.map(d => {
        const data = d.data();
        return {
            ...data,
            createdAt: (data.createdAt as Timestamp)?.toDate(),
            lastLogin: (data.lastLogin as Timestamp)?.toDate()
        } as UserProfile;
    });
}

export async function getAllUsers(firestore: Firestore): Promise<UserProfile[]> {
    const q = query(collection(firestore, 'users'), orderBy('email', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => {
        const data = d.data();
        return {
            ...data,
            createdAt: (data.createdAt as Timestamp)?.toDate(),
            lastLogin: (data.lastLogin as Timestamp)?.toDate()
        } as UserProfile;
    });
}
// --- Document Management ---

export async function saveDocumentMetadata(
    firestore: Firestore,
    data: {
        title: string,
        description: string,
        category: string,
        fileUrl: string,
        downloadUrl: string,
        fileType: string,
        extension: string,
        uploadedBy: string
    }
): Promise<void> {
    const docData: Omit<CICSDocument, 'id'> = {
        title: data.title,
        description: data.description,
        category: data.category,
        fileUrl: data.fileUrl,
        downloadUrl: data.downloadUrl,
        fileType: data.fileType,
        extension: data.extension,
        uploadedBy: data.uploadedBy,
        createdAt: new Date(),
        downloadCount: 0
    };

    await addDoc(collection(firestore, 'documents'), {
        ...docData,
        createdAt: serverTimestamp()
    });
}

export async function searchDocuments(firestore: Firestore, searchQuery: string = ''): Promise<CICSDocument[]> {
    // Simple search (fetch all and filter client-side for now, unless large scale)
    // Firestore lacks string 'contains' query
    const colRef = collection(firestore, 'documents');
    // If we wanted to search by exact category or sort by date
    const q = query(colRef, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    const docs = snap.docs.map(d => {
        const data = d.data();
        return {
            id: d.id,
            ...data,
            createdAt: (data.createdAt as Timestamp)?.toDate()
        } as CICSDocument;
    });

    if (!searchQuery) return docs;

    // Client-side filter
    const lowerQ = searchQuery.toLowerCase();
    return docs.filter(d =>
        d.title.toLowerCase().includes(lowerQ) ||
        d.description.toLowerCase().includes(lowerQ) ||
        d.category.toLowerCase().includes(lowerQ)
    );
}

// --- Logs & Analytics ---

export async function logDownload(
    firestore: Firestore,
    docId: string,
    student: UserProfile,
    docTitle: string
): Promise<void> {
    // Transaction: Increment counter on Document, Create Log Record
    await runTransaction(firestore, async (transaction) => {
        const docRef = doc(firestore, 'documents', docId);
        const logRef = doc(collection(firestore, 'downloads'));

        const docSnap = await transaction.get(docRef);
        if (!docSnap.exists()) throw new Error("Document does not exist!");

        const newCount = (docSnap.data().downloadCount || 0) + 1;

        transaction.update(docRef, { downloadCount: newCount });
        transaction.set(logRef, {
            documentId: docId,
            documentTitle: docTitle,
            studentId: student.uid,
            studentName: student.displayName,
            studentProgram: student.program || 'Unknown',
            timestamp: serverTimestamp()
        });
    });
}

export async function updateUserRole(firestore: Firestore, uid: string, role: UserRole): Promise<void> {
    const docRef = doc(firestore, 'users', uid);
    await updateDoc(docRef, { role });
}

export async function getDownloadStats(firestore: Firestore): Promise<DownloadLog[]> {
    const q = query(collection(firestore, 'downloads'), orderBy('timestamp', 'desc'), limit(100));
    const snap = await getDocs(q);

    // Need to convert Timestamp to Date for frontend usage
    return snap.docs.map(d => {
        const data = d.data();
        return {
            id: d.id,
            ...data,
            timestamp: (data.timestamp as Timestamp)?.toDate()
        } as DownloadLog;
    });
}
