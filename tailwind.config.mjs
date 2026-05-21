export default {
  content: ["./index.html", "./**/*.html", "./src/**/*.js"],
  theme: {
    extend: {
      colors: {
        noxus: {
          // existing surfaces
          bg: "#0f1115",
          panel: "#151821",
          steel: "#2a2f3a",
          red: "#8b1d2c",
          ash: "#8b8f99",
          text: "#e6e6e6",
          // modern additions
          track:    "#11131a",   // top-bar wash
          hairline: "#232735",   // softer than steel; new card / pill borders
          pill:     "#1c2030",   // pill nav resting bg
          "pill-hi":"#232838",   // pill nav hover bg
          ink:      "#f4f4f6",   // stronger white for headlines
          // status fills (cell backgrounds)
          "n-bg":   "#1a2d50",
          "td-bg":  "#142d25",
          "x-bg":   "#181f38",
          "u-bg":   "#332815",
          "kr-bg":  "#2e1520",
          // status foregrounds (chip text)
          "n-fg":   "#c8dcff",
          "td-fg":  "#b6ebca",
          "x-fg":   "#c0cbe8",
          "u-fg":   "#f0c989",
          "kr-fg":  "#f3aec1",
          // weekend accent
          "we-bar": "#8b1d2c",
        },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', '"Noto Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono NF"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
