$file = 'c:\Users\mxtmo\Desktop\extesnsions\nothingwallpaepr\atmosphere-wallpaper\src\components\CanvasRenderer.tsx'
$lines = Get-Content $file
# Delete lines 817-891 (0-indexed: 816-890) — orphaned dead code
$newContent = $lines[0..815] + $lines[891..($lines.Length - 1)]
$newContent | Set-Content $file
Write-Host "Done. Lines deleted: 817-891"
