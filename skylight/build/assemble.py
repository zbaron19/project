"""Assemble skylight/index.html from the src/ pieces (single self-contained file)."""
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "src")
OUT = os.path.join(HERE, "..", "index.html")


def read(name):
    with open(os.path.join(SRC, name), encoding="utf-8") as f:
        return f.read()


shell = read("shell.html")
astro = read("astro.js")
# strip the Node export so it runs as a plain browser script
astro = re.sub(r"module\.exports = \{[^}]*\};\n?", "", astro)

full = "<!doctype html>\n<html lang=\"en\"><head><meta charset=\"utf-8\">\n" + shell + "\n</html>\n"
full = full.replace("/*__CSS__*/", read("app.css"))
full = full.replace("/*__DATA__*/", read("data.js"))
full = full.replace("/*__ASTRO__*/", astro)
full = full.replace("/*__APP__*/", read("app.js"))
# close head/body around the shell's structure
full = full.replace("</style>\n", "</style></head><body>\n", 1)
full = full.replace("</script>\n</html>", "</script></body></html>")

with open(OUT, "w", encoding="utf-8") as f:
    f.write(full)
print(f"wrote {OUT}: {os.path.getsize(OUT) // 1024} KB")
