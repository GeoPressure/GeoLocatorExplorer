import { createRouter, createWebHistory } from "vue-router";
import Globe from "../pages/Globe.vue";
import Project from "../pages/Project.vue";
import Tag from "../pages/Tag.vue";

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

export default router;
