import { createApp } from "vue";
import "mapbox-gl/dist/mapbox-gl.css";
import "./style.css";
import App from "./App.vue";
import router from "./router";

createApp(App).use(router).mount("#app");
