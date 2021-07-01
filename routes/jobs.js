const Job = require('../models/job.js');
const Company = require('../models/company');
const {ensureLoggedIn, ensureAdmin, ensureAdminOrSameUser} = require('../middleware/auth');
const express = require('express'); 
const { BadRequestError, NotFoundError } = require('../expressError.js');
const router = express.Router(); 


router.post('/', ensureLoggedIn, ensureAdmin, async (req, res, next)=>{
    const {title, salary, equity, companyHandle} = req.body; 
    try{
        if(!title || !companyHandle){
            throw new BadRequestError('Need title and company handle', 400); 
        }
        
        if(salary){
            let val  = Number(salary); 
            if(Number.isNaN(val) || val < 0){
                throw new BadRequestError('Invalid salary', 400); 
            }    
        }

        if(equity){
            let val  = Number(equity); 
            if(Number.isNaN(val) || val > 1.0){
                throw new BadRequestError('Invalid equity', 400); 
            }       
        }
        let handleExists = await Company.companyExists(companyHandle);

        if(!handleExists){
            throw new BadRequestError("Company does not exist", 400);
        }

        const results = await Job.create({title, salary, equity, companyHandle}); 
        return res.status(201).json(results); 
    }
    catch(err){
        return next(err); 
    }

});

router.get('/:id', ensureLoggedIn, async (req, res, next)=>{
    const id = req.params.id; 
    try{
        const exists = await Job.jobExists(id);
        if(!exists){
            throw new NotFoundError('Job not found', 404);
        }

        const job = await Job.get(id);
        return res.json(job);         
    }
    catch(err){
        return  next(err); 
    }
});

router.get('/', ensureLoggedIn, async (req, res, next)=>{
    const {title, minSalary, hasEquity} = req.query; 
    const options = {title, minSalary, hasEquity};
    try{
        const validOptions = Job.validFilteringOptions(options); 
        if(validOptions){
            const results = await Job.getWhere(options);
            return res.json(results);
        }
        else{
            const results = await Job.getAll();
            return res.json(results); 
        }

    }
    catch(err){
        return next(err); 
    }
})

router.delete('/:id', ensureLoggedIn, ensureAdmin, async (req, res, next)=>{
    const id = req.params.id; 
    try{
        const exists = await Job.jobExists(id);
        if(!exists){
            throw new NotFoundError('Job not found', 404);
        }
        const result = await Job.remove(id); 
        return res.json(result);
    }
    catch(err){
        return next(err);
    }
});

router.patch('/:id', ensureLoggedIn, ensureAdmin, async (req, res, next)=>{
    const id = req.params.id; 
    const recordExists = await Job.jobExists(id); 
    if(!recordExists){
        return next(new NotFoundError('Job not found', 404)); 
    }

    const {title, salary, equity} = req.body; 

    if(!title){
        return next(new BadRequestError("Need title", 401));
    }

    if(salary && salary < 0){
        return next(new BadRequestError("Salary must be greater or equal to 0", 401));

    }

    if(equity && equity > 1){
        return next(new BadRequestError("Equity must not be greater than 1", 401));
    }

    try{
        const result = await Job.update({id, title, salary, equity});
        return res.json(result); 
    }
    catch(err){
        return next(err); 
    }
});

module.exports = router; 