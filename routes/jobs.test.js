const request = require("supertest");
const BadRequestError = require('../expressError');

const db = require("../db");
const app = require("../app");

const {
    commonBeforeAll,
    commonBeforeEach,
    commonAfterEach,
    commonAfterAll,
    u1Token,
    u2Token
} = require("./_testCommon");
const Job = require("../models/job");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);


describe('test create job', () => {
    const validJob = { title: 'Beard Knight', salary: 3000, equity: .9, companyHandle: 'c1' };
    test('create job as intended', async () => {
        const resp = await request(app).post('/jobs')
            .send(validJob)
            .set('authorization', `Bearer ${u2Token}`);

        expect(resp.statusCode).toBe(201);

        const rows = await Job.getAll();
        const rowExists = rows.some(b => b.title === 'Beard Knight');
        expect(rowExists).toBe(true);

    });

    test('prohibits non-admin users', async () => {
        const resp = await request(app).post('/jobs')
            .send(validJob)
            .set('authorization', `Bearer ${u1Token}`);

        expect(resp.statusCode).toBe(401);

        const rows = await Job.getAll();
        const rowExists = rows.some(b => b.title === 'Beard Knight');
        expect(rowExists).toBe(false);
    });

    test('prohibits unauth', async () => {
        const resp = await request(app).post('/jobs')
            .send(validJob);

        expect(resp.statusCode).toBe(401);

        const rows = await Job.getAll();
        const rowExists = rows.some(b => b.title === 'Beard Knight');
        expect(rowExists).toBe(false);
    });


    test('rejects bad data', async () => {
        const badJob = { ...validJob };

        // must have title 
        badJob.title = undefined;
        let resp = await request(app).post('/jobs')
            .send(badJob)
            .set('authorization', `Bearer ${u2Token}`);

        expect(resp.statusCode).toBe(400);
        badJob.title = validJob.title;

        // must have companyHandle 
        badJob.companyHandle = undefined;
        resp = await request(app).post('/jobs')
            .send(badJob)
            .set('authorization', `Bearer ${u2Token}`);

        expect(resp.statusCode).toBe(400);

        // companyHandle must be for existing company
        badJob.companyHandle = 'c1000009';
        resp = await request(app).post('/jobs')
            .send(badJob)
            .set('authorization', `Bearer ${u2Token}`);

        expect(resp.statusCode).toBe(400);
        badJob.companyHandle = validJob.companyHandle;

        // salary must not be less than 0
        badJob.salary = -100;
        resp = await request(app).post('/jobs')
            .send(badJob)
            .set('authorization', `Bearer ${u2Token}`);

        expect(resp.statusCode).toBe(400);
        badJob.salary = validJob.salary;

        // equity must not be greater than 1
        badJob.equity = 5;
        resp = await request(app).post('/jobs')
            .send(badJob)
            .set('authorization', `Bearer ${u2Token}`);

        expect(resp.statusCode).toBe(400);
    });

});



// same route is tested in the describe below this one 
// but testing the filtering
describe('GET ALL', () => {
    const job1 = { 'title': 'Beard Squire', salary: 50000, equity: .9, companyHandle: 'c1' };
    const job2 = { 'title': 'Beard Knight', salary: 100000, equity: .9, companyHandle: 'c2' };

    beforeEach(async () => {
        const req1 = await request(app)
            .post('/jobs')
            .send(job1)
            .set('authorization', `Bearer ${u2Token}`);

        const req2 = request(app)
            .post('/jobs')
            .send(job2)
            .set('authorization', `Bearer ${u2Token}`);

        await Promise.all([req1, req2]);
    });

    test('gets all jobs for logged in user', async () => {
        const jobs = await request(app)
            .get('/jobs')
            .set('authorization', `Bearer ${u1Token}`);

        expect(jobs.statusCode).toBe(200);
        expect(jobs.body.length).toBe(2);
    });

    test('Rejects unauth', async () => {
        const jobs = await request(app)
            .get('/jobs');

        expect(jobs.statusCode).toBe(401);
    });

});

// same route as tested in the above. 
// the seperate describe is for testing the filtering processes
describe('GET with filtering', () => {
    beforeEach(async function () {
        const job1 = { title: 'Beard Squire', salary: 800, equity: 0, companyHandle: 'c1' };
        const job2 = { title: 'Beard Knight', salary: 1000, equity: .1, companyHandle: 'c1' };
        const job3 = { title: 'Beard Commander', salary: 1200, equity: .2, companyHandle: 'c1' };

        const job4 = { title: 'Beard Apprentice', salary: 800, equity: undefined, companyHandle: 'c1' };
        const job5 = { title: 'Beard Mage', salary: 1000, equity: .1, companyHandle: 'c1' };
        const job6 = { title: 'Beard Arch Fire Mage', salary: 1200, equity: .2, companyHandle: 'c1' };

        const job7 = { title: 'Beard Squire', salary: 700, equity: 0, companyHandle: 'c2' };
        const job8 = { title: 'Beard Squire', salary: 2000, equity: .9, companyHandle: 'c3' };
        const job9 = { title: 'Beard Squire', salary: 2200, equity: .9, companyHandle: 'c3' };
        const job10 = { title: 'Beard Commander', salary: 2000, equity: .9, companyHandle: 'c2' };

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
    test('should reject invalid minSalary', async () => {
        let result = await request(app)
            .get(`/jobs?minSalary=-5`)
            .set('authorization', `Bearer ${u1Token}`);
        expect(result.statusCode).toBe(400);
    });

    test('should filter as intended', async ()=>{
        const jobs = await request(app)
            .get('/jobs?title=Beard Squire&minSalary=2100&hasEquity=true')
            .set('authorization', `Bearer ${u1Token}`);
        expect(jobs.body.length).toBe(1); 
    });
});

describe('GET:id', () => {
    test('gets existing job as intended for user', async () => {
        const validJob = { title: 'Beard Knight', salary: 3000, equity: .9, companyHandle: 'c1' };
        const validJobResult = await request(app)
            .post('/jobs')
            .send(validJob)
            .set('authorization', `Bearer ${u2Token}`);


        const result = await request(app).get(`/jobs/${validJobResult.body.id}`)
            .set('authorization', `Bearer ${u1Token}`);


        expect(result.statusCode).toBe(200);
        expect(result.body.title).toEqual(validJob.title);
    });

    test('rejects unauth', async () => {
        const validJob = { title: 'Beard Knight', salary: 3000, equity: .9, companyHandle: 'c1' };
        const validJobResult = await request(app)
            .post('/jobs')
            .send(validJob)
            .set('authorization', `Bearer ${u2Token}`);


        const result = await request(app).get(`/jobs/${validJobResult.body.id}`);

        expect(result.statusCode).toBe(401);
    });

    test('handles not-found', async () => {
        const validJob = { title: 'Beard Knight', salary: 3000, equity: .9, companyHandle: 'c1' };
        const validJobResult = await request(app)
            .post('/jobs')
            .send(validJob)
            .set('authorization', `Bearer ${u2Token}`);


        const result = await request(app).get(`/jobs/1`)
            .set('authorization', `Bearer ${u1Token}`);


        expect(result.statusCode).toBe(404);
    });
});

describe('DELETE', () => {
    var validJob = null;
    var validJobResult = null;
    beforeEach(async () => {
        validJob = { title: 'Beard Knight', salary: 3000, equity: .9, companyHandle: 'c1' };
        validJobResult = await request(app)
            .post('/jobs')
            .send(validJob)
            .set('authorization', `Bearer ${u2Token}`);
    });

    test('deletes for admin as intended', async () => {
        const result = await request(app)
            .delete(`/jobs/${validJobResult.body.id}`)
            .set('authorization', `Bearer ${u2Token}`);

        expect(result.statusCode).toBe(200);
        expect(result.body.id).toEqual(validJobResult.body.id);
    });

    test('rejects non-admin users', async () => {
        const result = await request(app)
            .delete(`/jobs/${validJobResult.body.id}`)
            .set('authorization', `Bearer ${u1Token}`);

        expect(result.statusCode).toBe(401);
    });

    test('rejects unauth', async () => {
        const result = await request(app)
            .delete(`/jobs/${validJobResult.body.id}`);

        expect(result.statusCode).toBe(401);
    });

    test('throws error for not-found', async () => {
        const result = await request(app)
            .delete(`/jobs/${1}`)
            .set('authorization', `Bearer ${u2Token}`);

        expect(result.statusCode).toBe(404);
    });
});

describe('PATCH', () => {
    var job = { 'title': 'Beard Fire Mage', salary: 4000, equity: .4, companyHandle: 'c1' };
    var jobResult = null;

    beforeEach(async () => {
        jobResult = await request(app)
            .post('/jobs')
            .send(job)
            .set('authorization', `Bearer ${u2Token}`);
    });

    test('works as intended for admin', async () => {
        const title = 'Beard Arch Fire Mage Of Ifirit';
        const salary = 5000;
        const equity = '0.5';
        const result = await request(app)
            .patch(`/jobs/${jobResult.body.id}`)
            .send({ title, salary, equity })
            .set('authorization', `Bearer ${u2Token}`);

        expect(result.statusCode).toEqual(200);

        let updatedRow = await request(app)
            .get(`/jobs/${jobResult.body.id}`)
            .set('authorization', `Bearer ${u2Token}`);
        updatedRow = updatedRow.body;
        delete updatedRow.id;
        delete updatedRow.company_handle;
        expect(updatedRow).toEqual({ title, salary, equity });

    });


    test('fails for non-admin user', async () => {
        const title = 'Beard Arch Fire Mage Of Ifirit';
        const salary = 5000;
        const equity = '0.5';
        const result = await request(app)
            .patch(`/jobs/${jobResult.body.id}`)
            .send({ title, salary, equity })
            .set('authorization', `Bearer ${u1Token}`);

        expect(result.statusCode).toEqual(401);
    });

    test('fails for unauth', async () => {
        const title = 'Beard Arch Fire Mage Of Ifirit';
        const salary = 5000;
        const equity = '0.5';
        const result = await request(app)
            .patch(`/jobs/${jobResult.body.id}`)
            .send({ title, salary, equity });

        expect(result.statusCode).toEqual(401);
    });


    test('rejects bad data', async () => {
        const update = { ...job };
        delete update.companyHandle;

        // rejects undefined title 
        update.title = undefined;
        let result = await request(app)
            .patch(`/jobs/${jobResult.body.id}`)
            .send(update)
            .set('authorization', `Bearer ${u2Token}`);
        update.title = job.title;

        expect(result.statusCode).toEqual(400);

        // rejects salary < 0
        update.salary = -3;
        result = await request(app)
            .patch(`/jobs/${jobResult.body.id}`)
            .send(update)
            .set('authorization', `Bearer ${u2Token}`);
        update.salary = job.salary;

        expect(result.statusCode).toEqual(400);


        // rejects equity > 1
        update.equity = 3;
        result = await request(app)
            .patch(`/jobs/${jobResult.body.id}`)
            .send(update)
            .set('authorization', `Bearer ${u2Token}`);

        expect(result.statusCode).toEqual(400);
    });

    test('throws not found error', async () => {
        const fakeId = (jobResult.body.id === 1) ? 2 : 1;
        const result = await request(app)
            .patch(`/jobs/${fakeId}`)
            .send({ title: 'Beard Thief', salary: 300, equity: .2 })
            .set('authorization', `Bearer ${u2Token}`);

        expect(result.statusCode).toEqual(404);
    });

});