import {
    Auth,
    AuthError,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    User,
} from 'firebase/auth';

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
    hd: 'neu.edu.ph',
    prompt: 'select_account'
});

export async function signInWithGoogle(auth: Auth, loginHint?: string): Promise<User | null> {
    if (loginHint) {
        googleProvider.setCustomParameters({
            hd: 'neu.edu.ph',
            login_hint: loginHint,
            prompt: 'select_account'
        });
    }

    try {
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
    } catch (error) {
        const firebaseError = error as AuthError;

        if (firebaseError.code === 'auth/unauthorized-domain') {
            throw new Error('This domain is not authorized in Firebase Auth. Add your app domain in Firebase Console → Authentication → Settings → Authorized domains.');
        }

        if (firebaseError.code === 'auth/popup-closed-by-user') {
            throw new Error('Google sign-in popup was closed. Please try again and complete sign-in.');
        }

        if (firebaseError.code === 'auth/popup-blocked') {
            throw new Error('Popup was blocked by the browser. Allow popups for this site, then try again.');
        }

        throw error;
    }
}

export async function signOutUser(auth: Auth): Promise<void> {
    await signOut(auth);
}
