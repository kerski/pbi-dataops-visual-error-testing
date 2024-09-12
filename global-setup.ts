import type { FullConfig } from '@playwright/test';
import { Environment, getAPIEndpoints} from './helper-functions/token-helpers';
import { readCSVFilesFromFolder } from './helper-functions/csv-reader';
import path from 'path';

// Global Setup
async function globalSetup(config: FullConfig) {
    console.log("##[debug]Global setup initiated");  
    console.log("##[debug]CI: " + process.env.CI);
}

export default globalSetup;