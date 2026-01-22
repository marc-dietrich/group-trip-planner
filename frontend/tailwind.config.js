import forms from "@tailwindcss/forms";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "Work Sans",
          "DM Sans",
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
        card: "0 14px 38px rgba(24, 36, 28, 0.08)",
        pop: "0 12px 24px rgba(106, 129, 103, 0.18)",
        modal: "0 24px 50px rgba(12, 18, 14, 0.25)",
        soft: "0 6px 18px rgba(0, 0, 0, 0.06)",
      },
      colors: {
        brand: {
          primary: "#6a8167",
          accent: "#8fb38d",
          surface: "#f9faf8",
          soft: "#f2f5f3",
          contrast: "#1e2720",
        },
        sage: {
          50: "#f4f7f4",
          100: "#e3e9e2",
          200: "#c7d3c5",
          300: "#a9b9a6",
          400: "#899d86",
          500: "#6a8167",
          600: "#536651",
          700: "#415040",
          800: "#313c30",
          900: "#232b22",
        },
        cream: "#fdfbf7",
        clay: "#f7f1e9",
      },
      borderRadius: {
        xl: "16px",
        lg: "14px",
        md: "12px",
        "2xl": "20px",
        "3xl": "28px",
      },
    },
  },
  plugins: [forms],
};
