with open('c:/LudusGenNew/LudusGen_frontend/src/ai_components/tripo/TripoPanel.jsx', 'r', encoding='utf-8') as f:
    content = f.readlines()

count_open = 0
count_close = 0
for line in content[899:1153]:  # lines 900 to 1153
    count_open += line.count('<')
    count_close += line.count('</')
    count_close += line.count('/>')

print(f"Open: {count_open}, Close: {count_close}")

# Counting braces
b_open = 0
b_close = 0
for line in content[899:1153]:
    b_open += line.count('{')
    b_close += line.count('}')

print(f"Braces Open: {b_open}, Braces Close: {b_close}")
