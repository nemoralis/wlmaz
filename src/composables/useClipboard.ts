import { ref } from "vue";

/**
 * Clipboard helper: exposes a `copy` action plus a reactive `copied` flag that
 * resets after `timeout` ms. Failures are logged, not thrown.
 */
export function useClipboard(timeout = 2000) {
   const copied = ref(false);

   const copy = async (text: string | number) => {
      if (!text) return;

      try {
         await navigator.clipboard.writeText(String(text));
         copied.value = true;

         setTimeout(() => {
            copied.value = false;
         }, timeout);
      } catch (err) {
         console.error("Failed to copy to clipboard", err);
      }
   };

   return {
      copied,
      copy,
   };
}
