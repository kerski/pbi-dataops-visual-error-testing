import { test, expect } from '@playwright/test';
import { chromium } from 'playwright';
import { getAccessToken, getPaginatedEmbedToken, TestSettings, getAPIEndpoints, PaginatedEmbedInfo } from '../helper-functions/token-helpers';
// Used for local testings
import { readJSONFilesFromFolder as readJSONFilesFromFolder } from '../helper-functions/file-reader';
import { logToConsole } from '../helper-functions/logging';

/* VARIABLES */
if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET || !process.env.TENANT_ID || !process.env.ENVIRONMENT) {
  throw new Error('Missing required environment variables.');
}

// Initialize the environment variables
let testRecords: Array<any>;
let endPoints;
// Access environment variables
let testSettings: TestSettings = {
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  tenantId: process.env.TENANT_ID,
  environment: process.env.ENVIRONMENT as Environment
};

// Parse the JSON file locally
testRecords = readJSONFilesFromFolder('./test-cases');
//testRecords = testRecords.slice(0,2);
endPoints = getAPIEndpoints(testSettings.environment);
// Set logging for debugging
let isVerboseLogging: boolean = true;
// Get Access Token
let testAccessToken: string | undefined = ""

// Make sure to get token
// Assume testing takes less then an hour at this point (before token expires)
test.beforeAll(async () => {
  testAccessToken = await getAccessToken(testSettings);
  //isVerboseLogging = true;
});

/* TESTS */

// Test to check if the access token is accessible
test('test if access token can be generated from the environment variables provided (Paginated Report).', async ({ }) => {
  logToConsole('##[debug]Test if access token can be generated from the environment variables provided (Paginated Report).', isVerboseLogging);
  const token = testAccessToken
  //logToConsole('******** ' + token + '********', isVerboseLogging);
  expect(token).not.toBeUndefined();
});

// Test each record to check if the embed token is accessible
testRecords.forEach((record) => {
  test(`test ${record.test_case} - '${record.report_name}' embed token is accessible ${record.role != '' && record.role !== undefined ? "(Role: " + record.role + ") " : ''}`, async ({ }) => {
    logToConsole(`##[debug]test ${record.test_case} - '${record.report_name}' embed token is accessible ${record.role != '' && record.role !== undefined ? "(Role: " + record.role + ") " : ''}`, isVerboseLogging);
    const tmpEmbedInfo: PaginatedEmbedInfo = {
      datasets: record.dataset_ids,
      reports: [{ id: record.report_id }]
    };

    //logToConsole('------' + testAccessToken + '-------', isVerboseLogging);
    const embedToken = await getPaginatedEmbedToken(tmpEmbedInfo, endPoints, testAccessToken);
    expect(embedToken).not.toBeUndefined();
  });
}// end for
);// end test

// Test for visual errors
testRecords.forEach((record) => {
  test(`test ${record.test_case} - '${record.report_name}' for visual errors ${record.role != '' && record.role !== undefined ? "(Role: " + record.role + ") " : ''}, Link: ${endPoints.webPrefix}/groups/${record.workspace_id}/rdlreports/${record.report_id}${record.report_parameters_string != '' && record.report_parameters_string !== undefined ? "?" + record.report_parameters_string : ''}  `, async ({ browser }) => {
    logToConsole(`##[debug]test ${record.test_case} - '${record.report_name}' for visual errors ${record.role != '' && record.role !== undefined ? "(Role: " + record.role + ") " : ''}, Link: ${endPoints.webPrefix}/groups/${record.workspace_id}/rdlreports/${record.report_id}${record.report_parameters_string != '' && record.report_parameters_string !== undefined ? "?" + record.report_parameters_string : ''}`,isVerboseLogging);
    //logToConsole(record, isVerboseLogging);
    //const accessToken = await getAccessToken(testSettings);
    browser = await chromium.launch({ args: ['--disable-web-security'], headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Get the embedURL for the paginated report
    const reportResponse = await fetch(`${endPoints.apiPrefix}/v1.0/myorg/groups/${record.workspace_id}/reports/${record.report_id}`, {
      method: 'GET',
      headers: {
          'Authorization': `Bearer ${testAccessToken}`
      }
    }).then(res => res.json());

    await page.goto('about:blank');
    await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/powerbi-client/2.23.7/powerbi.min.js' });

    const tmpEmbedInfo: PaginatedEmbedInfo = {
      datasets: record.dataset_ids,
      reports: [{ id: record.report_id }]
    };

    const embedToken = await getPaginatedEmbedToken(tmpEmbedInfo, endPoints, testAccessToken);

    let reportInfo = {
        reportId: record.report_id,
        parameterValues: record.report_parameters,
        embedUrl: reportResponse.embedUrl, // use one from report response
        embedToken: embedToken,
        endpoints: endPoints,
        waitSeconds: record.wait_seconds || 20      
    };
    
    // Evaluate the page and check for visual errors
    let test = await page.evaluate(async (reportInfo: any) => {
      var pbi = window['powerbi-client'];
      var models = window['powerbi-client'].models;
      let embedConfiguration: any = {
        type: 'report',
        id: reportInfo.reportId,
        embedUrl: reportInfo.embedUrl,
        accessToken: reportInfo.embedToken,
        tokenType: models.TokenType.Embed,
        permissions: models.Permissions.Read,
        viewMode: models.ViewMode.View,
        parameterValues: reportInfo.parameterValues
      };

      // Add parameters if they exist
      if(reportInfo.parameterValues){
        embedConfiguration['parameterValues'] = reportInfo.parameterValues;
      }      

      // Initialize the powerbi service
      const powerbi = new pbi.service.Service(pbi.factories.hpmFactory, pbi.factories.wpmpFactory, pbi.factories.routerFactory);
      let embed = powerbi.embed(document.body, embedConfiguration);

      // Wait for the report to typically load
      let pauseProme = new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve();
        }, reportInfo.waitSeconds * 1000);
      });
      let result = await pauseProme;
      return result;
    }, reportInfo)

    await page.waitForLoadState('networkidle'); // Ensure all JS-loaded content is finished
    // Get the main page's HTML
    let fullPageHTML = await page.content();    
    // Find all iframes on the page
    const frames = page.frames().filter(frame => frame !== page.mainFrame());

    for (const frame of frames) {
      const frameContent = await frame.evaluate(() => document.documentElement.outerHTML);
      const frameUrl = frame.url();
      fullPageHTML += `\n<!-- iframe content from ${frameUrl} -->\n${frameContent}\n`;
    }

    const searchForModal = fullPageHTML.search('"ms-Dialog-content');
    expect(searchForModal).toBe(-1);
  });
});