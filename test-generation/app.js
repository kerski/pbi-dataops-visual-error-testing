const express = require('express');
const path = require('path');
const { exec } = require('child_process');
const xml2js = require('xml2js');
const { ConfidentialClientApplication } = require('@azure/msal-node');
const { get } = require('http');
const app = express();
const port = 3000;
// Load environment variables from .env file
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
// Use environment variables from .env file
const tenantId = process.env.TENANT_ID;
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const environment = process.env.ENVIRONMENT;
const testSettings = getAPIEndpoints(environment);
// Handle file uploads
const multer = require('multer');
const fs = require('fs');

const msalConfig = {
    auth: {
        clientId: clientId,
        authority: `${testSettings.loginUrl}/${tenantId}`,
        clientSecret: clientSecret
    }
};
const cca = new ConfidentialClientApplication(msalConfig);
// Define the scopes for the access token
const tokenRequest = { scopes: [`${testSettings.resourceUrl}/.default`] };

// Function to get API endpoints based on the environment
function getAPIEndpoints(environment) {
    // Default endpoints
    let endpoints = {
        apiPrefix: 'https://api.powerbi.com',
        xmlaPrefix: 'powerbi://api.powerbi.com',
        webPrefix: 'https://app.powerbi.com',
        resourceUrl: 'https://analysis.windows.net/powerbi/api',
        embedUrl: 'https://app.powerbi.com/reportEmbed',
        loginUrl: 'https://login.microsoftonline.com'
    };

    // Switch case to set endpoints based on the environment
    switch (environment) {
        case "Public":
            break;
        case "Germany":
            endpoints.apiPrefix = "https://api.powerbi.de";
            endpoints.xmlaPrefix = "powerbi://api.powerbi.de";
            endpoints.webPrefix = "https://app.powerbi.de";
            endpoints.resourceUrl = "https://analysis.cloudapi.de/powerbi/api";
            endpoints.embedUrl = "https://app.powerbi.de/reportEmbed";
            endpoints.loginUrl = "https://login.microsoftonline.com";
            break;
        case "China":
            endpoints.apiPrefix = "https://api.powerbi.cn";
            endpoints.xmlaPrefix = "powerbi://api.powerbi.cn";
            endpoints.webPrefix = "https://app.powerbigov.cn";
            endpoints.resourceUrl = "https://analysis.chinacloudapi.cn/powerbi/api";
            endpoints.embedUrl = "https://app.powerbi.cn/reportEmbed";
            endpoints.loginUrl = "https://login.partner.microsoftonline.cn";
            break;
        case "USGov":
            endpoints.apiPrefix = "https://api.powerbigov.us";
            endpoints.xmlaPrefix = "powerbi://api.powerbigov.us";
            endpoints.webPrefix = "https://app.powerbigov.us";
            endpoints.resourceUrl = "https://analysis.usgovcloudapi.net/powerbi/api";
            endpoints.embedUrl = "https://app.powerbigov.us/reportEmbed";
            endpoints.loginUrl = "https://login.microsoftonline.com";
            break;
        case "USGovHigh":
            endpoints.apiPrefix = "https://api.high.powerbigov.us";
            endpoints.xmlaPrefix = "powerbi://api.high.powerbigov.us";
            endpoints.webPrefix = "https://app.high.powerbigov.us";
            endpoints.resourceUrl = "https://analysis.high.usgovcloudapi.net/powerbi/api";
            endpoints.embedUrl = "https://app.high.powerbigov.us/reportEmbed";
            endpoints.loginUrl = "https://login.microsoftonline.us";
            break;
        case "USGovDoD":
            endpoints.apiPrefix = "https://api.mil.powerbi.us";
            endpoints.xmlaPrefix = "powerbi://api.mil.powerbi.us";
            endpoints.webPrefix = "https://app.mil.powerbi.us";
            endpoints.resourceUrl = "https://analysis.dod.usgovcloudapi.net/powerbi/api";
            endpoints.embedUrl = "https://app.mil.powerbi.us/reportEmbed";
            endpoints.loginUrl = "https://login.microsoftonline.us";
            break;
        default:
            break;
    }

    // Return the endpoints
    return endpoints;
}

// Create the 'test-cases' directory if it doesn't exist
const testCasesDir = path.join(__dirname, '../test-cases');
if (!fs.existsSync(testCasesDir)) {
    fs.mkdirSync(testCasesDir, { recursive: true }); // Ensure the directory is created
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, testCasesDir); // Save to 'test-cases' folder
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname); // Use the original file name
    }
});

const upload = multer({ storage: storage });


// ENDPOINTS

// Get Access Token
async function getAccessToken() {
    const apiPrefix = getAPIEndpoints(process.env.ENVIRONMENT).apiPrefix;
    const tokenResponse = await cca.acquireTokenByClientCredential(tokenRequest);
    return { accessToken: tokenResponse.accessToken, apiUrl: apiPrefix, effectiveUserName: process.env.EFFECTIVE_USERNAME }
}

// Route to get access token
app.get('/getToken', async (req, res) => {
    try {
        const response = await getAccessToken();
        res.json(response);
    } catch (error) {
        console.error('Error acquiring token:', error);
        res.status(500).json({ error: 'Failed to get access token' });
    }
});

// Route to execute PowerShell script
app.get('/executeScript', async (req, res) => {
    const workspaceName = req.query.workspaceName;
    const datasetName = req.query.datasetName;

    if (!workspaceName || !datasetName) {
        return res.status(400).json({ error: "Workspace Name and Dataset Name are required" });
    }

    try {
        // Get access token
        const { accessToken } = await getAccessToken();

        // Path to your PowerShell script
        const scriptPath = path.join(__dirname, 'Execute-XMLAQuery.ps1');

        // Define the dataset name and XMLA query based on the report
        const xmlaQuery = "EVALUATE INFO.ROLES()";
        const dataSource = `${testSettings.xmlaPrefix}/v1.0/myorg/${workspaceName}`;

        // Prepare the PowerShell command
        const command = `pwsh.exe -ExecutionPolicy Bypass -File "${scriptPath}" -ClientId "${clientId}" -ClientSecret "${clientSecret}" -TenantId "${tenantId}" -XmlaQuery "${xmlaQuery}" -DataSource "${dataSource}" -DatasetName "${datasetName}" -AccessToken "${accessToken}"`;

        // Execute the PowerShell script
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing PowerShell script: ${error.message}`);
                res.status(500).json({ error: 'Failed to execute script' });
                return;
            }
            if (stderr) {
                console.error(`PowerShell script error: ${stderr}`);
                res.status(500).json({ error: 'PowerShell error' });
                return;
            }

            console.log("Query Results:", stdout);

            // Parse the XMLA response
            const parser = new xml2js.Parser();
            parser.parseString(stdout, (err, result) => {
                if (err) {
                    return res.status(500).send("Error parsing XML");
                }

                // Navigate to the rows in the parsed XML, check if rows exist
                const rows = result?.['return']?.['root']?.[0]?.['row'];

                if (!rows || rows.length === 0) {
                    return res.json({ message: "No rows found" });
                }

                // Extract the values for the C2 nodes, checking if the node exists
                const roles = rows.map(row => {
                    // Check if C2 exists and is an array with at least one value
                    return row['C2'] && row['C2'].length > 0 ? row['C2'][0] : 'C2 node not found';
                });

                res.json({ roles });
            })
        });

    } catch (error) {
        console.error('Error executing script:', error);
        res.status(500).json({ error: 'Failed to execute script' });
    }
});

// Serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Route to upload a CSV test file
app.post('/uploadCsv', upload.single('testFile'), (req, res) => {
    // Check if file was uploaded
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    res.json({ message: 'File uploaded successfully', fileName: req.file.originalname });
});

app.listen(port, () => {
    console.log(`App running at http://localhost:${port}`);
});
