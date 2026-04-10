import nextConfig from "eslint-config-next";

export default [
  ...nextConfig,
  {
    settings: {
      next: {
        rootDir: ".",
      },
    },
    rules: {
      // These rules are new in eslint-config-next 16 and too strict for now
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react/no-unescaped-entities": "off",
    },
  },
];
