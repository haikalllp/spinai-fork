#!/usr/bin/env node
import { Command } from "commander";
import { promises as fs } from "fs";
import * as path from "path";
import degit from "degit";
import chalk from "chalk";
import prompts, { PromptObject } from "prompts";
import { execSync } from "child_process";

interface Template {
  name: string;
  description: string;
  repo: string;
}

// Easy to add new templates here
const TEMPLATES: Template[] = [
  {
    name: "default",
    description: "A basic SpinAI calculator agent",
    repo: "fallomai/spinai/templates/default",
  },
  {
    name: "minimal",
    description: "Minimal setup with no actions or agents created",
    repo: "fallomai/spinai/templates/minimal",
  },
  {
    name: "Basic MPC Agent",
    description:
      "An AI Agent setup with a basic MPC configuration for executing actions",
    repo: "fallomai/spinai/templates/basic-mcp-agent",
  },
  {
    name: "Vercel Serverless Agent",
    description:
      "A serverless agent template for Vercel with a basic calculator agent",
    repo: "fallomai/spinai/templates/vercel-serverless",
  },
  {
    name: "github reviewer",
    description: "A GitHub pull request code review agent",
    repo: "fallomai/spinai/templates/github-code-review-agent",
  },
  {
    name: "Github MPC Agent",
    description:
      "An AI Agent that uses @smithery-ai/github's MPC to execute actions without needing any custom code at all",
    repo: "fallomai/spinai/templates/github-mcp-agent",
  },
  {
    name: "Mintlify docs updater",
    description:
      "An agent that automatically updates Mintlify documentation based on PRs",
    repo: "fallomai/spinai/templates/mintlify-docs-updater",
  },
  // Add new templates here like:
  // {
  //   name: "discord-bot",
  //   description: "Template for creating Discord bots",
  //   repo: "username/repo-name/path/to/template"
  // }
];

async function getProjectDetails(suggestedName?: string) {
  const questions: PromptObject[] = [];

  if (!suggestedName) {
    questions.push({
      type: "text",
      name: "projectName",
      message: "What is your project named?",
      initial: "my-spinai-app",
    } as PromptObject);
  }

  questions.push({
    type: "select",
    name: "template",
    message: "Which template would you like to use?",
    choices: TEMPLATES.map((t) => ({
      title: t.name,
      description: t.description,
      value: t.name,
    })),
    initial: 0,
  } as PromptObject);

  const response = await prompts(questions, {
    onCancel: () => {
      console.log(chalk.red("✖") + " Operation cancelled");
      process.exit(1);
    },
  });

  const selectedTemplate = TEMPLATES.find((t) => t.name === response.template);
  if (!selectedTemplate) {
    console.error(chalk.red("\n✖ Invalid template selected"));
    process.exit(1);
  }

  return {
    projectName: suggestedName || response.projectName,
    template: selectedTemplate,
  };
}

async function setupEnvFile(projectRoot: string) {
  try {
    const envExamplePath = path.join(projectRoot, ".env.example");
    const envPath = path.join(projectRoot, ".env");

    // Check if .env.example exists
    try {
      await fs.access(envExamplePath);
    } catch {
      return; // No .env.example file, skip this step
    }

    // Copy .env.example to .env
    await fs.copyFile(envExamplePath, envPath);
    console.log(chalk.green("✓") + " Created .env file from template");
  } catch (error) {
    console.log(chalk.yellow("⚠") + " Could not set up .env file");
  }
}

async function installDependencies(projectRoot: string) {
  console.log(chalk.yellow("\n⚡ Installing dependencies...\n"));

  const command = "npm install";
  try {
    execSync(command, {
      cwd: projectRoot,
      stdio: "inherit",
    });
    return true;
  } catch (error) {
    console.error(chalk.red("\n✖ Failed to install dependencies"));
    return false;
  }
}

async function changeDirectory(projectPath: string) {
  try {
    process.chdir(projectPath);
    return true;
  } catch (error) {
    console.log(chalk.yellow("  ⚠ Could not change to project directory"));
    return false;
  }
}

new Command("create-spinai-app")
  .version("0.1.0")
  .arguments("[project-name]")
  .option("-t, --template <template>", "Template to use")
  .action(async (name, options) => {
    console.log(chalk.bold("\n🤖 Creating a new SpinAI app...\n"));

    // If template is not provided via CLI, or name is missing, prompt for details
    const details = await getProjectDetails(name);
    const template = options.template
      ? TEMPLATES.find((t) => t.name === options.template)
      : details.template;

    if (!template) {
      console.error(chalk.red(`\n✖ Template "${options.template}" not found`));
      console.log("\nAvailable templates:");
      TEMPLATES.forEach((t) => {
        console.log(chalk.cyan(`  ${t.name}: `) + t.description);
      });
      process.exit(1);
    }

    const projectName = details.projectName;
    const root = path.resolve(projectName);

    // Ensure the directory is empty or doesn't exist
    try {
      const stats = await fs.stat(root);
      if (stats.isDirectory()) {
        const files = await fs.readdir(root);
        if (files.length > 0) {
          console.log(chalk.red("Error: Directory is not empty"));
          process.exit(1);
        }
      }
    } catch (error) {
      // Directory doesn't exist, which is fine
    }

    console.log(chalk.cyan(`\n📁 Creating project in ${chalk.bold(root)}`));
    console.log(
      chalk.cyan(`🎨 Using template: ${chalk.bold(template.name)}\n`)
    );

    try {
      // Create project directory
      await fs.mkdir(root, { recursive: true });

      console.log(chalk.yellow("⚡ Downloading template..."));

      // Clone the template from GitHub using the repo from config
      const emitter = degit(template.repo, {
        cache: false,
        force: true,
        verbose: true,
      });

      await emitter.clone(root);

      // Update package.json
      const pkgPath = path.join(root, "package.json");
      try {
        const pkgContent = await fs.readFile(pkgPath, "utf8");
        const pkg = JSON.parse(pkgContent);
        pkg.name = projectName;
        await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2));
      } catch (error) {
        // package.json doesn't exist, which is fine for some templates
      }

      // Set up environment variables
      await setupEnvFile(root);

      // Install dependencies
      const installSuccess = await installDependencies(root);

      // Change to project directory
      const cdSuccess = await changeDirectory(root);

      console.log(chalk.green("\n✨ Project created successfully!\n"));

      console.log(chalk.bold("Next steps:"));

      // First, change directory
      console.log(chalk.cyan("  1. Change to project directory:"));
      console.log(chalk.cyan(`     cd ${projectName}\n`));

      // Then set up API key
      console.log(
        chalk.cyan("  2. Set up your ENV variables (read the README.MD):")
      );
      console.log(
        chalk.cyan(
          "     • Get your API key from https://platform.openai.com/api-keys"
        )
      );
      console.log(
        chalk.cyan(
          "     • Open .env and replace 'your-openai-api-key' with your actual key\n"
        )
      );

      // Finally, start the dev server
      console.log(chalk.cyan("  3. Start the development server:"));
      console.log(chalk.cyan("     npm run dev\n"));

      console.log(chalk.bold("Resources:"));
      console.log(
        chalk.blue("  📚 Documentation: ") +
          chalk.underline("https://docs.spinai.dev")
      );
      console.log(
        chalk.blue("  💬 Discord: ") +
          chalk.underline("https://discord.gg/BYsRx36qR3")
      );
      console.log(
        chalk.blue("  📊 Monitor your agents: ") +
          chalk.underline("https://app.spinai.dev\n")
      );
    } catch (error) {
      console.error(chalk.red("\n✖ Failed to create project:"), error);
      process.exit(1);
    }
  })
  .parse();
