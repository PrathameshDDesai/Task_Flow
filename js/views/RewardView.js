export class RewardView {
    constructor() {
        this.bindElements();
    }

    bindElements() {
        this.rewardsList = document.getElementById('rewardsList');
        this.rewardsPagePoints = document.getElementById('rewardsPagePoints');
        this.totalPointsEl = document.getElementById('totalPoints');
        this.homePointsEl = document.getElementById('homePoints');
        this.homeAvailablePointsEl = document.getElementById('homeAvailablePoints');
    }

    renderRewards(rewards, userPoints) {
        if (this.rewardsPagePoints) this.rewardsPagePoints.textContent = userPoints;
        if (!this.rewardsList) return;

        if (rewards.length === 0) {
            this.rewardsList.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">No rewards created yet.</div>';
            return;
        }

        this.rewardsList.innerHTML = rewards.map((r, idx) => `
            <div class="panel" style="margin-bottom: 0; position: relative;">
                <div style="font-size: 2rem; color: var(--primary); margin-bottom: 1rem;"><i class="${r.icon || 'bi bi-gift'}"></i></div>
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <h4>${r.name}</h4>
                    ${r.redeemCount > 0 ? `<span class="tag" style="background: var(--accent)22; color: var(--accent);">Redeemed: ${r.redeemCount}</span>` : ''}
                </div>
                <p style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 1.5rem;">${r.description}</p>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 700; color: var(--secondary);">${r.points} pts</span>
                    <button class="btn btn-primary btn-small" onclick="appController.handleRedeemReward(${idx})" ${userPoints < r.points ? 'disabled' : ''}>Redeem</button>
                </div>
                <button onclick="appController.handleDeleteReward(${idx})" style="position: absolute; top: 1rem; right: 1rem; background: none; border: none; color: var(--text-muted); cursor: pointer;">
                    <i class="bi bi-x-lg"></i>
                </button>
            </div>
        `).join('');
    }

    updateStats(points) {
        if (this.totalPointsEl) this.totalPointsEl.textContent = points;
        if (this.homePointsEl) this.homePointsEl.textContent = points;
        if (this.homeAvailablePointsEl) this.homeAvailablePointsEl.textContent = points;
    }
}

export const rewardView = new RewardView();
