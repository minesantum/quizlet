$port = 8080
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:${port}/")
$listener.Start()

Write-Host "QuizClone Server running at http://localhost:${port}/"
Write-Host "Cierra esta ventana para detener el servidor."

$root = Get-Location

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response

    $path = $request.Url.LocalPath
    $method = $request.HttpMethod
    
    # CORS Headers
    $response.AddHeader("Access-Control-Allow-Origin", "*")
    $response.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    $response.AddHeader("Access-Control-Allow-Headers", "Content-Type")

    if ($method -eq "OPTIONS") {
        $response.StatusCode = 204
        $response.Close()
        continue
    }

    if ($path -eq "/api/decks") {
        if ($method -eq "GET") {
            # Read database.json
            if (Test-Path "$root\database.json") {
                $content = Get-Content "$root\database.json" -Raw -Encoding UTF8
                $buffer = [System.Text.Encoding]::UTF8.GetBytes($content)
            } else {
                $buffer = [System.Text.Encoding]::UTF8.GetBytes("[]")
            }
            $response.ContentType = "application/json"
            $response.ContentLength64 = $buffer.Length
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
        }
        elseif ($method -eq "POST") {
            # Save to database.json
            $reader = New-Object System.IO.StreamReader($request.InputStream)
            $body = $reader.ReadToEnd()
            $body | Out-File "$root\database.json" -Encoding UTF8
            
            $buffer = [System.Text.Encoding]::UTF8.GetBytes('{"status":"ok"}')
            $response.ContentType = "application/json"
            $response.ContentLength64 = $buffer.Length
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
        }
    }
    else {
        # Serve Static Files
        if ($path -eq "/") { $path = "/index.html" }
        $filePath = "$root$path"
        
        if (Test-Path $filePath) {
            try {
                $content = [System.IO.File]::ReadAllBytes($filePath)
                $response.ContentLength64 = $content.Length
                
                if ($filePath.EndsWith(".html")) { $response.ContentType = "text/html" }
                elseif ($filePath.EndsWith(".css")) { $response.ContentType = "text/css" }
                elseif ($filePath.EndsWith(".js")) { $response.ContentType = "application/javascript" }
                
                $response.OutputStream.Write($content, 0, $content.Length)
            } catch {
                $response.StatusCode = 500
            }
        } else {
            $response.StatusCode = 404
        }
    }
    $response.Close()
}
