import re

with open(r'c:\Users\AbuZarKamboh\OneDrive\Desktop\New folder\frontend\src\components\Sidebar.jsx', 'r', encoding='utf-8') as f:
    content = f.read()
    lines_list = content.splitlines()

# Pattern 1: Find .map() calls where the key might resolve to undefined
# Look for key={something?.something} patterns where chaining could yield undefined
print("=== PATTERN 1: Map calls with potentially undefined keys ===")
map_pattern = re.compile(r'\.map\s*\(')
for m in map_pattern.finditer(content):
    start_pos = m.start()
    line_num = content[:start_pos].count('\n') + 1
    snippet = content[start_pos:start_pos+800]
    
    # Find key= in the snippet
    key_match = re.search(r'key=\{([^}]+)\}', snippet)
    if key_match:
        key_expr = key_match.group(1).strip()
        safe = key_expr.encode('ascii','ignore').decode('ascii')
        print(f"  Line {line_num}: key={{{safe}}}")

# Pattern 2: Find arrays rendered as children inside divs (not from .map)
# Look for {[ ... ]} patterns or array expressions inside JSX
print("\n=== PATTERN 2: Inline array children in JSX ===")
inline_array = re.compile(r'\{(\[[\s\S]*?\])\.map')
for m in inline_array.finditer(content):
    start_pos = m.start()
    line_num = content[:start_pos].count('\n') + 1
    print(f"  Line {line_num}: inline array.map()")

# Pattern 3: Find conditional rendering that could produce siblings
# {items && items.map(...)} or ternary with maps
print("\n=== PATTERN 3: Conditional map rendering ===")
cond_map = re.compile(r'[?&]\s*\w+\.map\(')
for m in cond_map.finditer(content):
    start_pos = m.start()
    line_num = content[:start_pos].count('\n') + 1
    snippet = content[start_pos:start_pos+100]
    safe = snippet[:80].encode('ascii','ignore').decode('ascii').replace('\n', ' ')
    print(f"  Line {line_num}: {safe}")

# Pattern 4: Look for renderUserAvatar calls inside maps
print("\n=== PATTERN 4: renderUserAvatar inside map contexts ===")
for i, line in enumerate(lines_list):
    if 'renderUserAvatar' in line:
        print(f"  Line {i+1}: {line.strip()[:120]}")

# Pattern 5: Look for fragments <> inside map callbacks that have multiple children
print("\n=== PATTERN 5: Fragments inside map callbacks ===")
fragment_pattern = re.compile(r'\.map\([^)]*\)\s*=>\s*\(\s*<>')
for m in fragment_pattern.finditer(content):
    start_pos = m.start()
    line_num = content[:start_pos].count('\n') + 1
    print(f"  Line {line_num}: Fragment in map callback")
