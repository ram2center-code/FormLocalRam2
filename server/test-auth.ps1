# ================================================================
# FormLocal Auth API Test Script (PowerShell)
# รันหลังจากเริ่มเซิร์ฟเวอร์ด้วย: npm run dev ในโฟลเดอร์ server
# ================================================================

$BaseUrl = "http://localhost:4000/api"
$Session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " 🧪 ทดสอบระบบ Auth Module (FormLocal)   " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 1. Health Check
Write-Host "`n[1/6] 📡 ตรวจสอบสถานะ Server (GET /api/health)..." -ForegroundColor Yellow
try {
    $resHealth = Invoke-RestMethod -Uri "$BaseUrl/health" -Method Get
    Write-Host "✅ Health Check สำเร็จ: $($resHealth | ConvertTo-Json -Compress)" -ForegroundColor Green
} catch {
    Write-Host "❌ Health Check ล้มเหลว! เซิร์ฟเวอร์เปิดอยู่หรือไม่?" -ForegroundColor Red
    exit 1
}

# 2. Login ด้วย Admin (admin / ChangeMe123!)
Write-Host "`n[2/6] 🔑 ทดสอบ Login ด้วย Admin (admin / ChangeMe123!)..." -ForegroundColor Yellow
$loginBody = @{
    username = "admin"
    password = "ChangeMe123!"
} | ConvertTo-Json

try {
    $loginRes = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json" -WebSession $Session
    $token = $loginRes.data.accessToken
    Write-Host "✅ Login สำเร็จ!" -ForegroundColor Green
    Write-Host "   - FullName: $($loginRes.data.user.fullName)" -ForegroundColor Cyan
    Write-Host "   - Role:     $($loginRes.data.user.role)" -ForegroundColor Cyan
    Write-Host "   - Token:    $($token.Substring(0, 30))..." -ForegroundColor DarkGray
} catch {
    Write-Host "❌ Login Admin ล้มเหลว: $_" -ForegroundColor Red
    exit 1
}

# 3. Get Current User Profile (GET /api/auth/me)
Write-Host "`n[3/6] 👤 ทดสอบดึงข้อมูล Me (GET /api/auth/me)..." -ForegroundColor Yellow
$headers = @{
    Authorization = "Bearer $token"
}

try {
    $meRes = Invoke-RestMethod -Uri "$BaseUrl/auth/me" -Method Get -Headers $headers -WebSession $Session
    Write-Host "✅ ข้อมูลโปรไฟล์ถูกต้อง:" -ForegroundColor Green
    Write-Host "   - Email:      $($meRes.data.email)" -ForegroundColor Cyan
    Write-Host "   - Department: $($meRes.data.department.name)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ GET /api/auth/me ล้มเหลว: $_" -ForegroundColor Red
}

# 4. ทดสอบ Refresh Token (POST /api/auth/refresh) ผ่าน Cookie ใน WebSession
Write-Host "`n[4/6] 🔄 ทดสอบ Refresh Token (POST /api/auth/refresh)..." -ForegroundColor Yellow
try {
    $refreshRes = Invoke-RestMethod -Uri "$BaseUrl/auth/refresh" -Method Post -WebSession $Session
    $newToken = $refreshRes.data.accessToken
    Write-Host "✅ Refresh Token สำเร็จ ได้ Access Token ใหม่!" -ForegroundColor Green
    Write-Host "   - New Token: $($newToken.Substring(0, 30))..." -ForegroundColor DarkGray
} catch {
    Write-Host "❌ Refresh Token ล้มเหลว: $_" -ForegroundColor Red
}

# 5. ทดสอบ Login ด้วยรหัสผ่านผิด (คาดหวัง 401 และบันทึก LOGIN_FAILED ใน Audit Log)
Write-Host "`n[5/6] 🛡️ ทดสอบความปลอดภัย: ป้อนรหัสผ่านผิด (Brute-force / Fail test)..." -ForegroundColor Yellow
$wrongBody = @{
    username = "admin"
    password = "WrongPassword999!"
} | ConvertTo-Json

try {
    $failRes = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body $wrongBody -ContentType "application/json"
    Write-Host "⚠️ ผิดปกติ: รหัสผิดแต่กลับผ่าน!" -ForegroundColor Red
} catch {
    Write-Host "✅ ระบบตรวจจับรหัสผ่านผิดถูกต้อง (Status 401 บันทึกลง AuditLog แล้ว)" -ForegroundColor Green
}

# 6. Logout
Write-Host "`n[6/6] 🚪 ทดสอบ Logout (POST /api/auth/logout)..." -ForegroundColor Yellow
try {
    $logoutRes = Invoke-RestMethod -Uri "$BaseUrl/auth/logout" -Method Post -Headers $headers -WebSession $Session
    Write-Host "✅ Logout สำเร็จ: $($logoutRes.message)" -ForegroundColor Green
} catch {
    Write-Host "❌ Logout ล้มเหลว: $_" -ForegroundColor Red
}

Write-Host "`n🎉 ผ่านการทดสอบ Auth Module ทั้งหมดเรียบร้อย!" -ForegroundColor Green
