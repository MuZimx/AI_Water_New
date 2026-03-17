$basePath = "c:/Users/ASUS/Desktop/Projects/AI_Water_New/frontend/out"

# 递归查找所有 .js 文件并替换 localhost 引用
Get-ChildItem -Path $basePath -Filter "*.js" -Recurse | ForEach-Object {
    $file = $_.FullName
    $content = Get-Content $file -Raw

    if ($content -match "localhost:3000") {
        Write-Host "Fixing: $file"
        $newContent = $content -replace 'http://localhost:3000', 'https://api-aiwater.cszj.wang'
        Set-Content $file $newContent -NoNewline
    }
}

Write-Host "Done! All localhost references have been replaced."
