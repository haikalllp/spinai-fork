# Contributing to Mintlify Doc Updater

We love your input! We want to make contributing to Mintlify Doc Updater as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

## Local Development

1. Clone the repository:
```bash
git clone https://github.com/your-username/mintlify-doc-updater.git
cd mintlify-doc-updater
```

2. Install dependencies:
```bash
npm install
# or
yarn
```

3. Create a `.env` file:
```bash
cp .env.example .env
```

4. Start in development mode:
```bash
npm run dev
# or
yarn dev
```

## Testing

```bash
# Run tests
npm test

# Run linting
npm run lint

# Type checking
npm run check-types
```

## Pull Request Process

1. Update the README.md with details of changes to the interface
2. Update the version numbers in package.json following [SemVer](http://semver.org/)
3. Your PR will be merged once you have the sign-off of at least one maintainer

## Any contributions you make will be under the MIT Software License

In short, when you submit code changes, your submissions are understood to be under the same [MIT License](http://choosealicense.com/licenses/mit/) that covers the project. Feel free to contact the maintainers if that's a concern.

## Report bugs using GitHub's [issue tracker](https://github.com/your-org/mintlify-doc-updater/issues)

We use GitHub issues to track public bugs. Report a bug by [opening a new issue](https://github.com/your-org/mintlify-doc-updater/issues/new).

## License

By contributing, you agree that your contributions will be licensed under its MIT License. 