import re

with open('c:/LudusGenNew/LudusGen_frontend/src/ai_components/tripo/TripoPanel.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Extract the return block
match = re.search(r'return \((.*?)\);', text, re.DOTALL)
if not match:
    print("Return block not found!")
    exit()

return_block = match.group(1)

# Count div tags
div_open = return_block.count('<div')
div_close = return_block.count('</div>')
print(f"Div Open: {div_open}, Div Close: {div_close}")

# Count other tags
tags = re.findall(r'<([a-zA-Z0-9]+)', return_block)
close_tags = re.findall(r'</([a-zA-Z0-9]+)', return_block)
self_close = len(re.findall(r'/>', return_block))

print(f"Total Open Tags: {len(tags)}")
print(f"Total Close Tags: {len(close_tags)}")
print(f"Self-close Tags: {self_close}")
print(f"Unbalanced: {len(tags) - len(close_tags) - self_close}")
