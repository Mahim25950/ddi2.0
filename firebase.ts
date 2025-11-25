import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyAVnHFtkNRyDSlzZi7VO3NUYLdQL_YDr1M",
  authDomain: "class-8-project-c494d.firebaseapp.com",
  databaseURL: "https://class-8-project-c494d-default-rtdb.firebaseio.com",
  projectId: "class-8-project-c494d",
  storageBucket: "class-8-project-c494d.firebasestorage.app",
  messagingSenderId: "552503917607",
  appId: "1:552503917607:web:969183cae81728577ca202",
  measurementId: "G-VWND377T64"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
const auth = getAuth(app);
const db = getFirestore(app); // For structured data (Users, Questions, Results)
const rtdb = getDatabase(app); // For real-time presence, live counters, or very fast updates

export { app, auth, db, rtdb };
