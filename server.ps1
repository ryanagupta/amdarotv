<#
.SYNOPSIS
    Amdaro TV - Native PowerShell Media Station X (MSX) Web Server
    Requires no extra runtimes. Uses built-in Windows .NET HttpListener with CORS.
#>

$port = 8080

# Detect local IP
$localIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
    $_.InterfaceAlias -notmatch "Loopback|vEthernet|WSL" -and $_.IPAddress -notmatch "^169\.254\." 
} | Select-Object -First 1).IPAddress

if (-not $localIp) {
    $localIp = "127.0.0.1"
}

$prefix = "http://*:$port/"
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
} catch {
    $port = 8081
    $prefix = "http://*:$port/"
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add($prefix)
    $listener.Start()
}

$msxAddress = "$localIp`:$port"

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "           AMDARO TV - MEDIA STATION X SERVER (PowerShell)" -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " Web Server Active on: http://$msxAddress/" -ForegroundColor Green
Write-Host "----------------------------------------------------------------"
Write-Host " INSTRUCTIONS FOR YOUR TV (LG webOS / Media Station X):" -ForegroundColor Yellow
Write-Host " 1. Open the 'Media Station X' app on your TV."
Write-Host " 2. Navigate to: Settings -> Start Parameter -> Setup"
Write-Host " 3. In the input box, enter ONLY this (NO forward slashes):" -ForegroundColor White
Write-Host "    -->  $msxAddress  <--" -ForegroundColor Green
Write-Host " 4. Press OK / click the checkmark."
Write-Host " 5. Amdaro TV will automatically launch full screen!" -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server.`n"

$baseDir = $PSScriptRoot

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".svg"  = "image/svg+xml"
    ".ttf"  = "font/ttf"
    ".otf"  = "font/otf"
    ".mp4"  = "video/mp4"
}

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        # CORS Headers
        $response.AddHeader("Access-Control-Allow-Origin", "*")
        $response.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, HEAD")
        $response.AddHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Range")
        $response.AddHeader("Cache-Control", "no-cache, no-store, must-revalidate")

        if ($request.HttpMethod -eq "OPTIONS") {
            $response.StatusCode = 200
            $response.Close()
            continue
        }

        $rawUrl = $request.RawUrl.Split('?')[0]
        if ($rawUrl -eq "/" -or $rawUrl -eq "") {
            $rawUrl = "/index.html"
        }

        $relPath = [System.Uri]::UnescapeDataString($rawUrl).TrimStart('/').Replace('/', '\')
        $filePath = Join-Path $baseDir $relPath

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mime = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
            $response.ContentType = $mime

            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $errBytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $rawUrl")
            $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
        }
        $response.Close()
    }
} finally {
    $listener.Stop()
}
