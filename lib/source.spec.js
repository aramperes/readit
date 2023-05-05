import { SourceBag } from "./source";
import { encodeTokenBag } from "./tokens";

describe('SourceBag', () => {
    const sampleString = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.';
    const sampleSize = 96;
    const tokens = encodeTokenBag(sampleString);
    const filePath = 'lorem.txt';

    const src = new SourceBag(filePath, tokens);

    it('holds the source code', () => {
        expect(src.code).toBe(sampleString);
    });

    it('calculates the size of the bag based on tokens', () => {
        expect(src.size).toBe(sampleSize);
    });

    it('returns the file name', () => {
        expect(src.src).toBe(filePath);
    });

    it('splits the bag into a maximum number of tokens per bag', () => {
        // Split into 5 bags of max 20
        // Note that the bags are not equal, but rather optimize spreading everything out. So it should give 1 bag of 20 and 4 bags of 19.
        const split = src.split(20);

        // Should distribute equally
        expect(split.length).toBe(5);
        expect(split[0].size).toBe(20);
        expect(split[1].size).toBe(19);
        expect(split[2].size).toBe(19);
        expect(split[3].size).toBe(19);
        expect(split[4].size).toBe(19);

        // Each source bag file path should indicate part number
        expect(split[0].src).toBe(`${filePath} (part 1 of 5)`)
        expect(split[1].src).toBe(`${filePath} (part 2 of 5)`)
        expect(split[2].src).toBe(`${filePath} (part 3 of 5)`)
        expect(split[3].src).toBe(`${filePath} (part 4 of 5)`)
        expect(split[4].src).toBe(`${filePath} (part 5 of 5)`)

        // Recombing all the tokens together
        expect(split.reduce((sum, s) => sum + s.size, 0)).toBe(sampleSize);
        expect(split.reduce((str, s) => str + s.code, '')).toBe(sampleString);
    });
});
