import { test, expect } from '@playwright/test';
import { chromium } from 'playwright';
import { getAccessToken, getEmbedToken, EmbedInfo, TestSettings, getAPIEndpoints } from '../helper-functions/token-helpers';
// Used for local testings
import { IReportEmbedConfiguration } from 'powerbi-client';
import { readCSVFilesFromFolder } from '../helper-functions/csv-reader';
import { logToConsole } from '../helper-functions/logging';

/* VARIABLES */

// Initialize the environment variables
let testRecords: Array<any>;
let endPoints;
// Access environment variables
let testSettings : TestSettings = {
  clientId : process.env.CLIENT_ID,
  clientSecret : process.env.CLIENT_SECRET,
  tenantId : process.env.TENANT_ID,
  environment : process.env.ENVIRONMENT as Environment
};  

// Parse the JSON file locally
testRecords = readCSVFilesFromFolder('./test-cases');
//testRecords = testRecords.slice(0,2);
endPoints = getAPIEndpoints(testSettings.environment);  
// Set logging for debugging
let isVerboseLogging: boolean = false;  
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
test('test if access token can be generated from the environment variables provided.', async ({ }) => {
  console.log('##[debug]Test if access token can be generated from the environment variables provided.')
  const token = testAccessToken  
  logToConsole('******** ' + token + '********', isVerboseLogging);
  expect(token).not.toBeUndefined();
});

// Test each record to check if the embed token is accessible
testRecords.forEach((record) => {
    test(`test ${record.test_case} embed token is accessible`, async ({  }) => {
      console.log(`##[debug]test ${record.test_case} embed token is accessible`);
      const tmpEmbedInfo: EmbedInfo = {
        workspaceId: record.workspace_id,
        reportId: record.report_id,
        datasetId: record.dataset_id,
        pageId: record.page_id,
        userName: record.user_name,
        role: record.role
      };
      logToConsole('------' + testAccessToken + '-------', isVerboseLogging);
      const embedToken = await getEmbedToken(tmpEmbedInfo, endPoints, testAccessToken);
      expect(embedToken).not.toBeUndefined();
    });
  }// end for
);// end test

// Test for visual errors
testRecords.forEach((record) => {
  test(`${record.test_case}: test for visual errors, Link: ${endPoints.webPrefix}/groups/${record.workspace_id}/reports/${record.report_id}/${record.page_id} `, async ({ browser }) => {
    console.log(`##[debug]${record.test_case}: test for visual errors, Link: ${endPoints.webPrefix}/groups/${record.workspace_id}/reports/${record.report_id}/${record.page_id} `);
    const accessToken = await getAccessToken(testSettings);
    browser = await chromium.launch({ args: ['--disable-web-security'], headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('about:blank');
    await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/powerbi-client/2.23.1/powerbi.min.js' });

    const tmpEmbedInfo: EmbedInfo = {
      workspaceId: record.workspace_id,
      reportId: record.report_id,
      datasetId: record.dataset_id,
      pageId: record.page_id,
      userName: record.user_name,
      role: record.role
    };
    const embedToken = await getEmbedToken(tmpEmbedInfo, endPoints, testAccessToken);

    let reportInfo = {
      reportId: tmpEmbedInfo.reportId,
      page_id: tmpEmbedInfo.pageId,
      embedToken: embedToken,
      endpoints: endPoints
    };

    // Evaluate the page and check for visual errors
    let test = await page.evaluate(async (reportInfo: any) => {
      var pbi = window['powerbi-client'];
      var models = window['powerbi-client'].models;
      const embedConfiguration: IReportEmbedConfiguration = {
        type: 'report',
        id: reportInfo.reportId,
        pageName: reportInfo.page_id,
        embedUrl: reportInfo.endpoints.embedUrl,
        accessToken: reportInfo.embedToken,
        tokenType: models.TokenType.Embed,
        permissions: models.Permissions.Read,
        viewMode: models.ViewMode.View
      }; 
            
      const powerbi = new pbi.service.Service(pbi.factories.hpmFactory, pbi.factories.wpmpFactory, pbi.factories.routerFactory);
      const once = {
        once: true,
      };
      let embed = powerbi.embed(document.body, embedConfiguration);
      let testErrorPromise = new Promise<void>((resolve) => {
        document.body.addEventListener('error', async function (event: any) {
        resolve(event);    
        },once);        
      });
      let testRenderedPromise = new Promise<void>((resolve) => {
        document.body.addEventListener('rendered', async function (event: any) {
        resolve();// resolve undefined
        },once);        
      });

      // Wait for the report to render or error out using the race condition
      let result = await Promise.race([testErrorPromise, testRenderedPromise]);
      return result === undefined ? "passed" : "failed";
    }, reportInfo)

    expect(test).toBe("passed");
    });
  });