export class AnalyticsView {
    constructor() {
        this.charts = {};
    }

    initAnalytics(tasks) {
        this.updateCharts('daily', tasks);
    }

    updateCharts(type, tasks) {
        const canvasMap = {
            'daily': { id: 'dailyChart', color: '#6366f1' },
            'weekly': { id: 'weeklyChart', color: '#ec4899' },
            'monthly': { id: 'monthlyChart', color: '#10b981' },
            'rewards': { id: 'rewardsPieChart', color: '#8b5cf6' }
        };

        const config = canvasMap[type];
        const canvas = document.getElementById(config.id);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (this.charts[type]) this.charts[type].destroy();

        if (type === 'daily') {
            const last7Days = [...Array(7)].map((_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - i);
                return this.getLocalDateString(d);
            }).reverse();

            const data = last7Days.map(d => tasks.filter(t => t.date === d && t.completed).length);
            const labels = last7Days.map((d, i) => {
                if (i === 6) return 'Today';
                if (i === 5) return 'Yesterday';
                return d.split('-').slice(1).join('/');
            });

            this.charts.daily = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Tasks Completed',
                        data: data,
                        borderColor: config.color,
                        tension: 0.4,
                        fill: true,
                        backgroundColor: 'rgba(99, 102, 241, 0.1)'
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }
        // ... more chart types can be added here
    }

    getLocalDateString(date) {
        const d = new Date(date);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().split('T')[0];
    }
}

export const analyticsView = new AnalyticsView();
