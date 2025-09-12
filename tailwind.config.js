/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // Optimize for production builds
  corePlugins: {
    // Disable unused features to reduce bundle size
    preflight: true,
  },
  theme: {
    extend: {},
  },
  plugins: [],
}

