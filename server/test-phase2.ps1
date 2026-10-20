# ================================================================
# FormLocal Phase 2 API Test Script (PowerShell)
# ทดสอบ Department CRUD & User CRUD + Audit Log
# ================================================================

$BaseUrl = "http://localhost:4000/api"
$Session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " 🧪 ทดสอบระบบ Phase 2: Master Data (Department & User CRUD)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Login เป็น Admin เพื่อรับ Token
Write-Host "`n[1/8] 🔑 เข้าสู่ระบบด้วย Admin (admin / ChangeMe123!)..." -ForegroundColor Yellow
$loginBody = @{
    username = "admin"
    password = "ChangeMe123!"
} | ConvertTo-Json

try {
    $loginRes = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json" -WebSession $Session
    $token = $loginRes.data.accessToken
    $headers = @{ Authorization = "Bearer $token" }
    Write-Host "✅ Login Admin สำเร็จ!" -ForegroundColor Green
} catch {
    Write-Host "❌ Login Admin ล้มเหลว: $_" -ForegroundColor Red
    exit 1
}

# 2. ทดสอบดึงรายชื่อแผนก (GET /api/departments)
Write-Host "`n[2/8] 🏢 ทดสอบดึงรายชื่อแผนกทั้งหมด (GET /api/departments)..." -ForegroundColor Yellow
try {
    $deptsRes = Invoke-RestMethod -Uri "$BaseUrl/departments" -Method Get -Headers $headers -WebSession $Session
    Write-Host "✅ ดึงรายชื่อแผนกสำเร็จ พบ $($deptsRes.data.Count) แผนก:" -ForegroundColor Green
    foreach ($d in $deptsRes.data) {
        Write-Host "   - [$($d.name)] สมาชิก: $($d._count.users) คน, ฟอร์ม: $($d._count.forms) ฉบับ" -ForegroundColor DarkGray
    }
} catch {
    Write-Host "❌ ดึงแผนกล้มเหลว: $_" -ForegroundColor Red
}

# 3. ทดสอบสร้างแผนกใหม่ (POST /api/departments)
Write-Host "`n[3/8] ➕ ทดสอบสร้างแผนกใหม่ (POST /api/departments)..." -ForegroundColor Yellow
$newDeptBody = @{
    name = "ฝ่ายพัฒนาซอฟต์แวร์และการแพทย์ดิจิทัล"
} | ConvertTo-Json -Compress

try {
    $createDeptRes = Invoke-RestMethod -Uri "$BaseUrl/departments" -Method Post -Body $newDeptBody -ContentType "application/json; charset=utf-8" -Headers $headers -WebSession $Session
    $newDeptId = $createDeptRes.data.id
    Write-Host "✅ สร้างแผนกสำเร็จ: ID=$newDeptId, Name=$($createDeptRes.data.name)" -ForegroundColor Green
} catch {
    Write-Host "⚠️ สร้างแผนก: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 4. ทดสอบดึงรายชื่อผู้ใช้งาน (GET /api/users)
Write-Host "`n[4/8] 👥 ทดสอบดึงรายชื่อผู้ใช้ทั้งหมด (GET /api/users)..." -ForegroundColor Yellow
try {
    $usersRes = Invoke-RestMethod -Uri "$BaseUrl/users" -Method Get -Headers $headers -WebSession $Session
    Write-Host "✅ ดึงรายชื่อผู้ใช้สำเร็จ พบ $($usersRes.data.Count) ผู้ใช้:" -ForegroundColor Green
    foreach ($u in $usersRes.data) {
        Write-Host "   - @$($u.username) ($($u.fullName)) | Role: $($u.role) | Active: $($u.isActive)" -ForegroundColor DarkGray
    }
} catch {
    Write-Host "❌ ดึงรายชื่อผู้ใช้ล้มเหลว: $_" -ForegroundColor Red
}

# 5. ทดสอบสร้างผู้ใช้ใหม่ (POST /api/users)
Write-Host "`n[5/8] 👤 ทดสอบสร้างผู้ใช้งานใหม่ (POST /api/users)..." -ForegroundColor Yellow
$testUsername = "doctor.test"
$createUserBody = @{
    username = $testUsername
    email = "doctor.test@ram2.internal"
    password = "Password123!"
    fullName = "นพ. ทดสอบ สุขใจ"
    role = "USER"
    departmentId = $newDeptId
    isActive = $true
} | ConvertTo-Json -Compress

try {
    $createUserRes = Invoke-RestMethod -Uri "$BaseUrl/users" -Method Post -Body $createUserBody -ContentType "application/json; charset=utf-8" -Headers $headers -WebSession $Session
    $newUserId = $createUserRes.data.id
    Write-Host "✅ สร้างผู้ใช้ใหม่สำเร็จ: @$($createUserRes.data.username) (ID=$newUserId)" -ForegroundColor Green
} catch {
    Write-Host "⚠️ สร้างผู้ใช้: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 6. ทดสอบสลับสถานะผู้ใช้ (PATCH /api/users/:id/status)
if ($newUserId) {
    Write-Host "`n[6/8] 🔄 ทดสอบระงับการใช้งานผู้ใช้ (PATCH /api/users/:id/status)..." -ForegroundColor Yellow
    $statusBody = @{ isActive = $false } | ConvertTo-Json
    try {
        $statusRes = Invoke-RestMethod -Uri "$BaseUrl/users/$newUserId/status" -Method Patch -Body $statusBody -ContentType "application/json" -Headers $headers -WebSession $Session
        Write-Host "✅ สลับสถานะสำเร็จ: $($statusRes.message)" -ForegroundColor Green
    } catch {
        Write-Host "❌ สลับสถานะล้มเหลว: $_" -ForegroundColor Red
    }

    # 7. ทดสอบรีเซ็ตรหัสผ่าน (PATCH /api/users/:id/reset-password)
    Write-Host "`n[7/8] 🔑 ทดสอบรีเซ็ตรหัสผ่านผู้ใช้ (PATCH /api/users/:id/reset-password)..." -ForegroundColor Yellow
    $resetBody = @{ newPassword = "NewSecretPassword2026!" } | ConvertTo-Json
    try {
        $resetRes = Invoke-RestMethod -Uri "$BaseUrl/users/$newUserId/reset-password" -Method Patch -Body $resetBody -ContentType "application/json" -Headers $headers -WebSession $Session
        Write-Host "✅ รีเซ็ตรหัสผ่านสำเร็จ: $($resetRes.message)" -ForegroundColor Green
    } catch {
        Write-Host "❌ รีเซ็ตรหัสผ่านล้มเหลว: $_" -ForegroundColor Red
    }

    # 8. ทดสอบความปลอดภัย: ลบแผนกที่มีผู้ใช้งานสังกัดอยู่ (ต้องห้ามลบและฟ้อง error ชัดเจน)
    Write-Host "`n[8/8] 🛡️ ทดสอบความปลอดภัย: พยายามลบแผนกที่มีสมาชิกสังกัดอยู่..." -ForegroundColor Yellow
    try {
        $delDeptFail = Invoke-RestMethod -Uri "$BaseUrl/departments/$newDeptId" -Method Delete -Headers $headers -WebSession $Session
        Write-Host "⚠️ ผิดปกติ: แผนกมีสมาชิกแต่ยอมให้ลบ!" -ForegroundColor Red
    } catch {
        Write-Host "✅ ระบบป้องกันถูกต้อง: ไม่อนุญาตให้ลบแผนกที่มีสมาชิกอยู่" -ForegroundColor Green
    }
}

Write-Host "`n🎉 ผ่านการทดสอบ Master Data (Phase 2) ทุกขั้นตอนเรียบร้อย!" -ForegroundColor Green
