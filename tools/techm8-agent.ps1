# TECHM8 PC Health Agent
#
# Read-only helper for https://www.techm8australia.com/pc-health-check.html
# Web browsers are not allowed to read temperatures, battery wear or Windows
# error logs, so this script reads them and serves them to the page on
# http://127.0.0.1:8765 while this window stays open.
#
# It installs nothing and changes no settings. Close the window or press Q to stop.
# Only the TECHM8 website (and localhost during development) may read the data.

$ErrorActionPreference = 'SilentlyContinue'
$ProgressPreference = 'SilentlyContinue'

$TM8Version = '1.0.0'
$TM8Port = 8765
$TM8ScriptUrl = 'https://www.techm8australia.com/tools/techm8-agent.ps1'
$TM8PageUrl = 'https://www.techm8australia.com/pc-health-check.html'
$TM8AllowedOrigins = @(
  'https://www.techm8australia.com',
  'https://techm8australia.com',
  'http://localhost:4173',
  'http://127.0.0.1:4173'
)

function Test-TM8Admin {
  $id = [Security.Principal.WindowsIdentity]::GetCurrent()
  ([Security.Principal.WindowsPrincipal]$id).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-TM8Cim([string]$Class, [string]$Namespace = 'root/cimv2') {
  try { @(Get-CimInstance -Namespace $Namespace -ClassName $Class -ErrorAction Stop) } catch { @() }
}

function Format-TM8Date($Value) {
  if ($Value -is [datetime]) { return $Value.ToString('o') }
  return $null
}

function Get-TM8Round($Value, [int]$Digits = 1) {
  if ($null -eq $Value) { return $null }
  return [math]::Round([double]$Value, $Digits)
}

# ---------------------------------------------------------------- inventory

function Get-TM8Battery {
  $batteries = @()
  $xmlPath = Join-Path $env:TEMP 'techm8-battery.xml'
  try {
    & powercfg.exe /batteryreport /xml /output $xmlPath | Out-Null
    [xml]$xml = Get-Content -LiteralPath $xmlPath -Raw
    foreach ($b in @($xml.BatteryReport.Batteries.Battery)) {
      if (-not $b) { continue }
      $design = [double]$b.DesignCapacity
      $full = [double]$b.FullChargeCapacity
      $batteries += [ordered]@{
        name          = "$($b.Id)".Trim()
        manufacturer  = "$($b.Manufacturer)".Trim()
        serial        = "$($b.SerialNumber)".Trim()
        chemistry     = "$($b.Chemistry)".Trim()
        designMWh     = $design
        fullMWh       = $full
        healthPct     = $(if ($design -gt 0) { Get-TM8Round ($full / $design * 100) } else { $null })
        cycleCount    = $(if ("$($b.CycleCount)" -match '^\d+$') { [int]$b.CycleCount } else { $null })
        source        = 'powercfg'
      }
    }
  } catch { }
  Remove-Item -LiteralPath $xmlPath -ErrorAction SilentlyContinue

  if ($batteries.Count -eq 0) {
    # Fallback to the ACPI battery classes (needs administrator rights).
    $static = Get-TM8Cim BatteryStaticData 'root/wmi'
    $fullCap = Get-TM8Cim BatteryFullChargedCapacity 'root/wmi'
    $cycles = Get-TM8Cim BatteryCycleCount 'root/wmi'
    for ($i = 0; $i -lt $static.Count; $i++) {
      $design = [double]$static[$i].DesignedCapacity
      $full = [double]($fullCap | Select-Object -Index $i).FullChargedCapacity
      $batteries += [ordered]@{
        name         = "$($static[$i].DeviceName)".Trim()
        manufacturer = "$($static[$i].ManufactureName)".Trim()
        serial       = "$($static[$i].SerialNumber)".Trim()
        chemistry    = $null
        designMWh    = $design
        fullMWh      = $full
        healthPct    = $(if ($design -gt 0) { Get-TM8Round ($full / $design * 100) } else { $null })
        cycleCount   = ($cycles | Select-Object -Index $i).CycleCount
        source       = 'wmi'
      }
    }
  }
  return ,$batteries
}

function Get-TM8Disks {
  $disks = @()
  foreach ($d in @(Get-PhysicalDisk)) {
    $r = $d | Get-StorageReliabilityCounter
    $disks += [ordered]@{
      name         = "$($d.FriendlyName)".Trim()
      media        = "$($d.MediaType)"
      bus          = "$($d.BusType)"
      sizeGB       = Get-TM8Round ($d.Size / 1GB) 0
      health       = "$($d.HealthStatus)"
      status       = "$($d.OperationalStatus)"
      serial       = "$($d.SerialNumber)".Trim()
      firmware     = "$($d.FirmwareVersion)".Trim()
      tempC        = $(if ($r.Temperature) { [int]$r.Temperature } else { $null })
      tempMaxC     = $(if ($r.TemperatureMax) { [int]$r.TemperatureMax } else { $null })
      wearPct      = $r.Wear
      powerOnHours = $r.PowerOnHours
      readErrors   = $r.ReadErrorsTotal
      writeErrors  = $r.WriteErrorsTotal
      uncorrected  = $r.ReadErrorsUncorrected
    }
  }
  return ,$disks
}

function Get-TM8Inventory {
  $os = Get-TM8Cim Win32_OperatingSystem | Select-Object -First 1
  $cs = Get-TM8Cim Win32_ComputerSystem | Select-Object -First 1
  $csp = Get-TM8Cim Win32_ComputerSystemProduct | Select-Object -First 1
  $bios = Get-TM8Cim Win32_BIOS | Select-Object -First 1
  $board = Get-TM8Cim Win32_BaseBoard | Select-Object -First 1

  $cpus = @(Get-TM8Cim Win32_Processor | ForEach-Object {
    [ordered]@{
      name    = "$($_.Name)".Trim()
      cores   = $_.NumberOfCores
      threads = $_.NumberOfLogicalProcessors
      maxMHz  = $_.MaxClockSpeed
      socket  = "$($_.SocketDesignation)"
    }
  })

  # Win32_VideoController caps AdapterRAM at 4 GB; the driver registry key has the real size.
  $vram = @{}
  Get-ItemProperty 'HKLM:\SYSTEM\ControlSet001\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0*' |
    ForEach-Object {
      $size = $_.'HardwareInformation.qwMemorySize'
      if ($_.DriverDesc -and $size) { $vram["$($_.DriverDesc)"] = [int64]$size }
    }
  $gpus = @(Get-TM8Cim Win32_VideoController | ForEach-Object {
    $bytes = $vram["$($_.Name)"]
    if (-not $bytes) { $bytes = [int64]$_.AdapterRAM }
    [ordered]@{
      name       = "$($_.Name)".Trim()
      vramGB     = Get-TM8Round ($bytes / 1GB) 1
      driver     = "$($_.DriverVersion)"
      driverDate = Format-TM8Date $_.DriverDate
      resolution = $(if ($_.CurrentHorizontalResolution) { "$($_.CurrentHorizontalResolution) x $($_.CurrentVerticalResolution) @ $($_.CurrentRefreshRate) Hz" } else { $null })
    }
  })

  $memTypes = @{ 20 = 'DDR'; 21 = 'DDR2'; 24 = 'DDR3'; 26 = 'DDR4'; 27 = 'LPDDR'; 28 = 'LPDDR2'; 29 = 'LPDDR3'; 30 = 'LPDDR4'; 34 = 'DDR5'; 35 = 'LPDDR5' }
  $memory = @(Get-TM8Cim Win32_PhysicalMemory | ForEach-Object {
    [ordered]@{
      slot         = "$($_.DeviceLocator)".Trim()
      sizeGB       = Get-TM8Round ($_.Capacity / 1GB) 0
      type         = $memTypes[[int]$_.SMBIOSMemoryType]
      speedMTs     = $_.Speed
      configuredMTs = $_.ConfiguredClockSpeed
      manufacturer = "$($_.Manufacturer)".Trim()
      part         = "$($_.PartNumber)".Trim()
    }
  })

  $volumes = @(Get-Volume | Where-Object { $_.DriveLetter -and $_.Size -gt 0 } | Sort-Object DriveLetter | ForEach-Object {
    [ordered]@{
      letter = "$($_.DriveLetter):"
      label  = "$($_.FileSystemLabel)"
      fs     = "$($_.FileSystem)"
      sizeGB = Get-TM8Round ($_.Size / 1GB) 0
      freeGB = Get-TM8Round ($_.SizeRemaining / 1GB) 0
      health = "$($_.HealthStatus)"
    }
  })

  $network = @(Get-NetAdapter -Physical | ForEach-Object {
    [ordered]@{
      name   = "$($_.InterfaceDescription)"
      status = "$($_.Status)"
      speed  = "$($_.LinkSpeed)"
      mac    = "$($_.MacAddress)"
    }
  })

  return [ordered]@{
    agentVersion = $TM8Version
    isAdmin      = (Test-TM8Admin)
    collected    = (Get-Date).ToString('o')
    computerName = $env:COMPUTERNAME
    system       = [ordered]@{
      manufacturer = "$($cs.Manufacturer)".Trim()
      model        = "$($cs.Model)".Trim()
      family       = "$($csp.Version)".Trim()
      serial       = "$($bios.SerialNumber)".Trim()
      totalRamGB   = Get-TM8Round ($cs.TotalPhysicalMemory / 1GB) 1
    }
    os           = [ordered]@{
      name        = "$($os.Caption)".Trim()
      version     = "$($os.Version)"
      build       = "$($os.BuildNumber)"
      arch        = "$($os.OSArchitecture)"
      installDate = Format-TM8Date $os.InstallDate
      lastBoot    = Format-TM8Date $os.LastBootUpTime
    }
    bios         = [ordered]@{
      vendor  = "$($bios.Manufacturer)".Trim()
      version = "$($bios.SMBIOSBIOSVersion)".Trim()
      date    = Format-TM8Date $bios.ReleaseDate
    }
    board        = [ordered]@{
      manufacturer = "$($board.Manufacturer)".Trim()
      product      = "$($board.Product)".Trim()
    }
    cpus         = $cpus
    gpus         = $gpus
    memory       = $memory
    disks        = (Get-TM8Disks)
    volumes      = $volumes
    network      = $network
    batteries    = (Get-TM8Battery)
  }
}

# ---------------------------------------------------------------- live sensors

$script:TM8DiskTemps = @()
$script:TM8DiskTempsAt = [datetime]::MinValue
$script:TM8NvidiaSmi = $null
$script:TM8HmFound = $false
$script:TM8HmMissAt = [datetime]::MinValue

function Find-TM8NvidiaSmi {
  $cmd = Get-Command nvidia-smi.exe -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $paths = @("$env:SystemRoot\System32\nvidia-smi.exe", "$env:ProgramFiles\NVIDIA Corporation\NVSMI\nvidia-smi.exe")
  foreach ($p in $paths) { if (Test-Path -LiteralPath $p) { return $p } }
  return ''
}

function Get-TM8HardwareMonitorSensors {
  # LibreHardwareMonitor / OpenHardwareMonitor publish accurate CPU and GPU
  # sensors over WMI while they run as administrator.
  foreach ($ns in @('root/LibreHardwareMonitor', 'root/OpenHardwareMonitor')) {
    $sensors = Get-TM8Cim Sensor $ns
    if ($sensors.Count -eq 0) { continue }
    $hw = @{}
    foreach ($h in (Get-TM8Cim Hardware $ns)) { $hw["$($h.Identifier)"] = $h }
    $out = @()
    foreach ($s in $sensors) {
      $parent = $hw["$($s.Parent)"]
      $out += [ordered]@{
        hardware = "$($parent.Name)"
        hwType   = "$($parent.HardwareType)"
        name     = "$($s.Name)"
        type     = "$($s.SensorType)"
        value    = Get-TM8Round $s.Value 1
      }
    }
    return ,$out
  }

  # LibreHardwareMonitor's own web server (Options > Remote Web Server > Run).
  try {
    $data = Invoke-RestMethod -Uri 'http://127.0.0.1:8085/data.json' -TimeoutSec 1 -ErrorAction Stop
    $out = New-Object System.Collections.ArrayList
    $walk = {
      param($node, $depth, $hwName)
      if ($depth -eq 2) { $hwName = "$($node.Text)" }
      $value = "$($node.Value)"
      if ($node.Children.Count -eq 0 -and $value -match '^(-?[\d.,]+)\s*(.+)$') {
        $number = $Matches[1] -replace ',', '.'
        $unit = $Matches[2]
        $type = switch -Regex ($unit) {
          'C$' { 'Temperature' } '^RPM' { 'Fan' } '^%' { 'Load' } 'Hz$' { 'Clock' } '^W' { 'Power' } default { '' }
        }
        if ($type) {
          [void]$out.Add([ordered]@{
            hardware = $hwName; hwType = ''; name = "$($node.Text)"; type = $type
            value = Get-TM8Round $number 1
          })
        }
      }
      foreach ($child in @($node.Children)) { & $walk $child ($depth + 1) $hwName }
    }
    & $walk $data 0 ''
    if ($out.Count) { return ,@($out) }
  } catch { }
  return ,@()
}

function Get-TM8Sensors {
  $result = [ordered]@{
    time    = (Get-Date).ToString('o')
    cpu     = [ordered]@{ load = $null; clockMHz = $null; baseMHz = $null; perfPct = $null }
    cpuTemp = $null
    memory  = $null
    gpus    = @()
    temps   = @()
    fans    = @()
    battery = $null
    sources = @()
  }

  $pi = Get-TM8Cim Win32_PerfFormattedData_Counters_ProcessorInformation | Where-Object { $_.Name -eq '_Total' } | Select-Object -First 1
  if ($pi) {
    $load = $pi.PercentProcessorUtility
    if ($null -eq $load) { $load = $pi.PercentProcessorTime }
    $result.cpu.load = [math]::Min(100, [int]$load)
    $result.cpu.baseMHz = [int]$pi.ProcessorFrequency
    $result.cpu.perfPct = [int]$pi.PercentProcessorPerformance
    if ($pi.ProcessorFrequency -and $pi.PercentProcessorPerformance) {
      $result.cpu.clockMHz = [int]($pi.ProcessorFrequency * $pi.PercentProcessorPerformance / 100)
    }
  }

  $os = Get-TM8Cim Win32_OperatingSystem | Select-Object -First 1
  if ($os.TotalVisibleMemorySize) {
    $total = [double]$os.TotalVisibleMemorySize
    $free = [double]$os.FreePhysicalMemory
    $result.memory = [ordered]@{
      totalGB = Get-TM8Round ($total / 1MB) 1
      usedGB  = Get-TM8Round (($total - $free) / 1MB) 1
      usedPct = [int](($total - $free) / $total * 100)
    }
  }

  $temps = @()
  $fans = @()
  $gpus = @{}

  # Probing for LibreHardwareMonitor takes about a second when it is not
  # running, so after a miss only look again every 15 seconds.
  $hm = @()
  if ($script:TM8HmFound -or ((Get-Date) - $script:TM8HmMissAt).TotalSeconds -gt 15) {
    $hm = Get-TM8HardwareMonitorSensors
    $script:TM8HmFound = $hm.Count -gt 0
    if (-not $script:TM8HmFound) { $script:TM8HmMissAt = Get-Date }
  }
  if ($hm.Count) {
    $result.sources += 'LibreHardwareMonitor'
    $cpuPick = $null
    $cpuRank = 99
    foreach ($s in $hm) {
      $isCpu = $s.hwType -match '^Cpu' -or $s.hardware -match 'Intel|AMD Ryzen|Ryzen|Xeon|Core|Threadripper|Athlon|Pentium|Celeron' -and $s.hardware -notmatch 'Graphics|Radeon|GeForce|Arc'
      $isGpu = $s.hwType -match '^Gpu' -or $s.hardware -match 'GeForce|Radeon|RTX|GTX|Arc|Graphics'
      if ($s.type -eq 'Temperature' -and $null -ne $s.value -and $s.value -gt 0) {
        $temps += [ordered]@{ name = "$($s.hardware) - $($s.name)"; value = $s.value; source = 'LibreHardwareMonitor' }
        if ($isCpu) {
          $rank = switch -Regex ($s.name) {
            '^CPU Package$' { 0 } 'Tctl|Tdie' { 1 } '^Core Max$' { 2 } '^Core Average$' { 3 } '^CPU Core$' { 4 } default { 9 }
          }
          if ($rank -lt $cpuRank) { $cpuRank = $rank; $cpuPick = [ordered]@{ value = $s.value; source = "LibreHardwareMonitor ($($s.name))" } }
        }
        if ($isGpu -and $s.name -match 'GPU Core|^GPU$|Hot Spot' ) {
          if (-not $gpus[$s.hardware]) { $gpus[$s.hardware] = [ordered]@{ name = $s.hardware; temp = $null; load = $null; clockMHz = $null; powerW = $null; source = 'LibreHardwareMonitor' } }
          if ($s.name -match 'GPU Core|^GPU$' -or $null -eq $gpus[$s.hardware].temp) { $gpus[$s.hardware].temp = $s.value }
        }
      }
      if ($s.type -eq 'Fan' -and $s.value -gt 0) { $fans += [ordered]@{ name = "$($s.hardware) - $($s.name)"; rpm = [int]$s.value } }
      if ($isGpu -and $s.type -eq 'Load' -and $s.name -match 'GPU Core' -and $gpus[$s.hardware]) { $gpus[$s.hardware].load = $s.value }
    }
    if ($cpuPick) { $result.cpuTemp = $cpuPick }
  }

  # ACPI thermal zones: available without extra software but usually a
  # motherboard sensor near the CPU rather than the CPU die itself.
  foreach ($z in (Get-TM8Cim Win32_PerfFormattedData_Counters_ThermalZoneInformation)) {
    $c = $null
    if ($z.HighPrecisionTemperature -gt 0) { $c = $z.HighPrecisionTemperature / 10 - 273.15 }
    elseif ($z.Temperature -gt 0) { $c = $z.Temperature - 273.15 }
    if ($null -ne $c -and $c -gt 1 -and $c -lt 125) {
      $temps += [ordered]@{ name = "ACPI thermal zone $($z.Name -replace '^\\_TZ\.', '')"; value = Get-TM8Round $c 1; source = 'ACPI' }
    }
  }
  if (-not $result.cpuTemp) {
    $acpi = @($temps | Where-Object { $_.source -eq 'ACPI' } | Sort-Object { $_.value } -Descending)
    if ($acpi.Count) {
      $result.cpuTemp = [ordered]@{ value = $acpi[0].value; source = 'ACPI thermal zone (approximate)' }
      $result.sources += 'ACPI'
    }
  }

  if ($null -eq $script:TM8NvidiaSmi) { $script:TM8NvidiaSmi = Find-TM8NvidiaSmi }
  if ($script:TM8NvidiaSmi) {
    $lines = & $script:TM8NvidiaSmi --query-gpu=name,temperature.gpu,utilization.gpu,clocks.gr,power.draw --format=csv,noheader,nounits 2>$null
    foreach ($line in @($lines)) {
      $p = "$line" -split ',\s*'
      if ($p.Count -lt 5) { continue }
      $num = { param($v) if ($v -match '^[\d.]+$') { [double]$v } else { $null } }
      $gpus[$p[0]] = [ordered]@{
        name = $p[0]; temp = & $num $p[1]; load = & $num $p[2]; clockMHz = & $num $p[3]; powerW = & $num $p[4]; source = 'nvidia-smi'
      }
      if ($result.sources -notcontains 'nvidia-smi') { $result.sources += 'nvidia-smi' }
    }
  }
  $result.gpus = @($gpus.Values)

  # Disk temperatures are slow to read, so refresh them every 10 seconds.
  if (((Get-Date) - $script:TM8DiskTempsAt).TotalSeconds -gt 10) {
    $script:TM8DiskTempsAt = Get-Date
    $script:TM8DiskTemps = @(Get-PhysicalDisk | ForEach-Object {
      $r = $_ | Get-StorageReliabilityCounter
      if ($r.Temperature) { [ordered]@{ name = "Disk - $("$($_.FriendlyName)".Trim())"; value = [double]$r.Temperature; source = 'Storage' } }
    })
  }
  $temps += $script:TM8DiskTemps

  $result.temps = @($temps)
  $result.fans = @($fans)

  $bs = Get-TM8Cim BatteryStatus 'root/wmi' | Select-Object -First 1
  $wb = Get-TM8Cim Win32_Battery | Select-Object -First 1
  if ($wb -or $bs) {
    $rate = $null
    if ($bs.ChargeRate -gt 0) { $rate = Get-TM8Round ($bs.ChargeRate / 1000) 1 }
    elseif ($bs.DischargeRate -gt 0) { $rate = - (Get-TM8Round ($bs.DischargeRate / 1000) 1) }
    $result.battery = [ordered]@{
      percent     = $wb.EstimatedChargeRemaining
      pluggedIn   = $(if ($bs) { [bool]$bs.PowerOnline } else { $wb.BatteryStatus -eq 2 })
      charging    = [bool]$bs.Charging
      rateW       = $rate
      voltage     = $(if ($bs.Voltage) { Get-TM8Round ($bs.Voltage / 1000) 2 } else { $null })
      remainingWh = $(if ($bs.RemainingCapacity) { Get-TM8Round ($bs.RemainingCapacity / 1000) 1 } else { $null })
    }
  }

  return $result
}

# ---------------------------------------------------------------- error logs

function Get-TM8Category($e) {
  $p = "$($e.ProviderName)"
  $id = [int]$e.Id
  if ($id -eq 1001 -and $p -match 'WER-SystemErrorReporting|BugCheck') { return 'bsod' }
  if (($p -eq 'Microsoft-Windows-Kernel-Power' -and $id -eq 41) -or ($p -eq 'EventLog' -and $id -eq 6008)) { return 'power' }
  if ($p -match 'WHEA') { return 'hardware' }
  if ($p -match '^(disk|Ntfs|Microsoft-Windows-Ntfs|stornvme|storahci|iaStor\w*|Microsoft-Windows-StorPort|volmgr|nvme)$') { return 'storage' }
  if (($p -eq 'Display' -and $id -eq 4101) -or $p -match '^(nvlddmkm|amdkmdag|amdwddmg|igfx\w*)$') { return 'gpu' }
  if ($p -match '^Application (Error|Hang)$' -or $p -eq 'Windows Error Reporting') { return 'app' }
  if ($e.LogName -eq 'Application') { return 'app' }
  return 'system'
}

function Get-TM8Errors([int]$Days = 30) {
  $start = (Get-Date).AddDays(-$Days)
  $events = @()
  $events += @(Get-WinEvent -FilterHashtable @{ LogName = 'System'; Level = 1, 2; StartTime = $start } -MaxEvents 1500)
  $events += @(Get-WinEvent -FilterHashtable @{ LogName = 'System'; ProviderName = 'Microsoft-Windows-WHEA-Logger'; StartTime = $start } -MaxEvents 200)
  $events += @(Get-WinEvent -FilterHashtable @{ LogName = 'Application'; Level = 1, 2; StartTime = $start } -MaxEvents 400)

  $seen = @{}
  $counts = [ordered]@{ bsod = 0; power = 0; hardware = 0; storage = 0; gpu = 0; app = 0; system = 0 }
  $important = @()
  $other = @()
  foreach ($e in ($events | Where-Object { $_ } | Sort-Object TimeCreated -Descending)) {
    $key = "$($e.LogName)|$($e.RecordId)"
    if ($seen[$key]) { continue }
    $seen[$key] = $true
    $cat = Get-TM8Category $e
    $counts[$cat]++
    if ($cat -eq 'app' -or $cat -eq 'system') { $other += , @($e, $cat) } else { $important += , @($e, $cat) }
  }

  # Formatting messages is the slow part, so only 400 events get text: every
  # hardware-related one first, then the newest of the rest.
  $list = @()
  foreach ($pair in ($important + $other | Select-Object -First 400)) {
    $e = $pair[0]
    $msg = "$($e.Message)"
    if ($msg.Length -gt 600) { $msg = $msg.Substring(0, 600) + '...' }
    $list += [ordered]@{
      time     = $e.TimeCreated.ToString('o')
      log      = $e.LogName
      level    = "$($e.LevelDisplayName)"
      provider = "$($e.ProviderName)"
      id       = $e.Id
      category = $pair[1]
      message  = $msg.Trim()
    }
  }

  $dumps = @(Get-ChildItem -LiteralPath "$env:SystemRoot\Minidump" -Filter *.dmp | Sort-Object LastWriteTime -Descending | ForEach-Object {
    [ordered]@{ name = $_.Name; time = $_.LastWriteTime.ToString('o'); sizeKB = [int]($_.Length / 1KB) }
  })

  $stability = $null
  $rel = Get-CimInstance -ClassName Win32_ReliabilityStabilityMetrics -ErrorAction SilentlyContinue |
    Sort-Object TimeGenerated -Descending | Select-Object -First 1
  if ($rel) { $stability = Get-TM8Round $rel.SystemStabilityIndex 1 }

  return [ordered]@{
    days      = $Days
    counts    = $counts
    events    = $list
    minidumps = $dumps
    stability = $stability
  }
}

function Get-TM8BatteryReportHtml {
  $path = Join-Path $env:TEMP 'techm8-battery-report.html'
  & powercfg.exe /batteryreport /output $path | Out-Null
  if (Test-Path -LiteralPath $path) {
    $html = Get-Content -LiteralPath $path -Raw
    Remove-Item -LiteralPath $path -ErrorAction SilentlyContinue
    return $html
  }
  return '<p>No battery found, or the battery report could not be created.</p>'
}

# ---------------------------------------------------------------- HTTP server

function Send-TM8Response($Context, [int]$Status, [string]$Body, [string]$Type = 'application/json; charset=utf-8') {
  $res = $Context.Response
  $origin = $Context.Request.Headers['Origin']
  if ($origin -and $TM8AllowedOrigins -contains $origin) {
    $res.AddHeader('Access-Control-Allow-Origin', $origin)
    $res.AddHeader('Vary', 'Origin')
    $res.AddHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    $res.AddHeader('Access-Control-Allow-Headers', 'Content-Type')
    $res.AddHeader('Access-Control-Allow-Private-Network', 'true')
  }
  $res.AddHeader('Cache-Control', 'no-store')
  $res.StatusCode = $Status
  $res.ContentType = $Type
  $bytes = [Text.Encoding]::UTF8.GetBytes($Body)
  $res.ContentLength64 = $bytes.Length
  try { $res.OutputStream.Write($bytes, 0, $bytes.Length) } catch { }
  try { $res.OutputStream.Close() } catch { }
}

function Send-TM8Json($Context, $Data) {
  Send-TM8Response $Context 200 (ConvertTo-Json -InputObject $Data -Depth 8 -Compress)
}

function Invoke-TM8Request($Context) {
  $req = $Context.Request
  $origin = $req.Headers['Origin']
  if ($req.HttpMethod -eq 'OPTIONS') { Send-TM8Response $Context 204 ''; return }
  # Other websites the customer visits must not be able to read this data.
  if ($origin -and $TM8AllowedOrigins -notcontains $origin) {
    Send-TM8Response $Context 403 '{"error":"origin not allowed"}'
    return
  }

  $path = $req.Url.AbsolutePath.TrimEnd('/')
  Write-Host ("  {0}  {1}" -f (Get-Date -Format 'HH:mm:ss'), $path) -ForegroundColor DarkGray
  switch ($path) {
    '/ping' {
      Send-TM8Json $Context ([ordered]@{ ok = $true; version = $TM8Version; isAdmin = (Test-TM8Admin); computerName = $env:COMPUTERNAME })
    }
    '/info' {
      if (-not $script:TM8Inventory -or $req.QueryString['refresh']) { $script:TM8Inventory = Get-TM8Inventory }
      Send-TM8Json $Context $script:TM8Inventory
    }
    '/sensors' { Send-TM8Json $Context (Get-TM8Sensors) }
    '/errors' {
      $days = 30
      [int]::TryParse("$($req.QueryString['days'])", [ref]$days) | Out-Null
      $days = [math]::Max(1, [math]::Min(365, $days))
      Send-TM8Json $Context (Get-TM8Errors $days)
    }
    '/battery-report' { Send-TM8Response $Context 200 (Get-TM8BatteryReportHtml) 'text/html; charset=utf-8' }
    '/open/reliability' {
      Start-Process perfmon.exe -ArgumentList '/rel'
      Send-TM8Json $Context ([ordered]@{ ok = $true })
    }
    default { Send-TM8Response $Context 404 '{"error":"not found"}' }
  }
}

function Start-TM8Agent {
  $Host.UI.RawUI.WindowTitle = 'TECHM8 PC Health Agent'
  if (-not (Test-TM8Admin)) {
    Write-Host 'Asking for administrator rights (needed for battery, disk health and sensors)...' -ForegroundColor Yellow
    try {
      if ($PSCommandPath) {
        $argList = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
      } else {
        $argList = "-NoProfile -ExecutionPolicy Bypass -Command `"irm '$TM8ScriptUrl' | iex`""
      }
      Start-Process powershell.exe -Verb RunAs -ArgumentList $argList -ErrorAction Stop
      Write-Host 'The agent continues in the new administrator window. You can close this one.' -ForegroundColor Green
      return
    } catch {
      Write-Host 'Administrator rights were declined. Continuing with limited readings.' -ForegroundColor Yellow
    }
  }

  # Without administrator rights http.sys only lets us bind the localhost name.
  $listener = New-Object System.Net.HttpListener
  $listener.Prefixes.Add("http://localhost:$TM8Port/")
  if (Test-TM8Admin) { $listener.Prefixes.Add("http://127.0.0.1:$TM8Port/") }
  try {
    $listener.Start()
  } catch {
    Write-Host "Could not listen on port $TM8Port. Is the agent already running in another window?" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor DarkGray
    return
  }

  Write-Host ''
  Write-Host '  TECHM8 PC Health Agent' -ForegroundColor Cyan
  Write-Host "  version $TM8Version  |  listening on http://127.0.0.1:$TM8Port" -ForegroundColor DarkGray
  Write-Host ''
  Write-Host "  Open $TM8PageUrl" -ForegroundColor White
  Write-Host '  Keep this window open during the test. Press Q here to stop.' -ForegroundColor White
  Write-Host '  Nothing is installed or changed on this computer.' -ForegroundColor DarkGray
  Write-Host ''

  try {
    while ($listener.IsListening) {
      $task = $listener.GetContextAsync()
      while (-not $task.AsyncWaitHandle.WaitOne(250)) {
        try {
          if ([Console]::KeyAvailable -and [Console]::ReadKey($true).Key -eq 'Q') { return }
        } catch { }
      }
      try { Invoke-TM8Request $task.Result } catch {
        Write-Host "  Request failed: $($_.Exception.Message)" -ForegroundColor Red
      }
    }
  } finally {
    $listener.Stop()
    $listener.Close()
    Write-Host 'Agent stopped.' -ForegroundColor Yellow
  }
}

Start-TM8Agent
