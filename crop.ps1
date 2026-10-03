Add-Type -AssemblyName System.Drawing

$img = [System.Drawing.Bitmap]::FromFile("$PSScriptRoot\Screenshot 2026-10-02 152409.png")
Write-Host "Image size: $($img.Width) x $($img.Height)"

# Crop 1: Left pin (The full editorial portfolio mockup)
# Approximate coordinates of the left pin card
$rectLeft = New-Object System.Drawing.Rectangle(105, 205, 545, 1400)
# Ensure within bounds
$rectLeft.Height = [Math]::Min($rectLeft.Height, $img.Height - $rectLeft.Y)
$cropLeft = $img.Clone($rectLeft, $img.PixelFormat)
$cropLeft.Save("$PSScriptRoot\crop_left_pin.png", [System.Drawing.Imaging.ImageFormat]::Png)
$cropLeft.Dispose()

# Crop 2: Right pin (Md. Tanvir Hasan Rudro Maruf's portfolio card)
# Coordinates on the right side
$rectRight = New-Object System.Drawing.Rectangle(1600, 375, 290, 560)
# Let's adjust for typical 1920 width
$xRight = [int]($img.Width * 0.83)
$yRight = [int]($img.Height * 0.37)
$wRight = [int]($img.Width * 0.15)
$hRight = [int]($img.Height * 0.3)
$rectRight = New-Object System.Drawing.Rectangle($xRight, $yRight, $wRight, $hRight)
$cropRight = $img.Clone($rectRight, $img.PixelFormat)
$cropRight.Save("$PSScriptRoot\crop_tanvir_card.png", [System.Drawing.Imaging.ImageFormat]::Png)
$cropRight.Dispose()

$img.Dispose()
Write-Host "Crops saved successfully!"
