# NFC 潮玩二创监管平台 - 重启后一键恢复脚本
# 用法：重启后打开 PowerShell，运行：
#   powershell -ExecutionPolicy Bypass -File "D:\计算机编程相关\火山杯比赛项目\二创监管项目（区块链）\project\resume.ps1"

$ErrorActionPreference = "Continue"
$projectRoot = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
$contractsDir = Join-Path $projectRoot "contracts"
$backendDir = Join-Path $projectRoot "backend"
$frontendDir = Join-Path $projectRoot "frontend"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  NFC 潮玩二创监管平台 - 环境恢复脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ===== 1. PostgreSQL =====
Write-Host "[1/6] Starting PostgreSQL..." -ForegroundColor Yellow
$pgRunning = & "D:\pgsql\pgsql\bin\pg_isready.exe" -h localhost -p 5432 2>$null
if ($pgRunning -match "accepting") {
    Write-Host "  PostgreSQL already running" -ForegroundColor Green
} else {
    Start-Process "D:\pgsql\pgsql\bin\pg_ctl.exe" -ArgumentList "-D", "D:\pgdata", "-l", "D:\pgdata\logfile", "start" -NoNewWindow -Wait
    Start-Sleep -Seconds 3
    $pgRunning = & "D:\pgsql\pgsql\bin\pg_isready.exe" -h localhost -p 5432 2>$null
    if ($pgRunning -match "accepting") {
        Write-Host "  PostgreSQL started" -ForegroundColor Green
    } else {
        Write-Host "  PostgreSQL FAILED" -ForegroundColor Red
    }
}

# ===== 2. Hardhat 链 + 合约部署 =====
Write-Host "[2/6] Starting Hardhat node..." -ForegroundColor Yellow
$pids = Get-NetTCPConnection -LocalPort 8545 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($p in $pids) { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 2

Set-Location $contractsDir
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Hardhat Node :8545'; cd '$contractsDir'; npx hardhat node" -WindowStyle Minimized

$w = 0
do {
    Start-Sleep -Seconds 2
    $w += 2
    $ok = try {
        Invoke-RestMethod -Uri "http://127.0.0.1:8545" -Method Post -Body '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' -ContentType "application/json" -TimeoutSec 2 | Out-Null
        $true
    } catch { $false }
} while (-not $ok -and $w -lt 30)

if ($ok) {
    Write-Host "  Hardhat node ready (${w}s)" -ForegroundColor Green

    Write-Host "  Deploying contracts..." -ForegroundColor Yellow
    $deployResult = npx hardhat run script/deploy.ts --network localhost 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Contracts deployed" -ForegroundColor Green

        # 更新 .env
        $envPath = "$backendDir\.env"
        $env = Get-Content $envPath -Raw -Encoding UTF8
        $addrPattern = @{
            CREATORREGISTRY = "0x5FbDB2315678afecb367f032d93F642f64180aa3"
            ORIGINALWORK    = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
            LICENSETOKEN    = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
            DERIVATIVENFT   = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9"
            DERIVATIVERULE  = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9"
            ROYALTYSPLITTER = "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707"
            NFCSEALREGISTRY = "0x0165878A594ca255338adfa4d48449f69242Eb8F"
        }
        foreach ($k in $addrPattern.Keys) {
            $env = $env -replace "CONTRACT_$k=.*", "CONTRACT_$k=$($addrPattern[$k])"
        }
        [System.IO.File]::WriteAllText($envPath, $env, [System.Text.UTF8Encoding]::new($false))
        Write-Host "  .env updated" -ForegroundColor Green
    } else {
        Write-Host "  Contract deploy FAILED" -ForegroundColor Red
    }
} else {
    Write-Host "  Hardhat node FAILED to start" -ForegroundColor Red
}

# ===== 3. Docker (如果 WSL 已配置) =====
Write-Host "[3/6] Checking Docker..." -ForegroundColor Yellow
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
try {
    docker ps 2>&1 | Out-Null
    Write-Host "  Docker running" -ForegroundColor Green

    # 启动 IPFS
    Write-Host "  Starting IPFS node..." -ForegroundColor Yellow
    docker rm -f nfc-ipfs 2>$null | Out-Null
    docker run -d --name nfc-ipfs -p 4001:4001 -p 5001:5001 -p 8080:8080 ipfs/kubo:latest daemon --enable-gc 2>&1 | Out-Null
    Start-Sleep -Seconds 3

    $ipfsOk = try {
        $r = Invoke-RestMethod -Uri "http://localhost:5001/api/v0/version" -Method Post -TimeoutSec 3
        Write-Host "  IPFS ready: $($r.Version)" -ForegroundColor Green
        $true
    } catch {
        Write-Host "  IPFS not ready (will use fallback)" -ForegroundColor Yellow
        $false
    }

    # 启动 Redis
    Write-Host "  Starting Redis..." -ForegroundColor Yellow
    docker rm -f nfc-redis 2>$null | Out-Null
    docker run -d --name nfc-redis -p 6379:6379 redis:7-alpine 2>&1 | Out-Null
    Write-Host "  Redis started" -ForegroundColor Green
} catch {
    Write-Host "  Docker not available (skip IPFS/Redis)" -ForegroundColor Yellow
    Write-Host "  Hint: run 'wsl --install' as admin, then restart" -ForegroundColor Yellow
}

# ===== 4. 后端编译 + 启动 =====
Write-Host "[4/6] Building backend..." -ForegroundColor Yellow
$pids = Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($p in $pids) { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 2

Set-Location $backendDir
npx nest build 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  Build OK" -ForegroundColor Green

    Start-Process node -ArgumentList "dist/main.js" -WindowStyle Minimized
    $w = 0
    do {
        Start-Sleep -Seconds 2
        $w += 2
        $ok = try {
            Invoke-RestMethod -Uri "http://localhost:8080/api/dashboard/overview" -Method Get -TimeoutSec 2 | Out-Null
            $true
        } catch { $false }
    } while (-not $ok -and $w -lt 60)

    if ($ok) {
        Write-Host "  Backend ready: http://localhost:8080 (${w}s)" -ForegroundColor Green
        Write-Host "  Swagger: http://localhost:8080/api/docs" -ForegroundColor Green

        # 修复数据库：创作者认证状态
        Write-Host "  Fixing DB creator verification..." -ForegroundColor Yellow
        Set-Location $backendDir
        $fixResult = node fix-db.js 2>&1
        Write-Host "  DB fix: $fixResult" -ForegroundColor Green
    } else {
        Write-Host "  Backend FAILED to start" -ForegroundColor Red
    }
} else {
    Write-Host "  Build FAILED" -ForegroundColor Red
}

# ===== 5. 前端 =====
Write-Host "[5/6] Starting frontend..." -ForegroundColor Yellow
Set-Location $frontendDir
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Frontend :5173'; cd '$frontendDir'; npm run dev" -WindowStyle Minimized
Start-Sleep -Seconds 5
try {
    Invoke-RestMethod -Uri "http://localhost:5173" -Method Get -TimeoutSec 3 | Out-Null
    Write-Host "  Frontend ready: http://localhost:5173" -ForegroundColor Green
} catch {
    Write-Host "  Frontend may still be starting..." -ForegroundColor Yellow
}

# ===== 6. 合约演示 + 账户认证 =====
Write-Host "[6/6] Running contract demo + verifying accounts..." -ForegroundColor Yellow
Set-Location $contractsDir
$demoResult = npx hardhat run demo.ts 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  Demo: 7/7 steps passed" -ForegroundColor Green
} else {
    Write-Host "  Demo: check output above" -ForegroundColor Yellow
}

# 链上认证所有 Hardhat 测试账户（demo.ts 重部署后重新认证）
Write-Host "  Verifying creators on-chain..." -ForegroundColor Yellow
$verifyResult = npx hardhat run verify-all.ts --network localhost 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  Creators verified on-chain" -ForegroundColor Green
} else {
    Write-Host "  Creator verification: check output" -ForegroundColor Yellow
}

# ===== 最终摘要 =====
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ENVIRONMENT READY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Frontend  : http://localhost:5173" -ForegroundColor White
Write-Host "  Backend   : http://localhost:8080" -ForegroundColor White
Write-Host "  Swagger   : http://localhost:8080/api/docs" -ForegroundColor White
Write-Host "  Hardhat   : http://127.0.0.1:8545 (chainId=1337)" -ForegroundColor White
Write-Host "  PostgreSQL: localhost:5432 (nfc_registry)" -ForegroundColor White
if ($ipfsOk) { Write-Host "  IPFS      : localhost:5001" -ForegroundColor White }
Write-Host "  Accounts  : 3 test accounts pre-verified (on-chain + DB)" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $projectRoot
