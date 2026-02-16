
// FIREBASE CONFIGURATION AND AUTHENTICATION
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
import {
    getFirestore,
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

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCPdIzpvT8dujekAdGFgMj-mJgFt7tZXlk",
    authDomain: "login-a5bda.firebaseapp.com",
    projectId: "login-a5bda",
    storageBucket: "login-a5bda.firebasestorage.app",
    messagingSenderId: "663189795692",
    appId: "1:663189795692:web:8edc44142ed6f7df2f3949",
    measurementId: "G-96N9WTSCLD"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// App State
let isLoginMode = true;
let currentUser = null;
let userId = null;
let currentSelectedDate = new Date();
currentSelectedDate.setHours(0, 0, 0, 0);

let tasks = [];
let rewards = [];
let categories = [
    { name: 'Personal', color: '#6366f1' },
    { name: 'Work', color: '#ec4899' },
    { name: 'Health', color: '#10b981' },
    { name: 'Urgent', color: '#ef4444' }
];
let userStats = { points: 0, completedCount: 0 };
let charts = {};
let templateTasks = [];
let activeTimers = {};
let isAppInitialized = false;

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    initAuth();
});

function initAuth() {
    const authToggle = document.getElementById('authToggle');
    const authActionBtn = document.getElementById('authActionBtn');
    const googleAuthBtn = document.getElementById('googleAuthBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    authToggle?.addEventListener('click', toggleAuthMode);
    authActionBtn?.addEventListener('click', handleEmailAuth);
    googleAuthBtn?.addEventListener('click', handleGoogleAuth);
    logoutBtn?.addEventListener('click', handleLogout);

    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            userId = user.uid;
            handleAuthSuccess(user);
        } else {
            currentUser = null;
            userId = null;
            handleAuthSignOut();
        }
    });
}

function handleAuthSuccess(user) {
    document.body.classList.add('authenticated');
    const avatar = document.getElementById('userAvatar');
    const displayName = document.getElementById('userDisplayName');
    const email = document.getElementById('userEmail');

    if (user.displayName) {
        displayName.textContent = user.displayName;
        avatar.textContent = user.displayName.charAt(0).toUpperCase();
    } else {
        displayName.textContent = user.email.split('@')[0];
        avatar.textContent = user.email.charAt(0).toUpperCase();
    }
    email.textContent = user.email;

    initMainApp();
    loadUserData(user.uid);
}

function handleAuthSignOut() {
    document.body.classList.remove('authenticated');
    clearAppData();
}

async function loadUserData(uid) {
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
        const data = snap.data();
        userStats = data.stats || userStats;
        categories = data.categories || categories;
        rewards = data.rewards || [];
    } else {
        await setDoc(userRef, {
            email: currentUser.email,
            stats: userStats,
            categories: categories,
            rewards: [],
            createdAt: serverTimestamp()
        });
    }

    await fetchTasks();
    renderAll();
}

async function fetchTasks() {
    const q = query(
        collection(db, "users", userId, "tasks"),
        orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    tasks = [];
    snap.forEach(doc => tasks.push({ id: doc.id, ...doc.data() }));
}

function initMainApp() {
    if (isAppInitialized) return;
    isAppInitialized = true;

    // Nav Navigation
    const navItems = document.querySelectorAll('.nav-menu:not(.page-container .nav-menu) .nav-item');
    navItems.forEach((btn) => {
        if (!btn.id || btn.classList.contains('tab-btn')) return;
        btn.onclick = () => switchPage(btn.id.replace('Btn', 'Page'));
    });

    // Theme Toggle
    document.getElementById('themeToggle')?.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const icon = document.querySelector('#themeToggle i');
        if (icon) icon.className = document.body.classList.contains('dark-mode') ? 'bi bi-sun-fill' : 'bi bi-moon-fill';
    });

    // Forms
    document.getElementById('taskForm')?.addEventListener('submit', addTask);
    document.getElementById('addCategoryForm')?.addEventListener('submit', addCategory);
    document.getElementById('rewardForm')?.addEventListener('submit', addReward);
    document.getElementById('templateTaskForm')?.addEventListener('submit', addTemplateTask);

    // Day buttons for templates (using delegation to be safer)
    document.querySelector('.day-btns')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.day-btn');
        if (btn) btn.classList.toggle('active');
    });

    // Buttons

    // Buttons
    document.getElementById('applyTemplateBtn')?.addEventListener('click', applyTemplate);
    document.getElementById('addNewRewardBtn')?.addEventListener('click', () => document.getElementById('rewardModal').style.display = 'flex');
    document.getElementById('closeRewardModal')?.addEventListener('click', () => document.getElementById('rewardModal').style.display = 'none');
    document.getElementById('viewRewardsBtnQuick')?.addEventListener('click', () => switchPage('rewardsPage'));
    document.getElementById('resetAllDataBtn')?.addEventListener('click', resetAllData);
    document.getElementById('prevDateBtn')?.addEventListener('click', () => changeDate(-1));
    document.getElementById('nextDateBtn')?.addEventListener('click', () => changeDate(1));
    document.getElementById('todayBtn')?.addEventListener('click', () => {
        currentSelectedDate = new Date();
        currentSelectedDate.setHours(0, 0, 0, 0);
        renderAll();
    });

    // Analytics Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab') + 'Tab';
            document.querySelectorAll('.analytics-content').forEach(c => c.style.display = 'none');
            const target = document.getElementById(tabId);
            if (target) target.style.display = 'block';
            updateCharts(btn.getAttribute('data-tab'));
        });
    });

    // Data Management
    document.getElementById('exportDataBtn')?.addEventListener('click', exportData);
    document.getElementById('importDataBtn')?.addEventListener('click', () => document.getElementById('importDataInput').click());
    document.getElementById('importDataInput')?.addEventListener('change', importData);

    renderAll();
}

function switchPage(pageId) {
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page-container');

    navItems.forEach(i => i.classList.remove('active'));
    const btn = document.getElementById(pageId.replace('Page', 'Btn'));
    if (btn) btn.classList.add('active');

    pages.forEach(p => p.classList.remove('active'));
    document.getElementById(pageId)?.classList.add('active');

    if (pageId === 'analyticsPage') initAnalytics();
}

function changeDate(offset) {
    currentSelectedDate.setDate(currentSelectedDate.getDate() + offset);
    renderAll();
}

// RENDERING
function renderAll() {
    renderCategories();
    renderCurrentTasks();
    renderAllTasks();
    renderRewards();
    renderTemplateTasks();
    updateStats();
}

function renderCurrentTasks() {
    const container = document.getElementById('tasksContainer');
    const dateDisplay = document.getElementById('currentDateDisplay');
    const agendaSubtitle = document.getElementById('agendaSubtitle');
    if (!container) return;

    const dateStr = getLocalDateString(currentSelectedDate);
    const todayStr = getLocalDateString(new Date());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = getLocalDateString(tomorrow);

    if (dateDisplay) {
        if (dateStr === todayStr) {
            dateDisplay.textContent = 'Today';
            if (agendaSubtitle) agendaSubtitle.textContent = "Here's your agenda for today";
        } else if (dateStr === yesterdayStr) {
            dateDisplay.textContent = 'Yesterday';
            if (agendaSubtitle) agendaSubtitle.textContent = "Here's what you did yesterday";
        } else if (dateStr === tomorrowStr) {
            dateDisplay.textContent = 'Tomorrow';
            if (agendaSubtitle) agendaSubtitle.textContent = "Here's your agenda for tomorrow";
        } else {
            const formattedDate = currentSelectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
            dateDisplay.textContent = formattedDate;
            if (agendaSubtitle) agendaSubtitle.textContent = `Tasks for ${formattedDate}`;
        }
    }

    const dayTasks = tasks.filter(t => t.date === dateStr);
    const completedCount = dayTasks.filter(t => t.completed).length;
    const rate = dayTasks.length ? Math.round((completedCount / dayTasks.length) * 100) : 0;

    const rateEl = document.getElementById('completionRate');
    if (rateEl) rateEl.textContent = `${rate}% complete`;

    if (dayTasks.length === 0) {
        container.innerHTML = `<div class="no-tasks">All clear! Add some tasks to get started.</div>`;
    } else {
        container.innerHTML = dayTasks.map(t => {
            const timerState = activeTimers[t.id] || { remainingSeconds: (t.duration || 0) * 60, isRunning: false };
            const minutes = Math.floor(timerState.remainingSeconds / 60);
            const seconds = timerState.remainingSeconds % 60;
            const duration = Number(t.duration) || 0;
            const timerDisplay = duration > 0 ? `
                <div class="task-timer ${timerState.isRunning ? 'running' : ''}" id="timer-${t.id}">
                    <span class="timer-count">${minutes}:${seconds.toString().padStart(2, '0')}</span>
                    <button class="timer-btn" onclick="toggleTimer('${t.id}')">
                        <i class="fas ${timerState.isRunning ? 'fa-pause' : 'fa-play'}"></i>
                    </button>
                </div>
            ` : '';

            return `
                <div class="task-card ${t.completed ? 'completed' : ''}">
                    <input type="checkbox" class="checkbox" ${t.completed ? 'checked' : ''} onchange="toggleTask('${t.id}')">
                    <div class="task-info">
                        <div class="task-name">${t.name}</div>
                        <div class="task-meta">
                            <span class="tag" style="color: ${getCategoryColor(t.category)}">${t.category}</span>
                            <span><i class="bi bi-star-fill" style="color: gold;"></i> ${t.points} pts</span>
                            ${duration > 0 ? `<span><i class="bi bi-clock"></i> ${duration} min</span>` : ''}
                        </div>
                    </div>
                    ${timerDisplay}
                    <button onclick="deleteTask('${t.id}')" style="background:none; border:none; color:var(--text-muted); cursor:pointer;">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            `;
        }).join('');
    }
}

function renderAllTasks() {
    const container = document.getElementById('allTasksContainer');
    if (!container) return;

    if (tasks.length === 0) {
        container.innerHTML = '<div class="no-tasks">No tasks planned.</div>';
    } else {
        container.innerHTML = tasks.slice(0, 50).map(t => `
            <div class="task-card ${t.completed ? 'completed' : ''}">
                <div class="task-info">
                    <div class="task-name">${t.name}</div>
                    <div class="task-meta">
                        <span><i class="bi bi-calendar"></i> ${t.date}</span>
                        <span class="tag" style="color: ${getCategoryColor(t.category)}">${t.category}</span>
                        ${t.duration ? `<span><i class="bi bi-clock"></i> ${t.duration} min</span>` : ''}
                    </div>
                </div>
                <button onclick="deleteTask('${t.id}')" style="background:none; border:none; color:var(--text-muted); cursor:pointer;">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `).join('');
    }
}

function renderRewards() {
    const container = document.getElementById('rewardsList');
    const pointsEl = document.getElementById('rewardsPagePoints');
    if (pointsEl) pointsEl.textContent = userStats.points;

    if (!container) return;
    if (rewards.length === 0) {
        container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">No rewards created yet.</div>';
        return;
    }

    container.innerHTML = rewards.map((r, idx) => `
        <div class="panel" style="margin-bottom: 0; position: relative;">
            <div style="font-size: 2rem; color: var(--primary); margin-bottom: 1rem;"><i class="${r.icon || 'bi bi-gift'}"></i></div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <h4>${r.name}</h4>
                ${r.redeemCount > 0 ? `<span class="tag" style="background: var(--accent)22; color: var(--accent);">Redeemed: ${r.redeemCount}</span>` : ''}
            </div>
            <p style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 1.5rem;">${r.description}</p>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 700; color: var(--secondary);">${r.points} pts</span>
                <button class="btn btn-primary btn-small" onclick="redeemReward(${idx})" ${userStats.points < r.points ? 'disabled' : ''}>Redeem</button>
            </div>
            <button onclick="deleteReward(${idx})" style="position: absolute; top: 1rem; right: 1rem; background: none; border: none; color: var(--text-muted); cursor: pointer;">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>
    `).join('');
}

function renderCategories() {
    const selectors = ['taskCategory', 'templateTaskCategory'];
    selectors.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '<option value="">Category</option>' + categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    });

    const list = document.getElementById('categoriesList');
    if (list) {
        list.innerHTML = categories.map((c, idx) => `
            <div class="tag" style="background: ${c.color}22; color: ${c.color}; display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem;">
                ${c.name}
                <i class="bi bi-x" style="cursor: pointer;" onclick="deleteCategory(${idx})"></i>
            </div>
        `).join('');
    }
}

function renderTemplateTasks() {
    const container = document.getElementById('templateTasksList');
    if (!container) return;

    if (templateTasks.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted); text-align:center;">No template tasks defined.</p>';
        return;
    }

    container.innerHTML = templateTasks.map((t, idx) => {
        const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        const dayIndicators = days.map((day, i) => `
            <span class="day-tag ${t.days.includes(i) ? 'active' : ''}">${day}</span>
        `).join('');

        return `
            <div class="task-card">
                <div class="task-info">
                    <div class="task-name">${t.name}</div>
                    <div class="task-meta">
                        <span class="tag" style="color: ${getCategoryColor(t.category)}">${t.category}</span>
                        <span>${t.points} pts</span>
                        ${t.duration ? `<span><i class="bi bi-clock"></i> ${t.duration} min</span>` : ''}
                    </div>
                    <div style="display: flex; gap: 4px; margin-top: 8px;">
                        ${dayIndicators}
                    </div>
                </div>
                <button onclick="removeTemplateTask(${idx})" style="background:none; border:none; color:var(--text-muted); cursor:pointer;">
                    <i class="bi bi-x-lg"></i>
                </button>
            </div>
        `;
    }).join('');
}

function updateStats() {
    const pointsEl = document.getElementById('totalPoints');
    const homePointsEl = document.getElementById('homePoints');
    const availablePointsEl = document.getElementById('homeAvailablePoints');
    const completedEl = document.getElementById('homeCompleted');

    if (pointsEl) pointsEl.textContent = userStats.points;
    if (homePointsEl) homePointsEl.textContent = userStats.points;
    if (availablePointsEl) availablePointsEl.textContent = userStats.points;

    const todayStr = getLocalDateString(new Date());
    const todayTasks = tasks.filter(t => t.date === todayStr);
    if (completedEl) completedEl.textContent = todayTasks.filter(t => t.completed).length;
}

// HANDLERS
async function addTask(e) {
    e.preventDefault();
    const newTask = {
        name: document.getElementById('taskName').value,
        category: document.getElementById('taskCategory').value,
        points: Number(document.getElementById('taskPoints').value) || 10,
        date: document.getElementById('taskDate').value || getLocalDateString(new Date()),
        duration: Number(document.getElementById('taskDuration').value) || 0,
        completed: false,
        createdAt: serverTimestamp()
    };
    const ref = await addDoc(collection(db, "users", userId, "tasks"), newTask);
    tasks.unshift({ id: ref.id, ...newTask, createdAt: new Date() });
    renderAll();
    e.target.reset();
    showToast("Task added successfully!", "success");
    switchPage('homePage');
}

window.toggleTask = async (id) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    task.completed = !task.completed;

    // Stop timer if task is completed
    if (task.completed && activeTimers[id] && activeTimers[id].isRunning) {
        toggleTimer(id);
    }

    userStats.points += task.completed ? Number(task.points) : -Number(task.points);
    await updateDoc(doc(db, "users", userId, "tasks", id), { completed: task.completed });
    saveUserStats();
    renderAll();
    if (task.completed) showToast(`Goal achieved! +${task.points} pts`, "success");
};

window.toggleTimer = (id) => {
    const task = tasks.find(t => t.id === id);
    if (!task || task.completed) return;

    if (!activeTimers[id]) {
        activeTimers[id] = {
            remainingSeconds: (task.duration || 0) * 60,
            isRunning: false,
            intervalId: null
        };
    }

    const state = activeTimers[id];

    if (state.isRunning) {
        // Pause
        clearInterval(state.intervalId);
        state.isRunning = false;
        state.intervalId = null;
    } else {
        // Start
        if (state.remainingSeconds <= 0) {
            showToast("Timer already finished!", "info");
            return;
        }

        state.isRunning = true;
        state.intervalId = setInterval(() => {
            state.remainingSeconds--;
            if (state.remainingSeconds <= 0) {
                clearInterval(state.intervalId);
                state.isRunning = false;
                state.intervalId = null;
                showToast(`Time's up for: ${task.name}`, "info");
            }
            updateTimerUI(id);
        }, 1000);
    }
    renderCurrentTasks();
};

function updateTimerUI(id) {
    const timerEl = document.getElementById(`timer-${id}`);
    if (!timerEl) return;

    const state = activeTimers[id];
    const countEl = timerEl.querySelector('.timer-count');
    if (countEl) {
        const minutes = Math.floor(state.remainingSeconds / 60);
        const seconds = state.remainingSeconds % 60;
        countEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}

window.deleteTask = async (id) => {
    if (!confirm('Delete this task?')) return;
    const task = tasks.find(t => t.id === id);
    if (task && task.completed) userStats.points -= Number(task.points);
    await deleteDoc(doc(db, "users", userId, "tasks", id));
    tasks = tasks.filter(t => t.id !== id);
    saveUserStats();
    renderAll();
    showToast("Task deleted", "info");
};

function addTemplateTask(e) {
    e.preventDefault();
    const name = document.getElementById('templateTaskName').value;
    const category = document.getElementById('templateTaskCategory').value;
    const points = Number(document.getElementById('templateTaskPoints').value) || 10;
    const duration = Number(document.getElementById('templateTaskDuration').value) || 0;

    const selectedDays = [];
    document.querySelectorAll('.day-btn.active').forEach(btn => {
        selectedDays.push(Number(btn.getAttribute('data-day')));
    });

    templateTasks.push({ name, category, points, duration, days: selectedDays });

    // Reset buttons
    document.querySelectorAll('.day-btn').forEach(btn => btn.classList.remove('active'));

    renderTemplateTasks();
    e.target.reset();
    showToast("Added to template", "success");
}

window.removeTemplateTask = (idx) => {
    templateTasks.splice(idx, 1);
    renderTemplateTasks();
};

async function applyTemplate() {
    const start = document.getElementById('templateStartDate').value;
    const end = document.getElementById('templateEndDate').value;
    const status = document.getElementById('templateStatus');

    if (!start || !end || templateTasks.length === 0) {
        showToast("Define tasks and range first", "error");
        return;
    }

    const startDate = new Date(start);
    const endDate = new Date(end);
    if (endDate < startDate) {
        showToast("Invalid date range", "error");
        return;
    }

    if (status) {
        status.textContent = "Applying template... please wait.";
        status.style.color = "var(--primary)";
    }

    try {
        let current = new Date(startDate);
        current.setHours(0, 0, 0, 0);
        const endTimestamp = endDate.setHours(23, 59, 59, 999);

        let createdCount = 0;
        while (current.getTime() <= endTimestamp) {
            const dateStr = getLocalDateString(current);
            const dayOfWeek = current.getDay();

            for (const t of templateTasks) {
                if (t.days.length === 0 || t.days.includes(dayOfWeek)) {
                    await addDoc(collection(db, "users", userId, "tasks"), {
                        name: t.name,
                        category: t.category,
                        points: t.points,
                        duration: t.duration,
                        date: dateStr,
                        completed: false,
                        createdAt: serverTimestamp()
                    });
                    createdCount++;
                }
            }
            current.setDate(current.getDate() + 1);
        }

        showToast(`Template applied! Created ${createdCount} tasks.`, "success");
        await fetchTasks();
        renderAll();
        setTimeout(() => {
            templateTasks = [];
            renderTemplateTasks();
            if (status) status.textContent = "";
            switchPage('homePage');
        }, 1500);
    } catch (e) {
        console.error(e);
        showToast("Error applying template", "error");
    }
}

async function addCategory(e) {
    e.preventDefault();
    const name = document.getElementById('newCategoryName').value;
    const color = document.getElementById('newCategoryColor').value;
    categories.push({ name, color });
    await updateDoc(doc(db, "users", userId), { categories });
    renderCategories();
    e.target.reset();
    showToast("Category added", "success");
}

window.deleteCategory = async (idx) => {
    categories.splice(idx, 1);
    await updateDoc(doc(db, "users", userId), { categories });
    renderCategories();
    showToast("Category removed", "info");
};

async function addReward(e) {
    e.preventDefault();
    const reward = {
        name: document.getElementById('rewardName').value,
        description: document.getElementById('rewardDescription').value,
        points: Number(document.getElementById('rewardPoints').value) || 0,
        icon: document.getElementById('rewardIcon').value,
        redeemCount: 0
    };
    rewards.push(reward);
    await updateDoc(doc(db, "users", userId), { rewards });
    document.getElementById('rewardModal').style.display = 'none';
    renderRewards();
    e.target.reset();
    showToast("Reward created!", "success");
}

window.deleteReward = async (idx) => {
    rewards.splice(idx, 1);
    await updateDoc(doc(db, "users", userId), { rewards });
    renderRewards();
};

window.redeemReward = async (idx) => {
    const reward = rewards[idx];
    if (userStats.points >= reward.points) {
        userStats.points -= reward.points;
        reward.redeemCount = (reward.redeemCount || 0) + 1;

        await updateDoc(doc(db, "users", userId), {
            stats: userStats,
            rewards: rewards
        });

        showToast(`Successfully redeemed: ${reward.name}!`, "success");
        renderRewards();
        updateStats();
    } else {
        showToast("Insufficient points!", "error");
    }
};

async function saveUserStats() {
    if (userId) await updateDoc(doc(db, "users", userId), { stats: userStats });
}

async function resetAllData() {
    if (!confirm("⚠️ Are you ABSOLUTELY sure? This will delete ALL your data forever.")) return;

    const btn = document.getElementById('resetAllDataBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Wiping Data...';
    btn.disabled = true;

    try {
        const q = query(collection(db, "users", userId, "tasks"));
        const snap = await getDocs(q);
        const deletePromises = snap.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);

        const defaultCategories = [
            { name: 'Personal', color: '#6366f1' },
            { name: 'Work', color: '#ec4899' },
            { name: 'Health', color: '#10b981' },
            { name: 'Urgent', color: '#ef4444' }
        ];

        await updateDoc(doc(db, "users", userId), {
            stats: { points: 0, completedCount: 0 },
            categories: defaultCategories,
            rewards: []
        });

        tasks = [];
        categories = defaultCategories;
        rewards = [];
        userStats = { points: 0, completedCount: 0 };

        renderAll();
        showToast("Account reset successfully", "info");
        switchPage('homePage');
    } catch (e) {
        console.error(e);
        showToast("Error wiping data", "error");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// ANALYTICS
function initAnalytics() {
    updateCharts('daily');
}

function updateCharts(type) {
    if (type === 'daily') {
        const canvasDaily = document.getElementById('dailyChart');
        if (!canvasDaily) return;
        const ctxDaily = canvasDaily.getContext('2d');
        if (charts.daily) charts.daily.destroy();

        const last7Days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return getLocalDateString(d);
        }).reverse();
        const data = last7Days.map(d => tasks.filter(t => t.date === d && t.completed).length);

        const labels = last7Days.map((d, i) => {
            if (i === 6) return 'Today';
            if (i === 5) return 'Yesterday';
            return d.split('-').slice(1).join('/');
        });

        charts.daily = new Chart(ctxDaily, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Tasks Completed',
                    data: data,
                    borderColor: '#6366f1',
                    tension: 0.4,
                    fill: true,
                    backgroundColor: 'rgba(99, 102, 241, 0.1)'
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    } else if (type === 'weekly') {
        const canvasWeekly = document.getElementById('weeklyChart');
        if (!canvasWeekly) return;
        const ctxWeekly = canvasWeekly.getContext('2d');
        if (charts.weekly) charts.weekly.destroy();

        const last4Weeks = [...Array(4)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (i * 7));
            return d;
        }).reverse();

        const data = last4Weeks.map(weekDate => {
            const start = new Date(weekDate);
            start.setDate(start.getDate() - 6);
            start.setHours(0, 0, 0, 0);
            const end = new Date(weekDate);
            end.setHours(23, 59, 59, 999);

            return tasks.filter(t => {
                const taskDate = new Date(t.date);
                return taskDate >= start && taskDate <= end && t.completed;
            }).length;
        });

        charts.weekly = new Chart(ctxWeekly, {
            type: 'line',
            data: {
                labels: last4Weeks.map(d => `Week ending ${d.getMonth() + 1}/${d.getDate()}`),
                datasets: [{
                    label: 'Tasks Completed',
                    data: data,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    } else if (type === 'monthly') {
        const canvasMonthly = document.getElementById('monthlyChart');
        if (!canvasMonthly) return;
        const ctxMonthly = canvasMonthly.getContext('2d');
        if (charts.monthly) charts.monthly.destroy();

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const last6Months = [...Array(6)].map((_, i) => {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            return { month: d.getMonth(), year: d.getFullYear() };
        }).reverse();

        const data = last6Months.map(m => {
            return tasks.filter(t => {
                const taskDate = new Date(t.date);
                return taskDate.getMonth() === m.month && taskDate.getFullYear() === m.year && t.completed;
            }).length;
        });

        charts.monthly = new Chart(ctxMonthly, {
            type: 'line',
            data: {
                labels: last6Months.map(m => `${months[m.month]} ${m.year}`),
                datasets: [{
                    label: 'Tasks Completed',
                    data: data,
                    borderColor: '#f59e0b',
                    tension: 0.4,
                    fill: false
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    } else if (type === 'rewards') {
        const canvasRewards = document.getElementById('rewardsPieChart');
        if (!canvasRewards) return;
        const ctxRewards = canvasRewards.getContext('2d');
        if (charts.rewards) charts.rewards.destroy();

        const redeemData = rewards.filter(r => (r.redeemCount || 0) > 0);

        if (redeemData.length === 0) {
            ctxRewards.font = "14px Inter";
            ctxRewards.fillStyle = "#64748b";
            ctxRewards.textAlign = "center";
            ctxRewards.fillText("No redemptions yet", canvasRewards.width / 2, canvasRewards.height / 2);
            return;
        }

        charts.rewards = new Chart(ctxRewards, {
            type: 'pie',
            data: {
                labels: redeemData.map(r => r.name),
                datasets: [{
                    data: redeemData.map(r => r.redeemCount || 0),
                    backgroundColor: [
                        '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    }
}

// DATA
function exportData() {
    const data = { tasks, categories, rewards, stats: userStats };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `taskflow_backup.json`;
    a.click();
    showToast("Exported backup", "success");
}

function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const data = JSON.parse(event.target.result);
            if (data.categories) categories = data.categories;
            if (data.rewards) rewards = data.rewards;
            if (data.stats) userStats = data.stats;
            await updateDoc(doc(db, "users", userId), { categories, rewards, stats: userStats });
            showToast("Data imported successfully!", "success");
            setTimeout(() => location.reload(), 1000);
        } catch (err) { showToast("Error importing data", "error"); }
    };
    reader.readAsText(file);
}

// TOAST SYSTEM
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'bi-info-circle';
    if (type === 'success') icon = 'bi-check-circle';
    if (type === 'error') icon = 'bi-exclamation-triangle';

    toast.innerHTML = `
        <i class="bi ${icon}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease-in forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// CSS for toast animation out
const style = document.createElement('style');
style.innerHTML = `
    @keyframes toastOut {
        from { opacity: 1; transform: translateX(0); }
        to { opacity: 0; transform: translateX(50px); }
    }
`;
document.head.appendChild(style);

// HELPERS
function getLocalDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getCategoryColor(name) {
    const cat = categories.find(c => c.name === name);
    return cat ? cat.color : '#64748b';
}

function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    document.getElementById('authTitle').textContent = isLoginMode ? 'TaskFlow' : 'Create Account';
    document.getElementById('authActionText').textContent = isLoginMode ? 'Get Started' : 'Sign Up';
    document.getElementById('authToggle').textContent = isLoginMode ? 'New here? Create an account' : 'Already have an account? Login';
}

async function handleEmailAuth() {
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const msg = document.getElementById('authMessage');
    try {
        if (isLoginMode) await signInWithEmailAndPassword(auth, email, password);
        else await createUserWithEmailAndPassword(auth, email, password);
    } catch (e) {
        if (msg) {
            msg.style.display = 'block';
            msg.className = 'auth-message auth-error';
            msg.textContent = e.message;
        }
    }
}

async function handleGoogleAuth() {
    try { await signInWithPopup(auth, googleProvider); }
    catch (e) { showToast(e.message, "error"); }
}

async function handleLogout() {
    await signOut(auth);
}

function clearAppData() {
    tasks = [];
    rewards = [];
    userStats = { points: 0, completedCount: 0 };
}
