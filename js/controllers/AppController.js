import { authModel } from "../models/AuthModel.js";
import { taskModel } from "../models/TaskModel.js";
import { rewardModel } from "../models/RewardModel.js";
import { authView } from "../views/AuthView.js";
import { taskView } from "../views/TaskView.js";
import { rewardView } from "../views/RewardView.js";
import { analyticsView } from "../views/AnalyticsView.js";
import { TemplateLoader } from "../utils/TemplateLoader.js";
import { AppConfig } from "../config/AppConfig.js";

class AppController {
    constructor() {
        this.currentSelectedDate = new Date();
        this.currentSelectedDate.setHours(0, 0, 0, 0);
        this.activeTimers = {};
    }

    async init() {
        try {
            // 1. Initialize EmailJS
            if (typeof emailjs !== 'undefined') {
                emailjs.init(AppConfig.emailjs.publicKey);
            }

            // 2. Load HTML templates dynamically
            await TemplateLoader.loadAll();

            // 3. Re-bind view elements to the newly loaded HTML
            this.rebindViews();

            // 4. Setup Auth Listener
            authModel.onAuthStateChanged(async (user) => {
                authView.updateAuthStatus(user);
                if (user) {
                    const userData = await taskModel.fetchUserData();
                    if (!userData) {
                        await taskModel.initializeUser(user.email, rewardModel.userStats);
                    } else {
                        rewardModel.userStats = userData.stats || rewardModel.userStats;
                        rewardModel.rewards = userData.rewards || [];
                    }
                    await this.refreshData();
                }
            });

            this.setupEventListeners();

            // 5. Start the auto email scheduler (sends at 9 PM)
            this.startEmailScheduler();

            // 6. Show home page by default
            this.switchPage('homePage');

            // 6. Hide loading state
            const loader = document.getElementById(AppConfig.elements.appLoadingId);
            if (loader) {
                loader.style.opacity = '0';
                loader.style.transition = 'opacity 0.3s ease';
                setTimeout(() => loader.remove(), 300);
            }

        } catch (error) {
            console.error("App initialization failed:", error);
            // Error will be caught by global window.onerror in index.html
            throw error;
        }
    }

    rebindViews() {
        authView.bindElements();
        taskView.bindElements();
        rewardView.bindElements();
    }

    async refreshData() {
        await taskModel.fetchTasks();
        this.renderAll();
    }

    renderAll() {
        const dateStr = taskView.getLocalDateString(this.currentSelectedDate);
        taskView.renderCategories(taskModel.categories);
        taskView.renderCurrentTasks(taskModel.tasks, dateStr, taskModel.categories, this.activeTimers);
        taskView.renderAllTasks(taskModel.tasks, taskModel.categories);
        rewardView.renderRewards(rewardModel.rewards, rewardModel.userStats.points);
        rewardView.updateStats(rewardModel.userStats.points);
    }

    setupEventListeners() {
        // Auth events
        document.getElementById(AppConfig.elements.authToggleId)?.addEventListener('click', () => authView.toggleAuthMode());
        document.getElementById(AppConfig.elements.authActionBtnId)?.addEventListener('click', () => this.handleAuth());
        document.getElementById(AppConfig.elements.googleAuthBtnId)?.addEventListener('click', () => this.handleGoogleAuth());
        document.getElementById(AppConfig.elements.logoutBtnId)?.addEventListener('click', () => authModel.logout());

        // Navigation — explicit per-button binding
        const navMap = {
            'homeBtn': 'homePage',
            'tasksBtn': 'tasksPage',
            'rewardsBtn': 'rewardsPage',
            'statsBtn': 'statsPage',
            'templatesBtn': 'templatesPage',
            'settingsBtn': 'settingsPage'
        };
        Object.entries(navMap).forEach(([btnId, pageId]) => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.addEventListener('click', () => this.switchPage(pageId));
            }
        });

        // Task Form
        document.getElementById(AppConfig.elements.taskFormId)?.addEventListener('submit', (e) => this.handleAddTask(e));

        // Date Navigation
        document.getElementById(AppConfig.elements.prevDateBtnId)?.addEventListener('click', () => this.changeDate(-1));
        document.getElementById(AppConfig.elements.nextDateBtnId)?.addEventListener('click', () => this.changeDate(1));
        document.getElementById(AppConfig.elements.todayBtnId)?.addEventListener('click', () => {
            this.currentSelectedDate = new Date();
            this.currentSelectedDate.setHours(0, 0, 0, 0);
            this.renderAll();
        });

        // Email Summary
        document.getElementById(AppConfig.elements.sendEmailSummaryBtnId)?.addEventListener('click', () => this.handleSendEmailSummary());
    }

    async handleAuth() {
        const email = document.getElementById(AppConfig.elements.authEmailId).value;
        const password = document.getElementById(AppConfig.elements.authPasswordId).value;
        try {
            if (authView.isLoginMode) {
                await authModel.signIn(email, password);
            } else {
                await authModel.signUp(email, password);
            }
        } catch (error) {
            authView.showMessage(error.message);
        }
    }

    async handleGoogleAuth() {
        try {
            await authModel.signInWithGoogle();
        } catch (error) {
            authView.showMessage(error.message);
        }
    }

    switchPage(pageId) {
        if (!pageId) return;

        // 1. Update nav buttons
        const allNavBtns = document.querySelectorAll('header .nav-menu .nav-item');
        allNavBtns.forEach(b => b.classList.remove('active'));
        const activeBtn = document.getElementById(pageId.replace('Page', 'Btn'));
        if (activeBtn) activeBtn.classList.add('active');

        // 2. Hide ALL page containers, then show the target
        const allPages = document.querySelectorAll('.page-container');
        allPages.forEach(p => {
            p.classList.remove('active');
            p.style.display = 'none';
        });
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
            targetPage.style.display = 'block';
        }

        // 3. Init analytics if stats page
        if (pageId === 'statsPage') {
            analyticsView.initAnalytics(taskModel.tasks);
        }
    }

    changeDate(offset) {
        this.currentSelectedDate.setDate(this.currentSelectedDate.getDate() + offset);
        this.renderAll();
    }

    async handleAddTask(e) {
        e.preventDefault();
        const taskData = {
            name: document.getElementById(AppConfig.elements.taskNameId).value,
            category: document.getElementById(AppConfig.elements.taskCategoryId).value,
            points: Number(document.getElementById(AppConfig.elements.taskPointsId).value) || 10,
            date: document.getElementById(AppConfig.elements.taskDateId).value || taskView.getLocalDateString(new Date()),
            duration: Number(document.getElementById(AppConfig.elements.taskDurationId).value) || 0
        };
        await taskModel.addTask(taskData);
        await this.refreshData();
        e.target.reset();
        this.switchPage(AppConfig.elements.homePageId);
    }

    async handleSendEmailSummary() {
        const today = taskView.getLocalDateString(new Date());
        const todayTasks = taskModel.tasks.filter(t => t.date === today);

        if (todayTasks.length === 0) {
            showToast("No tasks for today to summarize.", "info");
            return;
        }

        const completed = todayTasks.filter(t => t.completed).length;
        const percent = Math.round((completed / todayTasks.length) * 100);

        // Build a task list for the email body
        const taskListHtml = todayTasks.map(t =>
            `${t.completed ? '✅' : '⬜'} ${t.name} (${t.points} pts)`
        ).join('\n');

        const templateParams = {
            // EmailJS recipient fields — sends TO the logged-in user
            to_email: authModel.currentUser?.email,
            to_name: authModel.currentUser?.displayName || "User",
            // Template data
            user_name: authModel.currentUser?.displayName || "User",
            user_email: authModel.currentUser?.email,
            percent: percent,
            task_stats: `${completed}/${todayTasks.length} tasks completed`,
            task_list: taskListHtml,
            message: percent === 100 ? "🎉 Great job! You've finished everything!" : `💪 Keep going, you are ${percent}% there!`
        };

        try {
            await emailjs.send(AppConfig.emailjs.serviceId, AppConfig.emailjs.templateId, templateParams);
            showToast("Summary email sent successfully!", "success");
        } catch (error) {
            console.error("Email failed:", error);
            showToast("Failed to send email. Check configuration.", "error");
        }
    }

    async handleToggleTask(id) {
        const task = taskModel.tasks.find(t => t.id === id);
        if (!task) return;
        task.completed = !task.completed;
        rewardModel.userStats.points += task.completed ? Number(task.points) : -Number(task.points);
        await taskModel.updateTask(id, { completed: task.completed });
        await rewardModel.saveUserStats(rewardModel.userStats);
        this.renderAll();

        const today = taskView.getLocalDateString(new Date());
        const todayTasks = taskModel.tasks.filter(t => t.date === today);
        const completedCount = todayTasks.filter(t => t.completed).length;
        if (completedCount === todayTasks.length && todayTasks.length > 0) {
            showToast("Great! 100% completed!", "success");
        }
    }

    async handleDeleteTask(id) {
        if (!confirm('Delete this task?')) return;
        const task = taskModel.tasks.find(t => t.id === id);
        if (task && task.completed) {
            rewardModel.userStats.points -= Number(task.points);
            await rewardModel.saveUserStats(rewardModel.userStats);
        }
        await taskModel.deleteTask(id);
        await this.refreshData();
    }

    handleTaskPointerDown(e, id) {
        if (e.button !== 2) return; // Only right click

        e.preventDefault();
        this.draggedId = id;
        this.draggedEl = e.currentTarget;
        this.draggedEl.classList.add('dragging');

        // Use a bound version of the handlers to maintain 'this' context
        this._mover = (ev) => this.handlePointerMove(ev);
        this._upper = (ev) => this.handlePointerUp(ev);

        window.addEventListener('pointermove', this._mover);
        window.addEventListener('pointerup', this._upper);
        window.addEventListener('pointercancel', this._upper);
    }

    handlePointerMove(e) {
        if (!this.draggedId) return;

        const container = document.getElementById(AppConfig.elements.tasksContainerId);
        const afterElement = this.getDragAfterElement(container, e.clientY);
        const draggable = this.draggedEl;

        if (afterElement == null) {
            container.appendChild(draggable);
        } else {
            container.insertBefore(draggable, afterElement);
        }
    }

    async handlePointerUp(e) {
        if (!this.draggedId) return;

        this.draggedEl.classList.remove('dragging');
        window.removeEventListener('pointermove', this._mover);
        window.removeEventListener('pointerup', this._upper);
        window.removeEventListener('pointercancel', this._upper);

        // Update order based on current DOM positions
        const taskCards = Array.from(document.querySelectorAll(`#${AppConfig.elements.tasksContainerId} .task-card`));
        const updates = [];

        taskCards.forEach((card, index) => {
            const id = card.getAttribute('data-id');
            const task = taskModel.tasks.find(t => t.id === id);
            if (task) {
                task.order = index;
                updates.push(taskModel.updateTask(id, { order: index }));
            }
        });

        await Promise.all(updates);

        this.draggedId = null;
        this.draggedEl = null;
        this._mover = null;
        this._upper = null;

        showToast("Order updated", "success");
    }

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.task-card:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    handleToggleTimer(id) {
        // Logic for timer (abbreviated for brevity, but could be fully ported)
    }

    // --- AUTO EMAIL SCHEDULER ---
    startEmailScheduler() {
        // Check every 60 seconds if it's time to send the daily email
        setInterval(() => {
            this.checkAndSendScheduledEmail();
        }, 60 * 1000); // every 1 minute
    }

    checkAndSendScheduledEmail() {
        // Only send if user is logged in
        if (!authModel.currentUser) return;

        const now = new Date();
        const hour = now.getHours();
        const minute = now.getMinutes();
        const todayKey = `emailSent_${now.toISOString().split('T')[0]}`;

        // Check: is it the scheduled hour (9 PM) and within the first minute?
        if (hour === AppConfig.ui.autoEmailHour && minute === 0) {
            // Check if we already sent today (avoid duplicates)
            if (localStorage.getItem(todayKey)) return;

            // Mark as sent for today
            localStorage.setItem(todayKey, 'true');

            // Send the email
            this.handleSendEmailSummary();
            showToast("📧 Auto-sending your daily summary!", "info");
        }
    }
}

export const appController = new AppController();