"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

const poses = ["idle", "password", "attention"];
const headImage = (pose) => `/images/skillswap-student-head-${pose}.webp`;
const blinkImage = (pose) => `/images/skillswap-student-head-${pose}-blink.webp`;
const eyeCenters = {
  idle: [[452, 222], [496, 218]],
  attention: [[451, 224], [497, 222]],
};

export default function InteractiveCharacter({ state = "idle", reactionToken = 0 }) {
  const reduceMotion = useReducedMotion();
  const [attention, setAttention] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [windowFocused, setWindowFocused] = useState(true);
  const [pointerGaze, setPointerGaze] = useState({ x: 0, y: 0 });
  const [blinkToken, setBlinkToken] = useState(0);
  const [blinking, setBlinking] = useState(false);
  const attentionTimer = useRef(null);
  const pointerFrame = useRef(0);
  const pendingGaze = useRef({ x: 0, y: 0 });
  const lastReaction = useRef(reactionToken);

  const blink = useCallback(() => {
    setBlinking(true);
    setBlinkToken((value) => value + 1);
  }, []);

  useEffect(() => {
    if (reactionToken !== lastReaction.current) {
      lastReaction.current = reactionToken;
      blink();
    }
  }, [blink, reactionToken]);

  useEffect(() => {
    if (reduceMotion || !windowFocused) return undefined;

    let timer;
    const schedule = () => {
      timer = window.setTimeout(() => {
        blink();
        if (Math.random() < 0.14) {
          timer = window.setTimeout(() => {
            blink();
            schedule();
          }, 250);
        } else {
          schedule();
        }
      }, 3200 + Math.random() * 1900);
    };

    schedule();
    return () => window.clearTimeout(timer);
  }, [blink, reduceMotion, windowFocused]);

  useEffect(() => {
    if (!blinkToken) return undefined;
    const timer = window.setTimeout(() => setBlinking(false), 165);
    return () => window.clearTimeout(timer);
  }, [blinkToken]);

  useEffect(() => {
    const clearAttention = () => {
      window.clearTimeout(attentionTimer.current);
      attentionTimer.current = null;
      setAttention(false);
    };
    const handleWindowBlur = () => {
      setWindowFocused(false);
      setHovering(false);
      setPointerGaze({ x: 0, y: 0 });
      clearAttention();
    };
    const handleWindowFocus = () => setWindowFocused(true);
    const handleVisibility = () => {
      if (document.hidden) handleWindowBlur();
      else handleWindowFocus();
    };

    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.clearTimeout(attentionTimer.current);
      if (pointerFrame.current) window.cancelAnimationFrame(pointerFrame.current);
    };
  }, []);

  const currentState = windowFocused ? state : "idle";
  const lockedPose = ["email-focused", "typing", "password-focused", "password-visible", "submitting", "success", "error"].includes(currentState);
  const isUrgent = ["submitting", "success", "error"].includes(currentState);
  const showAttention = windowFocused && !isUrgent && attention;
  const showHover = windowFocused && !lockedPose && !showAttention && hovering;
  const pose = currentState === "password-focused" || currentState === "password-visible"
    ? "password"
    : showAttention || currentState === "success"
      ? "attention"
      : "idle";
  const activeEyes = pose === "idle" ? eyeCenters.idle : null;
  const gazeX = showHover ? pointerGaze.x : currentState === "email-focused" || currentState === "typing" ? 5 : 0;
  const gazeY = showHover ? pointerGaze.y : currentState === "email-focused" || currentState === "typing" ? 2 : 0;

  function noticeClick() {
    setAttention(true);
    blink();
    window.clearTimeout(attentionTimer.current);
    attentionTimer.current = window.setTimeout(() => setAttention(false), 2350);
  }

  function handlePointerEnter(event) {
    if (event.pointerType === "mouse" || event.pointerType === "pen") setHovering(true);
  }

  function handlePointerMove(event) {
    if ((event.pointerType !== "mouse" && event.pointerType !== "pen") || lockedPose) return;
    const rect = event.currentTarget.getBoundingClientRect();
    pendingGaze.current = {
      x: ((event.clientX - rect.left) / rect.width - 0.5) * 7,
      y: ((event.clientY - rect.top) / rect.height - 0.5) * 5,
    };
    if (!pointerFrame.current) {
      pointerFrame.current = window.requestAnimationFrame(() => {
        setPointerGaze(pendingGaze.current);
        pointerFrame.current = 0;
      });
    }
  }

  function handlePointerLeave() {
    setHovering(false);
    setPointerGaze({ x: 0, y: 0 });
  }

  return (
    <div className="character-interactions" data-state={currentState} data-pose={pose}>
      <span className="character-breath" aria-hidden="true" />
      <div
        className={`character-head ${showHover ? "is-hovering" : ""} ${currentState === "email-focused" || currentState === "typing" ? "is-attentive" : ""} ${currentState === "submitting" ? "is-submitting" : ""} ${currentState === "error" ? "is-concerned" : ""}`}
        style={{
          "--head-x": `${showHover ? pointerGaze.x * 0.32 : 0}px`,
          "--head-y": `${showHover ? pointerGaze.y * 0.2 : currentState === "submitting" ? 1 : pose === "attention" ? -1 : currentState === "error" ? 1 : 0}px`,
          "--head-tilt": `${showHover ? pointerGaze.x * 0.08 : currentState === "email-focused" || currentState === "typing" ? 0.25 : currentState === "error" ? -0.5 : 0}deg`,
        }}
        aria-hidden="true"
      >
        {poses.map((name) => (
          <Image
            key={name}
            className={`character-head-pose ${pose === name ? "is-active" : ""}`}
            src={headImage(name)}
            width={300}
            height={320}
            alt=""
            sizes="300px"
            priority={name === "idle"}
            draggable={false}
          />
        ))}
        <Image
          key={`${pose}-${blinkToken}`}
          className={`character-blink-pose ${blinking && windowFocused ? "is-blinking" : ""}`}
          src={blinkImage(pose)}
          width={300}
          height={320}
          alt=""
          sizes="300px"
          draggable={false}
        />
        {activeEyes && (
          <svg className={`character-eye-tracking ${blinking ? "is-hidden" : ""}`} viewBox="0 0 1536 1024" aria-hidden="true">
            <defs>
              <radialGradient id="eye-sclera">
                <stop offset="0.62" stopColor="#fbf3ec" />
                <stop offset="1" stopColor="#fbf3ec" stopOpacity="0" />
              </radialGradient>
            </defs>
            {activeEyes.map(([x, y], index) => (
              <g key={index} className="tracked-pupil" style={{ "--gaze-x": `${gazeX}px`, "--gaze-y": `${gazeY}px` }}>
                <ellipse cx={x} cy={y} rx="12" ry="15" fill="url(#eye-sclera)" />
                <ellipse cx={x} cy={y} rx="9" ry="12" fill="#30251f" />
                <ellipse cx={x - 2} cy={y - 4} rx="2.4" ry="3" fill="#fffaf5" opacity=".94" />
              </g>
            ))}
          </svg>
        )}
      </div>
      <button
        className="character-hit-area"
        type="button"
        aria-label="Look at me"
        onClick={noticeClick}
        onPointerEnter={handlePointerEnter}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      />
    </div>
  );
}
