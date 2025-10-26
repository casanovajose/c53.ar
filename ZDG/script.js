const LETTER_COUNT = 7; // configurable number of placeholders
const DICT_PATH = "./dictionary.json";

let dictionary = [];
let currentWord = null;
let fixedIndex = null;
let animationInterval = null;
let mouseMoving = false;
let placeholdersEl;
let definitionEl;
let contextEl;
const alphabet = "abcdefghijklmnopqrstuvwxyz";
const alphabetUpper = alphabet.toUpperCase();
let currentOffset = 0;
let definitionChaosInterval = null;
let contextChaosInterval = null;
let currentDefinition = '';
let currentContext = '';
let bgMapEl = null;

async function init() {
  placeholdersEl = document.getElementById("placeholders");
  definitionEl = document.getElementById("definition");
  contextEl = document.getElementById("context");
  
  // Initialize background map
  bgMapEl = document.getElementById("background_map");
  if (bgMapEl && typeof AsciiMapGenerator !== 'undefined') {
    AsciiMapGenerator.enableAutoResize(bgMapEl, { color: '#530000' });
  }
  
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
    startContextChaos();      // animates context
    if (mouseTimer) clearTimeout(mouseTimer);
    mouseTimer = setTimeout(() => {
      mouseMoving = false;
      stopChaos();            // stop word animation
      stopDefinitionChaos();  // stop definition animation
      stopContextChaos();     // stop context animation
      onMouseStop();
    }, 200);
  });
}

function regenerateMap() {
  if (bgMapEl && typeof AsciiMapGenerator !== 'undefined') {
    AsciiMapGenerator.drawMap(bgMapEl, { color: '#320000' });
  }
}

function pickRandomWordAndRender() {
  const candidates = dictionary.filter(d => d.word && d.word.length > 0);
  if (candidates.length === 0) {
    currentWord = "WARWORD";
    currentOffset = 0;
    definitionEl.textContent = "";
    contextEl.textContent = "";
    renderWord(currentWord, currentOffset);
    return;
  }
  const choice = candidates[Math.floor(Math.random() * candidates.length)];
  currentWord = choice.word.toUpperCase();
  // Calculate a random offset so the word can appear anywhere in the placeholders
  currentOffset = Math.floor(Math.random() * (LETTER_COUNT - currentWord.length + 1));
  
  // Randomly select a definition (support both string and array)
  let selectedDefinition = '';
  if (Array.isArray(choice.definition)) {
    selectedDefinition = choice.definition[Math.floor(Math.random() * choice.definition.length)];
  } else {
    selectedDefinition = choice.definition || '';
  }
  
  // Randomly select a context if available
  let selectedContext = '';
  if (choice.context && Array.isArray(choice.context) && choice.context.length > 0) {
    selectedContext = choice.context[Math.floor(Math.random() * choice.context.length)];
  }
  
  setDefinitionAnimated(selectedDefinition);
  setContextAnimated(selectedContext);
  renderWord(currentWord, currentOffset);
  regenerateMap();
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
    // Show [LOADING] while chaos is happening
    setContextAnimated("[LOADING]", true);
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
  if (!contextChaosInterval) startContextChaos();
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
        // Randomly select definition and context
        let selectedDefinition = '';
        if (Array.isArray(d.definition)) {
          selectedDefinition = d.definition[Math.floor(Math.random() * d.definition.length)];
        } else {
          selectedDefinition = d.definition || '';
        }
        
        let selectedContext = '';
        if (d.context && Array.isArray(d.context) && d.context.length > 0) {
          selectedContext = d.context[Math.floor(Math.random() * d.context.length)];
        }
        
        candidates.push({ word, definition: selectedDefinition, context: selectedContext, offset });
      }
    }
  }
  if (candidates.length > 0) {
    const choice = candidates[Math.floor(Math.random() * candidates.length)];
    currentWord = choice.word;
    currentOffset = choice.offset;
    setDefinitionAnimated(choice.definition || "");
    setContextAnimated(choice.context || "");
    regenerateMap();
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

function setContextAnimated(text, isSpecial = false) {
  // Handle special cases
  if (!text || text === "...") {
    currentContext = "...";
    contextEl.classList.add("no-quotes");
  } else if (isSpecial) {
    currentContext = text;
    contextEl.classList.add("no-quotes");
  } else {
    currentContext = text;
    contextEl.classList.remove("no-quotes");
  }
  
  // If mouse is moving, start chaos
  if (mouseMoving) {
    startContextChaos();
  } else {
    stopContextChaos();
    contextEl.textContent = currentContext;
  }
}

function startContextChaos() {
  if (contextChaosInterval) return; // Already running
  contextChaosInterval = setInterval(() => {
    let fake = "";
    for (let i = 0; i < currentContext.length; i++) {
      if (currentContext[i] === " ") {
        fake += " ";
      } else {
        fake += alphabet[Math.floor(Math.random() * alphabet.length)];
      }
    }
    contextEl.textContent = fake;
  }, 40);
}

function stopContextChaos() {
  if (contextChaosInterval) {
    clearInterval(contextChaosInterval);
    contextChaosInterval = null;
  }
  contextEl.textContent = currentContext;
}

// initialize on DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else init();
