export class TaskView {
    constructor() {
        this.bindElements();
    }

    bindElements() {
        this.tasksContainer = document.getElementById('tasksContainer');
        this.allTasksContainer = document.getElementById('allTasksContainer');
        this.dateDisplay = document.getElementById('currentDateDisplay');
        this.agendaSubtitle = document.getElementById('agendaSubtitle');
        this.completionRateEl = document.getElementById('completionRate');
        this.categoriesList = document.getElementById('categoriesList');
        this.templateTasksList = document.getElementById('templateTasksList');
        this.homeCompletedEl = document.getElementById('homeCompleted');
    }

    renderCurrentTasks(tasks, dateStr, categories, activeTimers = {}, handlers = {}) {
        if (!this.tasksContainer) return;

        const todayStr = this.getLocalDateString(new Date());
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = this.getLocalDateString(yesterday);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = this.getLocalDateString(tomorrow);

        if (this.dateDisplay) {
            if (dateStr === todayStr) {
                this.dateDisplay.textContent = 'Today';
                if (this.agendaSubtitle) this.agendaSubtitle.textContent = "Here's your agenda for today";
            } else if (dateStr === yesterdayStr) {
                this.dateDisplay.textContent = 'Yesterday';
                if (this.agendaSubtitle) this.agendaSubtitle.textContent = "Here's what you did yesterday";
            } else if (dateStr === tomorrowStr) {
                this.dateDisplay.textContent = 'Tomorrow';
                if (this.agendaSubtitle) this.agendaSubtitle.textContent = "Here's your agenda for tomorrow";
            } else {
                const dateObj = new Date(dateStr);
                const formattedDate = dateObj.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
                this.dateDisplay.textContent = formattedDate;
                if (this.agendaSubtitle) this.agendaSubtitle.textContent = `Tasks for ${formattedDate}`;
            }
        }

        const dayTasks = tasks.filter(t => t.date === dateStr);
        const completedCount = dayTasks.filter(t => t.completed).length;
        const rate = dayTasks.length ? Math.round((completedCount / dayTasks.length) * 100) : 0;

        if (this.completionRateEl) this.completionRateEl.textContent = `${rate}% complete`;
        if (this.homeCompletedEl && dateStr === todayStr) this.homeCompletedEl.textContent = completedCount;

        if (dayTasks.length === 0) {
            this.tasksContainer.innerHTML = `<div class="no-tasks">All clear! Add some tasks to get started.</div>`;
        } else {
            this.tasksContainer.innerHTML = dayTasks.map(t => {
                const timerState = activeTimers[t.id] || { remainingSeconds: (t.duration || 0) * 60, isRunning: false };
                const minutes = Math.floor(timerState.remainingSeconds / 60);
                const seconds = timerState.remainingSeconds % 60;
                const duration = Number(t.duration) || 0;

                // Stack selection options
                const stackOptions = categories.map(c =>
                    `<option value="${c.name}" ${t.category === c.name ? 'selected' : ''}>${c.name}</option>`
                ).join('');

                const timerDisplay = duration > 0 ? `
                    <div class="task-timer ${timerState.isRunning ? 'running' : ''}" id="timer-${t.id}">
                        <span class="timer-count">${minutes}:${seconds.toString().padStart(2, '0')}</span>
                        <button class="timer-btn" onclick="appController.handleToggleTimer('${t.id}')">
                            <i class="fas ${timerState.isRunning ? 'fa-pause' : 'fa-play'}"></i>
                        </button>
                    </div>
                ` : '';

                return `
                    <div class="task-card ${t.completed ? 'completed' : ''}" 
                         data-id="${t.id}" 
                         oncontextmenu="return false;"
                         onpointerdown="appController.handleTaskPointerDown(event, '${t.id}')">
                        <input type="checkbox" class="checkbox" ${t.completed ? 'checked' : ''} onchange="appController.handleToggleTask('${t.id}')">
                        <div class="task-info">
                            <div class="task-name">${t.name}</div>
                            <div class="task-meta">
                                <span class="tag" style="color: ${this.getCategoryColor(t.category, categories)}">${t.category}</span>
                                <span><i class="bi bi-star-fill" style="color: gold;"></i> ${t.points} pts</span>
                                ${duration > 0 ? `<span><i class="bi bi-clock"></i> ${duration} min</span>` : ''}
                            </div>
                        </div>
                        ${timerDisplay}
                        <button onclick="appController.handleDeleteTask('${t.id}')" style="background:none; border:none; color:var(--text-muted); cursor:pointer;">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                `;
            }).join('');
        }
    }

    renderAllTasks(tasks, categories) {
        if (!this.allTasksContainer) return;

        if (tasks.length === 0) {
            this.allTasksContainer.innerHTML = '<div class="no-tasks">No tasks planned.</div>';
        } else {
            this.allTasksContainer.innerHTML = tasks.slice(0, 50).map(t => `
                <div class="task-card ${t.completed ? 'completed' : ''}">
                    <div class="task-info">
                        <div class="task-name">${t.name}</div>
                        <div class="task-meta">
                            <span><i class="bi bi-calendar"></i> ${t.date}</span>
                            <span class="tag" style="color: ${this.getCategoryColor(t.category, categories)}">${t.category}</span>
                            ${t.duration ? `<span><i class="bi bi-clock"></i> ${t.duration} min</span>` : ''}
                        </div>
                    </div>
                    <button onclick="appController.handleDeleteTask('${t.id}')" style="background:none; border:none; color:var(--text-muted); cursor:pointer;">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            `).join('');
        }
    }

    renderCategories(categories) {
        const selectors = ['taskCategory', 'templateTaskCategory'];
        selectors.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = '<option value="">Category</option>' + categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
        });

        if (this.categoriesList) {
            this.categoriesList.innerHTML = categories.map((c, idx) => `
                <div class="tag" style="background: ${c.color}22; color: ${c.color}; display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem;">
                    ${c.name}
                    <i class="bi bi-x" style="cursor: pointer;" onclick="appController.handleDeleteCategory(${idx})"></i>
                </div>
            `).join('');
        }
    }

    getCategoryColor(categoryName, categories) {
        const cat = categories.find(c => c.name === categoryName);
        return cat ? cat.color : '#6366f1';
    }

    getLocalDateString(date) {
        const d = new Date(date);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().split('T')[0];
    }
}

export const taskView = new TaskView();
