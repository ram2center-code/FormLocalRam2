# ================================================================
# FormLocal Phase 3 API Test Script (PowerShell)
# ทดสอบ Form CRUD, Versioning, Settings & Publish
# ================================================================

$BaseUrl = "http://localhost:4000/api"
$Session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " 🧪 ทดสอบระบบ Phase 3: Form Builder & Form Management API " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Login เป็น Admin เพื่อรับ Token
Write-Host "`n[1/6] 🔑 เข้าสู่ระบบด้วย Admin (admin / ChangeMe123!)..." -ForegroundColor Yellow
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

# 2. ทดสอบสร้างแบบฟอร์มใหม่ (POST /api/forms)
Write-Host "`n[2/6] 📝 ทดสอบสร้างแบบฟอร์มใหม่ (POST /api/forms)..." -ForegroundColor Yellow
$createFormBody = @{
    title = "แบบประเมินความพึงพอใจการใช้งานระบบ FormLocal 2026"
    description = "แบบประเมินสำหรับบุคลากรภายในเพื่อพัฒนาปรับปรุงการให้บริการ"
    type = "GENERAL"
    visibility = "PUBLIC"
    isAcceptingResponses = $true
    schema = @(
        @{
            id = "field_q1"
            type = "text"
            label = "ชื่อ-นามสกุลของผู้ให้ข้อมูล"
            required = $true
            placeholder = "กรอกชื่อ-นามสกุล..."
        },
        @{
            id = "field_q2"
            type = "single_choice"
            label = "ท่านใช้งานระบบผ่านอุปกรณ์ใดเป็นหลัก?"
            required = $true
            options = @(
                @{ id = "opt_pc"; label = "คอมพิวเตอร์ตั้งโต๊ะ / โน้ตบุ๊ก (PC/Laptop)" },
                @{ id = "opt_ipad"; label = "แท็บเล็ต / iPad" },
                @{ id = "opt_mobile"; label = "สมาร์ทโฟน (Mobile Phone)" }
            )
        },
        @{
            id = "field_q3"
            type = "rating"
            label = "ระดับความพึงพอใจต่อความง่ายในการใช้งาน"
            required = $true
        }
    )
} | ConvertTo-Json -Depth 6

try {
    $createFormRes = Invoke-RestMethod -Uri "$BaseUrl/forms" -Method Post -Body $createFormBody -ContentType "application/json; charset=utf-8" -Headers $headers -WebSession $Session
    $formId = $createFormRes.data.id
    Write-Host "✅ สร้างแบบฟอร์มสำเร็จ: ID=$formId" -ForegroundColor Green
    Write-Host "   - Title:      $($createFormRes.data.title)" -ForegroundColor Cyan
    Write-Host "   - Status:     $($createFormRes.data.status)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ สร้างแบบฟอร์มล้มเหลว: $_" -ForegroundColor Red
    exit 1
}

# 3. ทดสอบดึงรายการฟอร์ม (GET /api/forms)
Write-Host "`n[3/6] 📋 ทดสอบดึงรายการแบบฟอร์มทั้งหมด (GET /api/forms)..." -ForegroundColor Yellow
try {
    $formsListRes = Invoke-RestMethod -Uri "$BaseUrl/forms" -Method Get -Headers $headers -WebSession $Session
    Write-Host "✅ ดึงรายการฟอร์มสำเร็จ พบ $($formsListRes.data.Count) รายการ:" -ForegroundColor Green
    foreach ($f in $formsListRes.data) {
        Write-Host "   - [$($f.type)] $($f.title) (v$($f.latestVersionNumber) | สถานะ: $($f.status))" -ForegroundColor DarkGray
    }
} catch {
    Write-Host "❌ ดึงรายการฟอร์มล้มเหลว: $_" -ForegroundColor Red
}

# 4. ทดสอบบันทึกร่างคำถาม (PUT /api/forms/:id)
Write-Host "`n[4/6] 💾 ทดสอบบันทึกร่างคำถาม (PUT /api/forms/:id)..." -ForegroundColor Yellow
$updateBody = @{
    title = "แบบประเมินความพึงพอใจการใช้งานระบบ FormLocal 2026 (ปรับปรุงร่าง)"
    description = "แบบประเมินความพึงพอใจการใช้งานระบบภายในโรงพยาบาล"
    schema = @(
        @{
            id = "field_q1"
            type = "text"
            label = "ชื่อ-นามสกุลของผู้ให้ข้อมูล"
            required = $true
            placeholder = "กรอกชื่อ-นามสกุล..."
        },
        @{
            id = "field_q2"
            type = "single_choice"
            label = "ท่านใช้งานระบบผ่านอุปกรณ์ใดเป็นหลัก?"
            required = $true
            options = @(
                @{ id = "opt_pc"; label = "คอมพิวเตอร์ตั้งโต๊ะ / โน้ตบุ๊ก (PC/Laptop)" },
                @{ id = "opt_ipad"; label = "แท็บเล็ต / iPad" },
                @{ id = "opt_mobile"; label = "สมาร์ทโฟน (Mobile Phone)" }
            )
        },
        @{
            id = "field_q3"
            type = "rating"
            label = "ระดับความพึงพอใจต่อความเร็วของระบบ"
            required = $true
        },
        @{
            id = "field_q4"
            type = "textarea"
            label = "ข้อเสนอแนะเพิ่มเติมสำหรับการปรับปรุง"
            required = $false
            placeholder = "กรอกข้อเสนอแนะ..."
        }
    )
} | ConvertTo-Json -Depth 6

try {
    $updateRes = Invoke-RestMethod -Uri "$BaseUrl/forms/$formId" -Method Put -Body $updateBody -ContentType "application/json; charset=utf-8" -Headers $headers -WebSession $Session
    Write-Host "✅ บันทึกร่างแบบฟอร์มสำเร็จ: $($updateRes.message)" -ForegroundColor Green
} catch {
    Write-Host "❌ บันทึกร่างล้มเหลว: $_" -ForegroundColor Red
}

# 5. ทดสอบเผยแพร่ฟอร์ม (POST /api/forms/:id/publish)
Write-Host "`n[5/6] 🚀 ทดสอบเผยแพร่แบบฟอร์ม (POST /api/forms/:id/publish)..." -ForegroundColor Yellow
$publishBody = @{
    schema = (ConvertFrom-Json $updateBody).schema
} | ConvertTo-Json -Depth 6

try {
    $publishRes = Invoke-RestMethod -Uri "$BaseUrl/forms/$formId/publish" -Method Post -Body $publishBody -ContentType "application/json; charset=utf-8" -Headers $headers -WebSession $Session
    Write-Host "✅ เผยแพร่แบบฟอร์มสำเร็จ!" -ForegroundColor Green
    Write-Host "   - Version: $($publishRes.data.version)" -ForegroundColor Cyan
    Write-Host "   - Status:  $($publishRes.data.form.status)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ เผยแพร่ล้มเหลว: $_" -ForegroundColor Red
}

# 6. ทดสอบปรับตั้งค่าเปิด-ปิดรับคำตอบ (PATCH /api/forms/:id/settings)
Write-Host "`n[6/6] ⚙️ ทดสอบตั้งค่าเปิด-ปิดรับคำตอบ (PATCH /api/forms/:id/settings)..." -ForegroundColor Yellow
$settingsBody = @{
    isAcceptingResponses = $false
    allowMultiple = $false
    maxAttempts = 1
} | ConvertTo-Json

try {
    $settingsRes = Invoke-RestMethod -Uri "$BaseUrl/forms/$formId/settings" -Method Patch -Body $settingsBody -ContentType "application/json" -Headers $headers -WebSession $Session
    Write-Host "✅ ตั้งค่าแบบฟอร์มสำเร็จ: รับคำตอบ=$($settingsRes.data.isAcceptingResponses), ทำซ้ำได้=$($settingsRes.data.allowMultiple)" -ForegroundColor Green
} catch {
    Write-Host "❌ ตั้งค่าแบบฟอร์มล้มเหลว: $_" -ForegroundColor Red
}

Write-Host "`n🎉 ผ่านการทดสอบ Form API (Phase 3) ทุกขั้นตอนเรียบร้อย!" -ForegroundColor Green
