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
            this.rewardsList.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 3rem;">No rewards created yet. Add one to get started!</div>';
            return;
        }

        this.rewardsList.innerHTML = rewards.map((r, idx) => {
            const canRedeem = userPoints >= r.points;
            return `
            <div class="reward-card">
                <div style="font-size: 2.5rem; color: var(--primary); margin-bottom: 0.5rem;"><i class="${r.icon || 'bi bi-gift'}"></i></div>
                <div>
                    <h4 style="font-size: 1.1rem; margin-bottom: 0.25rem;">${r.name}</h4>
                    <p style="font-size: 0.875rem; color: var(--text-muted);">${r.description || 'No description'}</p>
                </div>
                
                <div style="margin-top: auto; display: flex; justify-content: space-between; align-items: center; padding-top: 1rem; border-top: 1px solid var(--border);">
                    <div style="display: flex; flex-direction: column;">
                        <span style="font-weight: 800; color: var(--secondary); font-size: 1.1rem;">${r.points} pts</span>
                        ${r.redeemCount > 0 ? `<span style="font-size: 0.65rem; color: var(--accent);">Redeemed: ${r.redeemCount}</span>` : ''}
                    </div>
                    <button class="btn ${canRedeem ? 'btn-primary' : 'btn-secondary'}" 
                            onclick="appController.handleRedeemReward(${idx})" 
                            ${!canRedeem ? 'disabled' : ''}
                            style="padding: 0.4rem 1rem;">
                        ${canRedeem ? 'Redeem' : 'Need Pts'}
                    </button>
                </div>
                <button onclick="appController.handleDeleteReward(${idx})" style="position: absolute; top: 1rem; right: 1rem; background: none; border: none; color: var(--text-muted); cursor: pointer; opacity: 0.5; transition: opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.5'">
                    <i class="bi bi-x-lg"></i>
                </button>
            </div>
        `}).join('');
    }

    updateStats(points) {
        if (this.totalPointsEl) this.totalPointsEl.textContent = points;
        if (this.homePointsEl) this.homePointsEl.textContent = points;
        if (this.homeAvailablePointsEl) this.homeAvailablePointsEl.textContent = points;
    }
}

export const rewardView = new RewardView();
