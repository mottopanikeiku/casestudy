$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$marketPath = Join-Path $repoRoot "data\market_intelligence.csv"
$crmPath = Join-Path $repoRoot "data\crm_notes.txt"
$kbPath = Join-Path $repoRoot "data\product_knowledge_base.md"

$requiredColumns = @(
  "id","name","credentials","title","institution","hospital_system","city","state","specialty",
  "top_cancer_types","est_monthly_patients","est_genomic_eligible","current_tempus_volume",
  "competitor_volume","primary_competitor","payer_mix","tempus_relationship","recent_publications","notes_flag"
)
$presentationFields = @("id", "name", "title", "institution", "specialty")
$kbSections = @(
  "## xT CDx",
  "## xR",
  "## xF and xF+",
  "## Hereditary Testing Powered By Ambry",
  "## TIME Trial Network",
  "## Reporting and Workflow"
)

$issues = New-Object System.Collections.Generic.List[string]

function Add-Issue {
  param([string]$Message)
  $script:issues.Add($Message)
}

function Test-Number {
  param([string]$Value)
  $parsed = 0.0
  $ok = [double]::TryParse($Value, [System.Globalization.NumberStyles]::Float, [System.Globalization.CultureInfo]::InvariantCulture, [ref]$parsed)
  return [pscustomobject]@{ Ok = $ok; Value = $parsed }
}

$headerLine = Get-Content -Path $marketPath -TotalCount 1
$headers = $headerLine.Trim('"') -split '","'
$missingColumns = $requiredColumns | Where-Object { $headers -notcontains $_ }
if ($missingColumns.Count) {
  Add-Issue "market_intelligence.csv missing required columns: $($missingColumns -join ', ')"
}

$marketRows = Import-Csv $marketPath
$presentationReady = 0

foreach ($row in $marketRows) {
  $missingPresentation = $presentationFields | Where-Object { [string]::IsNullOrWhiteSpace($row.$_) }
  if ($missingPresentation.Count) {
    Add-Issue "Provider $($row.id) missing presentation fields: $($missingPresentation -join ', ')"
  } else {
    $presentationReady++
  }

  $monthly = Test-Number $row.est_monthly_patients
  $eligible = Test-Number $row.est_genomic_eligible
  $tempus = Test-Number $row.current_tempus_volume
  $competitor = Test-Number $row.competitor_volume
  if (-not ($monthly.Ok -and $eligible.Ok -and $tempus.Ok -and $competitor.Ok)) {
    Add-Issue "Provider $($row.id) has invalid numeric fields."
    continue
  }
  if ($monthly.Value -lt 0 -or $eligible.Value -lt 0 -or $tempus.Value -lt 0 -or $competitor.Value -lt 0) {
    Add-Issue "Provider $($row.id) has negative numeric fields."
  }
  if ($eligible.Value -gt 0) {
    $routed = $tempus.Value + $competitor.Value
    if ($tempus.Value -gt $eligible.Value -or $routed -gt ($eligible.Value * 1.6)) {
      Add-Issue "Provider $($row.id) has implausible routing vs genomic-eligible volume."
    }
  }
}

$crmText = Get-Content -Path $crmPath -Raw
$crmBlocks = [regex]::Split($crmText, "\r?\n={3,}\r?\n") | ForEach-Object { $_.Trim() } | Where-Object { $_ }
# Recency in index.html is measured from CONFIG.asOfDate, so no touch may come after it.
$indexText = Get-Content -Path (Join-Path $repoRoot "index.html") -Raw
$asOfMatch = [regex]::Match($indexText, 'asOfDate:\s*"(\d{4}-\d{2}-\d{2})"')
if (-not $asOfMatch.Success) {
  Add-Issue "index.html is missing CONFIG.asOfDate."
  $asOfDate = Get-Date
} else {
  $asOfDate = [datetime]::ParseExact($asOfMatch.Groups[1].Value, "yyyy-MM-dd", [System.Globalization.CultureInfo]::InvariantCulture)
}
$crmProviderIds = New-Object System.Collections.Generic.List[string]
$crmInteractionCount = 0

foreach ($block in $crmBlocks) {
  $lines = $block -split "\r?\n"
  $providerId = if ($lines.Count -ge 1) { ($lines[0] -replace '^provider_id:\s*', '').Trim() } else { "" }
  $providerName = if ($lines.Count -ge 2) { ($lines[1] -replace '^provider_name:\s*', '').Trim() } else { "" }
  $dateMatches = [regex]::Matches($block, '(?m)^(\d{4}-\d{2}-\d{2}) \| ')

  if ([string]::IsNullOrWhiteSpace($providerId) -or [string]::IsNullOrWhiteSpace($providerName) -or $dateMatches.Count -eq 0) {
    Add-Issue "CRM block malformed for provider id '$providerId'."
    continue
  }

  $crmProviderIds.Add($providerId)
  $crmInteractionCount += $dateMatches.Count

  $previousDate = $null
  foreach ($match in $dateMatches) {
    $dateString = $match.Groups[1].Value
    $parsedDate = $null
    try {
      $parsedDate = [datetime]::ParseExact($dateString, "yyyy-MM-dd", [System.Globalization.CultureInfo]::InvariantCulture)
    } catch {
      Add-Issue "CRM has invalid date '$dateString' for provider $providerId."
      continue
    }
    if ($parsedDate -gt $asOfDate) {
      Add-Issue "CRM date '$dateString' for provider $providerId is after the as-of date $($asOfDate.ToString('yyyy-MM-dd'))."
    }
    if ($previousDate -and $parsedDate -lt $previousDate) {
      Add-Issue "CRM dates are out of order for provider $providerId."
      break
    }
    $previousDate = $parsedDate
  }
}

$marketIds = $marketRows | ForEach-Object { $_.id } | Where-Object { $_ } | Sort-Object -Unique
$crmIds = $crmProviderIds | Sort-Object -Unique
$missingCrmIds = $crmIds | Where-Object { $marketIds -notcontains $_ }
if ($missingCrmIds.Count) {
  Add-Issue "CRM provider ids missing from market_intelligence.csv: $($missingCrmIds -join ', ')"
}

$kbText = Get-Content -Path $kbPath -Raw
if ([string]::IsNullOrWhiteSpace($kbText)) {
  Add-Issue "product_knowledge_base.md is empty."
}

foreach ($section in $kbSections) {
  if ($kbText -notmatch [regex]::Escape($section)) {
    Add-Issue "product_knowledge_base.md missing section '$section'."
    continue
  }

  $pattern = "(?s)" + [regex]::Escape($section) + "(.*?)(?=\r?\n## |$)"
  $match = [regex]::Match($kbText, $pattern)
  if (-not $match.Success -or $match.Groups[1].Value -notmatch 'https?://\S+') {
    Add-Issue "product_knowledge_base.md section '$section' needs at least one citation URL."
  }
}

$summary = [pscustomobject]@{
  market_rows = $marketRows.Count
  presentation_ready = $presentationReady
  crm_accounts = $crmIds.Count
  crm_interactions = $crmInteractionCount
  id_overlap = ($crmIds | Where-Object { $marketIds -contains $_ }).Count
  kb_sections_present = ($kbSections | Where-Object { $kbText -match [regex]::Escape($_) }).Count
}

$summary | Format-List

if ($issues.Count) {
  Write-Host ""
  Write-Host "Validation issues:" -ForegroundColor Yellow
  $issues | ForEach-Object { Write-Host "- $_" -ForegroundColor Yellow }
  exit 1
}

Write-Host ""
Write-Host "Local input validation passed." -ForegroundColor Green
