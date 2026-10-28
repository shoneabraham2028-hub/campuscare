Write-Host "CampusCare prerequisite check" -ForegroundColor Cyan
systeminfo | findstr /C:"Total Physical Memory"
(Get-CimInstance Win32_Processor).NumberOfLogicalProcessors
foreach ($cmd in @("docker","kubectl","minikube","git","node","npm")) {
  $found = Get-Command $cmd -ErrorAction SilentlyContinue
  if ($found) { Write-Host "$cmd : $(& $cmd --version 2>$null | Select-Object -First 1)" -ForegroundColor Green }
  else { Write-Host "$cmd : NOT FOUND" -ForegroundColor Yellow }
}
