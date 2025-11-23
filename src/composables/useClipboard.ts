import { ref } from "vue";

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
        copy
    };
}