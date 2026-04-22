import re

with open('App.js', 'r', encoding='utf-8') as f:
    text = f.read()

# All garbled replacements!
bad_patterns = [
    r"A\\'A\+\?TA\?.*?A\d+",
    r"ÃƒÆ’.*?Ã¢â‚¬[^<\s\'\"]+",
    r"A\\'A\,A\?sA\,A",
    r"A\\'A\+.*?A\?sA\,[A-Za-z0-9\?]+",
    r"ÃƒÆ’.*?Ãâ€š[^\s<\"\']+",
    r"Ã[^<\s\'\"]+",  # Any sequence starting with Ã that doesn't have spaces or tags
    r"A\\'A\+.*?A[0-9]+",
]

original_length = len(text)
for p in bad_patterns:
    text = re.sub(p, '', text)

with open('App.js', 'w', encoding='utf-8') as f:
    f.write(text)

print(f"Cleaned {original_length - len(text)} bytes of mojibake.")