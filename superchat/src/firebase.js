import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import 'firebase/firestore';
import './App.css';

  // Your Firebase configuration goes here
  // Get these values from your Firebase Console
 const firebaseConfig = {
  apiKey: "AIzaSyD-VnrZ-bjw8WOF2vsn5lVw7NspZLh3BxY",
  authDomain: "react-chatapp-db817.firebaseapp.com",
  projectId: "react-chatapp-db817",
  storageBucket: "react-chatapp-db817.firebasestorage.app",
  messagingSenderId: "126510619225",
  appId: "1:126510619225:web:dd6c3cae1d254c36506f48",
  measurementId: "G-B31F493WW2"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);