import React, { useState, useEffect, useCallback } from "react";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const getSupabase = () => {
  if (typeof window !== "undefined" && window.supabase && SUPABASE_URL) {
    return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return null;
};

// --- Constants & Dictionary ---
const DICTIONARY = {
  4: [
    "كتاب",
    "بحر",
    "جبل",
    "سماء",
    "فكر",
    "صوت",
    "خبز",
    "عدل",
    "نور",
    "فجر",
    "شجر",
    "ثمر",
    "أرض",
    "نجم",
    "حلم",
    "أمل",
    "بيت",
    "باب",
    "موج",
    "ريح",
    "عمل",
    "قلم",
    "وقت",
    "صبر",
    "عقل",
  ],
  5: [
    "مدرسة",
    "سيارة",
    "تفاحة",
    "طائرة",
    "حديقة",
    "كتابة",
    "رياضة",
    "جزيرة",
    "سفينة",
    "قلمي",
    "قهوة",
    "شاشة",
    "صديق",
    "طويل",
    "جميل",
    "سريع",
    "قوي",
    "سعيد",
    "قريب",
    "بعيد",
  ],
  6: [
    "مهندس",
    "مستشفى",
    "كمبيوتر",
    "مدرسة",
    "طائرة",
    "جامعة",
    "معلومات",
    "سيارات",
    "تاريخ",
    "عربي",
    "سواحل",
    "ملاعب",
    "طبيعي",
    "جبال",
    "نجوم",
    "احلام",
    "اشجار",
    "فواكه",
    "مفاتيح",
    "صداقة",
  ],
};

const KEYS = [
  ["ض", "ص", "ث", "ق", "ف", "غ", "ع", "ه", "خ", "ح", "ج", "د"],
  ["ش", "س", "ي", "ب", "ل", "ا", "ت", "ن", "م", "ك", "ط"],
  ["ENTER", "ئ", "ء", "ؤ", "ر", "لا", "ى", "ة", "و", "ز", "ظ", "BACK"],
];

export default function App() {
  const [currentWordLength, setCurrentWordLength] = useState(4);
  const [targetWord, setTargetWord] = useState("");
  const [guesses, setGuesses] = useState([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [win, setWin] = useState(false);
  const [sessionRound, setSessionRound] = useState(1);
  const [sessionScore, setSessionScore] = useState(0);
  const [challengeId, setChallengeId] = useState(null);
  const [toast, setToast] = useState(null);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [challengeLink, setChallengeLink] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // --- Initialize Game ---
  const startNewGame = useCallback(
    async (nextRound = false) => {
      setIsLoading(true);
      let newWord = "";
      let wordLen = currentWordLength;
      const client = supabase;
      if (nextRound) {
        setSessionRound((prev) => prev + 1);
        setGuesses([]);
        setGameOver(false);
        setWin(false);
        setCurrentGuess("");
        setChallengeId(null);
        if (typeof window !== "undefined") {
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname,
          );
        }
      }

      const urlParams = new URLSearchParams(
        typeof window !== "undefined" ? window.location.search : "",
      );
      const cId = urlParams.get("c");

      if (cId && client && !nextRound) {
        setChallengeId(cId);
        try {
          const { data, error } = await client
            .from("challenges")
            .select("word, length")
            .eq("id", cId)
            .single();

          if (data && !error) {
            newWord = data.word;
            wordLen = data.length;
            setCurrentWordLength(wordLen);
          } else {
            showToast("التحدي غير موجود!");
          }
        } catch (e) {
          console.error("Supabase Error:", e);
        }
      }

      if (!newWord) {
        const list = DICTIONARY[wordLen];
        newWord = list[Math.floor(Math.random() * list.length)];
      }

      setTargetWord(newWord);
      setIsLoading(false);
    },
    [currentWordLength],
  );

  useEffect(() => {
    startNewGame();
  }, [currentWordLength, startNewGame]);

  // --- Handlers ---
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const checkGuess = (guess, target) => {
    let result = Array(currentWordLength).fill("absent");
    let tArr = target.split("");
    let gArr = guess.split("");

    for (let i = 0; i < currentWordLength; i++) {
      if (gArr[i] === tArr[i]) {
        result[i] = "correct";
        tArr[i] = null;
        gArr[i] = null;
      }
    }
    for (let i = 0; i < currentWordLength; i++) {
      if (gArr[i] !== null) {
        const idx = tArr.indexOf(gArr[i]);
        if (idx !== -1) {
          result[i] = "present";
          tArr[idx] = null;
        }
      }
    }
    return result;
  };

  const handleKeyPress = useCallback(
    (key) => {
      if (gameOver) return;

      if (key === "BACK" || key === "Backspace") {
        setCurrentGuess((prev) => prev.slice(0, -1));
      } else if (key === "ENTER" || key === "Enter") {
        if (currentGuess.length < currentWordLength) {
          showToast("أكمل الحروف!");
          return;
        }
        const result = checkGuess(currentGuess, targetWord);
        const newGuesses = [...guesses, { word: currentGuess, result }];
        setGuesses(newGuesses);

        if (currentGuess === targetWord) {
          setSessionScore((prev) => prev + (7 - newGuesses.length) * 10);
          setGameOver(true);
          setWin(true);
        } else if (newGuesses.length === 6) {
          setGameOver(true);
          setWin(false);
        }
        setCurrentGuess("");
      } else if (
        currentGuess.length < currentWordLength &&
        /^[\u0621-\u064A\u0671]+$/.test(key)
      ) {
        setCurrentGuess((prev) => prev + key);
      }
    },
    [currentGuess, currentWordLength, gameOver, guesses, targetWord],
  );

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      handleKeyPress(e.key);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleKeyPress]);

  const copyToClipboard = async (text) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch (err) {
      return false;
    }
  };

const createChallenge = async () => {
  const client = supabase;
  if (!client) {
    showToast("تأكد من وضع مفاتيح Supabase في .env وبادئة VITE_");
    return;
  }

  const id = Math.random().toString(36).substring(2, 8);

  const { error } = await client
    .from("challenges")
    .insert([{ id, word: targetWord, length: currentWordLength }]);

  if (error) {
    showToast("فشل إنشاء التحدي!");
    return;
  }

  setChallengeLink(`${window.location.origin}${window.location.pathname}?c=${id}`);
  setShowChallengeModal(true);
};

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-[#020617] flex items-center justify-center z-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="game-container" dir="rtl">
      {/* Reset Vite default styles locally for this component */}
      <style>{`
        .game-container {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100vh;
          background: radial-gradient(circle at center, #1e1b4b, #0f172a, #020617);
          color: white;
          display: flex;
          flex-direction: column;
          font-family: 'Tajawal', sans-serif;
          margin: 0;
          padding: 0;
          overflow: hidden;
          z-index: 9999;
        }
        body { margin: 0; padding: 0; display: block !important; }
        #root { display: block !important; width: 100%; height: 100%; }
      `}</style>

      <header className="p-4 flex flex-col gap-3 max-w-lg mx-auto w-full mt-2 shrink-0">
        <div className="flex justify-between items-center w-full">
          <h1 className="text-3xl font-black tracking-tighter bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent !m-0 !p-0 !leading-none">
            كَوْنها
          </h1>
          <div className="flex items-center gap-2">
            <select
              value={currentWordLength}
              disabled={guesses.length > 0 || !!challengeId}
              onChange={(e) => setCurrentWordLength(parseInt(e.target.value))}
              className="bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 text-sm font-bold outline-none cursor-pointer hover:bg-white/20 transition-all text-white appearance-none"
            >
              <option value="4" className="bg-slate-900">
                4 حروف
              </option>
              <option value="5" className="bg-slate-900">
                5 حروف
              </option>
              <option value="6" className="bg-slate-900">
                6 حروف
              </option>
            </select>
            <button
              onClick={createChallenge}
              className="bg-purple-600 hover:bg-purple-500 p-2.5 rounded-2xl shadow-lg transition-transform hover:scale-105 active:scale-95 flex items-center justify-center border-none text-white cursor-pointer"
            >
              👥
            </button>
          </div>
        </div>

        <div className="flex justify-between items-center px-2">
          <div className="flex gap-2 items-center">
            <span className="bg-gradient-to-br from-indigo-500 to-purple-600 px-3 py-1 rounded-full text-xs font-black shadow-lg">
              جولة {sessionRound}
            </span>
            <div className="text-[10px] text-blue-400 font-bold bg-blue-900/30 px-3 py-1.5 rounded-full border border-blue-500/30">
              محاولات: {6 - guesses.length}/6
            </div>
          </div>
          <div className="flex flex-col items-end">
            <div className="text-sm font-bold text-emerald-400">
              النقاط: {sessionScore}
            </div>
            {challengeId && (
              <div className="text-[9px] uppercase font-bold text-purple-300 tracking-widest bg-purple-900/40 px-2 py-1 rounded border border-purple-500/30 mt-1">
                وضع التحدي ⚔️
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex-grow flex items-center justify-center p-4 overflow-y-auto">
        <div
          className="grid gap-2 sm:gap-3 w-full max-w-md mx-auto"
          style={{ gridTemplateColumns: `repeat(${currentWordLength}, 1fr)` }}
        >
          {[...Array(6)].map((_, rowIndex) => {
            const rowGuess = guesses[rowIndex];
            const isCurrentRow = rowIndex === guesses.length;

            return [...Array(currentWordLength)].map((_, colIndex) => {
              let char = "";
              let status = "";
              if (rowGuess) {
                char = rowGuess.word[colIndex];
                status = rowGuess.result[colIndex];
              } else if (isCurrentRow) {
                char = currentGuess[colIndex] || "";
              }

              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={`aspect-square border-2 flex items-center justify-center text-2xl font-extrabold rounded-xl transition-all duration-500
                    ${
                      status === "correct"
                        ? "bg-[#10b981] border-[#10b981] shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                        : status === "present"
                          ? "bg-[#f59e0b] border-[#f59e0b] shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                          : status === "absent"
                            ? "bg-[#475569] border-[#475569] opacity-60"
                            : char
                              ? "border-blue-400 bg-blue-400/10 scale-105"
                              : "border-[#334155] bg-white/5"
                    }`}
                >
                  {char}
                </div>
              );
            });
          })}
        </div>
      </div>

      <div className="max-w-2xl mx-auto w-full px-2 pb-6 flex flex-col gap-2 shrink-0">
        {KEYS.map((row, i) => (
          <div key={i} className="flex justify-center gap-1.5 w-full">
            {row.map((key) => {
              let keyStatus = "";
              guesses.forEach((g) => {
                g.word.split("").forEach((char, idx) => {
                  if (char === key) {
                    const res = g.result[idx];
                    if (res === "correct") keyStatus = "correct";
                    else if (res === "present" && keyStatus !== "correct")
                      keyStatus = "present";
                    else if (res === "absent" && keyStatus === "")
                      keyStatus = "absent";
                  }
                });
              });

              return (
                <button
                  key={key}
                  onClick={() => handleKeyPress(key)}
                  className={`flex-1 h-12 rounded-lg font-bold text-sm transition-all shadow-[0_4px_0_#1e293b] active:translate-y-1 active:shadow-none border-none text-white cursor-pointer
                    ${
                      key === "ENTER" || key === "BACK"
                        ? "flex-[1.5] bg-[#475569]"
                        : keyStatus === "correct"
                          ? "bg-[#10b981]"
                          : keyStatus === "present"
                            ? "bg-[#f59e0b]"
                            : keyStatus === "absent"
                              ? "bg-[#1e293b] opacity-40"
                              : "bg-[#334155]"
                    }`}
                >
                  {key === "BACK" ? "⌫" : key === "ENTER" ? "دخول" : key}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {toast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-white text-black px-6 py-3 rounded-full font-bold shadow-2xl z-[9999] animate-bounce text-center">
          {toast}
        </div>
      )}

      {gameOver && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[10000] backdrop-blur-md">
          <div className="bg-slate-900 border-2 border-slate-700 p-8 rounded-3xl max-w-sm w-full text-center mx-4 shadow-2xl relative">
            <h2 className="text-3xl font-black mb-2 text-white">
              {win ? "عبقري! 🎉" : "انتهت المحاولات! 💡"}
            </h2>
            <p className="mb-4 text-slate-400 text-lg">
              الكلمة هي:{" "}
              <span className="text-emerald-400 font-bold text-2xl">
                {targetWord}
              </span>
            </p>

            <div className="bg-slate-800/50 p-4 rounded-2xl mb-6 border border-slate-700">
              <div className="text-sm text-slate-400 mb-1">التقدم الحالي</div>
              <div className="text-2xl font-black text-white">
                جولة {sessionRound} • نقاط {sessionScore}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => startNewGame(true)}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 py-4 px-6 rounded-2xl text-xl font-black shadow-lg text-white border-none cursor-pointer"
              >
                الجولة التالية 🔄
              </button>
              <button
                onClick={() => {
                  const text =
                    `لعبة كونها 🧩 (الجولة ${sessionRound})\nنقاطي: ${sessionScore}\n\n` +
                    guesses
                      .map((g) =>
                        g.result
                          .map((r) =>
                            r === "correct"
                              ? "🟩"
                              : r === "present"
                                ? "🟨"
                                : "⬛",
                          )
                          .join(""),
                      )
                      .join("\n");
                  copyToClipboard(text).then(() =>
                    showToast("تم نسخ النتيجة!"),
                  );
                }}
                className="bg-slate-800 py-3 px-6 rounded-2xl border border-slate-600 font-bold text-white cursor-pointer transition-transform hover:scale-105"
              >
                مشاركة النتيجة 📊
              </button>
            </div>
          </div>
        </div>
      )}

      {showChallengeModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[10000] backdrop-blur-md">
          <div className="bg-slate-900 border-2 border-slate-700 p-8 rounded-3xl max-w-sm w-full text-center mx-4 shadow-2xl">
            <h2 className="text-2xl font-black mb-4 text-purple-400">
              أنشئ تحدي لصديقك ⚔️
            </h2>
            <p className="text-slate-400 text-sm mb-6">
              سيقوم صديقك بمحاولة تخمين نفس الكلمة الحالية!
            </p>
            <input
              readOnly
              value={challengeLink}
              onClick={(e) => e.target.select()}
              className="w-full bg-slate-800 border border-slate-700 p-3 rounded-xl text-xs text-slate-300 outline-none mb-6 text-center"
            />
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  copyToClipboard(challengeLink).then(() =>
                    showToast("تم نسخ الرابط!"),
                  );
                }}
                className="bg-purple-600 py-3 px-6 rounded-2xl font-bold hover:bg-purple-500 transition-colors text-white border-none cursor-pointer"
              >
                نسخ الرابط
              </button>
              <button
                onClick={() => setShowChallengeModal(false)}
                className="text-slate-500 font-bold py-2 bg-transparent border-none cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
