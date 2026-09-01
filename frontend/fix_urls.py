import re, os

files = [
    r'src\pages\SettingsPage.jsx',
    r'src\pages\AdminDashboard.jsx',
    r'src\pages\JoinGroup.jsx',
    r'src\pages\ChatPage.jsx',
    r'src\components\CallOverlay.jsx',
]

# Pattern to fix: the broken nested template literal
# e.g.: ${import.meta.env.VITE_BACKEND_URL || `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}`}
bad_pattern = r'\$\{import\.meta\.env\.VITE_BACKEND_URL \|\| `\$\{import\.meta\.env\.VITE_BACKEND_URL \|\| [\'"]http://localhost:5000[\'"]\}`\}'
good_replacement = '${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}'

for f in files:
    if os.path.exists(f):
        with open(f, 'r', encoding='utf-8') as fh:
            content = fh.read()
        new_content = re.sub(bad_pattern, good_replacement, content)
        count = len(re.findall(bad_pattern, content))
        if content != new_content:
            with open(f, 'w', encoding='utf-8') as fh:
                fh.write(new_content)
            print(f'Fixed {count} occurrences: {f}')
        else:
            print(f'No matches found: {f}')
    else:
        print(f'File not found: {f}')

print('Done!')
