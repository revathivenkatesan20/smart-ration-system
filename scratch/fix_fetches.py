import re
import os

file_path = 'frontend/src/App.js'
content = open(file_path, 'r', encoding='utf-8').read()

# Replace any occurrence of '${API_BASE_URL}/...' in single or double quotes with backticks
# Regex: find ' then ${API_BASE_URL}/ then anything until first '
new_content = re.sub(r"'\$\{API_BASE_URL\}(.*?)'", r"`${API_BASE_URL}\1`", content)
new_content = re.sub(r"\"(\$\{API_BASE_URL\}/.*?)\"", r"`\1`", new_content)

open(file_path, 'w', encoding='utf-8').write(new_content)
print("Updated all API_BASE_URL strings to use backticks")
