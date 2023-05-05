import { encodeTokenBag } from "./tokens";

describe('TokenBag', () => {
    const sampleString = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.';
    const sampleSize = 96;
    const bag = encodeTokenBag(sampleString);

    it('encodes and decodes from and to string', () => {
        expect(bag.toString()).toBe(sampleString);
    });

    it('calculates the size of the bag', () => {
        expect(bag.size).toBe(sampleSize);
    });

    it('splits the bag into a maximum number of tokens per bag', () => {
        // Split into 5 bags of max 20
        // Note that the bags are not equal, but rather optimize spreading everything out. So it should give 1 bag of 20 and 4 bags of 19.
        const split = bag.split(20);

        // Should distribute equally
        expect(split.length).toBe(5);
        expect(split[0].size).toBe(20);
        expect(split[1].size).toBe(19);
        expect(split[2].size).toBe(19);
        expect(split[3].size).toBe(19);
        expect(split[4].size).toBe(19);

        // Recombing all the tokens together
        expect(split.reduce((sum, s) => sum + s.size, 0)).toBe(sampleSize);
        expect(split.reduce((str, s) => str + s.toString(), '')).toBe(sampleString);

        // All bags have actual strings from the sample
        expect(split.every(s => sampleString.includes(s.toString()))).toBe(true);
    });
});
