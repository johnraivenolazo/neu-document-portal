'use client';

// import { firebaseConfig } from '@/firebase/config';

const firebaseConfig = {
  apiKey: "AIzaSyCsvWt1K7O-InK0BaUkXSj8oHcjhbUtWb8",
  authDomain: "studio-7815438824-82398.firebaseapp.com",
  projectId: "studio-7815438824-82398",
  storageBucket: "studio-7815438824-82398.firebasestorage.app",
  messagingSenderId: "447987248019",
  appId: "1:447987248019:web:4dcbed3553ade9e5671666",
  measurementId: ""
};
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (getApps().length > 0) {
    return getSdks(getApp());
  }

  let firebaseApp;
  try {
    // Attempt to initialize via Firebase App Hosting environment variables
    // But check if we are in an environment that might actually have them
    firebaseApp = initializeApp();
  } catch (e) {
    // If auto-init fails, fall back to config
    firebaseApp = initializeApp(firebaseConfig);
  }

  return getSdks(firebaseApp);
}
export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';

export * from './errors';
export * from './error-emitter';
