import re

with open('c:/LudusGenNew/LudusGen_frontend/src/ai_components/tripo/TripoPanel.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Focusing on the return block
# It starts at 'return (' and ends at the end of the file (basically)
start_idx = text.find('return (')
if start_idx == -1:
    print("No return block found")
    exit()

return_content = text[start_idx:]

div_opens = len(re.findall(r'<div', return_content))
div_closes = len(re.findall(r'</div>', return_content))
self_closing_divs = len(re.findall(r'<div[^>]*/>', return_content))

print(f"Divs: Open={div_opens}, Close={div_closes}, SelfClosing={self_closing_divs}")
print(f"Net Divs: {div_opens - div_closes - self_closing_divs}")

# Check other common tags
main_opens = len(re.findall(r'<main', return_content))
main_closes = len(re.findall(r'</main>', return_content))
print(f"Main: Open={main_opens}, Close={main_closes}")

# Components
def count_comp(name):
    opens = len(re.findall(f'<{name}', return_content))
    closes = len(re.findall(f'</{name}>', return_content))
    self = len(re.findall(f'<{name}[^>]*/>', return_content))
    print(f"{name}: {opens} open, {closes} close, {self} self-closing. Net: {opens - closes - self}")

for comp in ["Tooltip", "GeneratePanel", "Segment", "Retopo", "Texture", "Animate", "PBar", "Loader2", "IconBtn", "WireframeControl", "BgColorPicker", "LightingControls", "ThreeViewer", "AnimatePresence", "motion.div", "Sparkles", "Box", "HistoryCard", "ChevronDown", "ChevronUp", "ConfirmModal", "DownloadModal"]:
    count_comp(comp)
