<template>
  <div class="wordle-container">
    <!-- Word selection screen -->
    <div v-if="!targetWord" class="word-selection">
      <h2>Generate Your Wordle Link</h2>
      <input
        v-model="customWordInput"
        type="password"
        maxlength="5"
        placeholder="Enter a 5-letter word"
        @keyup.enter="generateLink"
      />
      <button @click="generateLink" :disabled="!isValidCustomWord">Create Game Link</button>
      <p v-if="customWordInput && customWordInput.length !== 5" class="error">
        Word must be exactly 5 letters.
      </p>
    </div>

    <!-- Display generated link and start game when accessing link -->
    <div v-else-if="targetWord && !playing" class="link-display">
      <h2>Share This Link</h2>
      <input class="link-input" :value="shareableLink" readonly @focus="selectLink" />
      <p>Anyone with this link can play your custom Wordle.</p>
    </div>


    <!-- Game board screen -->
    <div v-if="gameStarted && playing" class="game-board">
      <h2>Wordle Game</h2>
      <div class="grid">
        <div
          v-for="(row, rowIndex) in maxGuesses"
          :key="rowIndex"
          class="grid-row"
        >
          <div
            v-for="(col, colIndex) in wordLength"
            :key="colIndex"
            class="grid-cell"
            :class="feedbacks[rowIndex] ? feedbacks[rowIndex][colIndex] : ''"
          >
            {{ guesses[rowIndex] ? guesses[rowIndex][colIndex] : '' }}
          </div>
        </div>
      </div>
      <div v-if="!gameOver" class="guess-input">
        <input
          v-model="currentGuess"
          type="text"
          maxlength="5"
          placeholder="Enter guess"
          @keyup.enter="submitGuess"
        />
        <button @click="submitGuess" :disabled="!isValidGuess">Guess</button>
        <p v-if="currentGuess && currentGuess.length !== 5" class="error">
          Guess must be exactly 5 letters.
        </p>
      </div>
      <div v-if="gameOver" class="game-result">
        <p v-if="win">Congratulations! You guessed the word correctly.</p>
        <p v-else>Game Over.</p>
        <button @click="resetCurrentGame">Play Again</button>
        <button @click="resetGame">Create New Game</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';

// Constants
const wordLength = 5
const maxGuesses = 6

// Reactive state
const customWordInput = ref('')      // Input for setting the secret word
const targetWord = ref('')           // The secret word to guess (from URL param)
const gameStarted = ref(false)       // True after generating or reading link
const playing = ref(false)           // True only when playing the game (not when just showing link)
const gameCreated = ref(false)       // True after generating link

const currentGuess = ref('')
const guesses = ref(Array(maxGuesses).fill(''))
const feedbacks = ref(Array(maxGuesses).fill(null))
const attemptIndex = ref(0)
const gameOver = ref(false)
const win = ref(false)

const shareableLink = ref('')

// Computed properties
const isValidCustomWord = computed(() => {
  return /^[A-Za-z]{5}$/.test(customWordInput.value)
})

const isValidGuess = computed(() => {
  return /^[A-Za-z]{5}$/.test(currentGuess.value) && attemptIndex.value < maxGuesses
})

// Lifecycle hook: onMounted
onMounted(() => {
  const params = new URLSearchParams(window.location.search)
  if (params.has('word')) {
    const encoded = params.get('word')
    try {
      const decoded = atob(encoded)
      if (/^[a-z]{5}$/.test(decoded)) {
        targetWord.value = decoded
        gameStarted.value = true
        playing.value = true
      }
    } catch (e) {
      // invalid base64 or word—ignore
    }
  }
})

// Methods

function generateLink() {
  if (!isValidCustomWord.value) return

  const word = customWordInput.value.trim().toLowerCase()
  const encoded = btoa(word)
  // Construct a shareable link keeping existing path
  const base = window.location.origin + window.location.pathname
  shareableLink.value = `${base}?word=${encoded}`

  targetWord.value = word
  gameCreated.value = true
  playing.value = false
}

function selectLink(event) {
  event.target.select()
}

function submitGuess() {
  if (!isValidGuess.value) return

  const guess = currentGuess.value.trim().toLowerCase()
  guesses.value[attemptIndex.value] = guess

  const feedback = getFeedback(guess)
  feedbacks.value[attemptIndex.value] = feedback

  if (guess === targetWord.value) {
    win.value = true
    gameOver.value = true
    return
  }

  attemptIndex.value++
  if (attemptIndex.value >= maxGuesses) {
    gameOver.value = true
  }

  currentGuess.value = ''
}

function getFeedback(guess) {
  const feedback = Array(wordLength).fill('absent')
  const targetArr = targetWord.value.split('')
  const guessArr = guess.split('')

  // First pass: correct positions
  for (let i = 0; i < wordLength; i++) {
    if (guessArr[i] === targetArr[i]) {
      feedback[i] = 'correct'
      targetArr[i] = null
      guessArr[i] = null
    }
  }

  // Second pass: present but wrong position
  for (let i = 0; i < wordLength; i++) {
    if (guessArr[i]) {
      const idx = targetArr.indexOf(guessArr[i])
      if (idx !== -1) {
        feedback[i] = 'present'
        targetArr[idx] = null
      }
    }
  }

  return feedback
}

function resetGame() {
  customWordInput.value = ''
  targetWord.value = ''
  gameStarted.value = false
  playing.value = false
  currentGuess.value = ''
  guesses.value = Array(maxGuesses).fill('')
  feedbacks.value = Array(maxGuesses).fill(null)
  attemptIndex.value = 0
  gameOver.value = false
  win.value = false
  shareableLink.value = ''

  // Remove URL param
  window.history.replaceState({}, document.title, window.location.pathname)
}

function resetCurrentGame() {
  currentGuess.value = ''
  guesses.value = Array(maxGuesses).fill('')
  feedbacks.value = Array(maxGuesses).fill(null)
  attemptIndex.value = 0
  gameOver.value = false
  win.value = false
}
</script>


<style scoped>
.wordle-container {
  max-width: 400px;
  margin: 0 auto;
  text-align: center;
  font-family: Arial, sans-serif;
}
.word-selection input {
  padding: 8px;
  font-size: 1rem;
  width: 250px;
  text-transform: uppercase;
  letter-spacing: 2px;
  text-align: center;
  margin-bottom: 10px;
}
.word-selection button {
  padding: 8px 16px;
  font-size: 1rem;
  cursor: pointer;
}
.error {
  color: red;
  font-size: 0.9rem;
  margin-top: 4px;
}
.link-display {
  margin-top: 20px;
}
.link-input {
  width: 100%;
  padding: 8px;
  font-size: 0.9rem;
  text-align: center;
}
.game-board .grid {
  display: grid;
  grid-template-rows: repeat(6, 50px);
  gap: 6px;
  margin-bottom: 20px;
}
.grid-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
}
.grid-cell {
  border: 2px solid #ddd;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: bold;
  font-size: 1.2rem;
  text-transform: uppercase;
  background-color: #fff;
}
.grid-cell.correct {
  background-color: #6aaa64;
  border-color: #6aaa64;
  color: #fff;
}
.grid-cell.present {
  background-color: #c9b458;
  border-color: #c9b458;
  color: #fff;
}
.grid-cell.absent {
  background-color: #787c7e;
  border-color: #787c7e;
  color: #fff;
}
.guess-input input {
  padding: 8px;
  font-size: 1rem;
  width: 200px;
  text-transform: uppercase;
  letter-spacing: 2px;
  text-align: center;
  margin-right: 8px;
}
.guess-input button {
  padding: 8px 16px;
  font-size: 1rem;
  cursor: pointer;
}
.game-result p {
  font-size: 1.2rem;
  margin-bottom: 10px;
}
.game-result button {
  padding: 8px 16px;
  font-size: 1rem;
  cursor: pointer;
}
</style>
