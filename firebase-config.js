// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDTyNZ4Cqw_3-G8AQCYaCxVpB_Vwh5q7-s",
  authDomain: "busybee-board.firebaseapp.com",
  projectId: "busybee-board",
  storageBucket: "busybee-board.firebasestorage.app",
  messagingSenderId: "557128928536",
  appId: "1:557128928536:web:7c05882844e1858fcba26d",
  measurementId: "G-VLQ131CNHW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);