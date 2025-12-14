import { onUnmounted, watch, type Ref } from "vue";

/**
 * Composable for managing focus trap in modals and dialogs
 * Prevents keyboard navigation from leaving the modal
 * Restores focus to previously focused element when deactivated
 */

export function useFocusTrap(containerRef: Ref<HTMLElement | null>, isActive: Ref<boolean>) {
   let previouslyFocused: HTMLElement | null = null;

   // Selector for all focusable elements
   const focusableSelector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

   /**
    * Trap focus within the container when Tab is pressed
    */
   function trapFocus(e: KeyboardEvent) {
      if (!isActive.value || !containerRef.value) return;

      const focusableElements = Array.from(
         containerRef.value.querySelectorAll<HTMLElement>(focusableSelector),
      );

      if (focusableElements.length === 0) return;

      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];

      if (e.key === "Tab") {
         if (e.shiftKey && document.activeElement === firstFocusable) {
            lastFocusable?.focus();
            e.preventDefault();
         } else if (!e.shiftKey && document.activeElement === lastFocusable) {
            firstFocusable?.focus();
            e.preventDefault();
         }
      }
   }

   /**
    * Activate the focus trap
    * Stores current focus and moves focus to first focusable element
    */
   function activate() {
      if (!containerRef.value) return;

      // Store the currently focused element
      previouslyFocused = document.activeElement as HTMLElement;

      // Focus the first focusable element in the container
      const focusableElements = containerRef.value.querySelectorAll<HTMLElement>(focusableSelector);

      if (focusableElements.length > 0) {
         focusableElements[0]?.focus();
      }

      // Add keydown listener
      document.addEventListener("keydown", trapFocus);
   }

   /**
    * Deactivate the focus trap
    * Removes listeners and restores focus to previously focused element
    */
   function deactivate() {
      document.removeEventListener("keydown", trapFocus);

      // Restore focus to the element that had focus before the trap was activated
      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
         previouslyFocused.focus();
      }
   }

   // Watch isActive and automatically activate/deactivate
   watch(isActive, (active) => {
      if (active) {
         // Use nextTick to ensure the DOM is ready
         setTimeout(() => activate(), 50);
      } else {
         deactivate();
      }
   });

   // Cleanup on unmount
   onUnmounted(() => {
      deactivate();
   });

   return { activate, deactivate };
}
