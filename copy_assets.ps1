$destDir = "$PSScriptRoot\assets"
if (!(Test-Path $destDir)) {
    New-Item -ItemType Directory -Path $destDir -Force | Out-Null
}

$sourceDir = "C:\Users\Saloni Yadav\.gemini\antigravity-ide\brain\6718bfdb-8c41-4af4-90b8-bb93c8386539"

Copy-Item "$sourceDir\process_botanical_1790941277439.jpg" "$destDir\process_botanical.jpg" -Force
Copy-Item "$sourceDir\project_velvet_1790941456219.jpg" "$destDir\project_velvet.jpg" -Force
Copy-Item "$sourceDir\project_aurora_1790941482309.jpg" "$destDir\project_aurora.jpg" -Force
Copy-Item "$sourceDir\project_mindspace_1790941518800.jpg" "$destDir\project_mindspace.jpg" -Force

Write-Host "All assets copied successfully to $destDir!"
