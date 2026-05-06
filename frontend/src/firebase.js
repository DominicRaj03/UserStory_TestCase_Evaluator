import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  projectId: "qa-evaluator-4557f",
  appId: "1:1074262932071:web:b6c3c9d3d60355002272c2",
  storageBucket: "qa-evaluator-4557f.firebasestorage.app",
  apiKey: "AIzaSyBQGJrwAFWNQl86_KJgqbNKDfKmRwK1pME",
  authDomain: "qa-evaluator-4557f.firebaseapp.com",
  messagingSenderId: "1074262932071",
  measurementId: "G-4F2ZK3P4LN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
