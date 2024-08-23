import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

// Function to read all CSV files from a folder
export function readCSVFilesFromFolder(folderPath: string): any {
    let tempRecords: Array<any> = [];
    console.log('##[debug]Folder Path To Check for Test CSVs: ' + folderPath)
    // Read the directory
    fs.readdirSync(folderPath).forEach(file => {
      if(path.extname(file) === '.csv'){
        console.log('##[debug]Folder Path To Check for Test CSVs: ' + file);
        let x = parse(fs.readFileSync(path.join(folderPath, file)), {
          columns: true,
          skip_empty_lines: true
        });
        // load results
        for(let i = 0; i < x.length; i++){
          console.log("##[debug]Loading " + x[i].test_case);
          tempRecords.push(x[i]);
        }// end for
      }//end file extension check
    });
  
    console.log("##[debug]Found " + tempRecords.length + " test cases to run.");
  
    return tempRecords;
}

