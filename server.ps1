<#
.SYNOPSIS
    Amdaro TV - Native High-Compatibility Media Station X (MSX) Web Server
    Uses System.Net.Sockets.TcpListener (requires NO admin rights / NO elevation).
    Runs on all Windows machines without permission errors.
#>

$port = 8080

# Auto-detect primary LAN IPv4
$localIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
    $_.InterfaceAlias -notmatch "Loopback|vEthernet|WSL" -and $_.IPAddress -notmatch "^169\.254\." 
} | Select-Object -First 1).IPAddress

if (-not $localIp) {
    $localIp = "127.0.0.1"
}

$baseDir = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }

# Clean up any lingering process on $port
Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | ForEach-Object {
    if ($_.OwningProcess -and $_.OwningProcess -ne $PID) {
        Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}

$endpoint = New-Object System.Net.IPEndPoint ([System.Net.IPAddress]::Any, $port)
$listener = New-Object System.Net.Sockets.TcpListener $endpoint

try {
    $listener.Start()
} catch {
    $port = 8081
    $endpoint = New-Object System.Net.IPEndPoint ([System.Net.IPAddress]::Any, $port)
    $listener = New-Object System.Net.Sockets.TcpListener $endpoint
    $listener.Start()
}

$msxAddress = "$localIp`:$port"

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "           AMDARO TV - MEDIA STATION X SERVER (PowerShell)" -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " Web Server Active on: http://$msxAddress/" -ForegroundColor Green
Write-Host " Serving directory:    $baseDir" -ForegroundColor DarkGray
Write-Host "----------------------------------------------------------------"
Write-Host " INSTRUCTIONS FOR YOUR TV (LG webOS / Media Station X):" -ForegroundColor Yellow
Write-Host " 1. Open the 'Media Station X' app on your TV."
Write-Host " 2. Navigate to: Settings -> Start Parameter -> Setup"
Write-Host " 3. In the input box, enter ONLY this (NO forward slashes):" -ForegroundColor White
Write-Host "    -->  $msxAddress  <--" -ForegroundColor Green
Write-Host " 4. Press OK / click the checkmark."
Write-Host " 5. Amdaro TV will automatically launch full screen!" -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "Server is running. Press Ctrl+C to stop.`n"

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
    ".vtt"  = "text/vtt"
}

try {
    while ($true) {
        $client = $listener.AcceptTcpClient()
        $stream = $client.GetStream()
        $reader = New-Object System.IO.StreamReader $stream, [System.Text.Encoding]::UTF8

        $requestLine = $reader.ReadLine()
        if (-not $requestLine) {
            $client.Close()
            continue
        }

        # Parse request line (e.g. GET /msx/start.json HTTP/1.1)
        $parts = $requestLine.Split(" ")
        $method = $parts[0]
        $rawUrl = if ($parts.Length -gt 1) { $parts[1] } else { "/" }

        # Read remaining headers
        $hostHeader = $msxAddress
        while ($line = $reader.ReadLine()) {
            if ($line -eq "") { break }
            if ($line -match "^Host:\s*(.+)$") {
                $hostHeader = $matches[1].Trim()
            }
        }

        if ($method -eq "OPTIONS") {
            $headers = "HTTP/1.1 200 OK`r`n" +
                       "Access-Control-Allow-Origin: *`r`n" +
                       "Access-Control-Allow-Methods: GET, POST, OPTIONS, HEAD`r`n" +
                       "Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Range`r`n" +
                       "Content-Length: 0`r`n" +
                       "Connection: close`r`n`r`n"
            $hdrBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
            $stream.Write($hdrBytes, 0, $hdrBytes.Length)
            $stream.Flush()
            $client.Close()
            continue
        }

        $cleanUrl = $rawUrl.Split('?')[0]
        if ($cleanUrl -eq "/" -or $cleanUrl -eq "") {
            $cleanUrl = "/index.html"
        }

        $relPath = [System.Uri]::UnescapeDataString($cleanUrl).TrimStart('/').Replace('/', '\')
        $filePath = Join-Path $baseDir $relPath

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mime = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }

            if ($ext -eq ".json") {
                $text = [System.IO.File]::ReadAllText($filePath)
                $text = $text.Replace("{PREFIX}", "http://")
                $text = $text.Replace("{SERVER}", $hostHeader)
                $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($text)
            } else {
                $bodyBytes = [System.IO.File]::ReadAllBytes($filePath)
            }

            $headers = "HTTP/1.1 200 OK`r`n" +
                       "Access-Control-Allow-Origin: *`r`n" +
                       "Access-Control-Allow-Methods: GET, POST, OPTIONS, HEAD`r`n" +
                       "Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Range`r`n" +
                       "Cache-Control: no-cache, no-store, must-revalidate`r`n" +
                       "Content-Type: $mime`r`n" +
                       "Content-Length: $($bodyBytes.Length)`r`n" +
                       "Connection: close`r`n`r`n"
            $hdrBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
            $stream.Write($hdrBytes, 0, $hdrBytes.Length)
            $stream.Write($bodyBytes, 0, $bodyBytes.Length)
        } else {
            $errBody = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $cleanUrl")
            $headers = "HTTP/1.1 404 Not Found`r`n" +
                       "Access-Control-Allow-Origin: *`r`n" +
                       "Content-Type: text/plain; charset=utf-8`r`n" +
                       "Content-Length: $($errBody.Length)`r`n" +
                       "Connection: close`r`n`r`n"
            $hdrBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
            $stream.Write($hdrBytes, 0, $hdrBytes.Length)
            $stream.Write($errBody, 0, $errBody.Length)
        }

        $stream.Flush()
        $client.Close()
    }
} finally {
    $listener.Stop()
}
