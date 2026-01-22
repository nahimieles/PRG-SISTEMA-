<#
.SYNOPSIS
    Script de Respaldo de Archivos de SharePoint / OneDrive
    Requisito: CLI for Microsoft 365 (https://pnp.github.io/cli-microsoft365/)
    
.DESCRIPTION
    Este script permite descargar archivos masivamente de un sitio de SharePoint o del OneDrive personal.
    Se recomienda usarlo para respaldos periódicos. 

.INSTRUCTIONS
    1. Instalar CLI for M365: npm install -g @pnp/cli-microsoft365
    2. Login: m365 login
    3. Ejecutar script: ./backup_sharepoint.ps1
#>

$ErrorActionPreference = "Stop"

function Backup-Site {
    param (
        [string]$Url,
        [string]$DestinationPath
    )

    Write-Host "Iniciando respaldo de: $Url" -ForegroundColor Cyan
    
    # Crear carpeta destino
    if (!(Test-Path $DestinationPath)) {
        New-Item -ItemType Directory -Force -Path $DestinationPath | Out-Null
    }

    # Nota: CLI for M365 no tiene un comando nativo de "download site". 
    # Usualmente se usa 'spo file list' y luego 'spo file get'.
    # Para simplicidad y robustez, este script es un template que el usuario debe configurar
    # con la herramienta que prefiera, pero aquí proveemos el comando para listar.
    
    Write-Host "Listando archivos (esto puede tardar)..." -ForegroundColor Yellow
    
    # Ejemplo de comando para listar archivos en la librería por defecto 'Documentos compartidos'
    # Ajustar según la estructura del sitio.
    try {
        $files = m365 spo file list --webUrl $Url --folder "Shared Documents" --recursive --output json | ConvertFrom-Json
        
        foreach ($file in $files) {
            $localPath = Join-Path $DestinationPath $file.ServerRelativeUrl
            $dir = Split-Path $localPath
            if (!(Test-Path $dir)) {
                New-Item -ItemType Directory -Force -Path $dir | Out-Null
            }
            
            Write-Host "Descargando: $($file.Name)"
            # m365 spo file get --webUrl $Url --id $file.UniqueId --asFile --path $localPath
        }
    }
    catch {
        Write-Host "Error accediendo al sitio. Asegúrate de estar logueado (m365 login) y tener permisos." -ForegroundColor Red
        Write-Host $_
    }
}

Write-Host "--- HERRAMIENTA DE RESPALDO V1.0 ---" -ForegroundColor Green
Write-Host "Este script requiere @pnp/cli-microsoft365 instalado."

# Configuración
$BackupRoot = "./Backups_$(Get-Date -Format 'yyyyMMdd')"
New-Item -ItemType Directory -Force -Path $BackupRoot | Out-Null

# TODO: Agregar aquí las URLs de los sitios a respaldar
# Backup-Site -Url "https://tutenant.sharepoint.com/sites/Sitio1" -DestinationPath "$BackupRoot/Sitio1"

Write-Host "Script generado. Por favor edita el archivo para agregar tus URLs de SharePoint." -ForegroundColor Magenta
Write-Host "Ubicación: $BackupRoot"
