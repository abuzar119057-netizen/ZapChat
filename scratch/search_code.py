with open(r'c:\Users\AbuZarKamboh\OneDrive\Desktop\New folder\frontend\src\components\Sidebar.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

keywords = ['uploadingstory', 'mystatusmanager', 'status', 'orange', 'cercal', 'circle', 'plus', 'add status']

for i, line in enumerate(lines):
    line_lower = line.lower()
    for kw in keywords:
        if kw in line_lower:
            safe_line = line.encode("ascii", "ignore").decode("ascii").strip()[:140]
            print(f"{i+1} ({kw}): {safe_line}")
            break
