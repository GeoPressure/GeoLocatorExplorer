import { createRouter, createWebHistory } from "vue-router";

// Each page loads its own code on first visit: the Globe doesn't need Plotly or threebox,
// which the Tag page uses.
const Globe = () => import("../pages/Globe.vue");
const Project = () => import("../pages/Project.vue");
const Tag = () => import("../pages/Tag.vue");

// Unlisted page: no menu link, not in the sitemap, marked noindex (see Media.vue); loaded on first visit
const Media = () => import("../pages/Media.vue");

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: "/", name: "home", component: Globe },
    { path: "/project/:conceptId?", name: "project", component: Project },
    { path: "/tag/:tagId?", name: "tag", component: Tag },
    { path: "/media", name: "media", component: Media },
  ],
  scrollBehavior() {
    return { top: 0 };
  },
});

// After a new deploy, a page opened earlier asks for page chunks whose hashed file names
// no longer exist (the dev server answers similarly after a dependency change). Load the
// target URL in full once instead of leaving a blank page.
const RELOAD_KEY = "chunk-reload-target";
router.onError((error, to) => {
  const isChunkError =
    /dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(
      String(error?.message || error),
    );
  if (!isChunkError || !to?.fullPath) {
    return;
  }
  let lastTarget = null;
  try {
    lastTarget = sessionStorage.getItem(RELOAD_KEY);
    sessionStorage.setItem(RELOAD_KEY, to.fullPath);
  } catch {
    // Storage unavailable: still try one reload below.
  }
  if (lastTarget === to.fullPath) {
    return;
  }
  window.location.assign(router.resolve(to.fullPath).href);
});
router.afterEach(() => {
  try {
    sessionStorage.removeItem(RELOAD_KEY);
  } catch {
    // Ignore.
  }
});

export default router;
