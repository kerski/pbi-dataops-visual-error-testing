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

// Function to read all JSON files from a folder
export function readJSONFilesFromFolder(folderPath: string): any {
  let tempRecords: Array<any> = [];
  // Read the directory
  fs.readdirSync(folderPath).forEach(file => {
      // Check if the file is a JSON file
      if (path.extname(file) === '.json') {
          let data = fs.readFileSync(path.join(folderPath, file), 'utf8');
          let json = JSON.parse(data);
          for (let i = 0; i < json.length; i++) {
            // Concatenate the name properties in the report_parameters array
            if (json[i].report_parameters) {
              json[i].report_parameters_string = json[i].report_parameters.map(param => `rp:${param.name}=${param.value}`).join('&');
            }
            else{
              json[i].report_parameters_string = '';
            }
          }// end for
          tempRecords.push(json);
      } // end file extension check
  });
  // Flatten the tempRecords array
  return tempRecords.flat();
}
