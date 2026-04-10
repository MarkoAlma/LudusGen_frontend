import re
import sys

def check_all_tags(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find everything that looks like a tag start, tag end, or self-close
    # Handle arrow functions in props by ignoring content inside {} for this pass
    # Actually, simpler: replace everything inside {} with "PROP"
    
    # Very crude brace balancer to find JSX expressions and mask them
    processed = ""
    brace_depth = 0
    in_tag = False
    
    i = 0
    while i < len(content):
        c = content[i]
        if not in_tag:
            if c == '<':
                in_tag = True
                processed += c
            else:
                processed += c
        else:
            # We are inside a tag. Handle props.
            if c == '{':
                # Skip to end of balanced braces
                depth = 1
                i += 1
                while i < len(content) and depth > 0:
                    if content[i] == '{': depth += 1
                    elif content[i] == '}': depth -= 1
                    i += 1
                processed += '"PROP"'
                i -= 1 # adjust for outer loop
            elif c == '>':
                in_tag = False
                processed += c
            else:
                processed += c
        i += 1
    
    tags = []
    line_nums = []
    lines = content.split('\n')
    current_line = 1
    
    # Simple scanner instead of findall to track line numbers
    i = 0
    while i < len(content):
        if content[i] == '\n': current_line += 1
        
        # Look for tag start
        if content[i:i+2] == '</':
            match = re.match(r'</([a-zA-Z0-9\.]+)>', content[i:])
            if match:
                tags.append(('/', match.group(1)))
                line_nums.append(current_line)
                i += len(match.group(0)) - 1
        elif content[i] == '<':
            # Check for self-close first or regular tag
            # Need to skip JSX {} as before
            tag_content = ""
            j = i
            depth = 0
            while j < len(content):
                if content[j] == '{': depth += 1
                elif content[j] == '}': depth -= 1
                elif content[j] == '>' and depth == 0:
                    tag_content = content[i:j+1]
                    break
                j += 1
            
            if tag_content:
                match = re.match(r'<([a-zA-Z0-9\.]+)', tag_content)
                if match:
                    is_self = tag_content.endswith('/>')
                    tags.append(('', match.group(1)))
                    line_nums.append(current_line)
                    if is_self:
                        tags.append(('self', '')) # special marker
                        line_nums.append(current_line)
                i = j 
        i += 1

    stack = []
    for idx, (prefix, name) in enumerate(tags):
        l = line_nums[idx]
        if prefix == 'self':
            if stack: stack.pop()
            else: print(f"L{l}: Extra self-close mark (internal error or weird tag)")
        elif prefix == '/':
            if not stack:
                print(f"L{l}: Extra close </{name}>")
            else:
                t, tl = stack.pop()
                if t != name:
                    print(f"L{l}: Mismatch: expected </{t}> (from L{tl}), got </{name}>")
        else:
            stack.append((name, l))
            
    if stack:
        print(f"Final Stack (unclosed): {stack}")
    else:
        print("All tags appear balanced!")

if __name__ == "__main__":
    check_all_tags(sys.argv[1])
