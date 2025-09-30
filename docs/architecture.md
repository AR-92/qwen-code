# Qwen Code Architecture Overview

## Core components

Qwen Code is primarily composed of two main packages:

1.  **CLI package (`packages/cli`):**
    - **Purpose:** Contains the user-facing portion of Qwen Code, such as handling the initial user input, presenting the final output, and managing the overall user experience.

2.  **Core package (`packages/core`):**
    - **Purpose:** Acts as the backend for Qwen Code. It receives requests from `packages/cli`, orchestrates interactions with the configured model API, and manages the execution of available tools.

3.  **Tools (`packages/core/src/tools/`):**
    - **Purpose:** Individual modules that extend the capabilities of the model, allowing it to interact with the local environment.

## Interaction Flow

1.  **User input:** The user types a prompt or command into the terminal.
2.  **Request to core:** `packages/cli` sends the user's input to `packages/core`.
3.  **Request processed:** The core package constructs an appropriate prompt for the configured model API and sends it to the model API.
4.  **Model API response:** The model API processes the prompt and returns a response.
5.  **Tool execution (if applicable):** When the model API requests a tool, the core package executes it.
6.  **Response to CLI:** The core package sends the final response back to the CLI package.
7.  **Display to user:** The CLI package formats and displays the response to the user.