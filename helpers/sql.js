const { BadRequestError } = require("../expressError");

// Assists in writing a sql statement for updating some of the properties on an object.

// Takes two parameters, dataToUpdate and jsToSql

// The dataToUpdate parameter will be an object with the model keynames and values.

// The jsToSql parameter takes an object holding the javascript property names as keys paired to the corresponding 
//  sql column names. 
//      Example: The javascript model may have a property named firstName but the sql column can be first_name 

// Returns an object with the setCols and values properties. 
//      setCols will be a string of sql assertions for a PARAMETERIZED update statement. 
//            '"first_name"=$1, "last_name"=$2'
//      the values property will be an array of the values whose order matches the columns. 
function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError("No data");

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map((colName, idx) =>
      `"${jsToSql[colName] || colName}"=$${idx + 1}`,
  );

  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

module.exports = { sqlForPartialUpdate };
