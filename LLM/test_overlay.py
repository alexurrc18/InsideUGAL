from PIL import Image
import numpy as np

def overlay_building(base_img_path, building_img_path, output_path):
    # Dummy base image (FLUX output is 1024x576)
    base = Image.new("RGB", (1024, 576), (100, 100, 200))
    
    building = Image.open(building_img_path).convert("RGBA")
    
    # Remove white background
    data = np.array(building)
    r, g, b, a = data.T
    white_areas = (r > 240) & (g > 240) & (b > 240)
    data[...][white_areas.T] = (255, 255, 255, 0)
    building_transparent = Image.fromarray(data)
    
    # Resize building to fit nicely
    # Max width 800, max height 500
    building_transparent.thumbnail((800, 450), Image.Resampling.LANCZOS)
    
    # Paste at the bottom center
    x = (base.width - building_transparent.width) // 2
    y = base.height - building_transparent.height
    
    base.paste(building_transparent, (x, y), building_transparent)
    base.save(output_path)
    print("Overlay successful!")

overlay_building("flux_out.png", "D:\\InsideUGAL\\InsideUGAL\\LLM\\src\\smart-news-parser\\assets\\buildings\\aciee\\corp_Y12.png", "composed.png")
