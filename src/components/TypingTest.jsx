import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

import { styles } from "../styles";
import { SectionWrapper } from "../hoc";
import { fadeIn, textVariant } from "../utils/motion";

const DURATIONS = [15, 30, 60];
const WORD_COUNT = 200;
const LINE_HEIGHT = 44; // px, keep in sync with the text box's leading
const BEST_KEY = "typing-test-best";

const WORDS = (
  "the be to of and a in that have it for not on with he as you do at this but his by from they we say her she or an " +
  "will my one all would there their what so up out if about who get which go me when make can like time no just him " +
  "know take people into year your good some could them see other than then now look only come its over think also " +
  "back after use two how our work first well way even new want because any these give day most us code build react " +
  "design data system world life hand part place case week point program number group problem fact screen light state " +
  "small large next early young important few public bad same able great keep start right leave call last long little " +
  "own old big high different follow turn learn plan grow open walk write read change play move live believe bring " +
  "happen begin seem show hear run stand lose pay meet include continue set create speak allow add spend offer remember"
).split(" ");

const generateText = () =>
  Array.from({ length: WORD_COUNT }, () => WORDS[Math.floor(Math.random() * WORDS.length)]).join(" ");

const readBest = () => {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
};

const saveBest = (wpm) => {
  try {
    localStorage.setItem(BEST_KEY, String(wpm));
  } catch {
    // Storage can be unavailable (private mode); the best score just won't persist
  }
};

const Stat = ({ label, value, accent }) => (
  <div className="flex flex-col items-center min-w-[90px]">
    <span className={`text-[32px] font-black ${accent ? "text-[#915EFF]" : "text-white"}`}>
      {value}
    </span>
    <span className="text-secondary text-[13px] uppercase tracking-wider">{label}</span>
  </div>
);

const TypingTest = () => {
  const [duration, setDuration] = useState(30);
  const [text, setText] = useState(generateText);
  const [typed, setTyped] = useState("");
  const [startTime, setStartTime] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [finished, setFinished] = useState(false);
  const [keystrokes, setKeystrokes] = useState({ total: 0, correct: 0 });
  const [best, setBest] = useState(readBest);
  const [focused, setFocused] = useState(false);
  const [scroll, setScroll] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);

  const inputRef = useRef(null);
  const caretRef = useRef(null);

  const elapsed = startTime ? Math.min((now - startTime) / 1000, duration) : 0;
  const timeLeft = Math.ceil(duration - elapsed);

  const correctChars = useMemo(() => {
    let count = 0;
    for (let i = 0; i < typed.length; i++) if (typed[i] === text[i]) count++;
    return count;
  }, [typed, text]);

  const minutes = elapsed / 60;
  const wpm = minutes > 0 ? Math.round(correctChars / 5 / minutes) : 0;
  const rawWpm = minutes > 0 ? Math.round(typed.length / 5 / minutes) : 0;
  const accuracy = keystrokes.total
    ? Math.round((keystrokes.correct / keystrokes.total) * 100)
    : 100;

  const reset = useCallback((nextDuration = duration) => {
    setDuration(nextDuration);
    setText(generateText());
    setTyped("");
    setStartTime(null);
    setFinished(false);
    setKeystrokes({ total: 0, correct: 0 });
    setScroll(0);
    setIsNewBest(false);
    inputRef.current?.focus();
  }, [duration]);

  // Tick the clock while a test is running
  useEffect(() => {
    if (!startTime || finished) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, [startTime, finished]);

  useEffect(() => {
    if (startTime && !finished && elapsed >= duration) setFinished(true);
  }, [elapsed, duration, startTime, finished]);

  useEffect(() => {
    if (finished && wpm > best) {
      setIsNewBest(true);
      setBest(wpm);
      saveBest(wpm);
    }
  }, [finished]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the caret's line in view: scroll so it sits on the second visible line
  useLayoutEffect(() => {
    if (!caretRef.current) return;
    const line = Math.floor(caretRef.current.offsetTop / LINE_HEIGHT);
    setScroll(Math.max(0, line - 1) * LINE_HEIGHT);
  }, [typed]);

  const handleChange = (event) => {
    if (finished) return;
    const value = event.target.value.slice(0, text.length);
    const begin = !startTime && value.length > 0;
    if (begin) {
      setStartTime(Date.now());
      setNow(Date.now());
    }

    if (value.length > typed.length) {
      const added = value.slice(typed.length);
      let correct = 0;
      for (let i = 0; i < added.length; i++) {
        if (added[i] === text[typed.length + i]) correct++;
      }
      setKeystrokes((k) => ({ total: k.total + added.length, correct: k.correct + correct }));
    }

    setTyped(value);
    if (value.length === text.length) setFinished(true);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      reset();
    }
  };

  // Split into words so the browser wraps on word boundaries
  const words = useMemo(() => {
    const result = [];
    let index = 0;
    text.split(" ").forEach((word, w, all) => {
      const chars = (w < all.length - 1 ? `${word} ` : word).split("");
      result.push(chars.map((char) => ({ char, index: index++ })));
    });
    return result;
  }, [text]);

  return (
    <>
      <motion.div variants={textVariant()}>
        <p className={styles.sectionSubText}>Try it yourself</p>
        <h2 className={styles.sectionHeadText}>Typing Test.</h2>
      </motion.div>

      <motion.p
        variants={fadeIn("", "", 0.1, 1)}
        className="mt-3 text-secondary text-[17px] max-w-3xl leading-[30px]"
      >
        How fast can you type? Pick a duration, click the box below and start typing.
        The timer starts on your first keystroke. Press Esc to restart.
      </motion.p>

      <motion.div
        variants={fadeIn("up", "spring", 0.2, 0.75)}
        className="mt-10 bg-black-100 rounded-2xl p-6 sm:p-8"
      >
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex gap-2">
            {DURATIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => reset(d)}
                className={`px-4 py-2 rounded-lg text-[14px] font-semibold transition-colors ${
                  duration === d
                    ? "bg-[#915EFF] text-white"
                    : "bg-tertiary text-secondary hover:text-white"
                }`}
              >
                {d}s
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-6">
            <Stat label="time" value={startTime ? timeLeft : duration} accent />
            <Stat label="wpm" value={wpm} />
            <Stat label="accuracy" value={`${accuracy}%`} />
            <Stat label="best" value={best} />
          </div>
        </div>

        <div
          onClick={() => inputRef.current?.focus()}
          className={`relative mt-8 bg-tertiary rounded-xl px-5 sm:px-6 py-4 cursor-text overflow-hidden border-2 transition-colors ${
            focused && !finished ? "border-[#915EFF]" : "border-transparent"
          }`}
          style={{ height: LINE_HEIGHT * 3 + 32 }}
        >
          <input
            ref={inputRef}
            value={typed}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onPaste={(e) => e.preventDefault()}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-label="Typing test input"
            className="absolute inset-0 opacity-0 cursor-text"
          />

          <div
            className="relative font-mono text-[20px] sm:text-[24px] select-none transition-transform duration-150"
            style={{ lineHeight: `${LINE_HEIGHT}px`, transform: `translateY(-${scroll}px)` }}
            aria-hidden="true"
          >
            {words.map((word, w) => (
              <span key={w} className="inline-block whitespace-pre">
                {word.map(({ char, index }) => {
                  const isTyped = index < typed.length;
                  const isCaret = index === typed.length;
                  const isWrong = isTyped && typed[index] !== char;
                  return (
                    <span
                      key={index}
                      ref={isCaret ? caretRef : undefined}
                      className={`relative ${
                        isWrong
                          ? "text-[#ff6b81] bg-[#ff6b81]/10 rounded-sm"
                          : isTyped
                          ? "text-white"
                          : "text-secondary/50"
                      }`}
                    >
                      {isCaret && focused && !finished && (
                        <span className="absolute left-0 top-[8px] bottom-[8px] w-[2px] bg-[#915EFF] animate-pulse" />
                      )}
                      {char}
                    </span>
                  );
                })}
              </span>
            ))}
          </div>

          {!focused && !finished && (
            <div className="absolute inset-0 flex items-center justify-center bg-tertiary/80 backdrop-blur-[2px] text-white font-medium pointer-events-none">
              Click here to start typing
            </div>
          )}

          {finished && (
            <div className="absolute inset-0 flex flex-col sm:flex-row items-center justify-center gap-6 bg-tertiary text-white">
              <div className="flex gap-8">
                <Stat label="wpm" value={wpm} accent />
                <Stat label="raw" value={rawWpm} />
                <Stat label="accuracy" value={`${accuracy}%`} />
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  reset();
                }}
                className="bg-[#915EFF] hover:bg-[#7a45f0] px-6 py-3 rounded-xl font-bold transition-colors"
              >
                {isNewBest ? "New best! Try again" : "Try again"}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
};

export default SectionWrapper(TypingTest, "typing");
