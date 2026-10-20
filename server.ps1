# Servidor HTTP local ligero para habilitar la camara web en DuckStrike
$port = 8080
$url = "http://localhost:$port/"
$baseDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $baseDir) { $baseDir = Get-Location }

# Buscar puerto libre si 8080 esta ocupado
for ($p = 8080; $p -le 8090; $p++) {
    try {
        $testListener = New-Object System.Net.HttpListener
        $testUrl = "http://localhost:$p/"
        $testListener.Prefixes.Add($testUrl)
        $testListener.Start()
        $testListener.Stop()
        $port = $p
        $url = $testUrl
        break
    } catch {
        # Puerto ocupado, probar siguiente
    }
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($url)

try {
    $listener.Start()
} catch {
    Write-Host "Error al iniciar el servidor en $url : $_"
    Read-Host "Presione Enter para salir"
    exit
}

Write-Host "==========================================================" -ForegroundColor Green
Write-Host "   DuckStrike Servidor Local Activo" -ForegroundColor Yellow
Write-Host "   Direccion: $url" -ForegroundColor Cyan
Write-Host "   Navegador abriendose automaticamente..." -ForegroundColor White
Write-Host "   (Deja esta ventana abierta mientras juegues)" -ForegroundColor DarkGray
Write-Host "==========================================================" -ForegroundColor Green

Start-Process $url

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $rawPath = $request.Url.LocalPath.TrimStart('/')
        if ([string]::IsNullOrWhiteSpace($rawPath)) {
            $rawPath = "index.html"
        }
        
        # Eliminar query strings si las hay
        if ($rawPath.Contains("?")) {
            $rawPath = $rawPath.Substring(0, $rawPath.IndexOf("?"))
        }

        # Decodificar caracteres URL como espacios (%20)
        $path = [System.Uri]::UnescapeDataString($rawPath)
        $filePath = Join-Path $baseDir $path

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mime = switch ($ext) {
                ".html" { "text/html; charset=utf-8" }
                ".htm"  { "text/html; charset=utf-8" }
                ".css"  { "text/css; charset=utf-8" }
                ".js"   { "application/javascript; charset=utf-8" }
                ".json" { "application/json; charset=utf-8" }
                ".mp3"  { "audio/mpeg" }
                ".wav"  { "audio/wav" }
                ".ogg"  { "audio/ogg" }
                ".png"  { "image/png" }
                ".jpg"  { "image/jpeg" }
                ".jpeg" { "image/jpeg" }
                ".svg"  { "image/svg+xml" }
                ".ico"  { "image/x-icon" }
                default { "application/octet-stream" }
            }

            try {
                $bytes = [System.IO.File]::ReadAllBytes($filePath)
                $response.ContentType = $mime
                $response.ContentLength64 = $bytes.Length
                $response.AddHeader("Cache-Control", "no-cache")
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            } catch {
                $response.StatusCode = 500
            }
        } else {
            $response.StatusCode = 404
        }

        try {
            $response.Close()
        } catch {}
    }
} finally {
    if ($listener.IsListening) {
        $listener.Stop()
    }
}
