#requires -Version 5.1
<#
.SYNOPSIS
    Builds a clean release zip for pbi-dataops-visual-error-testing.

.DESCRIPTION
    Stages only the files a consumer needs, excludes secrets/generated artifacts,
    verifies no forbidden files are present, and produces a zip plus SHA256 hash.

.PARAMETER OutputDirectory
    Folder (relative to repo root) where the zip is written. Default: release

.PARAMETER ZipName
    Name of the output zip file. Default: pbi-dataops-visual-error-testing.zip

.PARAMETER IncludeDocumentation
    Include documentation/ and its images. Default: true

.PARAMETER IncludePipelineScripts
    Include pipeline-scripts/ templates. Default: true
#>
[CmdletBinding()]
param(
    [string]$OutputDirectory = "release",
    [string]$ZipName = "pbi-dataops-visual-error-testing.zip",
    [switch]$IncludeDocumentation = $true,
    [switch]$IncludePipelineScripts = $true
)

$ErrorActionPreference = "Stop"

$repoRoot = $PSScriptRoot
$outputDir = [System.IO.Path]::Combine($repoRoot, $OutputDirectory)
$zipPath = [System.IO.Path]::Combine($outputDir, $ZipName)
$staging = [System.IO.Path]::Combine(
    [System.IO.Path]::GetTempPath(),
    "pbi-vis-rel-" + [System.Guid]::NewGuid().ToString("N")
)

function New-Directory {
    param([string]$Path)
    if (-not (Test-Path $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }
}

New-Directory $outputDir
New-Directory $staging

if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

# ---------------------------------------------------------------------------
# Explicit include list - these are the only items that ship in the release.
# ---------------------------------------------------------------------------
$include = [System.Collections.Generic.List[string]]::new()
$include.Add("README.md")
$include.Add("LICENSE")
$include.Add(".gitignore")
$include.Add("package.json")
$include.Add("package-lock.json")
$include.Add("template.env")
$include.Add("global-setup.ts")
$include.Add("playwright.config.ts")
$include.Add("generate-test-cases.ps1")
$include.Add("create-release.ps1")
$include.Add("helper-functions")
$include.Add("tests")
$include.Add("test-generation")

# Keep the test-cases folder structure, but do NOT ship user CSV/JSON data.
$include.Add("test-cases\placeholder.txt")

if ($IncludeDocumentation) { $include.Add("documentation") }
if ($IncludePipelineScripts) { $include.Add("pipeline-scripts") }

$skipDirNames = @("node_modules", "test-results", "playwright-report", "blob-report", ".git", ".vscode", "release", ".cache")
$forbiddenFilePatterns = @(".env", ".env.*", "localsettings.json", "*.pfx", "*.key", "*.pem")

function Copy-ReleaseTree {
    param(
        [string]$SourceRoot,
        [string]$DestRoot
    )

    $sourceRootLen = $SourceRoot.TrimEnd('\', '/').Length

    $files = Get-ChildItem -Path $SourceRoot -Recurse -File -Force |
        Where-Object {
            $relative = $_.FullName.Substring($sourceRootLen).TrimStart('\', '/')
            $segments = $relative -split '[\\/]'
            foreach ($seg in $segments) {
                if ($skipDirNames -contains $seg) { return $false }
            }
            foreach ($p in $forbiddenFilePatterns) {
                if ($_.Name -like $p) { return $false }
            }
            return $true
        }

    foreach ($file in $files) {
        $relative = $file.FullName.Substring($sourceRootLen).TrimStart('\', '/')
        $destFile = [System.IO.Path]::Combine($DestRoot, $relative)
        $destDir = [System.IO.Path]::GetDirectoryName($destFile)
        New-Directory $destDir
        Copy-Item -Path $file.FullName -Destination $destFile -Force
    }
}

foreach ($item in $include) {
    $src = [System.IO.Path]::Combine($repoRoot, $item)
    if (-not (Test-Path $src)) {
        Write-Warning "Included path not found and will be skipped: $item"
        continue
    }

    $dest = [System.IO.Path]::Combine($staging, $item)

    if ((Get-Item $src).PSIsContainer) {
        Copy-ReleaseTree -SourceRoot $src -DestRoot $dest
    } else {
        $destDir = [System.IO.Path]::GetDirectoryName($dest)
        New-Directory $destDir
        Copy-Item -Path $src -Destination $dest -Force
    }
}

# ---------------------------------------------------------------------------
# Safety scan for files that must never ship in a release.
# ---------------------------------------------------------------------------
$forbiddenPatterns = @(".env", ".env.*", "localsettings.json", "*.pfx", "*.key", "*.pem")
$foundForbidden = Get-ChildItem -Path $staging -Recurse -File | Where-Object {
    $n = $_.Name
    foreach ($p in $forbiddenPatterns) {
        if ($n -like $p) { return $true }
    }
    return $false
}

if ($foundForbidden) {
    throw "Release build aborted: forbidden files detected in staging: $($foundForbidden.FullName -join ', ')"
}

# ---------------------------------------------------------------------------
# Create the zip (using .NET to include hidden files like .gitignore).
# ---------------------------------------------------------------------------
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory(
    $staging,
    $zipPath,
    [System.IO.Compression.CompressionLevel]::Optimal,
    $false  # includeBaseDirectory
)

# ---------------------------------------------------------------------------
# Verify and report.
# ---------------------------------------------------------------------------
$zip = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
try {
    $entries = $zip.Entries | Select-Object -ExpandProperty FullName | Sort-Object
    Write-Host "`nRelease archive created: $zipPath" -ForegroundColor Green
    Write-Host "Entries ($($entries.Count)):"
    $entries | ForEach-Object { Write-Host "  $_" }
} finally {
    $zip.Dispose()
}

$hash = (Get-FileHash -Path $zipPath -Algorithm SHA256).Hash
Write-Host "`nSHA256: $hash" -ForegroundColor Green

# Cleanup staging.
Remove-Item -Path $staging -Recurse -Force
