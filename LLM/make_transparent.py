from PIL import Image
import numpy as np

img = Image.open("D:\\InsideUGAL\\InsideUGAL\\LLM\\src\\smart-news-parser\\assets\\buildings\\aciee\\corp_Y12.png").convert("RGBA")
data = np.array(img)

# Assuming white background:
r, g, b, a = data.T
white_areas = (r > 240) & (g > 240) & (b > 240)
data[...][white_areas.T] = (255, 255, 255, 0) # Make white transparent

img_out = Image.fromarray(data)
img_out.save("D:\\InsideUGAL\\InsideUGAL\\LLM\\src\\smart-news-parser\\assets\\buildings\\aciee\\corp_Y12_transparent.png")
print("Saved transparent image.")
