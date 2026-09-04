/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  // Disable Preflight to avoid conflicts with Ant Design's reset styles
  corePlugins: {
    preflight: false,
  },
  plugins: [],
}
