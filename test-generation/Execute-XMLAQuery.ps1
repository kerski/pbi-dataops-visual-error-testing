param (
    [string]$ClientId,
    [string]$ClientSecret,
    [string]$TenantId,
    [string]$XmlaQuery,
    [string]$DataSource,
    [string]$DatasetName,
    [string]$AccessToken
)

 #Install Powershell Module if Needed
 if (Get-Module -ListAvailable -Name "SqlServer") {
    # Do Nothing
  } else {
    Install-Module -Name SqlServer -Scope CurrentUser -AllowClobber -Force
  }

  # Setup the connection string
  $secret = $ClientSecret | ConvertTo-SecureString -AsPlainText -Force	
  $credentials = [System.Management.Automation.PSCredential]::new($ClientId,$secret)	

try {
    $Result = Invoke-ASCmd -Server $DataSource `
                 -Database $DatasetName `
                 -Query $XmlaQuery `
                 -Credential $credentials `
                 -TenantId $TenantId -ServicePrincipal

      #Remove unicode chars for brackets and spaces from XML node names
      $Result = $Result -replace '_x[0-9A-z]{4}_', '';

      $Result
      
} catch {
    Write-Host "Error: $_"
} 
