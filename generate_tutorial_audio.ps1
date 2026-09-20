Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SelectVoice("Microsoft Zira Desktop")
$synth.Rate = 0 # Normal speed
$synth.Volume = 100

$audioDir = "d:\AG Projects\whatsapp-crm\tutorial_audio"
if (!(Test-Path $audioDir)) {
    New-Item -ItemType Directory -Path $audioDir | Out-Null
}

$stepsVid1 = @(
    @{ Name = "v1_step1.wav"; Text = "Step 1: Open your phone app from the home screen." },
    @{ Name = "v1_step2.wav"; Text = "Step 2: Tap the three dots menu at the top right and select Settings." },
    @{ Name = "v1_step3.wav"; Text = "Step 3: Inside Call Settings, tap on Record Calls." },
    @{ Name = "v1_step4.wav"; Text = "Step 4: Turn on Auto Record Calls. All calls will now record in high definition and auto sync to OmniFlow CRM!" }
)

$stepsVid2 = @(
    @{ Name = "v2_step1.wav"; Text = "Step 1: In the OmniFlow Companion app, tap the Settings button at the top." },
    @{ Name = "v2_step2.wav"; Text = "Step 2: Inside Call Recording Hub, tap on Custom Folder to open the storage picker." },
    @{ Name = "v2_step3.wav"; Text = "Step 3: Browse your internal storage, open Recordings, and select the Call folder." },
    @{ Name = "v2_step4.wav"; Text = "Step 4: Tap Use This Folder at the bottom, then tap Allow. The folder is now linked and recordings will sync automatically!" }
)

foreach ($item in $stepsVid1) {
    $outPath = Join-Path $audioDir $item.Name
    $synth.SetOutputToWaveFile($outPath)
    $synth.Speak($item.Text)
    Write-Host "Generated: $outPath"
}

foreach ($item in $stepsVid2) {
    $outPath = Join-Path $audioDir $item.Name
    $synth.SetOutputToWaveFile($outPath)
    $synth.Speak($item.Text)
    Write-Host "Generated: $outPath"
}

$synth.Dispose()
Write-Host "All audio files successfully generated!"
