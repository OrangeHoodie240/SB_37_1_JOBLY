const { sqlForPartialUpdate } = require('./sql');


describe('test sqlForPartialUpdate', ()=>{
    beforeEach(()=>{
        testData = {
                'firstName': 'Bender', 
                'lastName': 'The Robot'    
                };
        testMap = {
            'firstName': "first_name", 
            'lastName': 'last_name'
        }
    }); 
    test('Should take object and map of keys to columns and return expected result', ()=>{
        const {setCols, values} = sqlForPartialUpdate(testData, testMap); 
        expect(setCols).toEqual(
            '"first_name"=$1, "last_name"=$2'
        );

        expect(values).toEqual([
            'Bender', 
            'The Robot'
        ]);
    });

    test('should throw error if data empty', ()=>{
        expect(()=>{
            sqlForPartialUpdate({}, {});
        }).toThrowError();
    });
});