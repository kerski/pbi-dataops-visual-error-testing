import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

// Function to read all CSV files from a folder
export function readCSVFilesFromFolder(folderPath: string): any {
    let tempRecords: Array<any> = [];
    // Read the directory
    fs.readdirSync(folderPath).forEach(file => {
      if(path.extname(file) === '.csv'){
        let x = parse(fs.readFileSync(path.join(folderPath, file)), {
          columns: true,
          skip_empty_lines: true
        });
        // load results
        for(let i = 0; i < x.length; i++){
          tempRecords.push(x[i]);
        }// end for
      }//end file extension check
    });
    return tempRecords;
}

