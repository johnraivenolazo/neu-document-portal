import {
    Auth,
    signInWithRedirect,
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

    await signInWithRedirect(auth, googleProvider);
    return null;
}

export async function signOutUser(auth: Auth): Promise<void> {
    await signOut(auth);
}
