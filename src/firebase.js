// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAgBY8rR7DFxN9R1ApM-UX-MCuit3WJwRc",
  authDomain: "kitchen-assistant-a31ff.firebaseapp.com",
  projectId: "kitchen-assistant-a31ff",
  storageBucket: "kitchen-assistant-a31ff.firebasestorage.app",
  messagingSenderId: "548974977221",
  appId: "1:548974977221:web:a5e1df0bd135ae48f110ac",
  measurementId: "G-96YM994G2X"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
