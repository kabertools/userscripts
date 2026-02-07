describe('DescrGen', () => {
    test('should generate description file from various inputs', () => {
        const descrGen = new DescrGen(79);

        descrGen.addSeparator('=');
        descrGen.addCenterLine('This is a test description file.');
        descrGen.addSeparator('=');

        descrGen.addLine('');
        descrGen.addLine('Normal line');
        descrGen.addLine('');

        descrGen.addPadRight('Field1', 20, '.', ': ', 'Value1');
        descrGen.addPadRight('LongerFieldName', 20, '.', ': ', 'Value2');

        descrGen.addLine('');

        descrGen.addSeparator();

        expect(descrGen.generate()).toBe(`===============================================================================
                       This is a test description file.
===============================================================================

Normal line

Field1..............: Value1
LongerFieldName.....: Value2

-------------------------------------------------------------------------------`);
    });
});
