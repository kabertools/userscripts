describe('cleanupString', () => {
    test('should cleanup string by removing leading and trailing whitespaces and replacing multiple whitespaces with a single whitespace', () => {
        expect(cleanupString('  hello  ')).toBe('hello');
        expect(cleanupString('  world  ')).toBe('world');
        expect(cleanupString('  hello    world  ')).toBe('hello world');
        expect(cleanupString('  javaScript  ')).toBe('javaScript');
        expect(cleanupString('  a  ')).toBe('a');
    });

    test('should handle empty strings', () => {
        expect(cleanupString('')).toBe('');
    });
});