"""Generate original geometric RESET R icons; Pillow needed only to regenerate."""
from pathlib import Path
from PIL import Image, ImageDraw
out = Path(__file__).resolve().parents[1] / 'public'
for size in (180, 192, 512):
    scale = 4
    image = Image.new('RGB', (size * scale, size * scale), '#FF775E')
    draw = ImageDraw.Draw(image)
    def points(coords):
        return [(round(x * size * scale), round(y * size * scale)) for x, y in coords]
    # Custom R silhouette, kept inside the maskable icon safe area.
    draw.polygon(points([(0.30,.24),(.53,.24),(.65,.29),(.69,.38),(.67,.47),(.59,.53),(.72,.75),(.57,.75),(.46,.56),(.43,.56),(.43,.75),(.30,.75)]), fill='#302F29')
    draw.rounded_rectangle((int(.43*size*scale), int(.35*size*scale), int(.56*size*scale), int(.44*size*scale)), radius=int(.025*size*scale), fill='#FF775E')
    image.resize((size,size), Image.Resampling.LANCZOS).save(out / f'reset-{size}.png')
