import re
import sys

def validate_jsx(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the start of the return block in TripoPanel
    # We'll look for 'return (' that opens the main UI
    # In this specific file, it's roughly after all the state/hooks.
    
    # We'll just scan the whole file for tag balance of standard HTML and known components
    tags = re.findall(r'<(/?)([a-zA-Z0-9\.]+)([^>]*?)(/?)>', content)
    
    stack = []
    
    for prefix, name, props, self_close in tags:
        # props might contain '>' if there's an arrow function, e.g. onClose={() => ...}
        # This regex might still fail on those, but let's try to handle them by 
        # refining the prop match. 
        
        # If it's a closing tag
        if prefix == '/':
            if not stack:
                print(f"Error: Unexpected closing tag </{name}>")
                continue
            top_name = stack.pop()
            if top_name != name:
                print(f"Error: Mismatched tag. Expected </{top_name}>, got </{name}>")
        # If it's an opening tag
        else:
            # Check if it's self-closing either by /> or by being a known self-closing tag
            # Actually in JSX, only /> or standard void tags (if not using React) matter.
            # We'll trust />.
            
            # Re-check the props for a trailing / because the regex might have cut off early
            # if the props contained a >.
            # Example: <Comp onClose={() => x > y} />
            # The regex <...([^>]*?)(/?)> will stop at 'y}'. 
            # Then it won't see ' />'.
            
            # This is hard to do with regex perfectly.
            # Let's use a simpler heuristic: if the line has '/>' and no '</name>', it's likely self-closing.
            
            is_self_closing = (self_close == '/')
            
            if not is_self_closing:
                stack.append(name)

    if stack:
        print(f"Error: Unclosed tags remaining: {stack}")
    else:
        print("JSX tags appear balanced (by basic regex scan).")

if __name__ == "__main__":
    validate_jsx(sys.argv[1])
