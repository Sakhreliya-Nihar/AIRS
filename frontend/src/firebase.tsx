// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyDaHET50vrrHcQ5nffFUY6i8t78BEYU0aE",
    authDomain: "airs-847ac.firebaseapp.com",
    projectId: "airs-847ac",
    storageBucket: "airs-847ac.firebasestorage.app",
    messagingSenderId: "690754686685",
    appId: "1:690754686685:web:3f492f08137eee1fd31534",
    measurementId: "G-8JJBNX2JLG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);

// Initialize Cloud Firestore and export it
export const db = getFirestore(app);