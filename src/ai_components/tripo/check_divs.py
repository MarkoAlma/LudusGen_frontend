import re
import sys

def check_div_balance(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    depth = 0
    in_return = False
    for i, line in enumerate(lines, 1):
        if 'return (' in line:
            in_return = True
        
        if not in_return:
            continue
            
        tags = re.findall(r'<div|</div', line)
        if tags:
            for t in tags:
                if t == '<div':
                    depth += 1
                elif t == '</div':
                    depth -= 1
            print(f"L{i}: {line.strip()[:40]}... -> Depth: {depth}")
    
    print(f"Final Div Depth: {depth}")

if __name__ == "__main__":
    check_div_balance(sys.argv[1])
