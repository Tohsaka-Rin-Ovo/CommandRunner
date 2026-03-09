Write-Host "Removing electron directory..."
try {
    Remove-Item -Path "node_modules\electron" -Recurse -Force -ErrorAction Stop
    Write-Host "Successfully removed electron directory"
} catch {
    Write-Host "Failed to remove: $($_.Exception.Message)"
    Write-Host "Trying alternative approach..."
    try {
        Move-Item -Path "node_modules\electron" -Destination "node_modules\electron_old" -Force -ErrorAction Stop
        Write-Host "Moved to electron_old"
    } catch {
        Write-Host "Please manually restart your computer and try again"
        exit 1
    }
}

Write-Host "Reinstalling Electron..."
npm install electron@33.2.0 --save-dev --no-save

Write-Host "Done!"
