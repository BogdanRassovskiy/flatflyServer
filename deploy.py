import shutil
from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent
projectName="flatfly";
FRONTEND_DIST = BASE_DIR / projectName / "dist"
STATIC_DIR = BASE_DIR / "static"
TEMPLATES_DIR = BASE_DIR / "templates"


def deploy_frontend():
    print("🚀 Deploying frontend...")

    assets_src = FRONTEND_DIST / "assets"
    fonts_src = FRONTEND_DIST / "fonts"

    assets_dst = STATIC_DIR / "assets"
    fonts_dst = STATIC_DIR / "fonts"

    index_src = FRONTEND_DIST / "index.html"
    index_dst = TEMPLATES_DIR / "index.html"
    vite_svg_src = FRONTEND_DIST / "vite.svg"
    vite_svg_dst = STATIC_DIR / "vite.svg"

    # 1. assets
    if assets_dst.exists():
        shutil.rmtree(assets_dst)
    shutil.copytree(assets_src, assets_dst)
    print("✅ assets copied")

    # 2. fonts (опционально)
    if fonts_src.exists():
        if fonts_dst.exists():
            shutil.rmtree(fonts_dst)
        shutil.copytree(fonts_src, fonts_dst)
        print("✅ fonts copied")

    # 3. index.html
    shutil.copy2(index_src, index_dst)

    # 4. vite.svg
    if vite_svg_src.exists():
        shutil.copy2(vite_svg_src, vite_svg_dst)
        print("✅ vite.svg copied")

    # 5. rewrite frontend asset paths for Django static serving
    index_html = index_dst.read_text(encoding="utf-8")
    index_html = index_html.replace('src="/assets/', 'src="/static/assets/')
    index_html = index_html.replace('href="/assets/', 'href="/static/assets/')
    index_html = index_html.replace('href="/vite.svg"', 'href="/static/vite.svg"')
    index_dst.write_text(index_html, encoding="utf-8")
    print("✅ index.html static paths normalized")
    print("✅ index.html copied")

    print("🎉 Frontend deployed successfully")


if __name__ == "__main__":
    deploy_frontend()