import sys, re

with open('c:/LudusGenNew/LudusGen_frontend/src/ai_components/tripo/TripoPanel.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

brace_stack = []
tag_stack = []

for i, line in enumerate(lines, 1):
    # Skip lines until we find the return block start if you want, 
    # but scanning the whole file is safer for braces.
    # Poor man's tokenizer
    # Improved regex: match full tags and self-closing status
    for match in re.finditer(r'<(div|main|button|AnimatePresence|motion\.div|h3|span|p|Tooltip|HistoryCard|button|ConfirmModal|DownloadModal|GeneratePanel|Segment|Retopo|Texture|Animate|ThreeViewer|WireframeControl|BgColorPicker|LightingControls|IconBtn|Box|ChevronDown|ChevronUp|ChevronRight|ChevronLeft|RotateCcw|Camera|Move3d|Layers|Play|Square|Clock|Zap|Trash2|Loader2|Activity|Sparkles|CoinIcon|PBar|Na|Collapsible|TopoControls|ModelDropdown|Enhancer)([^>]*?)(/?)>', line):
        full_tag = match.group(0)
        tag_name = match.group(1)
        is_self_closing = match.group(3) == '/' or full_tag.endswith('/>') # some catch-all
        
        if is_self_closing:
            # print(f"Self-closing {tag_name} at {i}")
            pass
        else:
            tag_stack.append(tag_name)
            # print(f"Pushing {tag_name} at {i}")

    # Check for closing tags
    for match in re.finditer(r'</(div|main|button|AnimatePresence|motion\.div|h3|span|p|Tooltip|HistoryCard|ConfirmModal|DownloadModal|GeneratePanel|Segment|Retopo|Texture|Animate|ThreeViewer|WireframeControl|BgColorPicker|LightingControls|IconBtn|Box|ChevronDown|ChevronUp|ChevronRight|ChevronLeft|RotateCcw|Camera|Move3d|Layers|Play|Square|Clock|Zap|Trash2|Loader2|Activity|Sparkles|CoinIcon|PBar|Na|Collapsible|TopoControls|ModelDropdown|Enhancer)>', line):
        tag_name = match.group(1)
        if not tag_stack:
            print(f"Error: Unexpected close tag </{tag_name}> at line {i}")
        else:
            top = tag_stack.pop()
            if top != tag_name:
                print(f"Error: Mismatched tag: expected </{top}>, got </{tag_name}> at line {i}")
    
    if i in [901, 911, 982, 1085, 1153, 1182]:
        print(f"Line {i} Tag Stack: {tag_stack}")
    
    # Check for braces
    for char in line:
        if char == '{':
            brace_stack.append(i)
        elif char == '}':
            if not brace_stack:
                print(f"Error: Unexpected close brace }} at line {i}")
            else:
                brace_stack.pop()

if tag_stack:
    print(f"Error: Unclosed tags: {tag_stack}")
if brace_stack:
    print(f"Error: Unclosed braces from lines: {brace_stack}")
