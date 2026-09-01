$srcFiles = Get-ChildItem -Recurse -Path "src" -Include "*.jsx","*.js" | Where-Object { $_.FullName -notlike "*node_modules*" }

$fixed = 0
foreach ($f in $srcFiles) {
    $c = [System.IO.File]::ReadAllText($f.FullName)
    $original = $c
    
    # Pattern 1: Fix the nested broken template literal
    # ${import.meta.env.VITE_BACKEND_URL || `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}`}
    $c = $c -replace '\$\{import\.meta\.env\.VITE_BACKEND_URL \|\| `\$\{import\.meta\.env\.VITE_BACKEND_URL \|\| .http://localhost:5000.\}`\}', '${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}'
    
    # Pattern 2: Fix fetch(${URL}/path, {  -->  fetch(`${URL}/path`, {
    # Match fetch( followed by ${...}/something, and NOT already having a backtick
    $c = $c -replace 'fetch\((\$\{import\.meta\.env\.VITE_BACKEND_URL [^`\n]+\}/[^`\n,\)]+),', 'fetch(`$1`,'
    
    # Pattern 3: Fix window.open(${URL}/path, -->  window.open(`${URL}/path`,
    $c = $c -replace 'window\.open\((\$\{import\.meta\.env\.VITE_BACKEND_URL [^`\n]+\}/[^`\n,]+),', 'window.open(`$1`,'
    
    # Pattern 4: Fix lines like:   : ${URL}/api/...; (ternary colon with no backtick)
    $c = $c -replace ': (\$\{import\.meta\.env\.VITE_BACKEND_URL [^`\n]+\}/api/[^`\n;]+);', ': `$1`;'
    
    # Pattern 5: Fix  src={...? ... : ${URL}/api/...}  (no backtick in ternary false branch)
    # This targets: ): ${URL}/api/...} at end of ternary inside src={}
    $c = $c -replace '\): (\$\{import\.meta\.env\.VITE_BACKEND_URL [^`\n}]+\}/api/[^`\n}]+)\}', '): `$1`}'
    
    # Pattern 6: fix  : ${URL}/api/files/... )   (ternary false-branch without backtick)
    $c = $c -replace ': (\$\{import\.meta\.env\.VITE_BACKEND_URL [^`\n]+\}/api/files/[^`\n\)]+)\)', ': `$1`)'
    
    if ($c -ne $original) {
        [System.IO.File]::WriteAllText($f.FullName, $c, [System.Text.Encoding]::UTF8)
        Write-Host "Fixed: $($f.Name)"
        $fixed++
    }
}
Write-Host "Total files fixed: $fixed"
