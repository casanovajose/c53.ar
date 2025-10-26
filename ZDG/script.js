const LETTER_COUNT = 7; // configurable number of placeholders
const DICT_PATH = "./dictionary.json";

let dictionary = [];
let currentWord = null;
let fixedIndex = null;
let animationInterval = null;
let mouseMoving = false;
let placeholdersEl;
let definitionEl;
const alphabet = "abcdefghijklmnopqrstuvwxyz";
const alphabetUpper = alphabet.toUpperCase();
let currentOffset = 0;
let definitionChaosInterval = null;
let currentDefinition = '';

async function init() {
  placeholdersEl = document.getElementById("placeholders");
  definitionEl = document.getElementById("definition");
  // create placeholders
  placeholdersEl.innerHTML = "";
  for (let i = 0; i < LETTER_COUNT; i++) {
    const p = document.createElement('div');
    p.className = "placeholder";
    const span = document.createElement("div");
    span.className = "letter";
    span.textContent = "";
    p.appendChild(span);
    placeholdersEl.appendChild(p);
  }

  // load dictionary
  try {
    const res = await fetch(DICT_PATH);
    let data = await res.json();
    // If the loaded object has a "list" property, use it
    if (data && Array.isArray(data.list)) {
      dictionary = data.list;
    } else {
      dictionary = data;
    }
  } catch (e) {
    console.error("Failed to load dictionary", e);
    dictionary = [];
  }

  pickRandomWordAndRender();

  // mouse handlers
  let mouseTimer;
  window.addEventListener("mousemove", (e) => {
    mouseMoving = true;
    onMouseMove(e);           // animates word
    startDefinitionChaos();   // animates definition
    if (mouseTimer) clearTimeout(mouseTimer);
    mouseTimer = setTimeout(() => {
      mouseMoving = false;
      stopChaos();            // stop word animation
      stopDefinitionChaos();  // stop definition animation
      onMouseStop();
    }, 200);
  });
}

function pickRandomWordAndRender() {
  const candidates = dictionary.filter(d => d.word && d.word.length > 0);
  if (candidates.length === 0) {
    currentWord = "WARWORD";
    currentOffset = 0;
    definitionEl.textContent = "";
    renderWord(currentWord, currentOffset);
    return;
  }
  const choice = candidates[Math.floor(Math.random() * candidates.length)];
  currentWord = choice.word.toUpperCase();
  // Calculate a random offset so the word can appear anywhere in the placeholders
  currentOffset = Math.floor(Math.random() * (LETTER_COUNT - currentWord.length + 1));
  setDefinitionAnimated(choice.definition || '');
  renderWord(currentWord, currentOffset);
}

function renderWord(word, offset = currentOffset, fixed = fixedIndex) {
  const letters = placeholdersEl.querySelectorAll('.letter');
  for (let i = 0; i < letters.length; i++) {
    letters[i].classList.remove("placeholder-underscore", "fixed-letter");
    if (fixedIndex === i) {
      letters[i].classList.add("fixed-letter");
    }
    if (i >= offset && i < offset + word.length) {
      const ch = word[i - offset];
      if (ch === " ") {
        letters[i].textContent = "_";
      } else {
        letters[i].textContent = ch;
      }
      // letters[i].classList.add("fixed-letter");
    } else {
      letters[i].textContent = "";
      letters[i].classList.add("placeholder-underscore");
    }
  }
}

function onMouseMove(e) {
  if (!currentWord) return;
  if (fixedIndex === null) {
    const maxIndex = currentWord.length - 1;
    if (maxIndex < 0) {
      fixedIndex = Math.floor(Math.random() * LETTER_COUNT);
    } else {
      fixedIndex = currentOffset + Math.floor(Math.random() * (maxIndex + 1));
    }
  }
  // Only start chaos if not already running
  if (!animationInterval) startChaosExcept(fixedIndex);
  if (!definitionChaosInterval) startDefinitionChaos();
}

function startChaosExcept(fixed) {
  if (animationInterval) return; // Already running
  animationInterval = setInterval(() => {
    const letters = placeholdersEl.querySelectorAll('.letter');
    for (let i = 0; i < letters.length; i++) {
      letters[i].classList.remove("placeholder-underscore", "fixed-letter");
      if (i === fixed) {
        letters[i].classList.add("fixed-letter");
        letters[i].classList.add("chaos"); // Blur the fixed letter too
        // Show the correct letter if in word, else blank
        if (i >= currentOffset && i < currentOffset + currentWord.length) {
          const ch = currentWord[i - currentOffset];
          if (ch === " ") {
            letters[i].textContent = "_";
          } else {
            letters[i].textContent = ch;
          }
        } else {
          letters[i].textContent = "";
        }
        continue;
      }
      // Fill all other slots (including empty ones) with random uppercase letter
      const rand = alphabetUpper[Math.floor(Math.random() * alphabetUpper.length)];
      letters[i].textContent = rand;
      letters[i].classList.add("chaos");
    }
  }, 60);
}

function stopChaos() {
  if (animationInterval) clearInterval(animationInterval);
  animationInterval = null;
  // Remove blur from all letters
  const letters = placeholdersEl.querySelectorAll(".letter");
  letters.forEach(l => l.classList.remove("chaos"));
}

function onMouseStop() {
  // pick another word matching the fixed letter in the same place
  if (fixedIndex === null) return;
  stopChaos();
  // Find the letter at the fixed position
  let targetLetter = null;
  let wordIndex = fixedIndex - currentOffset;
  if (wordIndex >= 0 && wordIndex < currentWord.length) {
    targetLetter = currentWord[wordIndex];
  }
  // Find candidates that can be placed at some offset so that their letter at wordIndex matches targetLetter
  const candidates = [];
  for (const d of dictionary) {
    const word = d.word.toUpperCase();
    for (let offset = 0; offset <= LETTER_COUNT - word.length; offset++) {
      let idx = fixedIndex - offset;
      if (idx >= 0 && idx < word.length && (!targetLetter || word[idx] === targetLetter)) {
        candidates.push({ word, definition: d.definition, offset });
      }
    }
  }
  if (candidates.length > 0) {
    const choice = candidates[Math.floor(Math.random() * candidates.length)];
    currentWord = choice.word;
    currentOffset = choice.offset;
    setDefinitionAnimated(choice.definition || "");
  }
  // render final word
  renderWord(currentWord, currentOffset, fixedIndex);
  // reset fixed index so next move can pick new fixed
  fixedIndex = null;
}

function setDefinitionAnimated(text) {
  currentDefinition = text;
  // If mouse is moving, start chaos
  if (mouseMoving) {
    startDefinitionChaos();
  } else {
    stopDefinitionChaos();
    definitionEl.textContent = text;
  }
}

function startDefinitionChaos() {
  if (definitionChaosInterval) return; // Already running
  definitionChaosInterval = setInterval(() => {
    let fake = "";
    for (let i = 0; i < currentDefinition.length; i++) {
      if (currentDefinition[i] === " ") {
        fake += " ";
      } else {
        fake += alphabet[Math.floor(Math.random() * alphabet.length)];
      }
    }
    definitionEl.textContent = fake;
  }, 40);
}

function stopDefinitionChaos() {
  if (definitionChaosInterval) {
    clearInterval(definitionChaosInterval);
    definitionChaosInterval = null;
  }
  definitionEl.textContent = currentDefinition;
}

// initialize on DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else init();
