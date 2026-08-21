"""
Catch components referenced in JSX but never imported or defined.

`npm run build` does not fail on these: Rollup treats a bare capitalised identifier
as a possible global, so the bundle succeeds and the page throws at render instead.
Two real outages this session (a missing useReducer, a missing SlidersHorizontal)
both shipped green builds.
"""
import pathlib, re, sys

BUILTIN = {'React', 'Fragment'}
problems = []

for path in sorted(pathlib.Path('src').rglob('*.jsx')):
    src = path.read_text()
    # strip comments and strings so references inside them are not counted
    src = re.sub(r'/\*.*?\*/', '', src, flags=re.S)
    src = re.sub(r'^\s*//.*$', '', src, flags=re.M)

    defined = set(BUILTIN)
    # imports: default, namespace and named (incl. `X as Y`)
    for m in re.finditer(r'import\s+(.*?)\s+from\s+[\'"][^\'"]+[\'"]', src, re.S):
        clause = m.group(1)
        for named in re.findall(r'\{([^}]*)\}', clause, re.S):
            for part in named.split(','):
                part = part.strip()
                if part:
                    defined.add(part.split(' as ')[-1].strip())
        head = re.sub(r'\{[^}]*\}', '', clause)
        for token in re.findall(r'[A-Za-z_$][\w$]*', head):
            if token not in ('as',):
                defined.add(token)
    # locally declared components
    defined |= set(re.findall(r'(?:function|const|class)\s+([A-Z][\w$]*)', src))
    # capitalised names bound by destructuring, incl. `icon: Icon` and `{ Icon }`
    defined |= set(re.findall(r'[:{,]\s*([A-Z][\w$]*)\s*[,}=]', src))

    used = set(re.findall(r'<([A-Z][\w$]*)[\s/>]', src))
    missing = sorted(u for u in used if u.split('.')[0] not in defined)
    if missing:
        problems.append((path, missing))

for path, missing in problems:
    print(f'  {path}: {", ".join(missing)}')

print(f'\n{len(problems)} file(s) with undefined JSX components')
sys.exit(1 if problems else 0)
