"use client";
import React, { useEffect, useState } from "react";

interface TypingAnimationProps {
  words: string[];
  speed?: number;
  pause?: number;
}

const TypingAnimation: React.FC<TypingAnimationProps> = ({
  words,
  speed = 100,
  pause = 1200,
}) => {
  const [currentWord, setCurrentWord] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const word = words[currentWord];
    if (!isDeleting && displayed.length < word.length) {
      timeout = setTimeout(() => {
        setDisplayed(word.slice(0, displayed.length + 1));
      }, speed);
    } else if (!isDeleting && displayed.length === word.length) {
      timeout = setTimeout(() => {
        setIsDeleting(true);
      }, pause);
    } else if (isDeleting && displayed.length > 0) {
      timeout = setTimeout(() => {
        setDisplayed(word.slice(0, displayed.length - 1));
      }, speed / 2);
    } else if (isDeleting && displayed.length === 0) {
      setIsDeleting(false);
      setCurrentWord((prev) => (prev + 1) % words.length);
    }
    return () => clearTimeout(timeout);
  }, [displayed, isDeleting, currentWord, words, speed, pause]);

  return <span>{displayed}</span>;
};

export default TypingAnimation;
