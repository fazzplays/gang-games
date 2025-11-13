<template>
  <v-btn @click="router.push({ name: 'GangGamesHome' })" class="home-button">Home</v-btn>
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
      <!-- <div>Today's word: {{ targetWord }}</div> -->
      <div style="margin-bottom: 10px">Today's date: {{ str }}</div>
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
        <v-btn @click="submitGuess" :disabled="!isValidGuess">Guess</v-btn>
        <p v-if="currentGuess && currentGuess.length !== 5" class="error">
          Guess must be exactly 5 letters.
        </p>
      </div>
      <div v-if="gameOver" class="game-result">
        <p v-if="win">Congratulations! You guessed the word correctly.</p>
        <p v-else>Game Over.</p>
        <v-btn style="margin-right: 10px; background-color: grey;" @click="resetCurrentGame" class="guess-input">Play Again</v-btn>
        <v-btn style="background-color: grey;"@click="resetGame">Create New Game</v-btn>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { dailyWords } from '../dailyWords.js'

const router = useRouter()

// 1) YOUR LIST OF 5-LETTER WORDS
//    (In a real app you’d probably import this from a separate file or fetch it.)
//    For brevity, here’s a tiny dummy list—replace with your full wordlist.


const wordLength  = 5
const maxGuesses  = 6

// 1. Create a new Date instance (defaults to “now”)
const now = new Date();
const str = new Intl.DateTimeFormat("en-AU", {
  timeZone: "Australia/Sydney",
  timeZoneName: "short"
}).format(now);

// 2) REACTIVE STATE
const customWordInput = ref('')
const targetWord      = ref('')
const gameStarted     = ref(false)
const playing         = ref(false)
const gameCreated     = ref(false)

const currentGuess  = ref('')
const guesses       = ref(Array(maxGuesses).fill(''))
const feedbacks     = ref(Array(maxGuesses).fill(null))
const attemptIndex  = ref(0)
const gameOver      = ref(false)
const win           = ref(false)
const shareableLink = ref('')

onMounted(() => {
  const route = useRoute()
  const encoded = route.query.word
  if (encoded) {
    try {
      const decoded = atob(encoded)
      if (/^[a-z]{5}$/.test(decoded)) {
        targetWord.value = decoded
        gameStarted.value = true
        playing.value = true
        return
      }
    } catch {}
  }
  targetWord.value = getDailyWord()
  gameStarted.value = true
  playing.value = true
})

// 3) COMPUTED VALIDATORS
const isValidCustomWord = computed(() => {
  return /^[A-Za-z]{5}$/.test(customWordInput.value)
})
const isValidGuess = computed(() => {
  return /^[A-Za-z]{5}$/.test(currentGuess.value) &&
         attemptIndex.value < maxGuesses
})

// 4) HELPER TO GET “WORD OF THE DAY”
function getDailyWord() {
  const msPerDay = 1000 * 60 * 60 * 24

  // 1. Grab “today” in local time
  const today = new Date()

  // 2. Construct a Date object at local midnight (year, month, day) → this is automatically in AEST/AEDT
  const localMidnight = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  )

  // 3. Compute “whole days since Unix epoch” based on that local‐midnight timestamp
  const daysSinceEpochLocal = Math.floor(localMidnight.getTime() / msPerDay)

  // 4. Map into [0 … dailyWords.length−1]
  const idx = daysSinceEpochLocal % dailyWords.length
  return dailyWords[idx]
}


// 5) ON MOUNT: EITHER USE ?word=… OR SET TODAY’S WORD
onMounted(() => {
  const params = new URLSearchParams(window.location.search)
  if (params.has('word')) {
    const encoded = params.get('word')
    try {
      const decoded = atob(encoded)
      // only accept strictly lowercase a–z, length 5
      if (/^[a-z]{5}$/.test(decoded)) {
        targetWord.value = decoded
        gameStarted.value = true
        playing.value = true
        return
      }
    } catch (e) {
      // invalid base64 → fall through to dailyWord logic
    }
  }

  // No valid URL param → automatically pick today’s word
  targetWord.value = getDailyWord()
  gameStarted.value = true
  playing.value = true
})

// 6) METHODS (unchanged aside from removing the old “mounted only sets if URL” logic)
function generateLink() {
  if (!isValidCustomWord.value) return
  const word = customWordInput.value.trim().toLowerCase()
  const encoded = btoa(word)
  shareableLink.value = window.location.origin + `/play?word=${encoded}`

  targetWord.value = word
  gameCreated.value = true
  playing.value = false
}

function selectLink(event) {
  event.target.select()
}

async function submitGuess() {
  if (!isValidGuess.value) return

  const guess = currentGuess.value.trim().toLowerCase()
  guesses.value[attemptIndex.value] = guess

  const feedback = getFeedback(guess)
  feedbacks.value[attemptIndex.value] = feedback

  // --- SEND TO DISCORD ---
  sendToDiscord({
    guess,
    attempt: attemptIndex.value + 1,
    feedback,
    won: guess === targetWord.value,
    gameOver: guess === targetWord.value || attemptIndex.value + 1 >= maxGuesses
  })
  // ------------------------

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


async function sendToDiscord(payload) {
  const webhookUrl = "https://discord.com/api/webhooks/1438409956897460297/ldzu8OiyNtPB4mZEj0eAuuPIwV7JkSaMKNKuhSuZKXbav0wCWBdrcGDKi_oL_D9H8ivD" // <- rotate this & replace

  // 1. Get real-world AEDT time from API
  let aedtIsoString

  try {
    const timeRes = await fetch("https://worldtimeapi.org/api/timezone/Australia/Melbourne")
    if (!timeRes.ok) {
      throw new Error(`Time API responded with status ${timeRes.status}`)
    }

    const timeData = await timeRes.json()
    // worldtimeapi returns something like: "2025-11-13T17:32:12.123456+11:00"
    aedtIsoString = timeData.datetime
  } catch (err) {
    console.error("Failed to fetch AEDT time, falling back to local time:", err)
    aedtIsoString = new Date().toISOString()
  }

  const body = {
    username: "Wordle Bot",
    embeds: [
      {
        title: payload.won ? "Player Won! 🎉" : "New Guess Submitted",
        color: payload.won ? 0x57F287 : 0x5865F2,
        fields: [
          { name: "Guess", value: `\`${payload.guess}\`` },
          { name: "Attempt", value: `${payload.attempt}` },
          { name: "Feedback", value: `\`${JSON.stringify(payload.feedback)}\`` },
          { name: "Game Over", value: payload.gameOver ? "Yes" : "No" },
          // Optional: show the AEDT time as a readable string field as well
          {
            name: "Time (AEDT)",
            value: new Date(aedtIsoString).toLocaleString("en-AU", {
              timeZone: "Australia/Melbourne",
              hour12: false
            })
          }
        ],
        // 2. Use the AEDT time as the embed timestamp
        timestamp: aedtIsoString
      }
    ]
  }

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    })
  } catch (err) {
    console.error("Failed to send Discord webhook:", err)
  }
}



function getFeedback(guess) {
  const feedback = Array(wordLength).fill('absent')
  const targetArr = targetWord.value.split('')
  const guessArr  = guess.split('')

  // 1st pass: correct
  for (let i = 0; i < wordLength; i++) {
    if (guessArr[i] === targetArr[i]) {
      feedback[i] = 'correct'
      targetArr[i] = null
      guessArr[i]  = null
    }
  }
  // 2nd pass: present
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
  targetWord.value      = ''
  gameStarted.value     = false
  playing.value         = false
  currentGuess.value    = ''
  guesses.value         = Array(maxGuesses).fill('')
  feedbacks.value       = Array(maxGuesses).fill(null)
  attemptIndex.value    = 0
  gameOver.value        = false
  win.value             = false
  shareableLink.value   = ''

  // Remove any ?word=… from URL
  window.history.replaceState({}, document.title, window.location.pathname)
}

function resetCurrentGame() {
  currentGuess.value = ''
  guesses.value      = Array(maxGuesses).fill('')
  feedbacks.value    = Array(maxGuesses).fill(null)
  attemptIndex.value = 0
  gameOver.value     = false
  win.value          = false
}
</script>



<style scoped>
.wordle-container {
  max-width: 400px;
  height: 600px;
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
  justify-content: center;
  grid-template-columns: repeat(5, 60px);
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
  background-color: black;
  opacity: 0.5;
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

.home-button {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 8px 16px;
  font-size: 1rem;
  cursor: pointer;
  background-color: grey;
}

</style>
