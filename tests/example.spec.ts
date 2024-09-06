import { test, expect } from '@playwright/test';
import { chromium } from 'playwright';
import { getAccessToken, getEmbedToken, EmbedInfo, TestSettings, getAPIEndpoints } from '../helper-functions/token-helpers';
// Used for local testings
import { IReportEmbedConfiguration } from 'powerbi-client';
import fs from 'fs';
import { readCSVFilesFromFolder } from '../helper-functions/csv-reader';

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

// Parse complex JSON strings from global setup
// Check for CI/CD pipeline environment variables
if(process.env.CI === 'true') {
  testRecords = JSON.parse(process.env.TEST_RECORDS);
  endPoints = JSON.parse(process.env.ENDPOINTS);
}else{
  // Parse the JSON file locally
  testRecords = readCSVFilesFromFolder('./test-cases');
  endPoints = getAPIEndpoints(testSettings.environment);    
}// end if

// Test to check if the access token is accessible
test('test if access token can be generated from the environment variables provided.', async ({ }) => {
  console.log('##[debug]Test if access token can be generated from the environment variables provided.')
  const token = await getAccessToken(testSettings);
  expect(token).not.toBeUndefined();
});


// Test each record to check if the embed token is accessible
for (const record of testRecords) {
  test(`test ${record.test_case} embed token is accessible`, async ({ }) => {
    console.log(`##[debug]test ${record.test_case} embed token is accessible`);
    const tmpEmbedInfo: EmbedInfo = {
      workspaceId: record.workspace_id,
      reportId: record.report_id,
      datasetId: record.dataset_id,
      pageId: record.page_id,
      userName: record.user_name,
      role: record.role
    };
    const embedToken = await getEmbedToken(tmpEmbedInfo, endPoints, testSettings);
    expect(embedToken).not.toBeUndefined();
  });

  /*test(`${record.test_case}: test for visual errors, Link: ${endPoints.webPrefix}/groups/${record.workspace_id}/reports/${record.report_id}/${record.page_id} `, async () => {
    console.log(`##[debug]${record.test_case}: test for visual errors, Link: ${endPoints.webPrefix}/groups/${record.workspace_id}/reports/${record.report_id}/${record.page_id} `);
    const accessToken = await getAccessToken(testSettings);
    const browser = await chromium.launch({ args: ['--disable-web-security'], headless: false });
    const page = await browser.newPage();
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
    const embedToken = await getEmbedToken(tmpEmbedInfo, endPoints, testSettings);

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
      let embed = powerbi.embed(document.body, embedConfiguration);

      let renderedPromise = new Promise<void>((resolve) => {
        embed.off('rendered');
        embed.on('rendered', async function (event: any) {
          console.log('Report rendered');
          resolve(event);
        });
      });

      let errorPromise = new Promise<void>((resolve) => {
        embed.off('error');
        embed.on('error', async function (event: any) {
          console.log('Report error');
          resolve(event);
        });

        setTimeout(() => {
          resolve();
        }, 10000);
      });

      // Wait for the report to render or error out
      let [result1, result2] = await Promise.all([renderedPromise, errorPromise]);

      return result2 === undefined ? "passed" : "failed";
    }, reportInfo)

    expect(test).toBe("passed");
  });*/
}