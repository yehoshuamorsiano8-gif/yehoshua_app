// Import the functions you need from the SDKs you need
// שימוש בכתובות מלאות (CDN) כדי שהדפדפן ידע מאיפה להוריד את Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// כאן נשאר ה-config שלך...
const firebaseConfig = {
    apiKey: "...",
    // וכו'
};
// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCByvoHlq6K8UZmfO5MoYSjSA5DwJWaDn4",
  authDomain: "yehoshua-system.firebaseapp.com",
  projectId: "yehoshua-system",
  storageBucket: "yehoshua-system.firebasestorage.app",
  messagingSenderId: "233499815606",
  appId: "1:233499815606:web:1445807090092403f3c017",
  measurementId: "G-2CFNKDHPE8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);