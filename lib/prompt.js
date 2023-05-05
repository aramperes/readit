/**
 * The name of the OpenAI chat completion model to use.
 */
export const MODEL_NAME = 'gpt-3.5-turbo';

export const MODEL_LIMIT = 4096;
export const SUMMARY_PROMPT_LIMIT = 2048;

export const codeSummaryPrompt = (language, file, code, targetTokens) => {
    return `
    Explain this (likely ${language}) code using pseudo-code and showing important snippets.
    If the name or contents look like a configuration for a tool in JSON or XML, it is NOT code.
    If this is code, infer the purpose and explain with as many details.
    If this is code, maximize information to cram in ${Math.ceil(targetTokens * 0.75)} words.
    If this is code, list (using bullet points) each class and function with a brief explanation of the purpose and logic, its inputs (function parameters), and what it outputs.
    Do not document external functions and classes from third-party libraries. If it's not code, say it is not code.
    If the code requires external configuration (command-line or environment variables), fully describe how to configure it. If there are command-line arguments, show example usage.
    For files that are not code, return 1 sentence that explains what the file is.
    If it is a license, say the name of the license.
    \nFile name: ${file}\n${code}
    `;
}

export const readmePrompt = (language, url) => {
    return `
    Use your prior knowledge of how typical GitHub READMEs look like in big open-source projects.
    Your purpose is to generate a real-world README file for a GitHub project, in Markdown, that explains the purpose of the following project, which will be described to you file by file.
    The README should include reason why you would use this package, how to install and run it, and also add a bit about high-level architecture. Include shields.io badges relevant to the project.
    You must respond with a full markdown README  that looks like it would be the public GitHub README documenting the project, maximizing the number of words, and separating into these sections: Introduction, Installation, High-level architecture, How to contribute, License.
    Title the README with the name of the project. Generate at least 3 paragraphs introducing the project with why someone might want to use it.
    In the high-level architecture, do not list files or exact code snippets. Do not assume the existence files that are not listed to you.
    In the architecture, do not list files that are not code, do not list the license, or documentation, or dependency-related files, etc.
    Do not invent installation instructions you have not been told about in the summaries of the code.
    If the repo has a file with a list of dependencies (package.json or equivalent), do not list the dependencies in the README. Do not list or describe config files like JSON/XML/TOML etc.
    If the project has a license, tell the users to read the file directly and do not explain the details of the license in the README.
    The project you are generating this README for is written in ${language} hosted at ${url}.
    Here is the pseudo-code or description of each file in the repo. The first line of each message is the name of the file.
    Here we go:`
}

