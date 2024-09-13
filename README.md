# pbi-dataops-visual-error-testing
Templates for testing Power BI reports for broken visuals using Azure DevOps, PowerShell, and Microsoft Playwright

## Prerequisities
   - Install VSCode
   - Install Node
   - At Least Premium Per User Capacity
   - Create App Service Principal
     - Provide the following API permissions with admin consent granted:
       - App.Read.All
       - Dataset.Read.All
       - SemanticModel.Read.All
       - Report.Read.All
       - Workspace.Read.All
     - Create a Secret
     - Copy the Client ID, Tenant and Secret for use later.
   - XMLA/Setup
   - Provide Member rights to the workspaces for testing
   - Setup Playwright - https://playwright.dev/docs/getting-started-vscode

## Setup
### 1. Copy the Project

   1. Download from releases
   2. Unzip file 
   3. Open in Visual Studio Code
   
### 2. Anatomy of the Project
 1. template.env
   - This is the template where environment variables are stored including the client secret for the service principal.
 2. test
   - The file pbi.spec.ts exists here and is the core set of code that runs the tests.
 3. helper-functions
   - Within this folder is a set of functions and interfaces to support pbi.spec.ts
 4. global-setup.ts
   - This file runs before any test.  Currently this logs some results to the console.
 5. test-cases
   - These are the CSV files as described in CSV section.
 6. playwright.config.* files
    - These files identify how the Playwright tests are run.  The default is playwright.config.ts
 7. pipeline-scripts 
    1. These files identify how Playwright tests are executed in Azure Pipelines

### 3. Update Environment Variables

 1. Rename template.env to .env
 2. Set the following variables in the .env
    - CLIENT_ID=""
      - Copy the Client ID registered from the prerequisites.
    - CLIENT_SECRET=""
      - Copy the Client Secret created from the prerequisites.
    - TENANT_ID=""
      - Copy the Tenant ID copied from the prerequisites.
    - ENVIRONMENT=""
      - This identifies the tenant type (public or sovereign) you Power BI service is located.
      - Within the quotation set it as Public, Germany, China, USGov, USGovHigh, or USGovDoD
 3. Save the .env file

### 4. Add test-cases

 1. Create test cases by follow the direction here https://github.com/kerski/get-powerbireportpagesfortesting

### 5. Run the Tests Locally

 1. From Visual Studio Code open the Terminal
 2. Run npx playwright test --workers=2
 3. The tests will then run in the following manner:
    1. Test that the service principal can authenicate with the Power BI service.
    2. Test that the service principal can generate an embed token for the report page that will be tested.
    3. Test that the report that is rendered does not have broken visuals.

### 6. Reading the Results
1. Open playwright-report folder
2. Double-click on index.html

### 7. Broken Visuals

As described in https://learn.microsoft.com/en-us/power-bi/connect-data/refresh-troubleshooting-tile-errors the following are the types of issues this testing tool will look for with visuals:

1. Power BI encountered an unexpected error while loading the model. Please try again later.
2. Couldn't retrieve the data model. Please contact the dashboard owner to make sure the data sources and model exist and are accessible.
3. You don't have permission to view this tile or open the workbook.
4. Power BI visuals have been disabled by your administrator.
5. Data shapes must contain at least one group or calculation that outputs data. Please contact the dashboard owner.
6. Can't display the data because Power BI can't determine the relationship between two or more fields.
7. The groups in the primary axis and the secondary axis overlap. Groups in the primary axis can't have the same keys as groups in the secondary axis.
8. This visual has exceeded the available resources. Try filtering to decrease the amount of data displayed.
9. We are not able to identify the following fields: {0}. Please update the visual with fields that exist in the semantic model.
10. Couldn't retrieve the data for this visual. Please try again later.