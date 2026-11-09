import { onUnmounted, ref } from "vue";

/**
 * Clipboard helper: exposes a `copy` action plus a reactive `copied` flag that
 * resets after `timeout` ms. Failures are logged, not thrown.
 */
export function useClipboard(timeout = 2000) {
   const copied = ref(false);
   let resetTimer: ReturnType<typeof setTimeout> | null = null;

   const clearResetTimer = () => {
      if (resetTimer !== null) {
         clearTimeout(resetTimer);
         resetTimer = null;
      }
   };

   const copy = async (text: string | number) => {
      if (!text) return;

      try {
         await navigator.clipboard.writeText(String(text));

         // Restart the window for this copy. Leaving the previous timer alive
         // would hide the new success state too early.
         clearResetTimer();
         copied.value = true;

         resetTimer = setTimeout(() => {
            copied.value = false;
            resetTimer = null;
         }, timeout);
      } catch (err) {
         console.error("Failed to copy to clipboard", err);
      }
   };

   onUnmounted(clearResetTimer);

   return {
      copied,
      copy,
   };
}
