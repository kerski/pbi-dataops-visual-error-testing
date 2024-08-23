import type { FullConfig } from '@playwright/test';
import { Environment, getAPIEndpoints} from './helper-functions/token-helpers';
import { readCSVFilesFromFolder } from './helper-functions/csv-reader';
import path from 'path';

// Global Setup
async function globalSetup(config: FullConfig) {
    console.log("##[debug]Global setup initiated");  

    // Check for CI/CD pipeline environment variables
    if(process.env.Environment && process.env.CLIENT_ID && process.env.CLIENT_SECRET && process.env.TENANT_ID) {
        console.log('hi');
        // Get API endpoints based on the environment
        let endPoints = getAPIEndpoints(process.env.ENVIRONMENT as Environment);
        process.env.ENDPOINTS = JSON.stringify(endPoints);

        // Convert reScords
        let testRecords: Array<any> = readCSVFilesFromFolder(path.resolve(__dirname, '..\\ci-pipeline\\csvArtifacts'));
        
        process.env.TEST_RECORDS = JSON.stringify(testRecords);
    }// end if
}

export default globalSetup;