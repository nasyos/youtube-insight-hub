# APIキー認証 テストスクリプト (PowerShell)
# 使用方法: .\test-api-auth.ps1

$baseUrl = "https://youtube-insight-hub-pied.vercel.app"
$apiKey = "C7J0NquorPID83H6atT1YKWGFplixAB9"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "APIキー認証 テスト開始" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# テスト1: 認証なしでリクエスト（エラーになることを確認）
Write-Host "テスト1: 認証なしでリクエスト" -ForegroundColor Yellow
Write-Host "期待される結果: 401 Unauthorized" -ForegroundColor Gray
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/youtube/poll" `
        -Method POST `
        -ContentType "application/json" `
        -Body '{"maxResults": 1}' `
        -ErrorAction Stop
    
    Write-Host "❌ 失敗: 認証なしでも成功してしまいました" -ForegroundColor Red
    Write-Host "レスポンス: $($response | ConvertTo-Json)" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 401) {
        Write-Host "✅ 成功: 401 Unauthorized が返されました" -ForegroundColor Green
        Write-Host "エラーメッセージ: $($_.Exception.Message)" -ForegroundColor Gray
    } else {
        Write-Host "⚠️ 予期しないエラー: ステータスコード $statusCode" -ForegroundColor Yellow
        Write-Host "エラーメッセージ: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "----------------------------------------" -ForegroundColor Gray
Write-Host ""

# テスト2: 認証ありでリクエスト（成功することを確認）
Write-Host "テスト2: 認証ありでリクエスト（正しいAPIキー）" -ForegroundColor Yellow
Write-Host "期待される結果: 200 OK" -ForegroundColor Gray
Write-Host ""

try {
    $headers = @{
        "Content-Type" = "application/json"
        "X-API-Key" = $apiKey
    }
    
    $response = Invoke-RestMethod -Uri "$baseUrl/api/youtube/poll" `
        -Method POST `
        -Headers $headers `
        -Body '{"maxResults": 1}' `
        -ErrorAction Stop
    
    Write-Host "✅ 成功: 200 OK が返されました" -ForegroundColor Green
    Write-Host "レスポンス: $($response | ConvertTo-Json -Depth 3)" -ForegroundColor Gray
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "❌ 失敗: エラーが発生しました" -ForegroundColor Red
    Write-Host "ステータスコード: $statusCode" -ForegroundColor Red
    Write-Host "エラーメッセージ: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "----------------------------------------" -ForegroundColor Gray
Write-Host ""

# テスト3: 間違ったAPIキーでリクエスト（エラーになることを確認）
Write-Host "テスト3: 認証ありでリクエスト（間違ったAPIキー）" -ForegroundColor Yellow
Write-Host "期待される結果: 401 Unauthorized" -ForegroundColor Gray
Write-Host ""

try {
    $headers = @{
        "Content-Type" = "application/json"
        "X-API-Key" = "wrong-api-key-12345"
    }
    
    $response = Invoke-RestMethod -Uri "$baseUrl/api/youtube/poll" `
        -Method POST `
        -Headers $headers `
        -Body '{"maxResults": 1}' `
        -ErrorAction Stop
    
    Write-Host "❌ 失敗: 間違ったAPIキーでも成功してしまいました" -ForegroundColor Red
    Write-Host "レスポンス: $($response | ConvertTo-Json)" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 401) {
        Write-Host "✅ 成功: 401 Unauthorized が返されました" -ForegroundColor Green
        Write-Host "エラーメッセージ: $($_.Exception.Message)" -ForegroundColor Gray
    } else {
        Write-Host "⚠️ 予期しないエラー: ステータスコード $statusCode" -ForegroundColor Yellow
        Write-Host "エラーメッセージ: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "テスト完了" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

