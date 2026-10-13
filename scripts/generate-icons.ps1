Add-Type -AssemblyName System.Drawing
[System.IO.Directory]::CreateDirectory('public/icons') | Out-Null
$srcPath = (Resolve-Path 'public/images/aika-logo.png').Path
$src = [System.Drawing.Bitmap]::FromFile($srcPath)

function Resize-Icon([int]$w, [int]$h, [string]$destPath, [string]$bg = "", [double]$paddingFactor = 1.0) {
    $bmp = New-Object System.Drawing.Bitmap($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    
    if ($bg -ne "") {
        $color = [System.Drawing.ColorTranslator]::FromHtml($bg)
        $brush = New-Object System.Drawing.SolidBrush($color)
        $g.FillRectangle($brush, 0, 0, $w, $h)
        $brush.Dispose()
    } else {
        $g.Clear([System.Drawing.Color]::Transparent)
    }
    
    $drawW = [int]($w * $paddingFactor)
    $drawH = [int]($h * $paddingFactor)
    $offsetX = [int](($w - $drawW) / 2)
    $offsetY = [int](($h - $drawH) / 2)
    
    $g.DrawImage($src, $offsetX, $offsetY, $drawW, $drawH)
    $g.Dispose()
    $bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Created $destPath ($w x $h)"
}

Resize-Icon 192 192 'public/icons/icon-192x192.png' "" 1.0
Resize-Icon 512 512 'public/icons/icon-512x512.png' "" 1.0
Resize-Icon 512 512 'public/icons/icon-maskable-512x512.png' "#f6f6ef" 0.8
Resize-Icon 180 180 'public/icons/apple-touch-icon.png' "#f6f6ef" 0.9
Resize-Icon 64 64 'public/icons/favicon-64x64.png' "" 1.0

$src.Dispose()
Write-Host "All PWA icons generated successfully."
