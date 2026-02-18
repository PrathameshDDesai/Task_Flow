import { AppConfig } from "../config/app-config.js";

export class TemplateLoader {
    static async load(path, containerId) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), AppConfig.ui.loadingTimeout);

        try {
            // Cache-bust to ensure fresh content
            const url = `${path}?v=${Date.now()}`;
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeout);

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const html = await response.text();

            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = html;
            }
            return html;
        } catch (error) {
            clearTimeout(timeout);
            const errorMsg = error.name === 'AbortError' ? `Timeout loading ${path}` : `Failed to load ${path}: ${error.message}`;
            console.error(`TemplateLoader:`, errorMsg);
            throw new Error(errorMsg);
        }
    }

    static async loadAll() {
        const templates = [
            { path: 'html/auth.html', containerId: 'authContainer' },
            { path: 'html/home.html', containerId: 'homePage' },
            { path: 'html/tasks.html', containerId: 'tasksPage' },
            { path: 'html/templates.html', containerId: 'templatesPage' },
            { path: 'html/rewards.html', containerId: 'rewardsPage' },
            { path: 'html/stats.html', containerId: 'statsPage' },
            { path: 'html/settings.html', containerId: 'settingsPage' },
            { path: 'html/modals.html', containerId: 'modalContainer' }
        ];

        return Promise.all(templates.map(t => this.load(t.path, t.containerId)));
    }
}
