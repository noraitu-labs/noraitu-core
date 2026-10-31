Add-Type -AssemblyName System.Drawing

function Generate-NexoraPwaIcon {
    param(
        [int]$Size,
        [string]$OutputPath,
        [bool]$IncludeText = $true
    )

    $bmp = New-Object System.Drawing.Bitmap ($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    # 1. Dark Industrial Background #050B14
    $bgColor = [System.Drawing.ColorTranslator]::FromHtml("#050B14")
    $g.Clear($bgColor)

    $scale = [float]$Size / 512.0
    $cx = [float]($Size / 2.0)
    $cy = if ($IncludeText) { [float]($Size * 0.44) } else { [float]($Size / 2.0) }

    # 2. Outer Ambient Radial Glow
    $glowPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $glowRadius = [float](220.0 * $scale)
    $glowPath.AddEllipse([float]($cx - $glowRadius), [float]($cy - $glowRadius), [float]($glowRadius * 2), [float]($glowRadius * 2))
    $pbrGlow = New-Object System.Drawing.Drawing2D.PathGradientBrush ($glowPath)
    $pbrGlow.CenterColor = [System.Drawing.Color]::FromArgb(65, 0, 240, 255) # Electric Cyan Core Glow
    $pbrGlow.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 5, 11, 20))
    $g.FillPath($pbrGlow, $glowPath)
    $pbrGlow.Dispose()
    $glowPath.Dispose()

    # 3. Concentric Orbital Rings
    $penWidth1 = [float](2.5 * $scale)
    $ringPen1 = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(90, 6, 182, 212), $penWidth1)
    $g.DrawEllipse($ringPen1, [float]($cx - 180 * $scale), [float]($cy - 180 * $scale), [float](360 * $scale), [float](360 * $scale))
    $ringPen1.Dispose()

    $penWidth2 = [float](1.5 * $scale)
    $ringPen2 = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(140, 2, 132, 199), $penWidth2)
    $ringPen2.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash
    $ringPen2.DashPattern = [single[]]@(4.0, 3.0)
    $g.DrawEllipse($ringPen2, [float]($cx - 150 * $scale), [float]($cy - 150 * $scale), [float](300 * $scale), [float](300 * $scale))
    $ringPen2.Dispose()

    # 4. Tech Hexagon Shield
    $hexR = [float](135.0 * $scale)
    $hexPoints = [System.Drawing.PointF[]]::new(6)
    for ($i = 0; $i -lt 6; $i++) {
        $angle = [Math]::PI / 3.0 * $i - [Math]::PI / 6.0
        $px = [float]($cx + $hexR * [Math]::Cos($angle))
        $py = [float]($cy + $hexR * [Math]::Sin($angle))
        $hexPoints[$i] = New-Object System.Drawing.PointF ($px, $py)
    }
    
    # Hexagon Fill
    $hexBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(40, 6, 182, 212))
    $g.FillPolygon($hexBrush, $hexPoints)
    $hexBrush.Dispose()

    # Hexagon Border
    $hexPenWidth = [float](3.5 * $scale)
    $hexPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(210, 56, 189, 248), $hexPenWidth)
    $g.DrawPolygon($hexPen, $hexPoints)
    $hexPen.Dispose()

    # 5. Stylized Futuristic 'N' Glyph (Nexora Brand Monogram)
    $stemW = [float](28.0 * $scale)
    $stemH = [float](145.0 * $scale)
    $leftX = [float]($cx - 62.0 * $scale)
    $topY = [float]($cy - 72.5 * $scale)
    
    # Left Vertical Stem (Sky Blue to Deep Cyan Gradient)
    $rectLeft = New-Object System.Drawing.RectangleF ($leftX, $topY, $stemW, $stemH)
    $brushLeft = New-Object System.Drawing.Drawing2D.LinearGradientBrush ($rectLeft, 
        [System.Drawing.ColorTranslator]::FromHtml("#38BDF8"), 
        [System.Drawing.ColorTranslator]::FromHtml("#0284C7"), 
        [System.Drawing.Drawing2D.LinearGradientMode]::Vertical)
    $g.FillRectangle($brushLeft, $rectLeft)
    $brushLeft.Dispose()

    # Right Vertical Stem (Ocean Blue Gradient)
    $rightX = [float]($cx + 34.0 * $scale)
    $rectRight = New-Object System.Drawing.RectangleF ($rightX, $topY, $stemW, $stemH)
    $brushRight = New-Object System.Drawing.Drawing2D.LinearGradientBrush ($rectRight, 
        [System.Drawing.ColorTranslator]::FromHtml("#0284C7"), 
        [System.Drawing.ColorTranslator]::FromHtml("#0369A1"), 
        [System.Drawing.Drawing2D.LinearGradientMode]::Vertical)
    $g.FillRectangle($brushRight, $rectRight)
    $brushRight.Dispose()

    # Diagonal Crossbeam (Electric Cyan to Vivid Turquoise)
    $diagPoints = [System.Drawing.PointF[]]@(
        (New-Object System.Drawing.PointF ($leftX, $topY)),
        (New-Object System.Drawing.PointF (($leftX + $stemW), $topY)),
        (New-Object System.Drawing.PointF (($rightX + $stemW), ($topY + $stemH))),
        (New-Object System.Drawing.PointF ($rightX, ($topY + $stemH)))
    )
    $diagRect = New-Object System.Drawing.RectangleF ($leftX, $topY, ($rightX - $leftX + $stemW), $stemH)
    $brushDiag = New-Object System.Drawing.Drawing2D.LinearGradientBrush ($diagRect, 
        [System.Drawing.ColorTranslator]::FromHtml("#00F0FF"), 
        [System.Drawing.ColorTranslator]::FromHtml("#06B6D4"), 
        [System.Drawing.Drawing2D.LinearGradientMode]::ForwardDiagonal)
    $g.FillPolygon($brushDiag, $diagPoints)
    $brushDiag.Dispose()

    # 6. Central Energy Core Pulse (White/Cyan Glowing Center)
    $pulseRadius = [float](14.0 * $scale)
    $pulsePath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $pulsePath.AddEllipse([float]($cx - $pulseRadius), [float]($cy - $pulseRadius), [float]($pulseRadius * 2), [float]($pulseRadius * 2))
    $pulseBrush = New-Object System.Drawing.Drawing2D.PathGradientBrush ($pulsePath)
    $pulseBrush.CenterColor = [System.Drawing.ColorTranslator]::FromHtml("#FFFFFF")
    $pulseBrush.SurroundColors = @([System.Drawing.ColorTranslator]::FromHtml("#00F0FF"))
    $g.FillPath($pulseBrush, $pulsePath)
    $pulseBrush.Dispose()
    $pulsePath.Dispose()

    # 7. Brand Label Typography (NEXORA ONE ENGINE)
    if ($IncludeText -and $Size -ge 128) {
        $fontTitleSize = [float](25.0 * $scale)
        $fontSubSize = [float](10.5 * $scale)
        
        $fontFamily = New-Object System.Drawing.FontFamily ("Segoe UI")
        $fontTitle = New-Object System.Drawing.Font ($fontFamily, $fontTitleSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
        $fontSub = New-Object System.Drawing.Font ($fontFamily, $fontSubSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)

        $format = New-Object System.Drawing.StringFormat
        $format.Alignment = [System.Drawing.StringAlignment]::Center
        $format.LineAlignment = [System.Drawing.StringAlignment]::Center

        $titleBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#F8FAFC"))
        $subBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#06B6D4"))

        $g.DrawString("NEXORA", $fontTitle, $titleBrush, $cx, [float]($Size * 0.79), $format)
        $g.DrawString("ONE ENGINE", $fontSub, $subBrush, $cx, [float]($Size * 0.86), $format)

        $titleBrush.Dispose()
        $subBrush.Dispose()
        $fontTitle.Dispose()
        $fontSub.Dispose()
        $fontFamily.Dispose()
        $format.Dispose()
    }

    # Save PNG
    $bmp.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "SUCCESS: $OutputPath ($Size x $Size)"
}

$publicDir = "D:\Nora itu UTN\public"
Generate-NexoraPwaIcon -Size 512 -OutputPath "$publicDir\icon-512x512.png" -IncludeText $true
Generate-NexoraPwaIcon -Size 512 -OutputPath "$publicDir\icon-512.png" -IncludeText $true
Generate-NexoraPwaIcon -Size 192 -OutputPath "$publicDir\icon-192x192.png" -IncludeText $true
Generate-NexoraPwaIcon -Size 192 -OutputPath "$publicDir\icon-192.png" -IncludeText $true
Generate-NexoraPwaIcon -Size 64 -OutputPath "$publicDir\favicon.png" -IncludeText $false
