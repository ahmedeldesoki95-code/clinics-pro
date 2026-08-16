# Script to setup PostgreSQL database for Clinics Pro

$env:PATH += ";C:\Program Files\PostgreSQL\17\bin"
$env:PGPASSWORD = "postgres"

Write-Host "Creating database..." -ForegroundColor Yellow

# Try to create database
$result = & psql -U postgres -c "CREATE DATABASE clinic_whatsapp;" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database 'clinic_whatsapp' created successfully!" -ForegroundColor Green
} else {
    if ($result -match "already exists") {
        Write-Host "✅ Database 'clinic_whatsapp' already exists!" -ForegroundColor Green
    } else {
        Write-Host "❌ Error creating database:" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
        Write-Host ""
        Write-Host "Please run this manually:" -ForegroundColor Yellow
        Write-Host 'psql -U postgres -c "CREATE DATABASE clinic_whatsapp;"' -ForegroundColor Cyan
        exit 1
    }
}

Write-Host ""
Write-Host "✅ Database setup complete!" -ForegroundColor Green
Write-Host "Next step: Run 'npm run prisma:migrate' in the project folder" -ForegroundColor Cyan
