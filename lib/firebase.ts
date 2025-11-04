import { initializeApp, getApps, getApp } from 'firebase/app'
// Avoid initializing Firebase Auth on the server to prevent build-time errors
// Import type only to keep types in client code
import type { Auth } from 'firebase/auth'
import { getFirestore, Firestore } from 'firebase/firestore'
import { getStorage, FirebaseStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Initialize Firebase (singleton)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

// Initialize Firebase Authentication only in the browser
export const auth = ((): Auth => {
  if (typeof window !== 'undefined') {
    // Dynamic import to avoid bundling auth on the server

    const { getAuth } = require('firebase/auth') as typeof import('firebase/auth')
    return getAuth(app)
  }
  // Server-side placeholder; should never be used on the server
  return undefined as unknown as Auth
})()

// Initialize Cloud Firestore and get a reference to the service
export const db: Firestore = getFirestore(app)

// Initialize Cloud Storage and get a reference to the service
export const storage: FirebaseStorage = getStorage(app)

export default app
