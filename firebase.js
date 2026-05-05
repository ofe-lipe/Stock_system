import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAgDftQGoNY4Qwb1uUodzv3oaOsvx7cHlY",
  authDomain: "stock-bar-adbfe.firebaseapp.com",
  projectId: "stock-bar-adbfe",
  storageBucket: "stock-bar-adbfe.firebasestorage.app",
  messagingSenderId: "893158185628",
  appId: "1:893158185628:web:635474e18404a5fbf8ab59"
};

// inicia app
const app = initializeApp(firebaseConfig);

// 🔥 conecta com banco
export const db = getFirestore(app);