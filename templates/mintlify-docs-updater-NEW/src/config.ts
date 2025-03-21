import { DocConfig, DocUpdateConfig } from "./types";

export const defaultConfig: Required<DocConfig> = {
  docsPath: "apps/docs",
  isMonorepo: true,
  docsRepoOwner: "",
  docsRepoName: "",
  docsBranch: "main",
  fileTypes: [".mdx", ".md"],
  ignorePaths: ["**/node_modules/**", "**/.git/**"],
  createNewPr: true,
  labels: ["documentation"],
  styleGuide: "",
};

export function createFullConfig(
  userConfig: Partial<DocConfig>
): DocUpdateConfig {
  const config = { ...defaultConfig, ...userConfig };

  return {
    docsPath: config.docsPath,
    docsRepo: config.docsRepoOwner
      ? {
          owner: config.docsRepoOwner,
          repo: config.docsRepoName || "",
          branch: config.docsBranch,
          monorepo: config.isMonorepo,
        }
      : undefined,
    matchRules: {
      docExtensions: config.fileTypes,
      ignorePatterns: config.ignorePaths,
    },
    prConfig: {
      updateOriginalPr: !config.createNewPr,
      branchPrefix: "docs/update",
      titleTemplate: "📚 Update documentation for {prTitle}",
      bodyTemplate: `This PR updates documentation to reflect changes in #{prNumber}

## Changes
{changes}

This PR was automatically generated using [SpinAI](https://github.com/Fallomai/spinai).`,
      labels: config.labels,
    },
    llmConfig: config.styleGuide
      ? {
          styleGuide: config.styleGuide,
          temperature: 0.3,
        }
      : undefined,
  };
}
