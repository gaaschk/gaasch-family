import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/src/mocks/setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  transform: {
    "^.+\\.[tj]sx?$": ["ts-jest", { diagnostics: false }],
  },
  transformIgnorePatterns: ["node_modules/(?!(msw|@mswjs|until-async)/)"],
  testPathIgnorePatterns: ["/node_modules/", "/.next/", "/.claude/", "/e2e/"],
};

export default config;
