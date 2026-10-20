$baseUrl = "http://localhost:4000/api"

Write-Host "=== TEST: FORM TRASH & SOFT DELETE SYSTEM ===" -ForegroundColor Cyan

# 1. Login as Admin
Write-Host "`n1. Logging in as Admin..." -ForegroundColor Yellow
$loginPayload = @{
    username = "admin"
    password = "ChangeMe123!"
} | ConvertTo-Json

$loginRes = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginPayload -ContentType "application/json"
if (-not $loginRes.success) {
    Write-Host "Login failed!" -ForegroundColor Red
    exit 1
}
$headers = @{
    Authorization = "Bearer $($loginRes.data.accessToken)"
}
Write-Host "Login successful! User: $($loginRes.data.user.fullName)" -ForegroundColor Green

# 2. Create a Test Form
Write-Host "`n2. Creating test form..." -ForegroundColor Yellow
$createPayload = @{
    title = "แบบฟอร์มทดสอบระบบถังขยะ E2E"
    description = "ทดสอบการย้ายลงถังขยะ การกู้คืน และการลบถาวร"
    type = "GENERAL"
    visibility = "PRIVATE"
} | ConvertTo-Json

$createRes = Invoke-RestMethod -Uri "$baseUrl/forms" -Method Post -Body $createPayload -ContentType "application/json" -Headers $headers
$formId = $createRes.data.id
Write-Host "Form created successfully! Form ID: $formId, Title: $($createRes.data.title)" -ForegroundColor Green

# 3. Check Active Forms: Must contain the form
Write-Host "`n3. Checking active forms list..." -ForegroundColor Yellow
$activeFormsRes = Invoke-RestMethod -Uri "$baseUrl/forms" -Method Get -Headers $headers
$foundActive = $activeFormsRes.data | Where-Object { $_.id -eq $formId }
if ($foundActive) {
    Write-Host "PASS: Form found in active forms list." -ForegroundColor Green
} else {
    Write-Host "FAIL: Form not found in active forms list!" -ForegroundColor Red
    exit 1
}

# 4. Move Form to Trash (Soft Delete)
Write-Host "`n4. Moving form to Trash (DELETE /forms/$formId)..." -ForegroundColor Yellow
$trashRes = Invoke-RestMethod -Uri "$baseUrl/forms/$formId" -Method Delete -Headers $headers
Write-Host "Server Response: $($trashRes.message)" -ForegroundColor Green

# 5. Check Active Forms: Must NOT contain the trashed form
Write-Host "`n5. Checking active forms list after moving to trash..." -ForegroundColor Yellow
$activeFormsAfterTrash = Invoke-RestMethod -Uri "$baseUrl/forms" -Method Get -Headers $headers
$foundActiveAfter = $activeFormsAfterTrash.data | Where-Object { $_.id -eq $formId }
if (-not $foundActiveAfter) {
    Write-Host "PASS: Form is no longer in active forms list." -ForegroundColor Green
} else {
    Write-Host "FAIL: Form is still in active forms list!" -ForegroundColor Red
    exit 1
}

# 6. Check Trash List: Must contain the trashed form
Write-Host "`n6. Checking trash list (GET /forms/trash)..." -ForegroundColor Yellow
$trashListRes = Invoke-RestMethod -Uri "$baseUrl/forms/trash" -Method Get -Headers $headers
$foundInTrash = $trashListRes.data | Where-Object { $_.id -eq $formId }
if ($foundInTrash) {
    Write-Host "PASS: Form found in Trash list! DeletedAt: $($foundInTrash.deletedAt)" -ForegroundColor Green
} else {
    Write-Host "FAIL: Form not found in Trash list!" -ForegroundColor Red
    exit 1
}

# 7. Verify Trashed Form cannot be submitted to
Write-Host "`n7. Verifying submit is blocked for trashed form..." -ForegroundColor Yellow
try {
    $submitPayload = @{ answers = @{} } | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/forms/$formId/submit" -Method Post -Body $submitPayload -ContentType "application/json" -Headers $headers
    Write-Host "FAIL: Submit succeeded unexpectedly!" -ForegroundColor Red
    exit 1
} catch {
    Write-Host "PASS: Submit blocked properly: $($_.Exception.Message)" -ForegroundColor Green
}

# 8. Restore Form from Trash
Write-Host "`n8. Restoring form from Trash (POST /forms/$formId/restore)..." -ForegroundColor Yellow
$restoreRes = Invoke-RestMethod -Uri "$baseUrl/forms/$formId/restore" -Method Post -Headers $headers
Write-Host "Server Response: $($restoreRes.message)" -ForegroundColor Green

# 9. Verify Form is back in Active Forms and gone from Trash
Write-Host "`n9. Verifying form is back in Active Forms and gone from Trash..." -ForegroundColor Yellow
$activeFormsAfterRestore = Invoke-RestMethod -Uri "$baseUrl/forms" -Method Get -Headers $headers
$foundActiveRestored = $activeFormsAfterRestore.data | Where-Object { $_.id -eq $formId }
$trashListAfterRestore = Invoke-RestMethod -Uri "$baseUrl/forms/trash" -Method Get -Headers $headers
$foundInTrashRestored = $trashListAfterRestore.data | Where-Object { $_.id -eq $formId }

if ($foundActiveRestored -and (-not $foundInTrashRestored)) {
    Write-Host "PASS: Form restored to active list and removed from trash!" -ForegroundColor Green
} else {
    Write-Host "FAIL: Restore verification failed!" -ForegroundColor Red
    exit 1
}

# 10. Move to Trash again and Permanently Delete
Write-Host "`n10. Moving to trash again and permanently deleting..." -ForegroundColor Yellow
$trashAgain = Invoke-RestMethod -Uri "$baseUrl/forms/$formId" -Method Delete -Headers $headers
$permDelete = Invoke-RestMethod -Uri "$baseUrl/forms/$formId/permanent" -Method Delete -Headers $headers
Write-Host "Server Response: $($permDelete.message)" -ForegroundColor Green

# 11. Verify Form is completely deleted
Write-Host "`n11. Verifying permanent deletion..." -ForegroundColor Yellow
$activeFinal = Invoke-RestMethod -Uri "$baseUrl/forms" -Method Get -Headers $headers
$trashFinal = Invoke-RestMethod -Uri "$baseUrl/forms/trash" -Method Get -Headers $headers
$foundFinal = ($activeFinal.data | Where-Object { $_.id -eq $formId }) -or ($trashFinal.data | Where-Object { $_.id -eq $formId })

if (-not $foundFinal) {
    Write-Host "PASS: Form permanently deleted from database!" -ForegroundColor Green
} else {
    Write-Host "FAIL: Form still exists in database!" -ForegroundColor Red
    exit 1
}

Write-Host "`n>>> ALL 11 TRASH & SOFT DELETE CHECKS PASSED (100%) <<<" -ForegroundColor Green
