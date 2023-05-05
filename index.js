import { Configuration, OpenAIApi } from "openai";
import { codeSummaryPrompt, readmePrompt, MODEL_NAME, SUMMARY_PROMPT_LIMIT, MODEL_LIMIT } from "./lib/prompt.js";
import { readSourceFiles } from "./lib/source.js";
import { encodeSize } from "./lib/tokens.js";

const README_PROMPT_SIZE_ESTIMATE = encodeSize(readmePrompt('example', 'github.com/abc/def-ghi-jkl'));
const README_RESPONSE_ESTIMATE = 1000;  // We want about 1000 tokens back for a nice README.
const README_PROMPT_BUFFER = README_PROMPT_SIZE_ESTIMATE + README_RESPONSE_ESTIMATE;

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

async function createReadme(repoPath, repoUrl, repoLanguage) {
    let fileSources = await readSourceFiles(repoPath);

    if (!fileSources.length) {
        console.error('No useful source files to summarize.');
        process.exit(1);
    }

    // Split source files to prevent going over limit of individual summaries:
    fileSources = fileSources.flatMap((src) => src.split(SUMMARY_PROMPT_LIMIT));

    // How many tokens we want to reduce the source code to:
    const targetTokens = MODEL_LIMIT - README_PROMPT_BUFFER;

    // How many tokens the raw source code has:
    const totalSourceTokens = fileSources.reduce((sum, src) => sum + src.size, 0);

    console.log('Project source code is a total of', totalSourceTokens, 'tokens', 'to be summarized to', targetTokens, 'tokens')

    const filePrompts = fileSources.map((src) => {
        const expectedResponseSize = Math.floor(targetTokens * (src.size / totalSourceTokens));
        const content = codeSummaryPrompt(repoLanguage, src.src, src.code, expectedResponseSize);

        return {
            prompt: {
                role: "user",
                content
            },
            src,
            maxTokens: expectedResponseSize
        }
    });

    const fileSummaries = [];
    for (let filePrompt of filePrompts) {
        const { prompt, src, maxTokens } = filePrompt;

        let summary;
        if (maxTokens <= 25) {
            summary = `This is a small file with path ${src.src}`;
        } else {
            console.log(`Summarizing ${src.src}... (${src.size} tokens, return max ${maxTokens})`);

            const completion = await openai.createChatCompletion({
                model: MODEL_NAME,
                messages: [prompt],
                max_tokens: maxTokens
            });

            summary = completion.data.choices[0].message.content.trim();
            const summarySize = encodeSize(summary);
            console.log(summary, '\n\n', `[Summary has ${summarySize} tokens]`);
            console.log('\n\n\n');
        }

        fileSummaries.push({
            src: src.src,
            summary
        });
    }

    // Generate README prompt based on code summaries.

    const defaultPrompts = [readmePrompt(repoLanguage, repoUrl)].map(content => { return { role: "system", content } });

    const codePrompts = fileSummaries
        .map(({ src, summary }) => `# ${src}\n${summary}`)
        .map(content => { return { role: "user", content } });

    const defaultPromptSize = defaultPrompts.reduce((sum, { content }) => (sum + encodeSize(content)), 0);
    const totalCodePromptSize = codePrompts.reduce((sum, { content }) => (sum + encodeSize(content)), 0);

    console.log('\n\nSummarized', totalSourceTokens, 'source tokens into', totalCodePromptSize, 'tokens to generate the readme (plus', defaultPromptSize, 'for README base prompt)\n\n');

    const responseBuffer = MODEL_LIMIT - defaultPromptSize - totalCodePromptSize;
    if (responseBuffer < 100) {
        console.error('Unexpectedly did not leave enough room for a README response:', responseBuffer, 'tokens left');
        process.exit(1);
    }

    const messages = [...defaultPrompts, ...codePrompts];
    console.log('Generating README for', repoUrl, '...\n\n');

    const completion = await openai.createChatCompletion({
        model: MODEL_NAME,
        messages
    });

    // debugging output
    console.log(completion.data, '\n\n');

    // print the readme
    console.log('*This README was generated using readit. It may not be accurate.*\n');
    console.log(completion.data.choices.reduce((acc, choice) => (acc + choice.message.content), ''));
}

// Entrypoint
createReadme(repoPath, repoUrl, repoLanguage);
