// Importing required modules for Auth Token
import { ConfidentialClientApplication } from '@azure/msal-node'
import axios from 'axios';

// Interface for API endpoints
export interface Endpoints {
  apiPrefix: string;
  webPrefix: string;
  resourceUrl: string;
  embedUrl: string;
  loginUrl: string;
}

// Interface for API endpoints
export interface EmbedInfo {
  workspaceId: string;
  reportId: string;
  pageId: string;
  userName: string;
  datasetId: string;
  role: string;
}

export interface TestSettings {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  environment: string;
  testCases: string;
}

// Enum for different environments
export enum Environment {
  Public = "Public",
  Germany = "Germany",
  China = "China",
  USGov = "USGov",
  USGovHigh = "USGovHigh",
  USGovDoD = "USGovDoD"
}

// Function to get API endpoints based on the environment
export function getAPIEndpoints(environment: Environment): Endpoints {
  // Default endpoints
  let endpoints: Endpoints = {
    apiPrefix: 'https://api.powerbi.com',
    webPrefix: 'https://app.powerbi.com',
    resourceUrl: 'https://analysis.windows.net/powerbi/api',
    embedUrl: 'https://app.powerbi.com/reportEmbed',
    loginUrl: 'https://login.microsoftonline.com'
  };

  // Switch case to set endpoints based on the environment
  switch (environment) {
    case Environment.Public:
      break;
    case Environment.Germany:
      endpoints.apiPrefix = "https://api.powerbi.de";
      endpoints.webPrefix = "https://app.powerbi.de";
      endpoints.resourceUrl = "https://analysis.cloudapi.de/powerbi/api";
      endpoints.embedUrl = "https://app.powerbi.de/reportEmbed";
      endpoints.loginUrl = "https://login.microsoftonline.com";
      break;
    case Environment.China:
      endpoints.apiPrefix = "https://api.powerbi.cn";
      endpoints.webPrefix = "https://app.powerbigov.cn";
      endpoints.resourceUrl = "https://analysis.chinacloudapi.cn/powerbi/api";
      endpoints.embedUrl = "https://app.powerbi.cn/reportEmbed";
      endpoints.loginUrl = "https://login.partner.microsoftonline.cn";
      break;
    case Environment.USGov:
      endpoints.apiPrefix = "https://api.powerbigov.us";
      endpoints.webPrefix = "https://app.powerbigov.us";
      endpoints.resourceUrl = "https://analysis.usgovcloudapi.net/powerbi/api";
      endpoints.embedUrl = "https://app.powerbigov.us/reportEmbed";
      endpoints.loginUrl = "https://login.microsoftonline.com";
      break;
    case Environment.USGovHigh:
      endpoints.apiPrefix = "https://api.high.powerbigov.us";
      endpoints.webPrefix = "https://app.high.powerbigov.us";
      endpoints.resourceUrl = "https://analysis.high.usgovcloudapi.net/powerbi/api";
      endpoints.embedUrl = "https://app.high.powerbigov.us/reportEmbed";
      endpoints.loginUrl = "https://login.microsoftonline.us";
      break;
    case Environment.USGovDoD:
      endpoints.apiPrefix = "https://api.mil.powerbi.us";
      endpoints.webPrefix = "https://app.mil.powerbi.us";
      endpoints.resourceUrl = "https://analysis.dod.usgovcloudapi.net/powerbi/api";
      endpoints.embedUrl = "https://app.mil.powerbi.us/reportEmbed";
      endpoints.loginUrl = "https://login.microsoftonline.us";
      break;
    default:
      break;
  }

  // Return the endpoints
  return endpoints
}

// Function to get access token
export async function getAccessToken(testSettings:TestSettings): Promise<string | undefined> {
  // Get API endpoints for the environment
  const endpoint = getAPIEndpoints(testSettings.environment as Environment);

  // ConfidentialClientApplication configuration
  const pca = {
    auth: {
      clientId: testSettings.clientId,
      clientSecret: testSettings.clientSecret,
      authority: `${endpoint.loginUrl}/${testSettings.tenantId}`
    }
  };
  // Create a ConfidentialClientApplication object
  const cca = new ConfidentialClientApplication(pca);

  // Define the scopes for the access token
  const tokenRequest = { scopes: [`${endpoint.resourceUrl}/.default`] };

  try {
    // Acquire a token
    const response = await cca.acquireTokenByClientCredential(tokenRequest);
    return response?.accessToken;
  } catch (error) {
    console.error(`Failed to get access token: ${error}`);
  }
}

// Function to get embed token
export async function getEmbedToken(embedInfo: EmbedInfo, endpoint: Endpoints, accessToken: any): Promise<string | undefined> {
  // Define the URL for the embed token
  const url = `${endpoint.apiPrefix}/v1.0/myorg/groups/${embedInfo.workspaceId}/reports/${embedInfo.reportId}/generatetoken`;
  // Define the headers for the request
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Authorization': "Bearer " + accessToken
  };

  // default to now RLS
  let jsonBody = {
    "accessLevel": "View"
  };

  // Check if the embedInfo role is defined and if we need to include RLS testing
  if(embedInfo.role !== undefined && embedInfo.datasetId !== '') {
    // Define the body for the RLS request
    jsonBody = {
      "accessLevel": "View",
      "identities": [
        {
          "username": embedInfo.userName,
          "roles": [
            embedInfo.role
          ],
          "datasets": [
            embedInfo.datasetId
          ]
        }
      ]
    };
  }// end embedInfo check

  try {
    // Acquire an embed token
    const response = await axios.post(url, jsonBody, { headers: headers });
    return response.data.token;
  } catch (error) {
    console.error(`Failed to get embed token: ${error}`);
  }
}