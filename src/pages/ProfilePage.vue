<template>
  <div class="min-h-full bg-gray-50 flex flex-col">
    <!-- Header -->
    <header class="bg-white border-b border-gray-200 py-6 px-4 sm:px-6">
      <div class="container mx-auto">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <div class="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 border-2 border-white shadow-sm">
              <font-awesome-icon :icon="['fas', 'user']" class="text-2xl" />
            </div>
            <div>
              <h1 class="text-2xl font-bold text-gray-900 tracking-tight">{{ auth.user?.username }}</h1>
              <p class="text-sm text-gray-500">Şəxsi profil və statistika</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <a 
              :href="commonsProfileUrl" 
              target="_blank" 
              rel="noopener"
              class="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
            >
              <font-awesome-icon :icon="['fas', 'external-link-alt']" class="text-xs" />
              Wikimedia Commons Profili
            </a>
          </div>
        </div>
      </div>
    </header>

    <main class="flex-1 container mx-auto p-4 sm:p-6 lg:p-8">
      <!-- Loading State -->
      <div v-if="isLoading" class="flex flex-col items-center justify-center py-20">
        <font-awesome-icon :icon="['fas', 'spinner']" class="text-4xl text-blue-500 animate-spin mb-4" />
        <p class="text-gray-500 font-medium">Statistikalarınız yüklənir...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="max-w-2xl mx-auto bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
        <div class="h-16 w-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <font-awesome-icon :icon="['fas', 'exclamation-circle']" class="text-2xl" />
        </div>
        <h2 class="text-xl font-bold text-gray-900 mb-2">Məlumat tapılmadı</h2>
        <p class="text-gray-600 mb-6">{{ error }}</p>
        <router-link to="/" class="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
          <font-awesome-icon :icon="['fas', 'location-arrow']" />
          Xəritəyə qayıt
        </router-link>
      </div>

      <!-- Content -->
      <div v-else-if="stats" class="space-y-8 animate-in fade-in duration-500">
        <!-- Stats Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div class="flex items-center justify-between mb-4">
              <div class="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <font-awesome-icon :icon="['fas', 'image']" />
              </div>
              <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Cəmi Foto</span>
            </div>
            <div class="flex items-baseline gap-2">
              <span class="text-3xl font-bold text-gray-900">{{ stats.total.count }}</span>
              <span class="text-sm text-gray-500 font-medium">ədəd</span>
            </div>
            <p class="mt-2 text-sm text-gray-500">Bütün illər ərzində yüklənən abidə fotoları</p>
          </div>

          <div class="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div class="flex items-center justify-between mb-4">
              <div class="h-10 w-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
                <font-awesome-icon :icon="['fas', 'file-signature']" />
              </div>
              <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">İstifadə</span>
            </div>
            <div class="flex items-baseline gap-2">
              <span class="text-3xl font-bold text-gray-900">{{ stats.total.usage }}</span>
              <span class="text-sm text-gray-500 font-medium">məqalə</span>
            </div>
            <p class="mt-2 text-sm text-gray-500">Vikipediyada istifadə olunan fotoların sayı</p>
          </div>

          <div class="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div class="flex items-center justify-between mb-4">
              <div class="h-10 w-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                <font-awesome-icon :icon="['fas', 'chart-pie']" />
              </div>
              <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">İstifadə nisbəti</span>
            </div>
            <div class="flex items-baseline gap-2">
              <span class="text-3xl font-bold text-gray-900">{{ usageRate }}%</span>
            </div>
            <p class="mt-2 text-sm text-gray-500">Yüklənmiş şəkillərin məqalələrdə istifadə faizi</p>
          </div>
        </div>

        <!-- Detail Cards -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <!-- Timeline / Archive Link -->
          <div class="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div class="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h3 class="font-bold text-gray-900">Müsabiqə Tarixçəsi</h3>
            </div>
            <div class="p-6">
              <div class="flex items-center gap-4 mb-6">
                <div class="h-12 w-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <font-awesome-icon :icon="['fas', 'trophy']" />
                </div>
                <div>
                  <p class="font-bold text-gray-900">Azərbaycan üzrə İlk Qeydiyyat</p>
                  <p class="text-sm text-gray-500">{{ formattedRegDate }}</p>
                </div>
              </div>
              
              <div class="space-y-4">
                 <p class="text-sm text-gray-600 leading-relaxed">
                   WLM Azərbaycan müsabiqəsindəki iştirakınız ölkəmizin mədəni irsinin sənədləşdirilməsində mühüm rol oynayır. 
                   Sizin tərəfinizdən yüklənən {{ stats.total.count }} foto gələcək nəsillər üçün dəyərli arxivdir.
                 </p>
                 <div class="pt-4 border-t border-gray-100 flex justify-between items-center">
                    <span class="text-sm font-medium text-gray-700">WLM Azərbaycan Səhifəsi</span>
                    <a href="https://commons.wikimedia.org/wiki/Commons:Wiki_Loves_Monuments_2025_in_Azerbaijan" target="_blank" class="text-blue-600 text-sm font-bold hover:underline">Keçid et ↗</a>
                 </div>
              </div>
            </div>
          </div>

          <!-- Actions & Tips -->
          <div class="bg-[#3366cc] rounded-2xl p-8 text-white shadow-lg relative overflow-hidden group">
            <div class="relative z-10 flex flex-col h-full">
              <h3 class="text-xl font-bold mb-4">Daha çox töhfə vermək istəyirsiniz?</h3>
              <p class="text-blue-100 mb-8 max-w-sm">
                Xəritədə şəkli olmayan abidələri taparaq onları çəkə və Azərbaycanın mədəni irsini dünyaya tanıda bilərsiniz.
              </p>
              <div class="mt-auto">
                <router-link to="/" class="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#3366cc] rounded-xl font-bold hover:bg-blue-50 transition-all transform group-hover:translate-x-1">
                  Xəritəni araşdırın
                  <font-awesome-icon :icon="['fas', 'location-arrow']" />
                </router-link>
              </div>
            </div>
            <!-- Decorative SVG circles -->
            <div class="absolute -right-10 -bottom-10 h-64 w-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/15 transition-all"></div>
            <div class="absolute -right-5 -top-5 h-20 w-20 bg-white/5 rounded-full"></div>
          </div>
        </div>
      </div>
    </main>

    <!-- Footer Decoration -->
    <div class="h-1 bg-gradient-to-r from-blue-400 via-[#3366cc] to-purple-500"></div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useUserStats } from '../composables/useUserStats';

const auth = useAuthStore();
const { stats, isLoading, error, fetchUserStats } = useUserStats();

const commonsProfileUrl = computed(() => {
  return `https://commons.wikimedia.org/wiki/User:${auth.user?.username}`;
});

const usageRate = computed(() => {
  if (!stats.value || stats.value.total.count === 0) return 0;
  return Math.round((stats.value.total.usage / stats.value.total.count) * 100);
});

const formattedRegDate = computed(() => {
  if (!stats.value?.total.reg) return 'N/A';
  // Example data format from toolforge: 20130912123456
  const regStr = stats.value.total.reg.toString();
  if (regStr.length >= 8) {
    const year = regStr.substring(0, 4);
    const month = regStr.substring(4, 6);
    const day = regStr.substring(6, 8);
    return `${day}.${month}.${year}`;
  }
  return regStr;
});

onMounted(() => {
  if (auth.user?.username) {
    fetchUserStats(auth.user.username);
  } else {
    // If not logged in redirect (handled by router guard technically but added here for safety)
    error.value = "İstifadəçi məlumatları tapılmadı. Zəhmət olmasa daxil olun.";
  }
});
</script>

<style scoped>
.animate-in {
  animation: fadeIn 0.5s ease-out forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
