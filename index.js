const { Configuration, OpenAIApi } = require("openai");
const fs = require('fs').promises;
const { glob } = require('glob-gitignore');
const path = require("path");
const { encoding_for_model } = require("@dqbd/tiktoken");


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
        Summarize the purpose of this (likely ${repoLanguage}) code using pseudo-code (do not return any actual code).
        Be concise without leaving important details. Make the code sound interesting. If this code requires external configuration (command-line or environment variables), fully describe how to configure it.
        For things that do not look like ${repoLanguage} code, just return 1 sentence that explains what the file is.
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
        Your job is to return a full markdown README in your response that looks like it would be the public GitHub README documenting the project, maximizing the number of words, and separating into multiple sections. Title the README with the name of the project. Generate at least 2000 words.`,
        `The project you are generating this README for is written in ${repoLanguage} hosted at ${repoUrl}. Here is a high-level summary of each source file. The first line of each message is the name of the file. Here we go:`,
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
createReadme('/home/amperes/dev/readit', 'github.com/aramperes/readit', 'nodejs');
