const { Configuration, OpenAIApi } = require("openai");
const fs = require('fs').promises;
const { glob } = require('glob-gitignore');
const path = require("path");
const { encoding_for_model } = require("@dqbd/tiktoken");

const args = [...process.argv].splice(2);
if (args.length < 3) {
    console.error('Syntax: node . <path to repo> <url of repo> <primary language>');
    console.error('Example: node . ./ github.com/aramperes/readit nodejs');
    process.exit(2);
}

const [repoPath, repoUrl, repoLanguage] = args;

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const codeTokens = (code) => {
    const enc = encoding_for_model("gpt-3.5-turbo");
    const tokens = enc.encode(code).length;
    enc.free();
    return tokens;
}

function chunkSubstr(str, size) {
    const numChunks = Math.ceil(str.length / size)
    const chunks = new Array(numChunks)
    for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
        chunks[i] = str.substr(o, size)
    }
    return chunks
}

async function createReadme(repoPath, repoUrl, repoLanguage) {
    // Check if there is a gitignore file
    const gitignore = (await fs.readFile(path.join(repoPath, '.gitignore'))).toString('utf-8')
        .split('\n')
        .map(p => p.trim())
        .filter(p => !!p);

    const tokenLimit = 4000;

    // Read all files in repo, and estimate number of tokens needed for summarizing each file.
    const filePaths = (await glob(['**/*'], { cwd: repoPath, nodir: true, ignore: [...gitignore, 'README.md', '*.lock'] }));
    let fileSources = (await Promise.all(
        filePaths.map(src =>
        (fs.readFile(path.join(repoPath, src))
            .then(buf => buf.toString('utf-8'))
            .then(code => { return { src, code } })))))
        .map(({ src, code }) => {
            return { src, code, tokens: codeTokens(code) }
        });

    // Total tokens that will be returned. This will help us get a ratio of how many tokens to ask back as a summary.
    const totalCodeTokens = fileSources.reduce((acc, { tokens }) => acc + tokens, 0);

    // Split files into chunks if they surpass the individual message limit
    fileSources = fileSources.flatMap(({ src, code, tokens }) => {
        const chunksNeeded = Math.ceil(tokens / tokenLimit);
        if (chunksNeeded > 1) {
            // Split code in equal number of parts
            const chunkSize = Math.ceil(code.length / chunksNeeded);
            const chunks = chunkSubstr(code, chunkSize);
            return chunks.map((code, i) => { return { src: `${src} (part ${i + 1} of ${chunks.length})`, code, tokens: codeTokens(code) } })
        } else {
            return [{ src, code, tokens }];
        }
    });

    const filePrompts = fileSources.map(({ src, code, tokens }) => {
        const max = Math.max(10, Math.floor(tokens / totalCodeTokens * tokenLimit * 0.75));
        const content = `
        Summarize the purpose of this (likely ${repoLanguage}) code using pseudo-code and important snippets.
        If this is code, list (using bullet points) each class and function with a brief explanation of the purpose and logic, its inputs (function parameters), and what it outputs. Do not document external functions and classes from third-party libraries. Also, tell me which language the code is written in, if it is code. If it's not code, tell me it is not code.
        If this code requires external configuration (command-line or environment variables), fully describe how to configure it.
        For files that are not code, just return 1 sentence that explains what the file is.
        Maximize the number of words up to ${max} words, while staying true to the code.\nFile name: ${src}\n${code}`;

        return {
            prompt: {
                role: "user",
                content
            },
            src,
            tokens,
            max
        }
    });

    const fileSummaries = [];
    for (let filePrompt of filePrompts) {
        const { prompt, src, tokens, max } = filePrompt;

        console.log(`Summarizing ${src}... (${tokens} tokens, return max ${max})`);
        const completion = await openai.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: [prompt]
        });
        const summary = completion.data.choices[0].message.content.trim();
        const summarySize = codeTokens(summary);
        console.log(summary, '\n\n', `[Summary has ${summarySize} tokens]`);
        console.log('\n\n\n');

        fileSummaries.push({
            src,
            summary
        });
    }

    const defaultPrompts = [
        `Your purpose is to generate a real-world README file for a GitHub project, in Markdown, that explains the purpose of the following project, which will be described to you file by file.
        The README should include reason why you would use this package, how to install and run it, and also add a bit about high-level architecture. Include shields.io badges relevant to the project.
        You must respond with a full markdown README  that looks like it would be the public GitHub README documenting the project, maximizing the number of words, and separating into these sections: Introduction, Installation, High-level architecture, How to contribute, License.
        Title the README with the name of the project. Generate at least 3 paragraphs introducing the project with why someone might want to use it.
        In the high-level architecture, only list code files. Do not list files you have not been told about.
        In the architecture, do not list files that are not code, do not list the license, or documentation, or dependency-related files, etc.
        Do not invent instructions you have not been told about in the summaries of the code.
        If the repo has a file with a list of dependencies (package.json or equivalent), do not list the dependencies in the README. Do not list or describe config files like JSON/XML/TOML etc.
        If the project has a license, tell the users to read the file directly and do not explain the details of the license in the README.`,
        `The project you are generating this README for is written in ${repoLanguage} hosted at ${repoUrl}. Here is a high-level summary of each file in the repo. The first line of each message is the name of the file. Here we go:`,
    ]
        .map(content => { return { role: "system", content } });

    const codePrompts = fileSummaries
        .map(({ src, summary }) => `# ${src}\n${summary}`)
        .map(content => { return { role: "user", content } });

    const messages = [...defaultPrompts, ...codePrompts];

    console.log(messages);
    const completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages
    });
    console.log(completion.data.choices[0].message.content);
}


// createReadme('/home/amperes/dev/onetun', 'github.com/aramperes/onetun', 'rust');
// createReadme('/home/amperes/dev/readit', 'github.com/aramperes/readit', 'nodejs');
createReadme(repoPath, repoUrl, repoLanguage);
