import { nextTick, onUnmounted, watch, type Ref } from "vue";

/**
 * Composable for managing focus trap in modals and dialogs
 * Prevents keyboard navigation from leaving the modal
 * Restores focus to previously focused element when deactivated
 */

export function useFocusTrap(containerRef: Ref<HTMLElement | null>, isActive: Ref<boolean>) {
   let previouslyFocused: HTMLElement | null = null;
   let listenerAttached = false;
   // Invalidates a pending activation when the trap is closed or unmounted
   // before Vue has flushed the DOM for the newly opened dialog.
   let activationToken = 0;

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
      // Idempotent: a second activation must not overwrite the element that
      // should receive focus back when the dialog closes.
      if (listenerAttached || !containerRef.value) return;

      // Store the currently focused element
      previouslyFocused =
         document.activeElement instanceof HTMLElement ? document.activeElement : null;

      // Focus the first focusable element in the container
      const focusableElements = containerRef.value.querySelectorAll<HTMLElement>(focusableSelector);

      if (focusableElements.length > 0) {
         focusableElements[0]?.focus();
      }

      // Add keydown listener
      document.addEventListener("keydown", trapFocus);
      listenerAttached = true;
   }

   /**
    * Deactivate the focus trap
    * Removes listeners and restores focus to previously focused element
    */
   function deactivate() {
      // Cancel any activation queued behind nextTick.
      activationToken++;

      if (listenerAttached) {
         document.removeEventListener("keydown", trapFocus);
         listenerAttached = false;
      }

      const target = previouslyFocused;
      previouslyFocused = null;

      // The opener may have been removed from the document while the dialog
      // was open (e.g. a route change), in which case focusing it is a no-op
      // that can move focus to the body.
      if (target?.isConnected && typeof target.focus === "function") {
         target.focus();
      }
   }

   // Watch isActive and automatically activate/deactivate. `flush: "post"`
   // waits for the dialog content to be rendered; the token guards against a
   // close that happens before that flush.
   watch(
      isActive,
      async (active) => {
         if (!active) {
            deactivate();
            return;
         }

         const token = ++activationToken;
         await nextTick();

         if (token !== activationToken || !isActive.value || !containerRef.value) return;

         activate();
      },
      { flush: "post" },
   );

   // Cleanup on unmount
   onUnmounted(() => {
      deactivate();
   });

   return { activate, deactivate };
}
