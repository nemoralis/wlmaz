<template>
   <div class="min-h-full bg-gray-50">
      <!-- Hero -->
      <section
         class="border-b border-gray-200 bg-gradient-to-br from-blue-50 via-white to-amber-50"
      >
         <div class="mx-auto max-w-4xl px-4 pt-10 pb-12 sm:px-6 sm:pt-14 lg:px-8">
            <nav aria-label="Yol" class="flex items-center gap-2 text-sm text-gray-500">
               <router-link
                  to="/"
                  class="transition-colors hover:text-[#3366cc]"
                  aria-label="Ana səhifəyə get"
               >
                  Ana səhifə
               </router-link>
               <svg
                  class="h-4 w-4 flex-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
               >
                  <path
                     stroke-linecap="round"
                     stroke-linejoin="round"
                     stroke-width="2"
                     d="M9 5l7 7-7 7"
                  />
               </svg>
               <span aria-current="page" class="font-medium text-gray-700">{{
                  PRIVACY_CRUMB
               }}</span>
            </nav>

            <h1
               class="font-display mt-6 text-4xl leading-tight font-bold text-gray-900 sm:text-5xl"
            >
               {{ PRIVACY_TITLE_LABEL.en }}
            </h1>
            <p class="mt-4 text-lg leading-relaxed text-gray-700">
               {{ PRIVACY_INTRO.administeredBy.en }}
            </p>

            <!-- Language switch. English is authoritative (WMCS ToU §11), so it
                 leads and is the version the policy requirement is written
                 against; Azerbaijani follows for local readers. -->
            <div class="mt-6 flex flex-wrap gap-2">
               <a
                  href="#english"
                  class="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
               >
                  Read in English
               </a>
               <a
                  href="#azerbaijani"
                  class="inline-flex items-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-gray-300 transition ring-inset hover:bg-gray-50"
               >
                  Azərbaycan dilində
               </a>
            </div>
         </div>
      </section>

      <!-- The statement itself. One reusable block per language, so the two
           versions can never drift out of structure: both render the same
           exported sections. -->
      <section class="bg-white py-12">
         <div class="mx-auto max-w-4xl space-y-12 px-4 sm:px-6 lg:px-8">
            <!-- English -->
            <article id="english" :lang="'en'" class="scroll-mt-20 space-y-10">
               <div>
                  <h2 class="text-2xl font-bold text-gray-900">{{ PRIVACY_INTRO.title.en }}</h2>
                  <p class="mt-3 leading-relaxed text-gray-700">
                     {{ PRIVACY_INTRO.administeredBy.en }}
                  </p>
                  <p class="mt-3 text-sm text-gray-600">
                     Available in:
                     <span v-for="(lang, i) in PRIVACY_LANGUAGES" :key="lang">
                        {{ lang }}<span v-if="i < PRIVACY_LANGUAGES.length - 1">, </span>
                     </span>
                  </p>
               </div>

               <!-- element 2: categories / uses / retention -->
               <div>
                  <h2 class="text-2xl font-bold text-gray-900">
                     {{ PRIVACY_COLLECT_HEADING.en }}
                  </h2>
                  <div
                     class="mt-4 overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm"
                  >
                     <table class="min-w-full text-left text-sm">
                        <caption class="sr-only">
                           {{
                              PRIVACY_TABLE_HEADERS.caption.en
                           }}
                        </caption>
                        <thead class="border-b border-gray-200 bg-gray-50 text-gray-600">
                           <tr>
                              <th scope="col" class="px-4 py-3 font-semibold">
                                 {{ PRIVACY_TABLE_HEADERS.type.en }}
                              </th>
                              <th scope="col" class="px-4 py-3 font-semibold">
                                 {{ PRIVACY_TABLE_HEADERS.use.en }}
                              </th>
                              <th scope="col" class="px-4 py-3 font-semibold">
                                 {{ PRIVACY_TABLE_HEADERS.retention.en }}
                              </th>
                           </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">
                           <tr v-for="row in PRIVACY_DATA_TABLE" :key="row.type.en">
                              <th scope="row" class="px-4 py-3 align-top font-medium text-gray-900">
                                 {{ row.type.en }}
                              </th>
                              <td class="px-4 py-3 align-top text-gray-700">{{ row.use.en }}</td>
                              <td class="px-4 py-3 align-top text-gray-700">
                                 {{ row.retention.en }}
                              </td>
                           </tr>
                        </tbody>
                     </table>
                  </div>
               </div>

               <!-- element 3: security measures -->
               <div>
                  <h2 class="text-2xl font-bold text-gray-900">
                     {{ PRIVACY_SECURITY_HEADING.en }}
                  </h2>
                  <p class="mt-3 leading-relaxed text-gray-700">{{ PRIVACY_SECURITY.intro.en }}</p>
                  <ul class="mt-4 list-disc space-y-2 pl-6 text-gray-700">
                     <li v-for="(measure, i) in PRIVACY_SECURITY.measures" :key="i">
                        {{ measure.en }}
                     </li>
                  </ul>
               </div>

               <!-- element 4: who else can see it -->
               <div>
                  <h2 class="text-2xl font-bold text-gray-900">{{ PRIVACY_ACCESS_HEADING.en }}</h2>
                  <p class="mt-3 leading-relaxed text-gray-700">{{ PRIVACY_ACCESS.en }}</p>
               </div>

               <!-- element 5: Wikimedia Usernames -->
               <div>
                  <h2 class="text-2xl font-bold text-gray-900">
                     {{ PRIVACY_USERNAMES_HEADING.en }}
                  </h2>
                  <ul class="mt-4 list-disc space-y-2 pl-6 text-gray-700">
                     <li v-for="(item, i) in PRIVACY_USERNAMES" :key="i">{{ item.en }}</li>
                  </ul>
               </div>

               <!-- element 6: governing terms + links -->
               <div>
                  <h2 class="text-2xl font-bold text-gray-900">{{ PRIVACY_ADMIN_HEADING.en }}</h2>
                  <p class="mt-3 leading-relaxed text-gray-700">{{ PRIVACY_ADMIN.en }}</p>
                  <ul class="mt-4 space-y-2 text-sm">
                     <li>
                        <a
                           :href="PRIVACY_POLICY_LINKS.adminTerms"
                           target="_blank"
                           rel="noopener"
                           class="font-medium text-blue-600 hover:underline"
                        >
                           {{ PRIVACY_POLICY_LINK_LABELS.adminTerms.en }}
                        </a>
                     </li>
                     <li>
                        <a
                           :href="PRIVACY_POLICY_LINKS.endUserTerms"
                           target="_blank"
                           rel="noopener"
                           class="font-medium text-blue-600 hover:underline"
                        >
                           {{ PRIVACY_POLICY_LINK_LABELS.endUserTerms.en }}
                        </a>
                     </li>
                     <li>
                        <a
                           :href="PRIVACY_POLICY_LINKS.wmfPrivacy"
                           target="_blank"
                           rel="noopener"
                           class="font-medium text-blue-600 hover:underline"
                        >
                           {{ PRIVACY_POLICY_LINK_LABELS.wmfPrivacy.en }}
                        </a>
                     </li>
                  </ul>
               </div>

               <!-- elements 7 and 8: US hosting / cross-border / closing disclaimer -->
               <div>
                  <h2 class="text-2xl font-bold text-gray-900">
                     {{ PRIVACY_TRANSFER_HEADING.en }}
                  </h2>
                  <p class="mt-3 leading-relaxed text-gray-700">{{ PRIVACY_TRANSFER.en }}</p>
               </div>

               <!-- contact. The report address is part of the sentence, so it is
                    linked in place rather than repeated as a second anchor. -->
               <div>
                  <h2 class="text-2xl font-bold text-gray-900">
                     {{ PRIVACY_CONTACT.heading.en }}
                  </h2>
                  <p class="mt-3 leading-relaxed text-gray-700">
                     {{ contactEn.before
                     }}<a
                        :href="`mailto:${PRIVACY_POLICY_LINKS.reportEmail}`"
                        class="font-medium text-blue-600 hover:underline"
                        >{{ PRIVACY_POLICY_LINKS.reportEmail }}</a
                     >{{ contactEn.after }}
                  </p>
               </div>
            </article>

            <!-- Azerbaijani -->
            <article
               id="azerbaijani"
               :lang="'az'"
               class="scroll-mt-20 space-y-10 border-t border-gray-200 pt-10"
            >
               <div>
                  <h2 class="text-2xl font-bold text-gray-900">{{ PRIVACY_INTRO.title.az }}</h2>
                  <p class="mt-3 leading-relaxed text-gray-700">
                     {{ PRIVACY_INTRO.administeredBy.az }}
                  </p>
               </div>

               <div>
                  <h2 class="text-2xl font-bold text-gray-900">
                     {{ PRIVACY_COLLECT_HEADING.az }}
                  </h2>
                  <div
                     class="mt-4 overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm"
                  >
                     <table class="min-w-full text-left text-sm">
                        <caption class="sr-only">
                           {{
                              PRIVACY_TABLE_HEADERS.caption.az
                           }}
                        </caption>
                        <thead class="border-b border-gray-200 bg-gray-50 text-gray-600">
                           <tr>
                              <th scope="col" class="px-4 py-3 font-semibold">
                                 {{ PRIVACY_TABLE_HEADERS.type.az }}
                              </th>
                              <th scope="col" class="px-4 py-3 font-semibold">
                                 {{ PRIVACY_TABLE_HEADERS.use.az }}
                              </th>
                              <th scope="col" class="px-4 py-3 font-semibold">
                                 {{ PRIVACY_TABLE_HEADERS.retention.az }}
                              </th>
                           </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">
                           <tr v-for="row in PRIVACY_DATA_TABLE" :key="row.type.az">
                              <th scope="row" class="px-4 py-3 align-top font-medium text-gray-900">
                                 {{ row.type.az }}
                              </th>
                              <td class="px-4 py-3 align-top text-gray-700">{{ row.use.az }}</td>
                              <td class="px-4 py-3 align-top text-gray-700">
                                 {{ row.retention.az }}
                              </td>
                           </tr>
                        </tbody>
                     </table>
                  </div>
               </div>

               <div>
                  <h2 class="text-2xl font-bold text-gray-900">
                     {{ PRIVACY_SECURITY_HEADING.az }}
                  </h2>
                  <p class="mt-3 leading-relaxed text-gray-700">{{ PRIVACY_SECURITY.intro.az }}</p>
                  <ul class="mt-4 list-disc space-y-2 pl-6 text-gray-700">
                     <li v-for="(measure, i) in PRIVACY_SECURITY.measures" :key="i">
                        {{ measure.az }}
                     </li>
                  </ul>
               </div>

               <div>
                  <h2 class="text-2xl font-bold text-gray-900">{{ PRIVACY_ACCESS_HEADING.az }}</h2>
                  <p class="mt-3 leading-relaxed text-gray-700">{{ PRIVACY_ACCESS.az }}</p>
               </div>

               <div>
                  <h2 class="text-2xl font-bold text-gray-900">
                     {{ PRIVACY_USERNAMES_HEADING.az }}
                  </h2>
                  <ul class="mt-4 list-disc space-y-2 pl-6 text-gray-700">
                     <li v-for="(item, i) in PRIVACY_USERNAMES" :key="i">{{ item.az }}</li>
                  </ul>
               </div>

               <div>
                  <h2 class="text-2xl font-bold text-gray-900">{{ PRIVACY_ADMIN_HEADING.az }}</h2>
                  <p class="mt-3 leading-relaxed text-gray-700">{{ PRIVACY_ADMIN.az }}</p>
                  <ul class="mt-4 space-y-2 text-sm">
                     <li>
                        <a
                           :href="PRIVACY_POLICY_LINKS.adminTerms"
                           target="_blank"
                           rel="noopener"
                           class="font-medium text-blue-600 hover:underline"
                        >
                           {{ PRIVACY_POLICY_LINK_LABELS.adminTerms.az }}
                        </a>
                     </li>
                     <li>
                        <a
                           :href="PRIVACY_POLICY_LINKS.endUserTerms"
                           target="_blank"
                           rel="noopener"
                           class="font-medium text-blue-600 hover:underline"
                        >
                           {{ PRIVACY_POLICY_LINK_LABELS.endUserTerms.az }}
                        </a>
                     </li>
                     <li>
                        <a
                           :href="PRIVACY_POLICY_LINKS.wmfPrivacy"
                           target="_blank"
                           rel="noopener"
                           class="font-medium text-blue-600 hover:underline"
                        >
                           {{ PRIVACY_POLICY_LINK_LABELS.wmfPrivacy.az }}
                        </a>
                     </li>
                  </ul>
               </div>

               <div>
                  <h2 class="text-2xl font-bold text-gray-900">
                     {{ PRIVACY_TRANSFER_HEADING.az }}
                  </h2>
                  <p class="mt-3 leading-relaxed text-gray-700">{{ PRIVACY_TRANSFER.az }}</p>
               </div>

               <div>
                  <h2 class="text-2xl font-bold text-gray-900">
                     {{ PRIVACY_CONTACT.heading.az }}
                  </h2>
                  <p class="mt-3 leading-relaxed text-gray-700">
                     {{ contactAz.before
                     }}<a
                        :href="`mailto:${PRIVACY_POLICY_LINKS.reportEmail}`"
                        class="font-medium text-blue-600 hover:underline"
                        >{{ PRIVACY_POLICY_LINKS.reportEmail }}</a
                     >{{ contactAz.after }}
                  </p>
               </div>
            </article>

            <!-- §7.3.2 element 8 — the closing disclaimer. Deliberately verbatim,
                 rendered last, in both languages. -->
            <section
               class="rounded-xl border border-amber-200 bg-amber-50 p-6"
               role="note"
               aria-labelledby="privacy-disclaimer-heading"
            >
               <h2 id="privacy-disclaimer-heading" class="text-lg font-bold text-amber-900">
                  Disclaimer
               </h2>
               <p class="mt-3 text-sm leading-relaxed text-amber-900">
                  {{ PRIVACY_DISCLAIMER.en }}
               </p>
               <p :lang="'az'" class="mt-4 text-sm leading-relaxed text-amber-900">
                  {{ PRIVACY_DISCLAIMER.az }}
               </p>
            </section>
         </div>
      </section>
   </div>
</template>

<script lang="ts" setup>
import { useHead } from "@unhead/vue";
import { computed } from "vue";
import {
   PRIVACY_ACCESS,
   PRIVACY_ACCESS_HEADING,
   PRIVACY_ADMIN,
   PRIVACY_ADMIN_HEADING,
   PRIVACY_CANONICAL,
   PRIVACY_COLLECT_HEADING,
   PRIVACY_CONTACT,
   PRIVACY_CRUMB,
   PRIVACY_DATA_TABLE,
   PRIVACY_DESCRIPTION,
   PRIVACY_DISCLAIMER,
   PRIVACY_INTRO,
   PRIVACY_LANGUAGES,
   PRIVACY_POLICY_LINK_LABELS,
   PRIVACY_POLICY_LINKS,
   PRIVACY_SECURITY,
   PRIVACY_SECURITY_HEADING,
   PRIVACY_SOCIAL_IMAGE,
   PRIVACY_TABLE_HEADERS,
   PRIVACY_TITLE,
   PRIVACY_TRANSFER,
   PRIVACY_TRANSFER_HEADING,
   PRIVACY_USERNAMES,
   PRIVACY_USERNAMES_HEADING,
} from "@/content/privacy.ts";

/** Short, un-suffixed heading for the h1; PRIVACY_TITLE is the <title> tag. */
const PRIVACY_TITLE_LABEL = PRIVACY_INTRO.title;

/**
 * The §7.3.2 contact sentence names the report address, and the address has to
 * be a real `mailto:` link rather than plain text. Splitting the sentence around
 * it is what keeps the supplied wording intact *and* the address clickable —
 * the alternative, a standalone anchor under the paragraph, prints the address
 * twice and reads worse.
 *
 * Both languages' sentences contain the address exactly once; if a translation
 * ever drops it, `after` comes back empty and the address silently loses its
 * anchor, which `privacy.test.ts` asserts against.
 */
const splitAtReportEmail = (text: string): { before: string; after: string } => {
   const [before = "", after = ""] = text.split(PRIVACY_POLICY_LINKS.reportEmail);
   return { before, after };
};

const contactEn = computed(() => splitAtReportEmail(PRIVACY_CONTACT.en));
const contactAz = computed(() => splitAtReportEmail(PRIVACY_CONTACT.az));

// Title, description and social tags mirror what scripts/prerender.ts writes
// into dist/privacy.html, so nothing swaps after hydration.
useHead({
   title: PRIVACY_TITLE,
   link: [{ rel: "canonical", href: PRIVACY_CANONICAL }],
   meta: [
      { name: "description", content: PRIVACY_DESCRIPTION },
      { property: "og:site_name", content: "Wiki Loves Monuments Azerbaijan" },
      { property: "og:title", content: PRIVACY_TITLE },
      { property: "og:description", content: PRIVACY_DESCRIPTION },
      { property: "og:url", content: PRIVACY_CANONICAL },
      { property: "og:image", content: PRIVACY_SOCIAL_IMAGE },
      { name: "twitter:image", content: PRIVACY_SOCIAL_IMAGE },
   ],
});
</script>
