
import os

filepath = 'src/App.js'
with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

# Fix 2878: className={`stock-item ${sel > 0 ? 'selected' : ''}`} 
# Should have a backtick after the brace!
# We search for the pattern and add backtick if missing
broken = "className={`stock-item ${sel > 0 ? 'selected' : ''}`} "
fixed = "className={`stock-item ${sel > 0 ? 'selected' : ''}`}" + " " # Wait, actually it s simpler
# Using regex to find all unclosed template literals inside JSX braces
import re
# Find: {` string ${interpolation} string } 
# Actually, the most common broken pattern from turn 3506 mojibake cleaning is:
# className={`something ${condition ? 'a' : 'b'}} (Missing backtick)

# Specific fix for 2878
text = text.replace("className={`stock-item ${sel > 0 ? 'selected' : ''}`} ", "className={`stock-item ${sel > 0 ? 'selected' : ''}`}` ")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(text)
print('Fixed App.js')
