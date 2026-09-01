import re, os

# These files have lines where fetch( or similar is followed by
# ${...} without being wrapped in backticks
files_to_fix = [
    r'src\pages\SettingsPage.jsx',
    r'src\pages\AdminDashboard.jsx',
    r'src\pages\JoinGroup.jsx',
    r'src\pages\ChatPage.jsx',
    r'src\components\CallOverlay.jsx',
]

def fix_template_literals(content):
    """
    Find lines where a string expression like:
       fetch(${...}/api/..., {
    is missing its backtick wrapper.
    
    Also fixes lines like:
       : ${...}/api/...;  (JSX ternary)
       window.open(${...}/api/..., '_blank')
    """
    lines = content.split('\n')
    fixed_lines = []
    total_fixes = 0
    
    for i, line in enumerate(lines):
        original = line
        
        # Pattern 1: fetch(${...}/path, { -- missing backticks around the URL
        # Replace: fetch(${X}/Y, with fetch(`${X}/Y`,
        line = re.sub(
            r'\bfetch\(\s*(\$\{[^`\n]+\}/[^\s,\n]+),',
            lambda m: 'fetch(`' + m.group(1) + '`,',
            line
        )
        
        # Pattern 2: window.open(${...}/path, '_blank') -- missing backtick
        line = re.sub(
            r'\bwindow\.open\(\s*(\$\{[^`\n]+\}/[^\s,\n]+),',
            lambda m: 'window.open(`' + m.group(1) + '`,',
            line
        )
        
        # Pattern 3: src={${...}/path} in JSX -- wrap the value in backtick template
        # e.g.: src={${X}/api/files/${y}} -> src={`${X}/api/files/${y}`}
        # But only when there's no backtick already
        line = re.sub(
            r'src=\{(\$\{[^`\n}]+\}/[^}`\n]*\$\{[^}`\n]*\}[^}`\n]*)\}',
            lambda m: 'src={`' + m.group(1) + '`}',
            line
        )
        
        # Pattern 4: ternary with : ${...}/api -- the value after colon
        # e.g.:  : ${X}/api/files/${y}?token=${z};
        line = re.sub(
            r':\s+(\$\{[^`\n]+\}/api/[^`\n;]+);',
            lambda m: ': `' + m.group(1) + '`;',
            line
        )
        
        if line != original:
            total_fixes += 1
            
        fixed_lines.append(line)
    
    return '\n'.join(fixed_lines), total_fixes

for f in files_to_fix:
    if os.path.exists(f):
        with open(f, 'r', encoding='utf-8') as fh:
            content = fh.read()
        new_content, count = fix_template_literals(content)
        if count > 0:
            with open(f, 'w', encoding='utf-8') as fh:
                fh.write(new_content)
            print(f'Fixed {count} lines: {f}')
        else:
            print(f'No changes needed: {f}')
    else:
        print(f'File not found: {f}')

print('All done!')
