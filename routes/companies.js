"use strict";

/** Routes for companies. */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError } = require("../expressError");
const { ensureLoggedIn, ensureAdmin } = require("../middleware/auth");

const Company = require("../models/company");

const companyNewSchema = require("../schemas/companyNew.json");
const companyUpdateSchema = require("../schemas/companyUpdate.json");
const Job = require("../models/job");

const router = new express.Router();


/** POST / { company } =>  { company }
 *
 * company should be { handle, name, description, numEmployees, logoUrl }
 *
 * Returns { handle, name, description, numEmployees, logoUrl }
 *
 * Authorization required: login
 */

router.post("/", ensureLoggedIn, ensureAdmin, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, companyNewSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const company = await Company.create(req.body);
    return res.status(201).json({ company });
  } catch (err) {
    return next(err);
  }
});

/** GET /  =>
 *   { companies: [ { handle, name, description, numEmployees, logoUrl }, ...] }
 *
 * Can filter on provided search filters:
 * - minEmployees
 * - maxEmployees
 * - nameLike (will find case-insensitive, partial matches)
 *
 * Authorization required: none
 */

router.get("/", async function (req, res, next) {
  let minEmployees = req.query.minEmployees; 
  let maxEmployees = req.query.maxEmployees; 

  if(minEmployees){
    minEmployees = parseInt(minEmployees); 
    if(Number.isNaN(minEmployees) || minEmployees < 0){
      const err =  new BadRequestError('Invalid filter for Minimum Employees', 400);
      return next(err);
    }
  }

  if(maxEmployees){
    maxEmployees = parseInt(maxEmployees); 
    if(Number.isNaN(maxEmployees) || maxEmployees < 0){
      const err = new BadRequestError('Invalid filter for Maxinum Employees', 400);
      return next(err);
    }
  }

  if(minEmployees && maxEmployees){
    if(minEmployees > maxEmployees){
      const err = new BadRequestError("Minimum Employees cannot be greater than Maxinum Employees", 400);
      return next(err);
    }
  }

  // exercise instructions say parameter should be called name whereas the comments above call it nameLike
  // testing for both then
  const name = (req.query.nameLike) ? req.query.nameLike : req.query.name; 
  try {
    let companies = null; 
    if(minEmployees || maxEmployees || name){
      companies = await Company.findWhere({name, minEmployees, maxEmployees}); 
    }
    else{
      companies = await Company.findAll();
    }
    return res.json({ companies });
  } catch (err) {
    return next(err);
  }
});

/** GET /[handle]  =>  { company }
 *
 *  Company is { handle, name, description, numEmployees, logoUrl, jobs }
 *   where jobs is [{ id, title, salary, equity }, ...]
 *
 * Authorization required: none
 */

router.get("/:handle", async function (req, res, next) {
  try {
    const [company, jobs] = await Promise.all([
      Company.get(req.params.handle),
      Job.getByCompanyHandle(req.params.handle)
    ]);
    company.jobs = jobs;
    return res.json({ company });
  } catch (err) {
    return next(err);
  }
});

/** PATCH /[handle] { fld1, fld2, ... } => { company }
 *
 * Patches company data.
 *
 * fields can be: { name, description, numEmployees, logo_url }
 *
 * Returns { handle, name, description, numEmployees, logo_url }
 *
 * Authorization required: login
 */

router.patch("/:handle", ensureLoggedIn, ensureAdmin,  async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, companyUpdateSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const company = await Company.update(req.params.handle, req.body);
    return res.json({ company });
  } catch (err) {
    return next(err);
  }
});

/** DELETE /[handle]  =>  { deleted: handle }
 *
 * Authorization: login
 */

router.delete("/:handle", ensureLoggedIn, ensureAdmin, async function (req, res, next) {
  try {
    await Company.remove(req.params.handle);
    return res.json({ deleted: req.params.handle });
  } catch (err) {
    return next(err);
  }
});


module.exports = router;
