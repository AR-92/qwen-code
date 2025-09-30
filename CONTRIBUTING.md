# How to Contribute

## Pull Request Guidelines

#### 1. Link to an Existing Issue
All PRs should be linked to an existing issue in our tracker.

#### 2. Keep It Small and Focused
We favor small, atomic PRs that address a single issue or add a single, self-contained feature.

#### 3. Use Draft PRs for Work in Progress
Use GitHub's **Draft Pull Request** feature if you'd like to get early feedback.

#### 4. Ensure All Checks Pass
Before submitting your PR, ensure that all automated checks are passing by running `npm run preflight`.

#### 5. Update Documentation
If your PR introduces a user-facing change, you must also update the relevant documentation.

## Development Setup

### Prerequisites:
1.  **Node.js** version ~20.19.0 for development

### Build Process
```bash
npm install
npm run build
```

### Running
```bash
npm start
```

### Running Tests
```bash
npm run test        # Unit tests
npm run test:e2e    # Integration tests
npm run preflight   # Full preflight check
```