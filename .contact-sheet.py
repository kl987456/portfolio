from PIL import Image, ImageOps, ImageDraw, ImageFont
from pathlib import Path

src = Path(r"C:\Users\99210\OneDrive\Documents\ChatGPT\New project 2\public\images\portfolio-library")
files = sorted(src.glob("P*.png"))
thumb_w, thumb_h, label_h, cols = 480, 270, 54, 3
rows = (len(files) + cols - 1) // cols
board = Image.new("RGB", (cols * thumb_w + (cols + 1) * 24, rows * (thumb_h + label_h) + (rows + 1) * 24), (7, 13, 10))
draw = ImageDraw.Draw(board)
try:
    font = ImageFont.truetype("arialbd.ttf", 28)
except OSError:
    font = ImageFont.load_default()

for index, path in enumerate(files):
    image = Image.open(path).convert("RGB")
    image = ImageOps.fit(image, (thumb_w, thumb_h), method=Image.Resampling.LANCZOS)
    x = 24 + (index % cols) * (thumb_w + 24)
    y = 24 + (index // cols) * (thumb_h + label_h + 24)
    board.paste(image, (x, y))
    label = path.name.split("-")[0]
    draw.rectangle((x, y + thumb_h, x + thumb_w, y + thumb_h + label_h), fill=(14, 28, 20))
    draw.text((x + 16, y + thumb_h + 10), label, fill=(190, 255, 79), font=font)

output = src / "portrait-art-approval-board.jpg"
board.save(output, quality=92)

scene_files = sorted(src.glob("scene-*.png"))
scene_board = Image.new("RGB", (1040, len(scene_files) * 342 + 24), (7, 13, 10))
for index, path in enumerate(scene_files):
    scene = ImageOps.fit(Image.open(path).convert("RGB"), (992, 280), method=Image.Resampling.LANCZOS)
    y = 24 + index * 342
    scene_board.paste(scene, (24, y))
    draw_scene = ImageDraw.Draw(scene_board)
    draw_scene.text((40, y + 292), path.stem.replace("scene-", "").upper(), fill=(190, 255, 79), font=font)
scene_output = src / "project-motion-scenes.jpg"
scene_board.save(scene_output, quality=92)
print(output)
print(scene_output)
