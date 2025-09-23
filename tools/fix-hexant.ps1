param(
  [string]$ProjectRoot = "."
)

$ErrorActionPreference = "Stop"

function Backup-File([string]$Path) {
  if (Test-Path $Path) {
    $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
    Copy-Item $Path "$Path.bak_$stamp" -Force
  }
}

function Write-Utf8([string]$Path, [string]$Content) {
  $dir = Split-Path $Path -Parent
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  Set-Content -Path $Path -Value $Content -Encoding UTF8
}

# 1) Reparar tipos.ts (bloque de "Entidad Huevo")
$tiposPath = Join-Path $ProjectRoot "src/hexant/tipos.ts"
if (-not (Test-Path $tiposPath)) {
  throw "No se encontró $tiposPath"
}
$tipos = Get-Content $tiposPath -Raw

$eggBlock = @"
/** === Entidad Huevo === */

export type EggState = "atQueen" | "carried" | "incubating";

export interface Egg {
  id: number;
  x: number;
  y: number;
  /** Estado del huevo: orbitando a la reina, en traslado o incubando en un nido */
  state: EggState;

  /** id de la hormiga que lo transporta (nurse/builder). null/undefined si no aplica */
  carrierId?: number | null;

  /** id del hexágono actual/destino para incubación. null/undefined si está en la reina */
  hexId?: number | null;

  /** (compat) objetivo de hex para traslado */
  targetHexId?: number | null;

  /** progreso de alimentación (unidades acumuladas) */
  fed?: number;

  /** tick de referencia para animaciones/TTL */
  tStart?: number;

  /** ticks restantes de incubación (si se usa este modo) */
  hatchTicks?: number;

  /** tick absoluto en el que eclosiona (si se usa este modo) */
  hatchAt?: number;
}
"@

$patternSectionStart = '(?s)/\*\*\s*===\s*Entidad\s+Huevo\s*===\s*\*/.*\Z'
if ($tipos -match $patternSectionStart) {
  $fixedTipos = [regex]::Replace($tipos, $patternSectionStart, $eggBlock)
} else {
  $patternFromInterface = '(?s)export\s+interface\s+Egg\s*\{.*\Z'
  if ($tipos -match $patternFromInterface) {
    $fixedTipos = [regex]::Replace($tipos, $patternFromInterface, $eggBlock)
  } else {
    throw "No pude localizar la sección de Egg en tipos.ts. Revisa el archivo."
  }
}

if ($fixedTipos -ne $tipos) {
  Backup-File $tiposPath
  Write-Utf8 $tiposPath $fixedTipos
  Write-Host " Reparado: $tiposPath (sección 'Entidad Huevo')." -ForegroundColor Green
} else {
  Write-Host "ℹ No se detectaron cambios necesarios en $tiposPath." -ForegroundColor Yellow
}

# 2) Limpiar invocaciones duplicadas en src/hexant/juego/sistemas/index.ts
$sisIndexPath = Join-Path $ProjectRoot "src/hexant/juego/sistemas/index.ts"
if (-not (Test-Path $sisIndexPath)) {
  throw "No se encontró $sisIndexPath"
}
$lines = Get-Content $sisIndexPath

$seenIA = $false
$seenMeta = $false
$out = New-Object System.Collections.Generic.List[string]

foreach ($ln in $lines) {
  $isIA   = $ln -match 'if\s*\(typeof\s+SistemaIA\s*===\s*"function"\)\s*SistemaIA\s*\(\s*w\s*,\s*cfg\s*\)\s*;'
  $isMeta = $ln -match 'if\s*\(typeof\s+SistemaMetabolismo\s*===\s*"function"\)\s*SistemaMetabolismo\s*\(\s*w\s*,\s*cfg\s*\)\s*;'

  if ($isIA) {
    if (-not $seenIA) { $seenIA = $true; $out.Add($ln) }
  } elseif ($isMeta) {
    if (-not $seenMeta) { $seenMeta = $true; $out.Add($ln) }
  } else {
    $out.Add($ln)
  }
}

if (($out -join "`n") -ne ($lines -join "`n")) {
  Backup-File $sisIndexPath
  Write-Utf8 $sisIndexPath ($out -join "`r`n")
  Write-Host " Reparado: llamadas duplicadas en $sisIndexPath." -ForegroundColor Green
} else {
  Write-Host "ℹ No se detectaron duplicados en $sisIndexPath." -ForegroundColor Yellow
}

# 3) Verificación de tipos
$pkgJson = Join-Path $ProjectRoot "package.json"
if (Test-Path $pkgJson) {
  try {
    Write-Host " Ejecutando: npm run check" -ForegroundColor Cyan
    $npm = & npm run check
    Write-Host $npm
    Write-Host " npm run check finalizó (revisa la salida arriba)." -ForegroundColor Green
  } catch {
    Write-Host " npm run check devolvió error. Revisa los mensajes arriba." -ForegroundColor Red
    exit 1
  }
} else {
  Write-Host "ℹ No hay package.json en $ProjectRoot; omito 'npm run check'." -ForegroundColor Yellow
}
