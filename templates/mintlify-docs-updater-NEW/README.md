# Mintlify Doc Updater

Automatically keep your [Mintlify](https://mintlify.com) documentation in sync with code changes using SpinAI. This agent watches your pull requests and automatically creates documentation updates when code changes.

## Features

- 🤖 Automatic documentation updates based on code changes
- 📚 Intelligent analysis of code and documentation relationships
- 🔄 Automatic navigation updates in `mint.json`
- 🎯 Smart prioritization of documentation updates
- 🎨 Maintains your existing documentation style
- 🏗️ Supports monorepo setups

## Quick Start

1. Create a new project:
```bash
npx create-spinai
```

2. Select `mintlify-docs-updater` from the template options.

3. Set up environment variables in `.env`:
```bash
# Edit .env with your keys:
# OPENAI_API_KEY=your-openai-key
# GITHUB_TOKEN=your-github-token
```

To get a GitHub token:
1. Go to [GitHub Settings > Developer Settings > Personal Access Tokens > Tokens (classic)](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Give it a name (e.g., "Mintlify Doc Updater")
4. Select these permissions:
   - For public repositories: `public_repo`
   - For private repositories: `repo`
   - Also select: `read:org` if you're using it with organization repositories
5. Copy the token and add it to your `.env` file

4. Configure the agent in `src/config.ts`:
```typescript
// For a standard Mintlify setup (docs in same repo)
export const defaultConfig: Required<DocConfig> = {
  docsPath: "docs",              // Path to your Mintlify docs
  isMonorepo: false,
  docsRepoOwner: "your-username",  // Your GitHub username or org
  docsRepoName: "your-repo",       // The repository name
  docsBranch: "main",
  fileTypes: [".mdx", ".md"],
  ignorePaths: ["**/node_modules/**"],
  createNewPr: true,
  labels: ["documentation"],
  styleGuide: "",
};

// For a monorepo setup (e.g., docs in apps/docs)
export const defaultConfig: Required<DocConfig> = {
  docsPath: "apps/docs",         // Adjust to your monorepo docs path
  isMonorepo: true,
  docsRepoOwner: "",
  docsRepoName: "",
  docsBranch: "main",
  fileTypes: [".mdx", ".md"],
  ignorePaths: ["**/node_modules/**"],
  createNewPr: true,
  labels: ["documentation"],
  styleGuide: "",
};

// For docs in a separate repository
export const defaultConfig: Required<DocConfig> = {
  docsPath: "docs",
  isMonorepo: false,
  docsRepoOwner: "your-org",     // Owner of the docs repo
  docsRepoName: "docs",          // Name of the docs repo
  docsBranch: "main",
  fileTypes: [".mdx", ".md"],
  ignorePaths: ["**/node_modules/**"],
  createNewPr: true,
  labels: ["documentation"],
  styleGuide: "",
};
```

5. Configure GitHub webhook:
   - Go to your repository settings
   - Add webhook: `http://your-server:3000/webhook` (use ngrok for local development)
   - Select events: "Pull requests"
   - Content type: "application/json"

6. Start the server:
```bash
npm run dev
# or
yarn dev
```

That's it! The agent will now automatically review pull requests and create documentation updates.

## Local Development with ngrok

For testing webhook functionality locally, the project includes a development setup script (`start-dev.bat` for Windows users) that automatically:

1. Checks for required dependencies (Node.js and ngrok)
2. Cleans up any existing processes using port 3000
3. Builds the project
4. Starts an ngrok tunnel to expose your local server
5. Launches the development server

To use this development environment:

```bash
# On Windows
npm run start:dev
```

This script will:
- Open an ngrok tunnel pointing to port 3000
- Start your development server
- Display the public ngrok URL you can use for GitHub webhooks

Requirements:
- Windows Terminal (recommended) or it will fall back to regular command windows
- ngrok installed (the script will attempt to install it globally if missing)

The ngrok URL (shown at http://localhost:4040) should be used in your GitHub webhook settings to allow GitHub to reach your local development server.

## Configuration

The agent accepts a simple configuration object:

```typescript
interface DocConfig {
  // Essential settings
  docsPath: string;           // Path to docs (e.g., "docs" or "apps/docs")
  isMonorepo?: boolean;       // Is this a monorepo setup?
  
  // Repository settings (optional)
  docsRepoOwner?: string;     // GitHub owner of docs repo if different
  docsRepoName?: string;      // Name of docs repo if different
  docsBranch?: string;        // Branch to update (defaults to 'main')
  
  // Documentation settings
  fileTypes?: string[];       // Doc file types (defaults to ['.mdx', '.md'])
  ignorePaths?: string[];     // Paths to ignore
  
  // PR settings
  createNewPr?: boolean;      // Create new PR vs update original
  labels?: string[];          // Labels to add to PR
  
  // Optional customization
  styleGuide?: string;        // Custom documentation style guide
}
```

### Using the Agent Directly

If you want to use the agent without the server:

```typescript
import { createDocUpdateAgent } from "mintlify-doc-updater";

const agent = createDocUpdateAgent({
  config: {
    docsPath: "docs"
  }
});

// Use the agent directly
const result = await agent({
  input: "Review pull request #123",
  externalCustomerId: "user123",
  state: {
    owner: "org",
    repo: "repo",
    pull_number: 123,
    config: {} // Will be populated from your config
  }
});
```

### Environment Variables

- `OPENAI_API_KEY` (required): Your OpenAI API key
- `GITHUB_TOKEN` (required): GitHub token with repo access
- `PORT` (optional): Server port (default: 3000)
- `SPINAI_API_KEY` (optional): SpinAI API key for monitoring and observability. Get one at [app.spinai.dev](https://app.spinai.dev)

The GitHub token needs these permissions:
- `repo` scope for private repositories
- `public_repo` scope for public repositories

### GitHub App Setup

For production use, we recommend setting up a GitHub App:

1. Create a new GitHub App
2. Configure permissions:
   - Pull requests: Read & write
   - Contents: Read & write
   - Metadata: Read-only
3. Subscribe to events:
   - Pull request
   - Pull request review
4. Install the app on your repositories
5. Use the app's credentials instead of a personal token

## How It Works

When a pull request is opened or updated, the agent:

1. Analyzes code changes to understand what functionality changed
2. Scans existing documentation structure and relationships
3. Plans necessary documentation updates
4. Generates precise, accurate documentation updates
5. Updates navigation structure in `mint.json` if needed
6. Creates a new PR with all documentation changes

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) for details.