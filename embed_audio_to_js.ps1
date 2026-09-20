$audioDir = "d:\AG Projects\whatsapp-crm\tutorial_audio"
$outFile = "d:\AG Projects\whatsapp-crm\tutorial_audio_data.js"

$files = Get-ChildItem -Path $audioDir -Filter *.wav

$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine("// Auto-generated Studio Female Voiceover Tracks (100% Reliable PCM WAV)")
[void]$sb.AppendLine("const STUDIO_VOICE_TRACKS = {")

foreach ($f in $files) {
    $bytes = [System.IO.File]::ReadAllBytes($f.FullName)
    $b64 = [System.Convert]::ToBase64String($bytes)
    $key = [System.IO.Path]::GetFileNameWithoutExtension($f.Name)
    [void]$sb.AppendLine("  '$key': 'data:audio/wav;base64,$b64',")
    Write-Host "Processed: $key (Length: $($b64.Length))"
}

[void]$sb.AppendLine("};")
[System.IO.File]::WriteAllText($outFile, $sb.ToString())
Write-Host "Generated $outFile successfully!"
