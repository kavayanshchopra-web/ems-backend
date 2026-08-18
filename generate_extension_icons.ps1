Add-Type -AssemblyName System.Drawing
$dir = "d:\AG Projects\whatsapp-crm\extension\icons"
if (!(Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

$sizes = @(16, 48, 128)
foreach ($s in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap($s, $s)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(13, 148, 136))
    $g.FillEllipse($brush, 0, 0, $s, $s)
    $bmp.Save("$dir\icon$s.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $brush.Dispose()
    $g.Dispose()
    $bmp.Dispose()
}
Write-Host "Icons generated successfully!"
