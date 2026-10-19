param(
  [Parameter(Mandatory = $true)][string]$InstallerPath,
  [Parameter(Mandatory = $true)][string]$LauncherPath
)

$ErrorActionPreference = 'Stop'
$publisher = $null
foreach ($artifactPath in @($LauncherPath, $InstallerPath)) {
  $resolvedArtifact = (Resolve-Path -LiteralPath $artifactPath).Path
  $signature = Get-AuthenticodeSignature -LiteralPath $resolvedArtifact
  if ($signature.Status -ne 'Valid') {
    throw "Production signature verification failed for $resolvedArtifact ($($signature.Status))."
  }
  if (-not $signature.TimeStamperCertificate) {
    throw "Production signature has no trusted timestamp: $resolvedArtifact"
  }
  $artifactPublisher = $signature.SignerCertificate.Subject
  if ($publisher -and $publisher -ne $artifactPublisher) {
    throw 'The launcher and installer must be signed by the same publisher.'
  }
  $publisher = $artifactPublisher
  Write-Output "Verified trusted, timestamped signature: $resolvedArtifact"
}
