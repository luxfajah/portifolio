import re

with open('css/styles.css', 'r') as f:
    css = f.read()

def scale_vw(match):
    prefix = match.group(1)
    if "clamp(" in prefix:
        return match.group(0) # skip
    
    val_str = match.group(2)
    unit = match.group(3)
    val = float(val_str) * 0.75
    
    if val.is_integer():
        return f"{prefix}{int(val)}{unit}"
    else:
        return f"{prefix}{val:.2f}{unit}"

# We want to match numbers followed by vw or vh, not inside clamp.
# It's easier to just do it line by line.

new_lines = []
for line in css.split('\n'):
    if 'clamp' in line:
        new_lines.append(line)
        continue
    
    # replace any number + vw or vh
    line = re.sub(r'(\s|:)(-?[\d\.]+)(vw|vh|px)', scale_vw, line)
    new_lines.append(line)

with open('css/styles.css', 'w') as f:
    f.write('\n'.join(new_lines))
