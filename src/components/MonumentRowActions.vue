<!--
   The three row actions, shared by `/table` and `/region/<name>` so the two
   tables cannot drift apart. Extracted for the same reason the sort was: a
   per-page copy is how the columns stopped matching in the first place.

   The upload button is gated on `auth.canUpload`, which in production requires a
   logged-in session, so anonymous visitors see at most the wiki and map buttons —
   and usually neither, since 80% of monuments have no `azLink` and no geometry.
-->
<template>
   <div class="flex justify-end gap-1 sm:gap-3">
      <CdxButton
         v-if="actions.upload"
         weight="quiet"
         aria-label="Şəkil yüklə"
         title="Şəkil yüklə"
         @click="emit('upload', row)"
      >
         <CdxIcon :icon="cdxIconUpload" />
      </CdxButton>

      <CdxButton
         v-if="actions.wiki"
         weight="quiet"
         aria-label="Vikipediyada oxu"
         title="Wikipedia"
         @click="openWiki"
      >
         <CdxIcon :icon="cdxIconLogoWikipedia" />
      </CdxButton>

      <CdxButton
         v-if="actions.map"
         weight="quiet"
         aria-label="Xəritədə göstər"
         title="Xəritədə göstər"
         @click="showOnMap"
      >
         <CdxIcon :icon="cdxIconMapPin" />
      </CdxButton>
   </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { useRouter } from "vue-router";
import { CdxButton, CdxIcon } from "@wikimedia/codex";
import { cdxIconLogoWikipedia, cdxIconMapPin, cdxIconUpload } from "@wikimedia/codex-icons";
import { useAuthStore } from "@/stores/auth.ts";
import { rowActionsFor } from "@/utils/monumentActions.ts";
import { getCanonicalId } from "@/utils/monumentFormatters.ts";
import type { MonumentProps } from "@/types";

const props = defineProps<{ row: MonumentProps }>();

/**
 * The page keeps ownership of the upload modal — it holds the selected monument
 * and whether the dialog is open — so this only reports the request.
 */
const emit = defineEmits<{ upload: [row: MonumentProps] }>();

const router = useRouter();
const auth = useAuthStore();

const actions = computed(() => rowActionsFor(props.row, auth.canUpload));

const openWiki = (): void => {
   window.open(props.row.azLink, "_blank", "noopener,noreferrer");
};

/**
 * Hands the id to `/map`, which reads `?inventory=` on mount and flies to that
 * marker (MonumentMap.vue). Passed as a query object rather than a string so
 * vue-router does the encoding: register ids contain characters like the em-dash
 * in "26—1" that need it.
 */
const showOnMap = (): void => {
   void router.push({ path: "/map", query: { inventory: getCanonicalId(props.row.inventory) } });
};
</script>
