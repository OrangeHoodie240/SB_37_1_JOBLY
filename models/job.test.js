const Job = require('./job'); 
const db = require('../db');

const {
    commonBeforeAll,
    commonBeforeEach,
    commonAfterEach,
    commonAfterAll,
  } = require("./_testCommon");
const { BadRequestError } = require('../expressError');
  
  beforeAll(commonBeforeAll);
  beforeEach(commonBeforeEach);
  afterEach(commonAfterEach);
  afterAll(commonAfterAll);

describe('creates Job', ()=>{
    test('should create job', async function(){
        const expectation = {
            'id': expect.any(Number), 
            'title': 'Crabby Patty Cook', 
            'salary': 25, 
            'equity': '0.25', 
            'company_handle': 'c1'
        };
        const job = await Job.create({title: 'Crabby Patty Cook', salary: 25, equity: .25, companyHandle: 'c1'});
        expect(job).toEqual(expectation);

        const id = job.id; 
        let row = await db.query(`SELECT * FROM jobs WHERE id=$1`, [id]);
        row = row.rows[0];
        expect(row).toEqual(expectation);
    });


    test('should throw error on bad data', async ()=>{
        //company handle c5000 does not exist
        await expect(Job.create({title: 'Crabby Patty Cook', salary: 25, equity: .25, companyHandle: 'c5000'}))
            .rejects
            .toThrow(BadRequestError); 

    });
});

describe('test get', ()=>{
    const job = {title: 'Crabby Patty Cook', salary: 25, equity: .25, companyHandle: 'c1'};
    let row = null; 
    beforeEach(async ()=>{
        row = await Job.create(job);
    })
    test('works as intended', async ()=>{
        const result = await Job.get(row.id); 
        expect(result.title).toEqual('Crabby Patty Cook'); 
        expect(result.id).toEqual(row.id);
    })
});

describe('test getAll', ()=>{
    test('gets all jobs', async ()=>{
        await Job.create({title: 'Crabby Patty Cook', salary: 25, equity: .25, companyHandle: 'c1'});
        await Job.create({title: 'Chum Bucket Cook', salary: 25, equity: .25, companyHandle: 'c2'});

        const jobs = await Job.getAll();
        expect(jobs.length).toEqual(2);
    });
});


describe('test getWhere', ()=>{
    beforeEach(async function(){
        const job1 = {title: 'Beard Squire', salary: 800, equity: 0, companyHandle:'c1'};
        const job2 = {title: 'Beard Knight', salary: 1000, equity: .1, companyHandle:'c1'};
        const job3 = {title: 'Beard Commander', salary: 1200, equity: .2, companyHandle:'c1'};

        const job4 = {title: 'Beard Apprentice', salary: 800, equity: undefined, companyHandle:'c1'};
        const job5 = {title: 'Beard Mage', salary: 1000, equity: .1, companyHandle:'c1'};
        const job6 = {title: 'Beard Arch Fire Mage', salary: 1200, equity: .2, companyHandle:'c1'};
        
        const job7 = {title: 'Beard Squire', salary: 700, equity: 0, companyHandle: 'c2'};
        const job8 = {title: 'Beard Squire', salary: 2000, equity: .9, companyHandle: 'c3'};
        const job9 = {title: 'Beard Squire', salary: 2200, equity: .9, companyHandle: 'c3'};
        const job10 = {title: 'Beard Commander', salary: 2000, equity: .9, companyHandle: 'c2'};

        await Promise.all([
            Job.create(job1),
            Job.create(job2),
            Job.create(job3),
            Job.create(job4),
            Job.create(job5),
            Job.create(job6),
            Job.create(job7), 
            Job.create(job8), 
            Job.create(job9),
            Job.create(job10)     
        ]);
    });

    test('should filter by minSalary', async ()=>{
        let jobs = await Promise.all([
                                        Job.getWhere({minSalary: 800}), 
                                        Job.getWhere({minSalary: 1000}), 
                                        Job.getWhere({minSalary: 1200}),
                                        Job.getWhere({minSalary: 700})

        ]); 
        expect(jobs[0].length).toBe(9);
        expect(jobs[1].length).toBe(7); 
        expect(jobs[2].length).toBe(5); 
        expect(jobs[3].length).toBe(10); 
    });

    test('should filter by title', async ()=>{
        let jobs = await Promise.all([
            Job.getWhere({title: 'Beard Commander'}), 
            Job.getWhere({title: 'Beard Squire'}), 
        ]);

        expect(jobs[0].length).toBe(2);
        expect(jobs[1].length).toBe(4);
    });

    test('should filter by hasEquity', async function(){
        const jobs = await Promise.all([
            Job.getWhere({hasEquity: true}), 
            Job.getWhere({hasEquity: undefined})
        ]);

        expect(jobs[0].length).toBe(7); 
        expect(jobs[1].length).toBe(10);
    });

    test('should filter by all fields', async ()=>{
        const jobs = await Job.getWhere({title: 'Beard Squire', minSalary: 2100, hasEquity: true});
        expect(jobs.length).toBe(1); 
    });

    test('should filter by minSalary and hasEquity', async ()=>{
        const jobs = await Job.getWhere({minSalary: 1200, hasEquity: true});
        expect(jobs.length).toBe(5);
    });

    test('should filter by minSalary and title', async()=>{
        const jobs = await Job.getWhere({title: 'Beard Squire', minSalary: 2000}); 
        expect(jobs.length).toBe(2);
    })

    test('should filter by title and hasEquity', async()=>{
        const jobs = await Job.getWhere({title: 'Beard Squire', hasEquity: true}); 
        expect(jobs.length).toBe(2);
    });
});

describe('test update', ()=>{
    test('updates as expected', async ()=>{
        const row = await Job.create({title: 'Crabby Patty Cook', salary: 25, equity: .25, companyHandle: 'c1'});
        
        // all valid fields updated
        let result = await Job.update({id: row.id, title: 'Iron Man', salary: 200, equity: .5}); 
        let expectation = {id: row.id, title: 'Iron Man', salary: 200, equity: '0.5', 'company_handle': 'c1'};
        expect(result).toEqual(expectation);

        result = await db.query(`SELECT * FROM jobs WHERE id=${result.id}`); 
        result = result.rows[0]; 
        expect(result).toEqual(expectation);

        // only title updated
        result = await Job.update({id: row.id, title: 'Mustached Man'}); 
        expectation = {id: row.id, title: 'Mustached Man', salary: 200, equity: '0.5', 'company_handle': 'c1'};
        expect(result).toEqual(expectation);

        result = await db.query(`SELECT * FROM jobs WHERE id=${result.id}`); 
        result = result.rows[0]; 
        expect(result).toEqual(expectation);


        // only salary updated
        result = await Job.update({id: row.id, salary: 400}); 
        expectation = {id: row.id, title: 'Mustached Man', salary: 400, equity: '0.5', 'company_handle': 'c1'};
        expect(result).toEqual(expectation);

        result = await db.query(`SELECT * FROM jobs WHERE id=${result.id}`); 
        result = result.rows[0]; 
        expect(result).toEqual(expectation);

        // only equity updated
        result = await Job.update({id: row.id, equity: .6}); 
        expectation = {id: row.id, title: 'Mustached Man', salary: 400, equity: '0.6', 'company_handle': 'c1'};
        expect(result).toEqual(expectation);

        result = await db.query(`SELECT * FROM jobs WHERE id=${result.id}`); 
        result = result.rows[0]; 
        expect(result).toEqual(expectation);

        // all but title updated
        result = await Job.update({id: row.id, salary: 500, equity: .7}); 
        expectation = {id: row.id, title: 'Mustached Man', salary: 500, equity: '0.7', 'company_handle': 'c1'};
        expect(result).toEqual(expectation);

        result = await db.query(`SELECT * FROM jobs WHERE id=${result.id}`); 
        result = result.rows[0]; 
        expect(result).toEqual(expectation);


        // all but salary updated
        result = await Job.update({id: row.id,  title: 'Beard Guard', equity: .8}); 
        expectation = {id: row.id, title: 'Beard Guard', salary: 500, equity: '0.8', 'company_handle': 'c1'};
        expect(result).toEqual(expectation);

        result = await db.query(`SELECT * FROM jobs WHERE id=${result.id}`); 
        result = result.rows[0]; 
        expect(result).toEqual(expectation);

         // all but equity updated
         result = await Job.update({id: row.id,  title: 'Beard Lord', salary: 900}); 
         expectation = {id: row.id, title: 'Beard Lord', salary: 900, equity: '0.8', 'company_handle': 'c1'};
         expect(result).toEqual(expectation);
 
         result = await db.query(`SELECT * FROM jobs WHERE id=${result.id}`); 
         result = result.rows[0]; 
         expect(result).toEqual(expectation);
    });

    test('rejects bad data', async ()=>{
        const row = await Job.create({title: 'Crabby Patty Cook', salary: 25, equity: .25, companyHandle: 'c1'});
        await expect(Job.update({id: row.id, equity: 300}))
            .rejects    
            .toThrow(BadRequestError); 
    });
});

describe('test removes item', ()=>{
    test('removes existing item as intended', async ()=>{
        const row = await Job.create({title: 'Crabby Patty Cook', salary: 25, equity: .25, companyHandle: 'c1'});
        let beforeLength = await Job.getAll(); 
        beforeLength = beforeLength.length; 

        const {id: removedId} = await Job.remove(row.id);
        let afterLength = await Job.getAll(); 
        afterLength = afterLength.length; 

        expect(removedId).toBe(row.id); 
        expect(afterLength).toBe(beforeLength - 1);
    });

    test('throws error if row not found', async ()=>{
        await expect(Job.remove(1))
            .rejects
            .toThrow(BadRequestError);
    });
});


describe('test getByCompanyHandle', ()=>{
    test('should work as intended', async ()=>{
        const job1 = {title: 'Beard Squire', salary: 200, equity: '0', companyHandle: 'c1'};
        const job2 = {title: 'Beard Knight', salary: 400, equity: '0.2', companyHandle: 'c1'};
        const job3 = {title: 'Beard Squire', salary: 800, equity: '0.4', companyHandle: 'c1'};

        const job4 = {title: 'Beard Squire', salary: 200, equity: '0', companyHandle: 'c2'};
        const job5 = {title: 'Beard Mage', salary: 400, equity: '0.2', companyHandle: 'c2'};
        const job6 = {title: 'Beard Fire Lord', salary: 800, equity: '0.3', companyHandle: 'c2'};

        const job7 = {title: 'Beard Thief', salary: 200, equity: '0', companyHandle: 'c3'};
        const job8 = {title: 'Beard Rogue', salary: 400, equity: '0.2', companyHandle: 'c3'};
        const job9 = {title: 'Beard Bandit Lord', salary: 800, equity: '0.4', companyHandle: 'c3'};


        await Promise.all([
           Job.create(job1),
           Job.create(job2), 
           Job.create(job3), 
           Job.create(job4), 
           Job.create(job5), 
           Job.create(job6), 
           Job.create(job7), 
           Job.create(job8), 
           Job.create(job9) 
        ]);
        
        const allJobs = [job1, job2, job3, job4, job5, job6, job7, job8, job9]; 
        for(let job of allJobs){
            delete job.companyHandle; 
            job.id = expect.any(Number);
        }        

        const jobs1 = await Job.getByCompanyHandle('c1'); 
        expect(jobs1).toEqual([job1, job2, job3]);

        
        const jobs2 = await Job.getByCompanyHandle('c2'); 
        expect(jobs2).toEqual([job4, job5, job6]);

        
        const jobs3 = await Job.getByCompanyHandle('c3'); 
        expect(jobs3).toEqual([job7, job8, job9]);
    });
});

                       