import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// 🔥 Replace with your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBtKDhsbS5v-DfAOsdW88mKfhWfiRaTIlc",
  authDomain: "room-expense-27c00.firebaseapp.com",
  projectId: "room-expense-27c00",
  storageBucket: "room-expense-27c00.firebasestorage.app",
  messagingSenderId: "817303602037",
  appId: "1:817303602037:web:c829896d1e8e04be24c93c",
  measurementId: "G-21KGSFYMB0"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
