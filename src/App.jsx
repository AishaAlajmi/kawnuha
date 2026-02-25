import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

// --- DICTIONARY (كما عندك) ---
const DICTIONARY = {
  4: [
    "كتاب",
    "سماء",
    "شجرة",
    "وردة",
    "غابة",
    "رمال",
    "نجوم",
    "بيوت",
    "حصان",
    "جمال",
    "قارب",
    "صخور",
    "ربيع",
    "خريف",
    "ثلوج",
    "عطور",
    "رياح",
    "غيوم",
    "بلاد",
    "وجوه",
    "قلوب",
    "عيون",
    "ملوك",
    "شموع",
    "طيور",
    "فضاء",
    "عالم",
    "منزل",
    "حدود",
    "نبات",
    "كوكب",
    "بريد",
    "طريق",
    "نخيل",
    "رموز",
    "فنون",
    "صلاة",
    "زكاة",
    "صيام",
    "كريم",
  ],
  5: [
    "مدرسة",
    "حديقة",
    "سيارة",
    "تفاحة",
    "طائرة",
    "سفينة",
    "خزانة",
    "كراسة",
    "نافذة",
    "سحابة",
    "فواكه",
    "ملابس",
    "كراسي",
    "لوحات",
    "حقيبة",
    "مدينة",
    "جزيرة",
    "طبيعة",
    "عيادة",
    "مكتبة",
    "مسطرة",
    "أزهار",
    "أنهار",
    "أشجار",
    "أقلام",
    "مفتاح",
    "جوالات",
    "كاميرا",
    "قهوتك",
    "كتابي",
    "مرايا",
    "بستان",
    "صحراء",
    "عواصف",
    "بركان",
    "ياقوت",
    "مرجان",
    "غواصة",
    "مدربك",
  ],
  6: [
    "مستشفى",
    "برتقال",
    "طاولات",
    "مكتبات",
    "طيارات",
    "عصافير",
    "مفاتيح",
    "مهندسة",
    "سبورات",
    "معلمات",
    "حافلات",
    "بنايات",
    "غسالات",
    "ثلاجات",
    "محركات",
    "طباخون",
    "خبازون",
    "فنانون",
    "صيادون",
    "خياطون",
    "لاعبون",
    "سباحون",
    "مدربون",
    "مرشدون",
    "مصورون",
    "مزارعون",
    "مهندسون",
    "مبدعون",
    "مسافرون",
    "تلاميذ",
    "ملاعبنا",
    "مدارسنا",
    "بيوتنا",
    "كواكبنا",
    "نجومنا",
    "حدائقنا",
    "مساجدنا",
    "أقلامنا",
    "كتبناكم",
  ],
};

const KEYS = [
  ["ض", "ص", "ث", "ق", "ف", "غ", "ع", "ه", "خ", "ح", "ج", "د"],
  ["ش", "س", "ي", "ب", "ل", "ا", "ت", "ن", "م", "ك", "ط"],
  ["ENTER", "ئ", "ء", "ؤ", "ر", "ز", "ى", "ة", "و", "ظ", "BACK"],
];

const genId = (len = 10) =>
  Math.random()
    .toString(36)
    .slice(2, 2 + len);

const nowSec = () => Math.floor(Date.now() / 1000);

export default function App() {
  // ====== Player Identity (local, no auth) ======
  const [playerId, setPlayerId] = useState("");
  const [playerName, setPlayerName] = useState("");

  // ====== Wordle core ======
  const [currentWordLength, setCurrentWordLength] = useState(4);
  const [targetWord, setTargetWord] = useState("");
  const [guesses, setGuesses] = useState([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [win, setWin] = useState(false);

  // ====== Session ======
  const [sessionRound, setSessionRound] = useState(1);
  const [sessionScore, setSessionScore] = useState(0);

  // ====== Challenge / Multiplayer ======
  const [challengeId, setChallengeId] = useState(null);
  const [hostKey, setHostKey] = useState(null);
  const [challengeLink, setChallengeLink] = useState("");
  const [showChallengeModal, setShowChallengeModal] = useState(false);

  // Lobby & Live data
  const [challengeData, setChallengeData] = useState(null);
  const [players, setPlayers] = useState([]);
  const [results, setResults] = useState([]);

  // ✅ لازم تكون هنا (قبل أي useMemo/return)
  const [matchScores, setMatchScores] = useState([]); // [{player_id,name,wins}]
  const [roundWinner, setRoundWinner] = useState(null); // {player_id,name}
  const [matchWinner, setMatchWinner] = useState(null); // {player_id,name}

  // Phases: "solo" | "lobby" | "countdown" | "playing" | "finished" | "round_over" | "match_over"
  const [phase, setPhase] = useState("solo");

  // Race mode
  const [raceCountdown, setRaceCountdown] = useState(null);
  const [raceStartAtSec, setRaceStartAtSec] = useState(null);
  const startedAtRef = useRef(null);

  // UI
  const [toast, setToast] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  // ====== Setup playerId + name ======
  useEffect(() => {
    const storedId = localStorage.getItem("buildle_player_id");
    const storedName = localStorage.getItem("buildle_player_name");
    const id = storedId || `p_${genId(12)}`;
    setPlayerId(id);
    if (!storedId) localStorage.setItem("buildle_player_id", id);

    setPlayerName(storedName || "");
  }, []);

  const saveName = (name) => {
    setPlayerName(name);
    localStorage.setItem("buildle_player_name", name);
  };

  // ====== Guess evaluation ======
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

  // ====== Detect challenge from URL (?c=...&h=...) ======
  useEffect(() => {
    const urlParams = new URLSearchParams(
      typeof window !== "undefined" ? window.location.search : ""
    );
    const c = urlParams.get("c");
    const h = urlParams.get("h");
    if (c) setChallengeId(c);
    if (h) setHostKey(h);
  }, []);

  // ====== Helpers ======
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
    } catch {
      return false;
    }
  };

  const calcScore = (won, tries, durationSec) => {
    if (!won) return 0;
    const base = Math.max(0, 7 - tries) * 10;
    const speedBonus = Math.max(0, 20 - Math.floor(durationSec / 10));
    return base + speedBonus;
  };

  // ====== Start new SOLO game ======
  const startSoloGame = useCallback((len) => {
    const list = DICTIONARY[len];
    const newWord = list[Math.floor(Math.random() * list.length)];
    setTargetWord(newWord);
    setGuesses([]);
    setCurrentGuess("");
    setGameOver(false);
    setWin(false);
    startedAtRef.current = Date.now();
  }, []);

  // ====== Load challenge from DB ======
  const fetchChallenge = useCallback(async (cId) => {
    const client = supabase;
    if (!client) return null;
    const { data, error } = await client
      .from("challenges")
      .select("*")
      .eq("id", cId)
      .single();
    if (error) return null;
    return data;
  }, []);

  const joinChallenge = useCallback(
    async (cId, name) => {
      const client = supabase;
      if (!client) return;

      await client.from("challenge_players").upsert({
        challenge_id: cId,
        player_id: playerId,
        name: name || "لاعب",
      });
    },
    [playerId]
  );

  const fetchPlayers = useCallback(async (cId) => {
    const client = supabase;
    if (!client) return [];
    const { data } = await client
      .from("challenge_players")
      .select("*")
      .eq("challenge_id", cId)
      .order("joined_at", { ascending: true });
    return data || [];
  }, []);

  const fetchResults = useCallback(async (cId, round) => {
    const client = supabase;
    if (!client) return [];
    const { data } = await client
      .from("challenge_results")
      .select("*")
      .eq("challenge_id", cId)
      .eq("round", round)
      .order("won", { ascending: true })
      .order("tries", { ascending: true })
      .order("duration_sec", { ascending: true })
      .order("score", { ascending: false });

    const arr = (data || []).slice().sort((a, b) => {
      if (a.won !== b.won) return a.won ? -1 : 1;
      if (a.tries !== b.tries) return a.tries - b.tries;
      if (a.duration_sec !== b.duration_sec)
        return a.duration_sec - b.duration_sec;
      return b.score - a.score;
    });
    return arr;
  }, []);

  const fetchMatchScores = useCallback(async (cId) => {
    const client = supabase;
    if (!client) return [];

    const { data } = await client
      .from("challenge_results")
      .select("player_id,name,is_round_winner")
      .eq("challenge_id", cId);

    const wins = new Map();
    (data || []).forEach((r) => {
      if (!r.is_round_winner) return;
      const key = r.player_id;
      const cur = wins.get(key) || { player_id: key, name: r.name, wins: 0 };
      cur.wins += 1;
      wins.set(key, cur);
    });

    return Array.from(wins.values()).sort((a, b) => b.wins - a.wins);
  }, []);

  const resetBoard = () => {
    setGuesses([]);
    setCurrentGuess("");
    setGameOver(false);
    setWin(false);
  };

  // ====== Initialize game depending on challenge/solo ======
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);

      // If no challenge => solo
      if (!challengeId) {
        setPhase("solo");
        setChallengeData(null);
        setPlayers([]);
        setResults([]);
        setSessionRound(1);
        setSessionScore(0);
        setRoundWinner(null);
        setMatchWinner(null);
        setMatchScores([]);
        startSoloGame(currentWordLength);
        setIsLoading(false);
        return;
      }

      // Challenge mode
      const c = await fetchChallenge(challengeId);
      if (!c) {
        showToast("التحدي غير موجود!");
        setIsLoading(false);
        return;
      }

      setChallengeData(c);
      setCurrentWordLength(c.length);
      setTargetWord(c.word);
      setSessionRound(c.current_round);
      resetBoard();

      // status -> phase
      if (c.status === "lobby") setPhase("lobby");
      if (c.status === "running") setPhase("playing");
      if (c.status === "round_over") setPhase("round_over");
      if (c.status === "match_over") setPhase("match_over");
      if (c.status === "finished") setPhase("finished"); // احتياط لو عندك قيم قديمة

      // winners
      setRoundWinner(
        c.round_winner_player_id
          ? { player_id: c.round_winner_player_id, name: c.round_winner_name }
          : null
      );
      setMatchWinner(
        c.match_winner_player_id
          ? { player_id: c.match_winner_player_id, name: c.match_winner_name }
          : null
      );

      // Join
      if (playerId) await joinChallenge(challengeId, playerName || "لاعب");

      const pls = await fetchPlayers(challengeId);
      setPlayers(pls);

      const res = await fetchResults(challengeId, c.current_round);
      setResults(res);

      // match scores (سلسلة الفوز)
      const ms = await fetchMatchScores(challengeId);
      setMatchScores(ms);

      // race timer
      if (c.starts_at) {
        const startAt = Math.floor(new Date(c.starts_at).getTime() / 1000);
        setRaceStartAtSec(startAt);
      } else {
        setRaceStartAtSec(null);
      }

      startedAtRef.current = Date.now();
      setIsLoading(false);
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challengeId, playerId]);

  // ====== Realtime subscriptions (players/results/challenge) ======
  useEffect(() => {
    if (!challengeId || !supabase) return;

    const channel = supabase
      .channel(`buildle_${challengeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "challenge_players",
          filter: `challenge_id=eq.${challengeId}`,
        },
        async () => setPlayers(await fetchPlayers(challengeId))
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "challenge_results",
          filter: `challenge_id=eq.${challengeId}`,
        },
        async () => {
          const round = challengeData?.current_round || sessionRound;
          setResults(await fetchResults(challengeId, round));
          setMatchScores(await fetchMatchScores(challengeId));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "challenges",
          filter: `id=eq.${challengeId}`,
        },
        async (payload) => {
          const c = payload.new;

          setChallengeData(c);
          setCurrentWordLength(c.length);
          setTargetWord(c.word);

          // status -> phase
          if (c.status === "lobby") setPhase("lobby");
          if (c.status === "running") setPhase("playing");
          if (c.status === "round_over") setPhase("round_over");
          if (c.status === "match_over") setPhase("match_over");
          if (c.status === "finished") setPhase("finished");

          // winners
          setRoundWinner(
            c.round_winner_player_id
              ? { player_id: c.round_winner_player_id, name: c.round_winner_name }
              : null
          );
          setMatchWinner(
            c.match_winner_player_id
              ? { player_id: c.match_winner_player_id, name: c.match_winner_name }
              : null
          );

          // starts_at
          setRaceStartAtSec(
            c.starts_at ? Math.floor(new Date(c.starts_at).getTime() / 1000) : null
          );

          // round changed -> reset board
          setSessionRound(c.current_round);
          resetBoard();
          startedAtRef.current = Date.now();

          // refresh results
          setResults(await fetchResults(challengeId, c.current_round));
          setMatchScores(await fetchMatchScores(challengeId));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    challengeId,
    fetchPlayers,
    fetchResults,
    fetchMatchScores,
    challengeData,
    sessionRound,
  ]);

  // ====== Race countdown tick ======
  useEffect(() => {
    if (!challengeId) return;
    if (!raceStartAtSec) {
      setRaceCountdown(null);
      return;
    }

    const tick = () => {
      const diff = raceStartAtSec - nowSec();
      if (diff > 0) {
        setRaceCountdown(diff);
        setPhase("countdown");
      } else {
        setRaceCountdown(0);
        if (challengeData?.status === "running") setPhase("playing");
      }
    };

    tick();
    const t = setInterval(tick, 300);
    return () => clearInterval(t);
  }, [raceStartAtSec, challengeId, challengeData]);

  // ====== Keyboard handling ======
  const handleKeyPress = useCallback(
    (key) => {
      if (gameOver) return;
      // ✅ إصلاح return المكرر + منع اللعب في round/match over
      if (
        phase === "lobby" ||
        phase === "countdown" ||
        phase === "round_over" ||
        phase === "match_over" ||
        phase === "finished"
      )
        return;

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
    [gameOver, phase, currentGuess, currentWordLength, guesses, targetWord]
  );

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      handleKeyPress(e.key);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleKeyPress]);

  // ====== When game ends in challenge => submit result + close round if first winner ======
  useEffect(() => {
    const submit = async () => {
      if (!gameOver) return;
      if (!challengeId || !supabase) return;

      const finishedAt = Date.now();
      const durationSec = Math.max(
        1,
        Math.floor((finishedAt - (startedAtRef.current || finishedAt)) / 1000)
      );
      const tries = win ? guesses.length : 6;
      const score = calcScore(win, tries, durationSec);
      const round = challengeData?.current_round || sessionRound;

      // ارفع نتيجتي
      await supabase.from("challenge_results").upsert({
        challenge_id: challengeId,
        round,
        player_id: playerId,
        name: playerName || "لاعب",
        tries,
        won: !!win,
        duration_sec: durationSec,
        score,
        is_round_winner: false,
      });

      // لو فزت بالكلمة: حاول اقفل الراوند كأول واحد
      if (win) {
        const { data: updated } = await supabase
          .from("challenges")
          .update({
            round_winner_player_id: playerId,
            round_winner_name: playerName || "لاعب",
            round_ended_at: new Date().toISOString(),
          })
          .eq("id", challengeId)
          .is("round_winner_player_id", null)
          .eq("status", "running")
          .select()
          .maybeSingle();

        // إذا أنا فعلاً أول واحد
        if (updated) {
          await supabase
            .from("challenge_results")
            .update({ is_round_winner: true })
            .eq("challenge_id", challengeId)
            .eq("round", round)
            .eq("player_id", playerId);

          const scores = await fetchMatchScores(challengeId);
          setMatchScores(scores);

          const me = scores.find((s) => s.player_id === playerId);
          const target = updated.match_target_wins || 5;

          if ((me?.wins || 0) >= target) {
            await supabase
              .from("challenges")
              .update({
                status: "match_over",
                match_winner_player_id: playerId,
                match_winner_name: playerName || "لاعب",
              })
              .eq("id", challengeId);
          } else {
            await supabase
              .from("challenges")
              .update({ status: "round_over" })
              .eq("id", challengeId);
          }
        }
      }
    };

    submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOver]);

  // ====== Create challenge ======
  const createChallenge = async () => {
    const client = supabase;
    if (!client) {
      showToast("تأكد من وضع مفاتيح Supabase في .env وبادئة VITE_");
      return;
    }
    if (!playerName) {
      showToast("اكتب اسمك أولاً للعب الجماعي 👤");
      return;
    }

    const id = genId(7);
    const hk = genId(10);

    const { error } = await client.from("challenges").insert([
      {
        id,
        word:
          targetWord ||
          DICTIONARY[currentWordLength][
            Math.floor(Math.random() * DICTIONARY[currentWordLength].length)
          ],
        length: currentWordLength,
        status: "lobby",
        current_round: 1,
        host_key: hk,
        starts_at: null,
      },
    ]);

    if (error) {
      showToast("فشل إنشاء التحدي!");
      return;
    }

    const link = `${window.location.origin}${window.location.pathname}?c=${id}&h=${hk}`;
    setChallengeLink(link);
    setShowChallengeModal(true);

    window.history.replaceState({}, document.title, `?c=${id}&h=${hk}`);
    setChallengeId(id);
    setHostKey(hk);
  };

  // ====== Host actions ======
  const isHost = useMemo(() => {
    if (!challengeData || !hostKey) return false;
    return challengeData.host_key === hostKey;
  }, [challengeData, hostKey]);

  const startRaceNow = async () => {
    if (!challengeId || !supabase) return;
    if (!isHost) {
      showToast("فقط المضيف يقدر يبدأ السباق 👑");
      return;
    }
    const startAt = new Date(Date.now() + 5000).toISOString();
    await supabase
      .from("challenges")
      .update({ status: "running", starts_at: startAt })
      .eq("id", challengeId);
  };

  // ✅ بدل rematchSameLink (نفس الرابط لكن راوند جديد)
  const nextRoundSameLink = async () => {
    if (!challengeId || !supabase) return;
    if (!isHost) return showToast("فقط المضيف 👑");

    const len = challengeData?.length || currentWordLength;
    const list = DICTIONARY[len];
    const newWord = list[Math.floor(Math.random() * list.length)];

    await supabase
      .from("challenges")
      .update({
        word: newWord,
        length: len,
        status: "lobby",
        starts_at: null,
        current_round: (challengeData?.current_round || sessionRound) + 1,
        round_winner_player_id: null,
        round_winner_name: null,
        round_ended_at: null,
      })
      .eq("id", challengeId);

    showToast("راوند جديد جاهز 🔁");
  };

  // ====== Solo length change behavior ======
  useEffect(() => {
    if (challengeId) return;
    startSoloGame(currentWordLength);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWordLength]);

  // ====== Derived leaderboard ======
  const leaderboard = useMemo(() => {
    return (results || []).slice().sort((a, b) => {
      if (a.won !== b.won) return a.won ? -1 : 1;
      if (a.tries !== b.tries) return a.tries - b.tries;
      if (a.duration_sec !== b.duration_sec)
        return a.duration_sec - b.duration_sec;
      return b.score - a.score;
    });
  }, [results]);

  // ====== UI render guards ======
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-[#020617] flex items-center justify-center z-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const inChallenge = !!challengeId;

  return (
    <div className="game-container" dir="rtl">
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

      {/* ===== Header ===== */}
      <header className="p-4 flex flex-col gap-3 max-w-lg mx-auto w-full mt-2 shrink-0">
        <div className="flex justify-between items-center w-full">
          <h1 className="text-3xl font-black tracking-tighter bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent !m-0 !p-0 !leading-none">
            كَوْنها
          </h1>

          <div className="flex items-center gap-2">
            <input
              value={playerName}
              onChange={(e) => saveName(e.target.value)}
              placeholder="اسمك"
              className="w-[110px] bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 text-sm font-bold outline-none text-white placeholder:text-white/40"
            />

            <select
              value={currentWordLength}
              disabled={guesses.length > 0 || inChallenge}
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
              title="إنشاء تحدي"
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
            {inChallenge && (
              <div className="text-[9px] uppercase font-bold text-purple-300 tracking-widest bg-purple-900/40 px-2 py-1 rounded border border-purple-500/30 mt-1">
                لعب جماعي ⚔️ {isHost ? "• مضيف 👑" : ""}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ===== LOBBY / COUNTDOWN / PLAYING ===== */}
      <div className="flex-grow flex items-center justify-center p-4 overflow-y-auto">
        <div className="w-full max-w-md mx-auto">
          {/* LOBBY */}
          {inChallenge && phase === "lobby" && (
            <div className="bg-slate-900/60 border border-slate-700 rounded-3xl p-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-400">لوبي التحدّي</div>
                  <div className="text-2xl font-black text-white mt-1">
                    تحدّي #{challengeId}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">طول الكلمة</div>
                  <div className="text-lg font-black text-purple-300">
                    {currentWordLength} حروف
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4">
                  <div className="text-xs text-slate-400 mb-2">اللاعبين</div>
                  <div className="space-y-2 max-h-36 overflow-auto pr-1">
                    {players.map((p) => (
                      <div
                        key={p.player_id}
                        className="flex items-center justify-between"
                      >
                        <span className="font-bold text-white">{p.name}</span>
                        <span className="text-[10px] text-slate-400">
                          {p.player_id === playerId ? "أنت" : "متصل"}
                        </span>
                      </div>
                    ))}
                    {players.length === 0 && (
                      <div className="text-slate-500 text-sm">
                        لا يوجد لاعبين بعد
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4">
                  <div className="text-xs text-slate-400 mb-2">التحكم</div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={startRaceNow}
                      className={`py-3 rounded-2xl font-black border-none cursor-pointer transition-transform active:scale-95
                        ${
                          isHost
                            ? "bg-gradient-to-r from-emerald-500 to-teal-600"
                            : "bg-slate-700/60 text-slate-300"
                        }`}
                    >
                      بدء سباق الوقت ⏱️
                    </button>

                    <button
                      onClick={() =>
                        copyToClipboard(window.location.href).then(() =>
                          showToast("تم نسخ رابط التحدي!")
                        )
                      }
                      className="py-3 rounded-2xl font-black bg-slate-900 border border-slate-700 cursor-pointer"
                    >
                      نسخ الرابط 🔗
                    </button>

                    {!isHost && (
                      <div className="text-[11px] text-slate-400 leading-5">
                        انتظر المضيف يبدأ السباق 👑
                      </div>
                    )}
                    {isHost && (
                      <div className="text-[11px] text-emerald-300 leading-5">
                        أنت المضيف — اضغط “بدء سباق الوقت” وسيبدأ العد التنازلي
                        للجميع.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5 text-[12px] text-slate-400 bg-slate-900/60 border border-slate-700 rounded-2xl p-4">
                ✅ الهدف: نفس الكلمة للجميع. ✅ الترتيب: فوز + أقل محاولات +
                أسرع وقت. ✅ بعد ما يخلصون، تظهر لوحة الترتيب تلقائيًا.
              </div>
            </div>
          )}

          {/* COUNTDOWN */}
          {inChallenge && phase === "countdown" && (
            <div className="bg-slate-900/60 border border-slate-700 rounded-3xl p-8 shadow-2xl text-center">
              <div className="text-sm text-slate-400">سباق الوقت يبدأ خلال</div>
              <div className="text-6xl font-black mt-4 bg-gradient-to-r from-emerald-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                {raceCountdown ?? 0}
              </div>
              <div className="text-slate-400 mt-3">استعد! 🚀</div>
            </div>
          )}

          {/* PLAYING BOARD */}
          {(phase === "playing" || phase === "solo") && (
            <div
              className="grid gap-2 sm:gap-3 w-full mx-auto"
              style={{
                gridTemplateColumns: `repeat(${currentWordLength}, 1fr)`,
              }}
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
          )}

          {/* ✅ ROUND OVER */}
          {inChallenge && phase === "round_over" && (
            <div className="bg-slate-900/60 border border-slate-700 rounded-3xl p-6 shadow-2xl mt-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-400">انتهى الراوند</div>
                  <div className="text-2xl font-black text-white mt-1">
                    الفائز:{" "}
                    <span className="text-emerald-300">
                      {roundWinner?.name || "—"}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">الجولة</div>
                  <div className="text-sm font-black text-purple-300">
                    #{sessionRound}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="text-xs text-slate-400 mb-2">ترتيب الراوند</div>
                <div className="space-y-2">
                  {leaderboard.map((r, idx) => (
                    <div
                      key={r.player_id}
                      className={`flex items-center justify-between rounded-2xl px-4 py-3 border
                        ${
                          idx === 0
                            ? "bg-emerald-500/10 border-emerald-500/30"
                            : "bg-slate-800/60 border-slate-700"
                        }`}
                    >
                      <span className="font-bold text-white">
                        {idx + 1}. {r.name}
                      </span>
                      <span className="text-slate-300 text-sm">
                        {r.won ? `✅ ${r.tries} محاولات` : "❌"}
                      </span>
                    </div>
                  ))}
                  {leaderboard.length === 0 && (
                    <div className="text-slate-500 text-sm">
                      بانتظار النتائج...
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <div className="text-xs text-slate-400 mb-2">سلسلة الفوز</div>
                <div className="space-y-2">
                  {(matchScores || []).map((s) => (
                    <div
                      key={s.player_id}
                      className="flex items-center justify-between bg-slate-800/60 border border-slate-700 rounded-2xl px-4 py-3"
                    >
                      <span className="font-bold text-white">{s.name}</span>
                      <span className="text-purple-300 font-black">
                        {s.wins}
                      </span>
                    </div>
                  ))}
                  {(matchScores || []).length === 0 && (
                    <div className="text-slate-500 text-sm">
                      لا توجد نقاط سلسلة بعد
                    </div>
                  )}
                </div>
              </div>

              {isHost && (
                <button
                  onClick={nextRoundSameLink}
                  className="mt-4 w-full py-3 rounded-2xl font-black bg-gradient-to-r from-indigo-500 to-purple-600 border-none cursor-pointer"
                >
                  الراوند التالي 🔁
                </button>
              )}

              {!isHost && (
                <div className="text-[11px] text-slate-400 text-center mt-3">
                  انتظر المضيف يبدأ الراوند التالي 👑
                </div>
              )}
            </div>
          )}

          {/* ✅ MATCH OVER */}
          {inChallenge && phase === "match_over" && (
            <div className="bg-slate-900/60 border border-slate-700 rounded-3xl p-6 shadow-2xl mt-4 text-center">
              <div className="text-sm text-slate-400">انتهت المباراة</div>
              <div className="text-3xl font-black text-white mt-2">
                🏆 الفائز النهائي:{" "}
                <span className="text-emerald-300">
                  {matchWinner?.name || "—"}
                </span>
              </div>

              <div className="mt-4 text-left">
                <div className="text-xs text-slate-400 mb-2">سلسلة الفوز</div>
                <div className="space-y-2">
                  {(matchScores || []).map((s, idx) => (
                    <div
                      key={s.player_id}
                      className={`flex items-center justify-between rounded-2xl px-4 py-3 border
                        ${
                          idx === 0
                            ? "bg-emerald-500/10 border-emerald-500/30"
                            : "bg-slate-800/60 border-slate-700"
                        }`}
                    >
                      <span className="font-bold text-white">
                        {idx + 1}. {s.name}
                      </span>
                      <span className="text-purple-300 font-black">
                        {s.wins}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() =>
                  copyToClipboard(window.location.href).then(() =>
                    showToast("تم نسخ رابط التحدي!")
                  )
                }
                className="mt-5 bg-slate-900 py-3 w-full rounded-2xl border border-slate-700 font-black text-white cursor-pointer"
              >
                نسخ الرابط 🔗
              </button>
            </div>
          )}

          {/* FINISHED: Leaderboard (موجود مثل ما هو - احتياطي) */}
          {inChallenge && phase === "finished" && (
            <div className="bg-slate-900/60 border border-slate-700 rounded-3xl p-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-400">لوحة الترتيب</div>
                  <div className="text-2xl font-black text-white mt-1">
                    الجولة {sessionRound}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">التحدي</div>
                  <div className="text-sm font-black text-purple-300">
                    #{challengeId}
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {leaderboard.length === 0 && (
                  <div className="text-slate-500 text-sm">
                    بانتظار النتائج...
                  </div>
                )}

                {leaderboard.map((r, idx) => (
                  <div
                    key={r.player_id}
                    className={`flex items-center justify-between rounded-2xl px-4 py-3 border
                      ${
                        idx === 0
                          ? "bg-emerald-500/10 border-emerald-500/30"
                          : "bg-slate-800/60 border-slate-700"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-black
                        ${
                          idx === 0
                            ? "bg-emerald-500 text-slate-950"
                            : "bg-slate-700 text-white"
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <div>
                        <div className="font-black text-white">
                          {r.name}{" "}
                          {r.player_id === playerId ? (
                            <span className="text-[11px] text-slate-400">
                              {" "}
                              (أنت)
                            </span>
                          ) : (
                            ""
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {r.won ? `فاز • محاولات ${r.tries}` : "لم يحلها"} •{" "}
                          {r.duration_sec}s
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-slate-400">Score</div>
                      <div className="text-lg font-black text-purple-300">
                        {r.score}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-col gap-2">
                <button
                  onClick={() =>
                    copyToClipboard(window.location.href).then(() =>
                      showToast("تم نسخ رابط التحدي!")
                    )
                  }
                  className="bg-slate-900 py-3 rounded-2xl border border-slate-700 font-black text-white cursor-pointer"
                >
                  نسخ الرابط 🔗
                </button>

                <button
                  onClick={nextRoundSameLink}
                  className={`py-3 rounded-2xl font-black border-none cursor-pointer transition-transform active:scale-95
                    ${
                      isHost
                        ? "bg-gradient-to-r from-indigo-500 to-purple-600"
                        : "bg-slate-700/60 text-slate-300"
                    }`}
                >
                  الراوند التالي (نفس الرابط) 🔁
                </button>

                {!isHost && (
                  <div className="text-[11px] text-slate-400 text-center">
                    فقط المضيف يقدر يبدأ الراوند التالي 👑
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== Keyboard ===== */}
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

      {/* Toast */}
      {toast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-white text-black px-6 py-3 rounded-full font-bold shadow-2xl z-[9999] animate-bounce text-center">
          {toast}
        </div>
      )}

      {/* SOLO GameOver popup (only for solo) */}
      {!inChallenge && gameOver && (
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

            <div className="flex flex-col gap-3">
              <button
                onClick={() => startSoloGame(currentWordLength)}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 py-4 px-6 rounded-2xl text-xl font-black shadow-lg text-white border-none cursor-pointer"
              >
                لعبة جديدة 🔄
              </button>
              <button
                onClick={() => {
                  const text =
                    `لعبة كونها 🧩\n\n` +
                    guesses
                      .map((g) =>
                        g.result
                          .map((r) =>
                            r === "correct"
                              ? "🟩"
                              : r === "present"
                              ? "🟨"
                              : "⬛"
                          )
                          .join("")
                      )
                      .join("\n");
                  copyToClipboard(text).then(() =>
                    showToast("تم نسخ النتيجة!")
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

      {/* Challenge link modal */}
      {showChallengeModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[10000] backdrop-blur-md">
          <div className="bg-slate-900 border-2 border-slate-700 p-8 rounded-3xl max-w-sm w-full text-center mx-4 shadow-2xl">
            <h2 className="text-2xl font-black mb-4 text-purple-400">
              أنشئ تحدي لصديقك ⚔️
            </h2>
            <p className="text-slate-400 text-sm mb-6">
              الرابط يحتوي صلاحية المضيف 👑 (للبدء/الراوند التالي)
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
                    showToast("تم نسخ الرابط!")
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
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}