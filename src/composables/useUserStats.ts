import { ref } from "vue";
import type { UserStats } from "../types";

export const useUserStats = () => {
    const stats = ref<UserStats | null>(null);
    const isLoading = ref(false);
    const error = ref<string | null>(null);

    const fetchUserStats = async (username: string) => {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await fetch(`/api/leaderboard/user/${encodeURIComponent(username)}`);
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error("Sizin bu il və ya əvvəlki illərdə WLM Azərbaycan üçün qeydə alınmış şəkliniz tapılmadı.");
                }
                throw new Error(`Xəta: ${response.status}`);
            }
            const data = await response.json();
            stats.value = data;
        } catch (err: any) {
            console.error("Failed to fetch user stats:", err);
            error.value = err.message || "Statistikaları yükləmək mümkün olmadı.";
        } finally {
            isLoading.value = false;
        }
    };

    return {
        stats,
        isLoading,
        error,
        fetchUserStats,
    };
};
