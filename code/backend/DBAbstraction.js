const sqlite3 = require('sqlite3'); 
 
class DBAbstraction { 
    constructor(fileName) { 
        this.fileName = fileName; 
    } 
 
    init() { 
        return new Promise((resolve, reject) => { 
            this.db = new sqlite3.Database(this.fileName, async (err) => { 
                if(err) { 
                    reject(err); 
                } else { 
                    try { 
                        await this.createTables(); 
                        resolve(); 
                    } catch (err) { 
                        reject(err);
                    } 
                } 
            }); 
        }); 
    } 
 
    createTables() { 
        const sql = `

            `
    }
        

} 
 
module.exports = DBAbstraction;