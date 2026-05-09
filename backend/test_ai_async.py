import asyncio
import sys, os
import logging
logging.basicConfig(level=logging.DEBUG)
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

from app.ai.question_generator import generate_questions_from_chunk

SAMPLE_TEXT = """
Photosynthesis is the process by which green plants convert sunlight into
chemical energy. It takes place mainly in the leaves, inside organelles
called chloroplasts. The pigment chlorophyll absorbs light energy, which
is used to convert carbon dioxide and water into glucose and oxygen.
The overall equation is: 6CO2 + 6H2O -> C6H12O6 + 6O2.
Photosynthesis is essential for life on Earth because it produces oxygen
and forms the base of most food chains.
"""

async def main():
    print("Sending sample text to AI (this may take 10-30 seconds)...")
    semaphore = asyncio.Semaphore(5)
    try:
        questions = await generate_questions_from_chunk(
            SAMPLE_TEXT,
            semaphore=semaphore,
            mcq_count=2,
            fill_count=1,
        )
        if questions:
            print(f"[OK] SUCCESS -- AI returned {len(questions)} question(s):")
        else:
            print("[WARN] AI returned 0 valid questions.")
    except Exception as e:
        print(f"[FAIL] {e}")

if __name__ == "__main__":
    asyncio.run(main())
