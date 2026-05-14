"""
Quick smoke test -- sends a tiny text chunk to the AI and prints the result.
Run:  python test_ai.py
"""
import sys, os # Needed for modifying the system path to import local modules
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

from app.ai.question_generator import generate_questions_from_chunk # Needed to test the AI question generation function

SAMPLE_TEXT = """
Photosynthesis is the process by which green plants convert sunlight into
chemical energy. It takes place mainly in the leaves, inside organelles
called chloroplasts. The pigment chlorophyll absorbs light energy, which
is used to convert carbon dioxide and water into glucose and oxygen.
The overall equation is: 6CO2 + 6H2O -> C6H12O6 + 6O2.
Photosynthesis is essential for life on Earth because it produces oxygen
and forms the base of most food chains.
"""

print("=" * 60)
print("AI SMOKE TEST -- MiniMax via OpenRouter")
print("=" * 60)
print(f"Model : {os.getenv('OPENAI_MODEL', 'not set')}")
print(f"API Key: {os.getenv('OPENAI_API_KEY', '')[:15]}...")
print("-" * 60)
print("Sending sample text to AI (this may take 10-30 seconds)...")
print()

try:
    questions = generate_questions_from_chunk(
        SAMPLE_TEXT,
        mcq_count=2,
        fill_count=1,
    )
    if questions:
        print(f"[OK] SUCCESS -- AI returned {len(questions)} question(s):")
        print()
        for i, q in enumerate(questions, 1):
            print(f"  Q{i}. [{q['type'].upper()}] [{q['difficulty']}] {q['question']}")
            if q.get("options"):
                for j, opt in enumerate(q["options"]):
                    marker = " << CORRECT" if opt == q["correct_answer"] else ""
                    print(f"      {chr(65+j)}) {opt}{marker}")
            else:
                print(f"      Answer: {q['correct_answer']}")
            print()
    else:
        print("[WARN] AI returned 0 valid questions. Check logs above for warnings.")
except Exception as e:
    print(f"[FAIL] {e}")
