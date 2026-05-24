$ErrorActionPreference = "Continue"
$GITHUB_USER = "NhanBui"
$REPO_NAME   = "CengageChap10"
$MAIN_FILE   = "Streamlit.py"
$PROJECT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path

function Green($m)  { Write-Host "  [OK] $m" -ForegroundColor Green }
function Yellow($m) { Write-Host "  [!!] $m" -ForegroundColor Yellow }
function Red($m)    { Write-Host "  [ERR] $m" -ForegroundColor Red }
function Blue($m)   { Write-Host "`n--- $m ---" -ForegroundColor Cyan }

Clear-Host
Write-Host ""
Write-Host "  DataMine AI - GitHub Auto Deploy" -ForegroundColor Blue
Write-Host "  Repo: github.com/$GITHUB_USER/$REPO_NAME" -ForegroundColor Gray
Write-Host ""

# Step 0: Check git
Blue "Step 0: Checking git"
try {
    $v = git --version 2>&1
    Green "Git found: $v"
} catch {
    Red "Git not installed. Please install from https://git-scm.com/download/win"
    Start-Process "https://git-scm.com/download/win"
    Read-Host "Press Enter after installing git"
    exit 1
}

# Step 1: Get token
Blue "Step 1: GitHub Personal Access Token"
Write-Host ""
Write-Host "  You need a token with 'repo' scope." -ForegroundColor White
Write-Host "  Press Enter to open the GitHub token page..." -ForegroundColor Gray
$ans = Read-Host "  Do you already have a token? (y/n)"
if ($ans -ne "y" -and $ans -ne "Y") {
    Start-Process "https://github.com/settings/tokens/new?scopes=repo&description=DataMine+Deploy"
    Write-Host ""
    Write-Host "  In the GitHub page that just opened:" -ForegroundColor White
    Write-Host "   1. Note: DataMine Deploy" -ForegroundColor Gray
    Write-Host "   2. Expiration: 90 days" -ForegroundColor Gray
    Write-Host "   3. Scope: tick 'repo'" -ForegroundColor Gray
    Write-Host "   4. Click Generate token" -ForegroundColor Gray
    Write-Host "   5. COPY the token (shown only once!)" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "  Press Enter when ready"
}

Write-Host ""
$TOKEN_SEC = Read-Host "  Paste your GitHub Token here" -AsSecureString
$TOKEN = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($TOKEN_SEC)
)
$TOKEN = $TOKEN.Trim()

if ($TOKEN.Length -lt 10) {
    Red "Token too short. Please check and try again."
    Read-Host "Press Enter to exit"
    exit 1
}
Green "Token received ($($TOKEN.Length) chars)"

# Step 2: Create repo via GitHub API
Blue "Step 2: Creating GitHub repo"

$headers = @{
    "Authorization" = "token $TOKEN"
    "Accept"        = "application/vnd.github+json"
    "User-Agent"    = "DataMineAI-Deploy"
}

$repoExists = $false
try {
    $existing = Invoke-RestMethod -Uri "https://api.github.com/repos/$GITHUB_USER/$REPO_NAME" -Headers $headers -Method Get
    Yellow "Repo already exists. Will push to existing repo."
    $repoExists = $true
} catch {
    # Repo does not exist, create it
}

if (-not $repoExists) {
    $body = @{
        name        = $REPO_NAME
        description = "DataMine AI - Professional Data Analytics and ML App"
        private     = $false
        auto_init   = $false
    } | ConvertTo-Json

    try {
        $newRepo = Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Headers $headers -Method Post -Body $body -ContentType "application/json"
        Green "Repo created: $($newRepo.html_url)"
    } catch {
        Red "Failed to create repo: $_"
        Red "Make sure your token has the 'repo' scope."
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# Step 3: Init git and commit
Blue "Step 3: Git init and commit"

Set-Location $PROJECT_DIR

if (Test-Path ".git") {
    Yellow "Existing .git found. Will update remote and commit."
} else {
    git init | Out-Null
    Green "Git initialized"
}

git branch -M main 2>&1 | Out-Null

$null = git remote remove origin 2>&1
$authUrl = "https://${GITHUB_USER}:${TOKEN}@github.com/$GITHUB_USER/$REPO_NAME.git"
git remote add origin $authUrl | Out-Null

git config user.email "buile.thanhnhan@gmail.com"
git config user.name "NhanBui"

git add .
$changed = git status --short
if ($changed) {
    Write-Host "  Files to commit:" -ForegroundColor Gray
    $changed | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
} else {
    Yellow "No new files to stage."
}

git commit -m "feat: DataMine AI - Smart Advisor + Fitness Report + Professional UI" 2>&1 | Out-Null
Green "Commit done"

# Step 4: Push to GitHub
Blue "Step 4: Pushing to GitHub"

try {
    git push -u origin main --force 2>&1 | Out-Null
    Green "Push successful!"
} catch {
    Red "Push failed: $_"
    Read-Host "Press Enter to exit"
    exit 1
}

# Remove token from remote URL for security
git remote set-url origin "https://github.com/$GITHUB_USER/$REPO_NAME.git"
Green "Token removed from remote URL (security)"

# Step 5: Open Streamlit Cloud
Blue "Step 5: Opening Streamlit Cloud"

Write-Host ""
Write-Host "  =====================================================" -ForegroundColor Green
Write-Host "  SUCCESS! Code is now on GitHub." -ForegroundColor Green
Write-Host "  Repo: https://github.com/$GITHUB_USER/$REPO_NAME" -ForegroundColor Green
Write-Host "  =====================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Next steps in Streamlit Cloud:" -ForegroundColor White
Write-Host "   1. Sign in with GitHub" -ForegroundColor Gray
Write-Host "   2. Click 'New app'" -ForegroundColor Gray
Write-Host "   3. Repository: $GITHUB_USER/$REPO_NAME" -ForegroundColor Gray
Write-Host "   4. Branch: main    Main file: $MAIN_FILE" -ForegroundColor Gray
Write-Host "   5. (Optional) Advanced -> Secrets -> paste API keys" -ForegroundColor Gray
Write-Host "   6. Click Deploy!" -ForegroundColor Gray
Write-Host ""

Start-Process "https://github.com/$GITHUB_USER/$REPO_NAME"
Start-Sleep -Seconds 2
Start-Process "https://share.streamlit.io"

Write-Host "  Browser opened. Follow the steps above." -ForegroundColor Cyan
Write-Host ""
Read-Host "  Press Enter to close"
