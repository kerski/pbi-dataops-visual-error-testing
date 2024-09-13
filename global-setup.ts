import type { FullConfig } from '@playwright/test';
import { Environment, getAPIEndpoints } from './helper-functions/token-helpers';
import { readCSVFilesFromFolder } from './helper-functions/csv-reader';
import path from 'path';

/**
 * Global setup function for Playwright tests.
 *
 * @param {FullConfig} config - The full configuration object for Playwright.
 * @returns {Promise<void>} A promise that resolves when the global setup is complete.
 */
async function globalSetup(config: FullConfig): Promise<void> {
    console.log("##[debug]Global setup initiated");
    console.log("##[debug]CI: " + process.env.CI);
}

export default globalSetup;