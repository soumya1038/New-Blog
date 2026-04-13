const withOpacityValue = (variable) => {
  return ({ opacityValue } = {}) => {
    if (opacityValue === undefined) {
      return `rgb(var(${variable}))`;
    }
    return `rgb(var(${variable}) / ${opacityValue})`;
  };
};

const primaryPalette = {
  50: withOpacityValue("--color-primary-100-rgb"),
  100: withOpacityValue("--color-primary-100-rgb"),
  200: withOpacityValue("--color-primary-200-rgb"),
  300: withOpacityValue("--color-primary-300-rgb"),
  400: withOpacityValue("--color-primary-400-rgb"),
  500: withOpacityValue("--color-primary-500-rgb"),
  600: withOpacityValue("--color-primary-600-rgb"),
  700: withOpacityValue("--color-primary-700-rgb"),
  800: withOpacityValue("--color-primary-800-rgb"),
  900: withOpacityValue("--color-primary-900-rgb"),
  DEFAULT: withOpacityValue("--color-primary-600-rgb"),
};

const neutralPalette = {
  50: withOpacityValue("--gray-50-rgb"),
  100: withOpacityValue("--gray-100-rgb"),
  200: withOpacityValue("--gray-200-rgb"),
  300: withOpacityValue("--gray-300-rgb"),
  400: withOpacityValue("--gray-400-rgb"),
  500: withOpacityValue("--gray-500-rgb"),
  600: withOpacityValue("--gray-600-rgb"),
  700: withOpacityValue("--gray-700-rgb"),
  800: withOpacityValue("--gray-800-rgb"),
  900: withOpacityValue("--gray-900-rgb"),
};

const functionalPalette = (baseVar, lightVar) => ({
  50: withOpacityValue(lightVar),
  100: withOpacityValue(lightVar),
  200: withOpacityValue(lightVar),
  300: withOpacityValue(baseVar),
  400: withOpacityValue(baseVar),
  500: withOpacityValue(baseVar),
  600: withOpacityValue(baseVar),
  700: withOpacityValue(baseVar),
  800: withOpacityValue(baseVar),
  900: withOpacityValue(baseVar),
  DEFAULT: withOpacityValue(baseVar),
  light: withOpacityValue(lightVar),
});

const successPalette = functionalPalette("--success-rgb", "--success-light-rgb");
const warningPalette = functionalPalette("--warning-rgb", "--warning-light-rgb");
const errorPalette = functionalPalette("--error-rgb", "--error-light-rgb");
const infoPalette = functionalPalette("--info-rgb", "--info-light-rgb");

module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      screens: {
        xs: "475px",
      },
      colors: {
        transparent: "transparent",
        current: "currentColor",
        black: withOpacityValue("--color-black-rgb"),
        white: withOpacityValue("--color-white-rgb"),
        primary: primaryPalette,
        gray: neutralPalette,
        slate: neutralPalette,
        neutral: neutralPalette,
        stone: neutralPalette,
        zinc: neutralPalette,
        blue: primaryPalette,
        indigo: primaryPalette,
        purple: primaryPalette,
        violet: primaryPalette,
        fuchsia: primaryPalette,
        pink: primaryPalette,
        rose: errorPalette,
        red: errorPalette,
        orange: warningPalette,
        amber: warningPalette,
        yellow: warningPalette,
        green: successPalette,
        emerald: successPalette,
        lime: successPalette,
        teal: infoPalette,
        cyan: infoPalette,
        sky: infoPalette,
        success: {
          DEFAULT: withOpacityValue("--success-rgb"),
          light: withOpacityValue("--success-light-rgb"),
        },
        warning: {
          DEFAULT: withOpacityValue("--warning-rgb"),
          light: withOpacityValue("--warning-light-rgb"),
        },
        error: {
          DEFAULT: withOpacityValue("--error-rgb"),
          light: withOpacityValue("--error-light-rgb"),
        },
        info: {
          DEFAULT: withOpacityValue("--info-rgb"),
          light: withOpacityValue("--info-light-rgb"),
        },
        background: {
          primary: "var(--background-primary)",
          secondary: "var(--background-secondary)",
          tertiary: "var(--background-tertiary)",
        },
        surface: {
          card: "var(--surface-card)",
          elevated: "var(--surface-elevated)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
        },
        border: {
          default: "var(--border-default)",
        },
        tag: {
          bg: "var(--tag-bg)",
          text: "var(--tag-text)",
        },
      },
      spacing: {
        1: "var(--space-1)",
        2: "var(--space-2)",
        3: "var(--space-3)",
        4: "var(--space-4)",
        5: "var(--space-5)",
        6: "var(--space-6)",
        7: "var(--space-7)",
        8: "var(--space-8)",
        9: "var(--space-9)",
        10: "var(--space-10)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
        full: "var(--radius-full)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        hover: "var(--shadow-hover)",
      },
      fontFamily: {
        sans: ["var(--font-primary)"],
        mono: ["var(--font-mono)"],
      },
      fontSize: {
        xs: "var(--text-xs)",
        sm: "var(--text-sm)",
        md: "var(--text-md)",
        lg: "var(--text-lg)",
        xl: "var(--text-xl)",
        "2xl": "var(--text-2xl)",
        "3xl": "var(--text-3xl)",
        "4xl": "var(--text-4xl)",
        "5xl": "var(--text-5xl)",
      },
      transitionDuration: {
        fast: "var(--transition-fast)",
        normal: "var(--transition-normal)",
        slow: "var(--transition-slow)",
      },
      transitionTimingFunction: {
        default: "var(--ease-default)",
      },
      backgroundImage: {
        primary: "var(--gradient-primary)",
      },
      height: {
        navbar: "var(--navbar-height)",
      },
      minHeight: {
        navbar: "var(--navbar-height)",
      },
      keyframes: {
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        shimmer: "shimmer var(--transition-slow) linear",
      },
    },
  },
  plugins: [],
};
