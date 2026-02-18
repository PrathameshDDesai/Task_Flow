import {
    doc,
    setDoc,
    getDoc,
    collection,
    query,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    orderBy
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { authModel } from "./AuthModel.js";

class TaskModel {
    constructor() {
        this.db = authModel.db;
        this.tasks = [];
        this.categories = [
            { name: 'Personal', color: '#6366f1' },
            { name: 'Work', color: '#ec4899' },
            { name: 'Health', color: '#10b981' },
            { name: 'Urgent', color: '#ef4444' }
        ];
        this.templateTasks = [];
    }

    get userId() {
        return authModel.getUserId();
    }

    async fetchTasks() {
        if (!this.userId) return [];
        const q = query(
            collection(this.db, "users", this.userId, "tasks"),
            orderBy("order", "asc")
        );
        const snap = await getDocs(q);
        this.tasks = [];
        snap.forEach(doc => this.tasks.push({ id: doc.id, ...doc.data() }));

        // Backward compatibility: add order if missing
        let updated = false;
        for (let i = 0; i < this.tasks.length; i++) {
            if (this.tasks[i].order === undefined) {
                this.tasks[i].order = i;
                await this.updateTask(this.tasks[i].id, { order: i });
                updated = true;
            }
        }
        if (updated) this.tasks.sort((a, b) => a.order - b.order);

        return this.tasks;
    }

    async addTask(taskData) {
        const newTask = {
            ...taskData,
            completed: false,
            order: this.tasks.length,
            createdAt: serverTimestamp()
        };
        const ref = await addDoc(collection(this.db, "users", this.userId, "tasks"), newTask);
        return { id: ref.id, ...newTask };
    }

    async updateTask(taskId, updates) {
        await updateDoc(doc(this.db, "users", this.userId, "tasks", taskId), updates);
    }

    async deleteTask(taskId) {
        await deleteDoc(doc(this.db, "users", this.userId, "tasks", taskId));
    }

    async saveCategories(categories) {
        this.categories = categories;
        await updateDoc(doc(this.db, "users", this.userId), { categories });
    }

    async fetchUserData() {
        const userRef = doc(this.db, "users", this.userId);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
            const data = snap.data();
            this.categories = data.categories || this.categories;
            return data;
        }
        return null;
    }

    async initializeUser(email, stats) {
        await setDoc(doc(this.db, "users", this.userId), {
            email: email,
            stats: stats,
            categories: this.categories,
            rewards: [],
            createdAt: serverTimestamp()
        });
    }
}

export const taskModel = new TaskModel();
