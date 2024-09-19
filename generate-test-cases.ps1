# Install the module, run once
# Check if the module is already installed
$moduleName = "Get-PowerBIReportPagesForTesting"
if (-not (Get-Module -ListAvailable -Name $moduleName)) {
    # Module is not installed, so install it
    Write-Output "$moduleName module is not installed. Installing now..."
    Install-Module -Name $moduleName -AllowPrerelease -Force -Scope CurrentUser
} else {
    # Module is installed
    Write-Output "$moduleName module is already installed."
}
$moduleName = "Az.Accounts"
if (-not (Get-Module -ListAvailable -Name $moduleName)) {
    # Module is not installed, so install it
    Write-Output "$moduleName module is not installed. Installing now..."
    Install-Module -Name $moduleName -Force -Scope CurrentUser
} else {
    # Module is installed
    Write-Output "$moduleName module is already installed."
}
# Import Modules
Import-Module Az.Accounts
Import-Module Get-PowerBIReportPagesForTesting

# Get Current Credential of the User
$clientId = Read-Host "Enter Client Id"
$clientSecret = Read-Host -AsSecureString "Enter Password"
$tenantId = Read-Host "Enter Tenant Id"
$credential = New-Object System.Management.Automation.PSCredential ($clientId, $clientSecret)
Connect-AzAccount -Credential $credential -ServicePrincipal

# Get other datasets
$datasetId = Read-Host "Provide the Dataset Id/Semantic Model Id"
$workspaceId = Read-Host "Provide the Workspace Id"
$roleUserName = Read-Host "Provide the Role User Name if using RLS with this semantic model"

Get-PowerBIReportPagesForTesting -DatasetId $datasetId `
        -WorkspaceId $workspaceId `
        -WorkspaceIdsToCheck $workspaceId `
        -Credential $credential `
        -TenantId $tenantId `
        -LogOutput "Host" `
        -Environment Public `
        -RoleUserName $roleUserName `
        -Path ".\test-cases\test.csv"