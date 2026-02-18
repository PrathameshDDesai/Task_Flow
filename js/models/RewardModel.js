import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { authModel } from "./AuthModel.js";

class RewardModel {
    constructor() {
        this.db = authModel.db;
        this.rewards = [];
        this.userStats = { points: 0, completedCount: 0 };
    }

    get userId() {
        return authModel.getUserId();
    }

    async saveRewards(rewards) {
        this.rewards = rewards;
        await updateDoc(doc(this.db, "users", this.userId), { rewards });
    }

    async saveUserStats(stats) {
        this.userStats = stats;
        await updateDoc(doc(this.db, "users", this.userId), { stats });
    }

    async redeemReward(rewardIndex) {
        const reward = this.rewards[rewardIndex];
        if (this.userStats.points >= reward.points) {
            this.userStats.points -= reward.points;
            reward.redeemCount = (reward.redeemCount || 0) + 1;

            await updateDoc(doc(this.db, "users", this.userId), {
                stats: this.userStats,
                rewards: this.rewards
            });
            return true;
        }
        return false;
    }
}

export const rewardModel = new RewardModel();
