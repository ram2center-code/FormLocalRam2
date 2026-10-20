# Test Script Phase 4: Form Submission & Scoring Engine Test
$baseUrl = "http://localhost:4000/api"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ">>> STARTING PHASE 4 SUBMISSION & SCORING TESTS" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Login as user1 (Form Creator & Submitter)
$loginBody = @{
    username = "user1"
    password = "ChangeMe123!"
} | ConvertTo-Json

$loginRes = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $loginRes.data.accessToken
$headers = @{
    Authorization = "Bearer $token"
}
Write-Host "[1] Login as user1: SUCCESS" -ForegroundColor Green

# 2. Create a SCORE_TEST form
$formPayload = @{
    title = "แบบทดสอบวัดผลคณิตและทั่วไป (Phase 4 Test)"
    description = "แบบทดสอบอัตโนมัติสำหรับทดสอบระบบตรวจคะแนน"
    type = "SCORE_TEST"
    visibility = "PUBLIC"
    schema = @(
        @{
            id = "q1"
            type = "number"
            label = "1 + 2 = เท่าไร?"
            required = $true
            points = 5
            correctAnswer = 3
        },
        @{
            id = "q2"
            type = "text"
            label = "เมืองหลวงของประเทศไทยคือ?"
            required = $true
            points = 5
            correctAnswer = "กรุงเทพ"
        },
        @{
            id = "q3"
            type = "single_choice"
            label = "หนึ่งสัปดาห์มีกี่วัน?"
            required = $true
            points = 5
            options = @(
                @{ id = "opt_5"; label = "5 วัน" },
                @{ id = "opt_7"; label = "7 วัน" }
            )
            correctAnswer = "opt_7"
        }
    )
    scoreConfig = @{
        passScore = 60
        passType = "percent"
        showResultToUser = $true
    }
} | ConvertTo-Json -Depth 5

$createRes = Invoke-RestMethod -Uri "$baseUrl/forms" -Method Post -Headers $headers -Body ([System.Text.Encoding]::UTF8.GetBytes($formPayload)) -ContentType "application/json; charset=utf-8"
$formId = $createRes.data.id
Write-Host "[2] Create SCORE_TEST Form: SUCCESS (ID: $formId)" -ForegroundColor Green

# 3. Publish Form
$publishPayload = @{
    schema = $createRes.data.versions[0].schema
    scoreConfig = @{
        passScore = 60
        passType = "percent"
        showResultToUser = $true
    }
} | ConvertTo-Json -Depth 5

$pubRes = Invoke-RestMethod -Uri "$baseUrl/forms/$formId/publish" -Method Post -Headers $headers -Body ([System.Text.Encoding]::UTF8.GetBytes($publishPayload)) -ContentType "application/json; charset=utf-8"
Write-Host "[3] Publish Form: SUCCESS (Version: $($pubRes.data.version))" -ForegroundColor Green

# 4. Submit Answers (All correct: 3, กรุงเทพ, opt_7)
$submitPayload = @{
    answers = @{
        q1 = 3
        q2 = "กรุงเทพ"
        q3 = "opt_7"
    }
} | ConvertTo-Json -Depth 5

$submitRes = Invoke-RestMethod -Uri "$baseUrl/forms/$formId/submit" -Method Post -Headers $headers -Body ([System.Text.Encoding]::UTF8.GetBytes($submitPayload)) -ContentType "application/json; charset=utf-8"
$subData = $submitRes.data

if ($subData.score -eq 15 -and $subData.maxScore -eq 15 -and $subData.passed -eq $true) {
    Write-Host "[4] Form Submission & Auto-Scoring: SUCCESS (Score: $($subData.score)/$($subData.maxScore), Passed: $($subData.passed), Grade: $($subData.grade))" -ForegroundColor Green
} else {
    Write-Host "[4] Form Submission & Auto-Scoring: FAILED (Result: $($subData | ConvertTo-Json))" -ForegroundColor Red
    exit 1
}

# 5. Get Submissions as Form Owner
try {
    $subListRes = Invoke-RestMethod -Uri "$baseUrl/forms/$formId/submissions" -Method Get -Headers $headers
    if ($subListRes -is [string]) {
        $subListRes = $subListRes | ConvertFrom-Json
    }
    $listData = $subListRes.data
    Write-Host "Raw summary: $($listData.summary | ConvertTo-Json)" -ForegroundColor Yellow

    if ($listData.summary.totalSubmissions -ge 1) {
        Write-Host "[5] Get Form Submissions & Summary Stats: SUCCESS (Total: $($listData.summary.totalSubmissions), PassRate: $($listData.summary.passRate)%)" -ForegroundColor Green
    } else {
        Write-Host "[5] Get Form Submissions & Summary Stats: FAILED (Result: $($listData | ConvertTo-Json -Depth 4))" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "[5] Get Form Submissions threw error: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        Write-Host "HTTP Response: $($reader.ReadToEnd())" -ForegroundColor Red
    }
    exit 1
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ">>> ALL PHASE 4 BACKEND TESTS PASSED (5/5)!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
