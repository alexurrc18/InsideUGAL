import os
import asyncio
from dotenv import load_dotenv
from parser_schemas import ExtractedAnnouncementInfo, TipEveniment, NivelUrgenta
from image_service_v2 import ImageServiceV2

load_dotenv("D:\\InsideUGAL\\InsideUGAL\\.env")

async def main():
    service = ImageServiceV2()
    info = ExtractedAnnouncementInfo(
        tip_eveniment=TipEveniment.CONCURS,
        materie_sau_subiect="AI Hackathon 2026",
        entitate_sursa="Facultatea de Automatica si Calculatoare ACIEE",
        taguri_cheie=["ai", "hackathon", "robotics"],
        rezumat_notificare="Join the AI Hackathon 2026 at ACIEE!",
        urgenta_estimata=NivelUrgenta.MEDIE,
        public_tinta=[],
        actiuni_extrase=[],
    )
    res = await service.generate_announcement_banner(info)
    print("Success:", res.success)
    print("URL:", res.image_url)
    print("Used FLUX:", res.used_flux_fallback)
    
    if res.success and res.image_base64:
        import base64
        with open("test_banner_overlay.jpg", "wb") as f:
            f.write(base64.b64decode(res.image_base64.split(",")[1]))

if __name__ == "__main__":
    asyncio.run(main())
