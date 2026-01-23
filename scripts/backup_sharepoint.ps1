<#
.SYNOPSIS
    Smart Backup Tool for SharePoint/OneDrive (Interactive)
    
.DESCRIPTION
    Herramienta interactiva para respaldar sitios de SharePoint.
    Permite elegir entre respaldo masivo o un sitio específico.
    
.PREREQUISITES
    - CLI for Microsoft 365 (npm i -g @pnp/cli-microsoft365)
    - Login previo (m365 login)
#>

$ErrorActionPreference = "Stop"

function Show-Menu {
    Clear-Host
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "    SISTEMA DE RESPALDO SHAREPOINT v2.0   " -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "1. Respaldar Sitio Específico"
    Write-Host "2. Respaldar Todos los Sitios (Batch)"
    Write-Host "3. Ver Estado de Conexión (m365 status)"
    Write-Host "Q. Salir"
    Write-Host "==========================================" -ForegroundColor Cyan
}

function Convert-Size {
    param([long]$Bytes)
    if ($Bytes -gt 1GB) { return "{0:N2} GB" -f ($Bytes / 1GB) }
    if ($Bytes -gt 1MB) { return "{0:N2} MB" -f ($Bytes / 1MB) }
    return "{0:N2} KB" -f ($Bytes / 1KB)
}

function Download-Site {
    param ([string]$Url)

    $SiteName = $Url.Split("/")[-1]
    $BackupDir = Join-Path $PWD "Backups"
    $SiteDir = Join-Path $BackupDir "$SiteName-$(Get-Date -Format 'yyyyMMdd')"

    Write-Host "`n[INFO] Iniciando respaldo de: $SiteName" -ForegroundColor Yellow
    Write-Host "[INFO] Destino: $SiteDir" -ForegroundColor Gray

    if (!(Test-Path $SiteDir)) { New-Item -ItemType Directory -Force -Path $SiteDir | Out-Null }

    try {
        Write-Host " > Buscando Documentos Compartidos..." -NoNewline
        # List items recursively in "Shared Documents"
        $filesJson = m365 spo file list --webUrl $Url --folder "Shared Documents" --recursive --output json
        $files = $filesJson | ConvertFrom-Json
        
        $count = $files.Count
        Write-Host " OK ($count archivos encontrados)" -ForegroundColor Green

        $i = 0
        foreach ($file in $files) {
            $i++
            $Percent = ($i / $count) * 100
            $LocalPath = Join-Path $SiteDir $file.ServerRelativeUrl.Substring($file.ServerRelativeUrl.IndexOf("Shared Documents"))
            $LocalDir = Split-Path $LocalPath

            if (!(Test-Path $LocalDir)) { New-Item -ItemType Directory -Force -Path $LocalDir | Out-Null }

            # Basic Progress Bar
            Write-Progress -Activity "Descargando $SiteName" -Status "$($file.Name)" -PercentComplete $Percent

            # Download File
            # Note: CLI for M365 'spo file get' saves to current dir or specified path
            # Using --asFile to save content
            m365 spo file get --webUrl $Url --id $file.UniqueId --asFile --path $LocalPath
        }
        Write-Host "`n[EXITO] Respaldo completado para $SiteName" -ForegroundColor Green
    }
    catch {
        Write-Host "`n[ERROR] Falló el respaldo de $SiteName" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Gray
    }
}

# Main Loop
do {
    Show-Menu
    $choice = Read-Host "Seleccione una opción"

    switch ($choice) {
        '1' {
            $url = Read-Host "Ingrese la URL completa del sitio (ej. https://tenant.sharepoint.com/sites/Contabilidad)"
            if ($url) { Download-Site -Url $url }
            Pause
        }
        '2' {
            Write-Host "Modo Batch: Asegúrese de editar el script para definir la lista de sitios." -ForegroundColor Yellow
            # Add your list here
            $sites = @(
                "https://tu-tenant.sharepoint.com/sites/Ejemplo1",
                "https://tu-tenant.sharepoint.com/sites/Ejemplo2"
            )
            foreach ($s in $sites) { Download-Site -Url $s }
            Pause
        }
        '3' {
            m365 status
            Pause
        }
        'Q' { return }
    }
} while ($true)
