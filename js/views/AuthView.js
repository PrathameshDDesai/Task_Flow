export class AuthView {
    constructor() {
        this.bindElements();
        this.isLoginMode = true;
    }

    bindElements() {
        this.authBox = document.getElementById('authBox');
        this.mainApp = document.getElementById('mainApp');
        this.authTitle = document.getElementById('authTitle');
        this.authSubtitle = document.getElementById('authSubtitle');
        this.authToggle = document.getElementById('authToggle');
        this.authActionBtn = document.getElementById('authActionBtn');
        this.authActionText = document.getElementById('authActionText');
        this.authMessage = document.getElementById('authMessage');
        this.avatar = document.getElementById('userAvatar');
        this.displayName = document.getElementById('userDisplayName');
        this.email = document.getElementById('userEmail');
    }

    toggleAuthMode() {
        this.isLoginMode = !this.isLoginMode;
        if (this.authTitle) {
            this.authTitle.innerHTML = this.isLoginMode ? `
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/action/google.svg" alt="G" style="width: 24px;"> TaskFlow
            ` : 'Create Account';
        }
        if (this.authSubtitle) this.authSubtitle.textContent = this.isLoginMode ? 'Your productivity, organized.' : 'Join us to stay productive.';
        if (this.authActionText) this.authActionText.textContent = this.isLoginMode ? 'Get Started' : 'Create Account';
        if (this.authToggle) this.authToggle.textContent = this.isLoginMode ? 'New here? Create an account' : 'Already have an account? Log in';
    }

    updateAuthStatus(user) {
        if (user) {
            document.body.classList.add('authenticated');
            if (user.displayName) {
                if (this.displayName) this.displayName.textContent = user.displayName;
                if (this.avatar) this.avatar.textContent = user.displayName.charAt(0).toUpperCase();
            } else {
                if (this.displayName) this.displayName.textContent = user.email.split('@')[0];
                if (this.avatar) this.avatar.textContent = user.email.charAt(0).toUpperCase();
            }
            if (this.email) this.email.textContent = user.email;
        } else {
            document.body.classList.remove('authenticated');
        }
    }

    showMessage(message, type = 'error') {
        if (!this.authMessage) return;
        this.authMessage.textContent = message;
        this.authMessage.style.display = 'block';
        this.authMessage.className = `auth-message ${type}`;
        setTimeout(() => {
            this.authMessage.style.display = 'none';
        }, 5000);
    }
}

export const authView = new AuthView();
