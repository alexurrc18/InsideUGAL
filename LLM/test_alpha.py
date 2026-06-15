from PIL import Image

def test():
    img = Image.open("D:\\InsideUGAL\\InsideUGAL\\LLM\\src\\smart-news-parser\\assets\\buildings\\aciee\\corp_Y12.png")
    print(f"Mode: {img.mode}, Size: {img.size}")
    if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
        print("Image has transparency!")
    else:
        print("No transparency.")

test()
