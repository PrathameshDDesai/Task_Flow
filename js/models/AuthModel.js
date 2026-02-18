import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCPdIzpvT8dujekAdGFgMj-mJgFt7tZXlk",
    authDomain: "login-a5bda.firebaseapp.com",
    projectId: "login-a5bda",
    storageBucket: "login-a5bda.firebasestorage.app",
    messagingSenderId: "663189795692",
    appId: "1:663189795692:web:8edc44142ed6f7df2f3949",
    measurementId: "G-96N9WTSCLD"
};

class AuthModel {
    constructor() {
        this.app = initializeApp(firebaseConfig);
        this.auth = getAuth(this.app);
        this.db = getFirestore(this.app);
        this.googleProvider = new GoogleAuthProvider();
        this.currentUser = null;
    }

    onAuthStateChanged(callback) {
        onAuthStateChanged(this.auth, (user) => {
            this.currentUser = user;
            callback(user);
        });
    }

    async signIn(email, password) {
        return signInWithEmailAndPassword(this.auth, email, password);
    }

    async signUp(email, password) {
        return createUserWithEmailAndPassword(this.auth, email, password);
    }

    async signInWithGoogle() {
        return signInWithPopup(this.auth, this.googleProvider);
    }

    async logout() {
        return signOut(this.auth);
    }

    getUserId() {
        return this.currentUser ? this.currentUser.uid : null;
    }
}

export const authModel = new AuthModel();
