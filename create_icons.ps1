# Create PNG icons for all Android mipmap densities
Add-Type -AssemblyName System.Drawing

$sizes = @{
    36  = "mipmap-ldpi"
    48  = "mipmap-mdpi"
    72  = "mipmap-hdpi"
    96  = "mipmap-xhdpi"
    144 = "mipmap-xxhdpi"
    192 = "mipmap-xxxhdpi"
}

$resDir = "d:\AG Projects\whatsapp-crm\flutter_sim_app\android\app\src\main\res"

foreach ($size in $sizes.Keys) {
    $folder = $sizes[$size]
    $dir = Join-Path $resDir $folder
    [System.IO.Directory]::CreateDirectory($dir) | Out-Null

    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    # Dark blue background
    $g.Clear([System.Drawing.Color]::FromArgb(30, 58, 95))

    # Blue circle
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(79, 142, 247))
    $pad = [int]($size * 0.12)
    $g.FillEllipse($brush, $pad, $pad, $size - 2*$pad, $size - 2*$pad)

    # White play triangle
    $wbrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $p1 = [System.Drawing.PointF]::new([float]($size * 0.38), [float]($size * 0.28))
    $p2 = [System.Drawing.PointF]::new([float]($size * 0.38), [float]($size * 0.72))
    $p3 = [System.Drawing.PointF]::new([float]($size * 0.72), [float]($size * 0.50))
    $pts = [System.Drawing.PointF[]]@($p1, $p2, $p3)
    $g.FillPolygon($wbrush, $pts)

    $path = Join-Path $dir "ic_launcher.png"
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)

    $g.Dispose()
    $bmp.Dispose()
    $brush.Dispose()
    $wbrush.Dispose()

    Write-Host "Created: $folder\ic_launcher.png ($size x $size)"
}

Write-Host ""
Write-Host "All icons created successfully!" -ForegroundColor Green
