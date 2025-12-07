<template>
   <Teleport to="body">
      <Transition name="modal">
         <div
            v-if="isOpen"
            class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            @click.self="$emit('close')"
         >
            <div
               class="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left shadow-xl transition-all"
            >
               <div class="absolute top-4 right-4">
                  <button
                     class="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                     @click="$emit('close')"
                  >
                     <i class="fa fa-times text-xl"></i>
                  </button>
               </div>

               <div class="text-center">
                  <div
                     class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100"
                  >
                     <i class="fa-solid fa-person-digging text-3xl text-blue-600"></i>
                  </div>
                  <h3 class="text-xl leading-6 font-bold text-gray-900">Hazırlanır...</h3>
                  <div class="mt-2">
                     <p class="text-sm text-gray-500">
                        Şəkil yükləmə funksiyası hazırda inkişaf mərhələsindədir. Tezliklə
                        istifadəyə veriləcək!
                     </p>
                  </div>

                  <div class="mt-6">
                     <button
                        type="button"
                        class="inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 transition-colors hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                        @click="$emit('close')"
                     >
                        Aydındır
                     </button>
                  </div>
               </div>
            </div>
         </div>
      </Transition>
   </Teleport>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
   name: "UploadModal",
   props: {
      isOpen: {
         type: Boolean,
         required: true,
      },
   },
   emits: ["close"],
});
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
   transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
   opacity: 0;
}

.modal-enter-active .transform,
.modal-leave-active .transform {
   transition: all 0.3s ease;
}

.modal-enter-from .transform,
.modal-leave-to .transform {
   opacity: 0;
   transform: scale(0.95);
}
</style>
