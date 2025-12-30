import forms from "@tailwindcss/forms";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "Space Grotesk",
          "IBM Plex Sans",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
        mono: [
          "IBM Plex Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      boxShadow: {
        card: "0 8px 18px rgba(15, 23, 42, 0.05)",
        pop: "0 10px 22px rgba(14, 165, 233, 0.18)",
        modal: "0 18px 40px rgba(15, 23, 42, 0.18)",
      },
      colors: {
        brand: {
          primary: "#2563eb",
          primaryLight: "#0ea5e9",
          surface: "#f7f9fb",
        },
      },
      borderRadius: {
        xl: "14px",
        lg: "12px",
        md: "10px",
      },
    },
  },
  plugins: [forms],
};
