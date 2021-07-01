const db = require('../db');
const { BadRequestError } = require('../expressError');

class Job {
    static async create({title, salary, equity, companyHandle}){
        const query = `INSERT INTO jobs(title, salary, equity, company_handle)
                        VALUES($1, $2, $3, $4)
                        RETURNING id, title, salary, equity, company_handle`;
        try{
            const resp = await db.query(query, [title, salary, equity, companyHandle]); 
            return resp.rows[0];
        }                
        catch{
            throw new BadRequestError('Cannot create job', 401);
        }
    }
    
    static async get(id){
        const query = 'SELECT * FROM jobs WHERE id=$1'; 
        const results = await db.query(query, [id]); 
        if(results.rows.length === 0){
            throw new BadRequestError('Job not found', 404); 
        }

        return results.rows[0];
    }

    static async getAll(){
        const query = `SELECT id, title, salary, equity, company_handle from jobs`; 
        let rows = await db.query(query); 
        rows = rows.rows; 
        return rows; 
    }
    

    // filters jobs based on title, minSalary and equity
    static async getWhere(options){
        const {title, minSalary, hasEquity} = options; 
        const params = [];

        let query = `SELECT id, title, salary, equity, company_handle FROM  jobs`;
        let whereClause = '';
        if(title){
            params.push(title); 
            whereClause += ` title=$${params.length}`;     
        }

        if(minSalary){
            if(params.length > 0){
                whereClause += ' AND'; 
            }
            
            params.push(minSalary);
            
            whereClause += ` salary>=$${params.length}`;
        }

        if(hasEquity){
            if(params.length > 0){
                whereClause += ' AND'; 
            }

            whereClause += ` equity IS NOT NULL AND equity > 0`; 
        }

        if(whereClause){
            query += ' WHERE' + whereClause; 
        }

        let results = await db.query(query, params); 
        results = results.rows; 
        return results; 
    }


    // for filtering options given to getWhere
    static validFilteringOptions(options){
        if(!options){
            return false; 
        }

        const {title, minSalary, hasEquity} = options; 
        if(!title && !minSalary && !hasEquity){
            return false; 
        }
        else if(minSalary){
            let num = Number(minSalary); 
            if(Number.isNaN(num) || num < 0){
                throw new BadRequestError("Invalid minSalary value", 401);
            }
        }
        
        return true; 
    }

    static async getByCompanyHandle(handle){
        let query = `SELECT id, title, salary, equity FROM jobs WHERE company_handle=$1`;
        const jobs = await db.query(query, [handle]); 
        return jobs.rows; 
    }

    static async update({id, title, salary, equity }){
        try{
            const params = []; 
            let query = `UPDATE jobs SET`; 
            
            if(title){
                params.push(title);
                query += ` title=$${params.length}`; 
            }
            if(salary){
                if(params.length > 0){
                    query += ','; 
                }
                params.push(salary);
                query += ` salary=$${params.length}`; 
            }
            if(equity){
                if(params.length > 0){
                    query += ' ,'; 
                }
                params.push(equity); 
                query += ` equity=$${params.length}`;
            }

            query+= ` WHERE id=${id}`;
            query += ' RETURNING id, title, salary, equity, company_handle';

            let result = await db.query(query, params); 
            result = result.rows[0]; 
            return result; 
        }
        catch{
            throw new BadRequestError("Invalid inputs", 401);
        }
    }

    static async remove(id){
        try{
            const query = `DELETE FROM jobs WHERE id=$1 RETURNING id`; 
            let result = await db.query(query, [id]);

            if(result.rows.length === 0){
                throw new Error();
            }
            result = result.rows[0]; 
            return result; 
        }
        catch{
            throw new BadRequestError("Cannot remove job", 401);
        }
    }


    static async jobExists(id){
        const query = `SELECT * FROM jobs WHERE id=$1`;
        const row = await db.query(query, [id]);
        if(row.rows.length > 0){
            return true;
        } 
        return false;
    }
}


module.exports = Job; 