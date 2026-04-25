with open('css/styles.css', 'r') as f:
    css = f.read()

css = "html { font-size: 75%; }\n" + css

with open('css/styles.css', 'w') as f:
    f.write(css)
