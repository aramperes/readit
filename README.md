*This README was generated using readit. It may not be accurate.*

# readit

## Introduction
The `readit` project is a node.js application that generates a natural language README description of a Github repository by summarizing the contents of the repository. It can be difficult for developers and maintainers to provide clear and concise documentation for their projects, especially if the project encompasses many files or is complex in nature. The purpose of `readit` is to simplify this process by automatically generating the documentation for you, highlighting important information and saving time.

## Installation
To use `readit`, you must have node.js and npm installed on your machine.
1. Clone the repository from https://github.com/aramperes/readit.git.
2. Run `npm install` to install all required dependencies including "@dqbd/tiktoken", "glob-gitignore", and "openai".
3. Set a valid OpenAI API key as an environment variable by running:
   ```
   export OPENAI_API_KEY=<your-api-key>
   ```
4. Run `node index.js <path-to-repo-root> <repo-url> <language>` to generate the README file. The `<path-to-repo-root>` should be an absolute path to the root directory of the repository, `<repo-url>` is the URL of the repository, and `<language>` is the language used in the repository.

## High-level architecture
The following code files are used in the application:
- **`index.js`**: The main file which generates the README file by summarizing the contents of the repository.
- **`LICENSE`**: A file describing the MIT license under which this software is released.
- **`package.json`**: A configuration file that specifies the metadata about the `readit` application and its dependencies.

## How to contribute
Contributions to `readit` are welcome! If you find a bug or have a suggestion for improvement, please open an issue or submit a pull request. Before contributing any changes, please ensure that you have read the `LICENSE` file and agree to its terms.

## License
This software is released under the MIT License. Please see the `LICENSE` file for more information.
