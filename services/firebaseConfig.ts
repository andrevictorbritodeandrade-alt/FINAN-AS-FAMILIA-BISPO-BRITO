import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

let app, auth, db;
let isConfigured = false;

if (firebaseConfig.projectId) {
    isConfigured = true;
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        
        // Initialize Firestore with the specific databaseId from config
        db = initializeFirestore(app, {
            localCache: persistentLocalCache({
                tabManager: persistentMultipleTabManager()
            })
        }, (firebaseConfig as any).firestoreDatabaseId || "(default)");
        
    } catch (error) {
        console.warn("Error initializing Firebase (Offline Mode active):", error);
        isConfigured = false;
    }
}

export { db, auth, isConfigured, onAuthStateChanged, signInAnonymously };