// src/firebase.js
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDFsSWlr0BCtQgR6boVwnjw1MnoyrUR-Sw",
  authDomain: "zapchat204.firebaseapp.com",
  projectId: "zapchat204",
  storageBucket: "zapchat204.firebasestorage.app",
  messagingSenderId: "795113613255",
  appId: "1:795113613255:web:cb33770f9309dd24e49be2",
  measurementId: "G-WSLKQTJL9R"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export { app, analytics };
