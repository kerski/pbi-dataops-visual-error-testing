// Importing required modules for authentication and HTTP requests
import { ConfidentialClientApplication } from '@azure/msal-node';
import axios from 'axios';

// Interfaces for configuration and embedding
export interface Endpoints {
  apiPrefix: string;
  webPrefix: string;
  resourceUrl: string;
  embedUrl: string;
  loginUrl: string;
}

export interface EmbedInfo {
  workspaceId: string;
  reportId: string;
  bookmarkId?: string;
  pageId: string;
  userName: string;
  datasetId: string;
  role: string;
}

export interface ReportEmbedInfo {
  reports: any[];
  datasets: any[];
  targetWorkspaces: any[];
  accessLevel: string;
  identities?: any[];
}

export interface PaginatedEmbedInfo {
  reports: any;
  datasets: [];
}

export interface TestSettings {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  environment: string;
  testCases: string;
}

// Enum for supported cloud environments
export enum Environment {
  Public = "Public",
  Germany = "Germany",
  China = "China",
  USGov = "USGov",
  USGovHigh = "USGovHigh",
  USGovDoD = "USGovDoD"
}

/**
 * Returns the correct API endpoints for the specified Power BI environment.
 */
export function getAPIEndpoints(environment: Environment): Endpoints {
  // Default to Public cloud endpoints
  let endpoints: Endpoints = {
    apiPrefix: 'https://api.powerbi.com',
    webPrefix: 'https://app.powerbi.com',
    resourceUrl: 'https://analysis.windows.net/powerbi/api',
    embedUrl: 'https://app.powerbi.com/reportEmbed',
    loginUrl: 'https://login.microsoftonline.com'
  };

  // Override endpoints for other sovereign clouds
  switch (environment) {
    case Environment.Germany:
      endpoints.apiPrefix = "https://api.powerbi.de";
      endpoints.webPrefix = "https://app.powerbi.de";
      endpoints.resourceUrl = "https://analysis.cloudapi.de/powerbi/api";
      endpoints.embedUrl = "https://app.powerbi.de/reportEmbed";
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
  }

  return endpoints;
}

/**
 * Acquires an Azure AD token using client credentials.
 */
export async function getAccessToken(testSettings: TestSettings): Promise<string | undefined> {
  const endpoint = getAPIEndpoints(testSettings.environment as Environment);

  // Configure the confidential client for MSAL
  const cca = new ConfidentialClientApplication({
    auth: {
      clientId: testSettings.clientId,
      clientSecret: testSettings.clientSecret,
      authority: `${endpoint.loginUrl}/${testSettings.tenantId}`
    }
  });

  // Request token with scope for Power BI
  const tokenRequest = { scopes: [`${endpoint.resourceUrl}/.default`] };

  try {
    const response = await cca.acquireTokenByClientCredential(tokenRequest);
    return response?.accessToken;
  } catch (error) {
    console.error(`Failed to get access token:`, error);
  }
}

/**
 * Requests an embed token for a report.
 */
export async function getReportEmbedToken(embedInfo: ReportEmbedInfo, endpoint: Endpoints, accessToken: string): Promise<string | undefined> {
  const url = `${endpoint.apiPrefix}/v1.0/myorg/GenerateToken`;
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Authorization': `Bearer ${accessToken}`
  };

  try {
    const response = await axios.post(url, embedInfo, { headers });
    return response.data.token;
  } catch (error: any) {
    console.error(`Failed to get embed token:`, error);
    if (error.response) {
      console.error('Error Status:', error.response.status);
      console.error('Error Data:', error.response.data);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error setting up request:', error.message);
    }
  }
}

/**
 * Requests an embed token for paginated report scenarios.
 */
export async function getPaginatedEmbedToken(embedInfo: PaginatedEmbedInfo, endpoint: Endpoints, accessToken: string): Promise<string | undefined> {
  const url = `${endpoint.apiPrefix}/v1.0/myorg/GenerateToken`;
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Authorization': `Bearer ${accessToken}`
  };

  try {
    const response = await axios.post(url, embedInfo, { headers });
    return response.data.token;
  } catch (error: any) {
    console.error(`Failed to get embed token:`, error);
  }
}

/**
 * Creates a standardized embed payload for a report from a record.
 */
export function createReportEmbedInfo(record: any): ReportEmbedInfo {
  const embedInfo: ReportEmbedInfo = {
    reports: [{ id: record.report_id }],
    datasets: [{ id: record.dataset_id }],
    targetWorkspaces: [{ id: record.workspace_id }],
    accessLevel: 'View'
  };

  // If RLS is needed, set the identity
  if (record.user_name) {
    embedInfo.identities = [
      {
        username: record.user_name,
        roles: [record.role],
        datasets: [record.dataset_id]
      }
    ];
  }

  return embedInfo;
}
