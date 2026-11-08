param([ValidateSet("dev", "start")][string]$Mode = "dev")

$envPath = Join-Path (Get-Location) ".env.local"
if (-not (Test-Path -LiteralPath $envPath)) { throw "Copy .env.example to .env.local first." }

$values = @{}
Get-Content -LiteralPath $envPath | ForEach-Object {
  if ($_ -match '^([^#=]+)=(.*)$') { $values[$matches[1]] = $matches[2] }
}

function Resolve-PublicDnsAddress([string]$hostName) {
  $target = $hostName
  for ($attempt = 0; $attempt -lt 6; $attempt++) {
    $records = Resolve-DnsName -Name $target -Server "1.1.1.1" -ErrorAction Stop
    $address = $records | Where-Object { $_.Type -eq "A" -and $_.IPAddress } | Select-Object -First 1 -ExpandProperty IPAddress
    if ($address) { return $address }
    $alias = $records | Where-Object { $_.NameHost } | Select-Object -First 1 -ExpandProperty NameHost
    if (-not $alias) { break }
    $target = $alias.TrimEnd(".")
  }
  throw "Could not resolve the Neon endpoint using public DNS."
}

$databaseUrl = $values["DATABASE_URL"]
$authUrl = $values["NEON_AUTH_BASE_URL"]
if (-not $databaseUrl -or -not $authUrl) { throw "Set DATABASE_URL and NEON_AUTH_BASE_URL in .env.local." }
$env:NEON_ENDPOINT_IP = Resolve-PublicDnsAddress ([uri]$databaseUrl).Host
$env:NEON_AUTH_ENDPOINT_IP = Resolve-PublicDnsAddress ([uri]$authUrl).Host

# Turbopack request workers do not consistently inherit launcher variables on
# Windows. Keep these local-only addresses in the ignored dotenv file that Next
# loads in each worker. The hostname remains in the URLs for TLS verification.
$content = Get-Content -LiteralPath $envPath -Raw
foreach ($entry in @{
  "NEON_ENDPOINT_IP" = $env:NEON_ENDPOINT_IP
  "NEON_AUTH_ENDPOINT_IP" = $env:NEON_AUTH_ENDPOINT_IP
}.GetEnumerator()) {
  $line = "$($entry.Key)=$($entry.Value)"
  if ($content -match "(?m)^$($entry.Key)=.*$") {
    $content = [regex]::Replace($content, "(?m)^$($entry.Key)=.*$", [System.Text.RegularExpressions.MatchEvaluator]{ param($match) $line })
  } else {
    $content = $content.TrimEnd() + [Environment]::NewLine + $line + [Environment]::NewLine
  }
}
Set-Content -LiteralPath $envPath -Value $content -NoNewline
if ($Mode -eq "dev") { npm run dev:raw } else { npm run start }
