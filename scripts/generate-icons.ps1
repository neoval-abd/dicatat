# Vector-drawn application icons. No external image service or design dependency.
Add-Type -AssemblyName System.Drawing
$iconDir = Join-Path $PSScriptRoot '..\public\icons'
[System.IO.Directory]::CreateDirectory($iconDir) | Out-Null
foreach ($iconSpec in @(@{ Name = 'icon-192.png'; Size = 192 }, @{ Name = 'icon-512.png'; Size = 512 }, @{ Name = 'maskable-512.png'; Size = 512 }, @{ Name = 'apple-touch-icon.png'; Size = 180 })) {
    $size = $iconSpec.Size
    $bitmap = New-Object System.Drawing.Bitmap($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#087f72'))
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, ($size * 0.035))
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $graphics.DrawRectangle($pen, ($size * 0.30), ($size * 0.24), ($size * 0.40), ($size * 0.52))
    $graphics.DrawLine($pen, ($size * 0.30), ($size * 0.66), ($size * 0.70), ($size * 0.66))
    $graphics.DrawLine($pen, ($size * 0.37), ($size * 0.46), ($size * 0.47), ($size * 0.54))
    $graphics.DrawLine($pen, ($size * 0.47), ($size * 0.54), ($size * 0.63), ($size * 0.36))
    $bitmap.Save((Join-Path $iconDir $iconSpec.Name), [System.Drawing.Imaging.ImageFormat]::Png)
    $pen.Dispose()
    $graphics.Dispose()
    $bitmap.Dispose()
}
