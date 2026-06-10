import argparse
import os
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

# ─────────────────────────────────────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────────────────────────────────────
SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
DEFAULT_LOW_THRESHOLD  = 50
DEFAULT_HIGH_THRESHOLD = 150
DEFAULT_BLUR_SIZE      = 5
DEFAULT_RESIZE         = 1024   # SDXL works best at 1024×1024

# ─────────────────────────────────────────────────────────────────────────────
# Core processing
# ─────────────────────────────────────────────────────────────────────────────
def resize_keep_aspect(img: np.ndarray, max_side: int) -> np.ndarray:
    h, w = img.shape[:2]
    scale = max_side / max(h, w)
    if scale >= 1.0: return img
    new_w, new_h = int(w * scale), int(h * scale)
    return cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)

def enhance_contrast(img_gray: np.ndarray) -> np.ndarray:
    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
    return clahe.apply(img_gray)

def normalize_background(img_path: Path, img_bgr: np.ndarray) -> tuple[np.ndarray, bool]:
    fixed = False
    if img_path.suffix.lower() == ".png":
        pil_img = Image.open(str(img_path)).convert("RGBA")
        arr = np.array(pil_img)
        alpha = arr[:, :, 3]
        if np.any(alpha < 128):
            bg_mask = alpha < 128
            rgb = arr[:, :, :3]
            rgb[bg_mask] = [220, 220, 220]
            img_bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
            fixed = True
            print("  ℹ️  Fundal transparent detectat → înlocuit cu gri neutru.")

    gray_check = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    dark_ratio = np.sum(gray_check < 15) / gray_check.size
    if dark_ratio > 0.05:
        bg_mask = gray_check < 15
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        bg_mask_clean = cv2.erode(bg_mask.astype(np.uint8), kernel, iterations=1).astype(bool)
        img_bgr[bg_mask_clean] = [220, 220, 220]
        fixed = True
        print(f"  ℹ️  Fundal negru solid detectat ({dark_ratio*100:.1f}% pixeli) → înlocuit cu gri neutru.")
    return img_bgr, fixed

def reduce_jpeg_artifacts(img_bgr: np.ndarray) -> np.ndarray:
    return cv2.fastNlMeansDenoisingColored(img_bgr, None, h=6, hColor=6, templateWindowSize=7, searchWindowSize=21)

def extract_canny(img_bgr: np.ndarray, low_threshold: int, high_threshold: int, blur_size: int) -> np.ndarray:
    denoised = reduce_jpeg_artifacts(img_bgr)
    gray = cv2.cvtColor(denoised, cv2.COLOR_BGR2GRAY)
    enhanced = enhance_contrast(gray)
    if blur_size % 2 == 0: blur_size += 1
    blurred = cv2.GaussianBlur(enhanced, (blur_size, blur_size), sigmaX=0)
    edges = cv2.Canny(blurred, low_threshold, high_threshold)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
    edges = cv2.dilate(edges, kernel, iterations=1)
    edges_rgb = cv2.cvtColor(edges, cv2.COLOR_GRAY2RGB)
    return edges_rgb

def make_preview(original_bgr: np.ndarray, canny_rgb: np.ndarray) -> np.ndarray:
    orig_rgb = cv2.cvtColor(original_bgr, cv2.COLOR_BGR2RGB)
    h1, w1 = orig_rgb.shape[:2]
    h2, w2 = canny_rgb.shape[:2]
    if h1 != h2:
        canny_rgb = cv2.resize(canny_rgb, (w1, h1), interpolation=cv2.INTER_NEAREST)
    separator = np.ones((h1, 8, 3), dtype=np.uint8) * 200
    return np.concatenate([orig_rgb, separator, canny_rgb], axis=1)

def collect_images(input_path: Path) -> list[Path]:
    if input_path.is_file(): return [input_path]
    elif input_path.is_dir(): return sorted([p for p in input_path.iterdir() if p.suffix.lower() in SUPPORTED_EXTENSIONS])
    return []

def process_image(img_path: Path, output_dir: Path, low_threshold: int, high_threshold: int, blur_size: int, max_resize: int, make_preview_flag: bool) -> None:
    print(f"\n→ Procesez: {img_path.name}")
    img_bgr = cv2.imread(str(img_path))
    if img_bgr is None: return
    img_bgr, _ = normalize_background(img_path, img_bgr)
    img_bgr = resize_keep_aspect(img_bgr, max_resize)
    canny_rgb = extract_canny(img_bgr, low_threshold, high_threshold, blur_size)
    stem = img_path.stem
    canny_filename = f"{stem}_canny.png"
    canny_path = output_dir / canny_filename
    Image.fromarray(canny_rgb).save(str(canny_path), format="PNG")
    print(f"  ✓ Canny salvat:  {canny_path}")
    if make_preview_flag:
        preview_rgb = make_preview(img_bgr, canny_rgb)
        preview_path = output_dir / f"{stem}_preview.jpg"
        Image.fromarray(preview_rgb).save(str(preview_path), format="JPEG", quality=90)

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--low_threshold", type=int, default=DEFAULT_LOW_THRESHOLD)
    parser.add_argument("--high_threshold", type=int, default=DEFAULT_HIGH_THRESHOLD)
    parser.add_argument("--blur_size", type=int, default=DEFAULT_BLUR_SIZE)
    parser.add_argument("--resize", type=int, default=DEFAULT_RESIZE)
    parser.add_argument("--no_preview", action="store_true")
    return parser.parse_args()

def main() -> None:
    args = parse_args()
    input_path = Path(args.input)
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)
    images = collect_images(input_path)
    for img_path in images: process_image(img_path, output_dir, args.low_threshold, args.high_threshold, args.blur_size, args.resize, not args.no_preview)

if __name__ == "__main__":
    main()
