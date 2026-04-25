import re

with open('css/styles.css', 'r') as f:
    css = f.read()

def scale_match(match):
    val = float(match.group(1)) * 0.75
    unit = match.group(2)
    # round to 2 decimal places to keep it clean
    if val.is_integer():
        return f"{int(val)}{unit}"
    else:
        return f"{val:.2f}{unit}"

def scale_clamp(match):
    # clamp(1.8rem, 4.5vw, 4rem)
    return f"clamp({scale_val(match.group(1))}, {scale_val(match.group(2))}, {scale_val(match.group(3))})"

def scale_val(val_str):
    m = re.match(r'(-?[\d\.]+)([a-zA-Z%]+)', val_str.strip())
    if m:
        val = float(m.group(1)) * 0.75
        unit = m.group(2)
        if val.is_integer():
            return f"{int(val)}{unit}"
        else:
            return f"{val:.2f}{unit}"
    return val_str

# Replace clamps
css = re.sub(r'clamp\(([^,]+),\s*([^,]+),\s*([^\)]+)\)', scale_clamp, css)

# Replace specific properties using regex, but maybe it's easier to just do it manually for the big ones.
with open('css/styles.css', 'w') as f:
    f.write(css)
