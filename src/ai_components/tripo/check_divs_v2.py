import re
import sys

def check_div_balance(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    # Pre-process: replace self-closing divs so they don't affect count
    # Note: <div /> is valid in JSX.
    content = re.sub(r'<div[^>]*?/>', '<!-- self-closing-div -->', content)
    
    opens = list(re.finditer(r'<div(?![a-zA-Z])', content))
    closes = list(re.finditer(r'</div>', content))
    
    # We want to find which opens are not closed.
    # This is a bit complex for a script, so let's just count.
    print(f"Total <div: {len(opens)}")
    print(f"Total </div: {len(closes)}")
    
    if len(opens) != len(closes):
        print(f"FAILED: {len(opens) - len(closes)} unclosed divs.")
        # Try to locate the nesting error
        stack = []
        lines = content.split('\n')
        for i, line in enumerate(lines, 1):
            # Very simple line-by-line check
            tags = re.findall(r'<div(?![a-zA-Z])|</div', line)
            for t in tags:
                if t == '<div':
                    stack.append(i)
                else:
                    if not stack:
                        print(f"Unexpected </div> at line {i}")
                    else:
                        stack.pop()
        
        if stack:
            print(f"Unclosed <div> tags started at lines: {stack}")
    else:
        print("Divs are balanced!")

if __name__ == "__main__":
    check_div_balance(sys.argv[1])
