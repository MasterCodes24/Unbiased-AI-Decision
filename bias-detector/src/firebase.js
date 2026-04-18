// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

// Replace these values with the ones from your Firebase Project Settings
const firebaseConfig = {
  apiKey: "AIzaSyDsBUTJZGTQMzcRdjglmq_UuXm0QiT8JJs",
  authDomain: "fairlens-87c34.firebaseapp.com",
  projectId: "fairlens-87c34",
  storageBucket: "fairlens-87c34.firebasestorage.app",
  messagingSenderId: "72215436723",
  appId: "1:72215436723:web:91d7936d4cf333177a3fc6",
  measurementId: "G-H4TE7459S7"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Helper functions for your components to use
export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);