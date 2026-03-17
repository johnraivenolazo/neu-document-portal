import { FirebaseOptions } from 'firebase/app';

const fallbackFirebaseConfig: FirebaseOptions = {
  projectId: 'studio-7815438824-82398',
  appId: '1:447987248019:web:4dcbed3553ade9e5671666',
  apiKey: 'AIzaSyCsvWt1K7O-InK0BaUkXSj8oHcjhbUtWb8',
  authDomain: 'studio-7815438824-82398.firebaseapp.com',
  storageBucket: 'studio-7815438824-82398.firebasestorage.app',
  messagingSenderId: '447987248019',
  measurementId: '',
};

export const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || fallbackFirebaseConfig.apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || fallbackFirebaseConfig.authDomain,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || fallbackFirebaseConfig.projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || fallbackFirebaseConfig.storageBucket,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || fallbackFirebaseConfig.messagingSenderId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || fallbackFirebaseConfig.appId,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || fallbackFirebaseConfig.measurementId,
};
