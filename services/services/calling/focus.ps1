Add-Type -AssemblyName System.Windows.Forms
$proc = Get-Process -Name "VoxbayPhone", "Voxbay Phone", "microx-communicator" -ErrorAction SilentlyContinue | Select-Object -First 1

if ($proc -and $proc.MainWindowHandle -ne [IntPtr]::Zero) {
  $wscript = New-Object -ComObject WScript.Shell
  $wscript.AppActivate($proc.Id)
}