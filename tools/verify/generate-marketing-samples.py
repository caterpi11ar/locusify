from PIL import Image, ImageDraw
from pathlib import Path

out = Path('packages/web/public/images/product')
out.mkdir(parents=True, exist_ok=True)
stops = [('lake', 46.45, 6.55), ('ridge', 46.48, 6.65), ('sunset', 46.50, 6.75)]
for index, (name, lat, lon) in enumerate(stops):
    image = Image.new('RGB', (1200, 800))
    draw = ImageDraw.Draw(image)
    top, bottom = [( (91,151,185),(235,211,173)), ((108,144,169),(215,221,207)), ((126,107,154),(249,188,137))][index]
    for y in range(800):
        f = y / 800
        draw.line((0,y,1200,y), fill=tuple(int(a+(b-a)*f) for a,b in zip(top,bottom)))
    draw.ellipse((870,100,1010,240), fill=(251,225,170))
    draw.polygon([(0,530),(240,200),(440,470),(680,160),(1000,490),(1200,300),(1200,800),(0,800)],fill=(82,112,126))
    draw.polygon([(170,300),(240,200),(330,320),(250,290)],fill=(228,235,230))
    draw.polygon([(570,305),(680,160),(800,310),(690,265)],fill=(238,241,231))
    draw.polygon([(0,620),(250,480),(480,580),(760,410),(1200,590),(1200,800),(0,800)],fill=(45,88,91))
    draw.polygon([(0,670),(1200,610),(1200,800),(0,800)],fill=(83,143,153))
    for y in range(690,800,24): draw.line((250,y,1000,y-12),fill=(156,183,176),width=3)
    exif = Image.Exif()
    exif[306] = f'2026:04:{10+index:02d} 09:00:00'
    exif[34665] = {36867: f'2026:04:{10+index:02d} 09:00:00'}
    def dms(value):
        degrees = int(value); minutes = int((value-degrees)*60)
        return (float(degrees), float(minutes), (value-degrees-minutes/60)*3600)
    exif[34853] = {1:'N',2:dms(lat),3:'E',4:dms(lon)}
    image.save(out / f'sample-{name}.jpg',quality=92,exif=exif)
print('Created three original synthetic landscape fixtures with synthetic GPS/date EXIF.')
