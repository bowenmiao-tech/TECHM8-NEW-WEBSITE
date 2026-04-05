import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        repairs: resolve(__dirname, "repairs.html"),
        products: resolve(__dirname, "products.html"),
        stores: resolve(__dirname, "stores.html"),
        shop: resolve(__dirname, "shop.html"),
        storePolicy: resolve(__dirname, "store-policy.html"),
        cbdStore: resolve(__dirname, "stores/cbd-store.html"),
        southsideStore: resolve(__dirname, "stores/southside-store.html"),
        northsideStore: resolve(__dirname, "stores/northside-store.html"),
        serviceHub: resolve(__dirname, "stores/warehouse-hub.html")
      }
    }
  },
  server: {
    host: "0.0.0.0",
    port: 4173
  }
});
