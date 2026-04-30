import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD_C_yn_RyBSopY7Tb9aqLW8akkXJR94Vg",
  authDomain: "chaveunica-225e0.firebaseapp.com",
  projectId: "chaveunica-225e0",
  storageBucket: "chaveunica-225e0.firebasestorage.app",
  messagingSenderId: "324211037832",
  appId: "1:324211037832:web:362a46e6446ea37b85b13d",
  measurementId: "G-MRBDJC3QXZ"
};

let app, auth, db;
let isConfigured = false;

// Check if config is valid
if (firebaseConfig.projectId && firebaseConfig.projectId !== "your-project-id") {
    isConfigured = true;
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        
        // Initialize Firestore with new persistence settings (fixes deprecation warning)
        db = initializeFirestore(app, {
            localCache: persistentLocalCache({
                tabManager: persistentMultipleTabManager()
            })
        });
        
    } catch (error) {
        console.warn("Error initializing Firebase (Offline Mode active):", error);
        isConfigured = false;
    }
}

export { db, auth, isConfigured, onAuthStateChanged, signInAnonymously };