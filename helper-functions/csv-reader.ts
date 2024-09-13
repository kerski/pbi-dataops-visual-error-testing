import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

/**
 * Reads all CSV files from a specified folder and returns their contents as an array of objects.
 *
 * @param {string} folderPath - The path to the folder containing the CSV files.
 * @returns {any[]} An array of objects representing the contents of the CSV files.
 */
export function readCSVFilesFromFolder(folderPath: string): any[] {
    let tempRecords: Array<any> = [];
    // Read the directory
    fs.readdirSync(folderPath).forEach(file => {
        if (path.extname(file) === '.csv') {
            let x = parse(fs.readFileSync(path.join(folderPath, file)), {
                columns: true,
                skip_empty_lines: true
            });
            // Load results
            for (let i = 0; i < x.length; i++) {
                tempRecords.push(x[i]);
            } // End for
        } // End file extension check
    });
    return tempRecords;
}