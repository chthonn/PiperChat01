import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: true,
        environment: "node",
        setupFiles: "./tests/setup.js",
        testTimeout: 30000
    },
});