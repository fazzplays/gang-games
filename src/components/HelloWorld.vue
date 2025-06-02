<template>
  <div class="wordle-container">
    <!-- Word selection screen -->
    <div v-if="!gameStarted" class="word-selection">
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
    <div v-else class="link-display">
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
        <p v-else>Game Over. The word was: <strong>{{ targetWord }}</strong></p>
        <button @click="resetGame">Play Again</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'WordleGameWithLink',
  data() {
    return {
      customWordInput: '',    // Input for setting the secret word
      targetWord: '',         // The secret word to guess (from URL param)
      gameStarted: false,     // True after generating or reading link
      playing: false,         // True only when playing the game (not when just showing link)
      wordLength: 5,
      maxGuesses: 6,
      currentGuess: '',
      guesses: Array(6).fill(''),
      feedbacks: Array(6).fill(null),
      attemptIndex: 0,
      gameOver: false,
      win: false,
      shareableLink: '',      // Link with encoded word
    };
  },
  computed: {
    isValidCustomWord() {
      return /^[A-Za-z]{5}$/.test(this.customWordInput);
    },
    isValidGuess() {
      return /^[A-Za-z]{5}$/.test(this.currentGuess) && this.attemptIndex < this.maxGuesses;
    },
  },
  mounted() {
    // On load, check for "word" param in URL
    const params = new URLSearchParams(window.location.search);
    if (params.has('word')) {
      const encoded = params.get('word');
      try {
        const decoded = atob(encoded);
        if (/^[a-z]{5}$/.test(decoded)) {
          this.targetWord = decoded;
          this.gameStarted = true;
          this.playing = true;
        }
      } catch (e) {
        // Invalid base64 or word—ignore
      }
    }
  },
  methods: {
    generateLink() {
      if (!this.isValidCustomWord) return;
      const word = this.customWordInput.trim().toLowerCase();
      const encoded = btoa(word);
      // Construct a shareable link keeping existing path
      const base = window.location.origin + window.location.pathname;
      this.shareableLink = `${base}?word=${encoded}`;
      this.targetWord = word;
      this.gameStarted = true;
      this.playing = false;
    },
    selectLink(event) {
      event.target.select();
    },
    submitGuess() {
      if (!this.isValidGuess) return;
      const guess = this.currentGuess.trim().toLowerCase();
      this.guesses[this.attemptIndex] = guess;
      const feedback = this.getFeedback(guess);
      this.feedbacks[this.attemptIndex] = feedback;
      if (guess === this.targetWord) {
        this.win = true;
        this.gameOver = true;
        return;
      }
      this.attemptIndex++;
      if (this.attemptIndex >= this.maxGuesses) {
        this.gameOver = true;
      }
      this.currentGuess = '';
    },
    getFeedback(guess) {
      const feedback = Array(this.wordLength).fill('absent');
      const targetArr = this.targetWord.split('');
      const guessArr = guess.split('');
      for (let i = 0; i < this.wordLength; i++) {
        if (guessArr[i] === targetArr[i]) {
          feedback[i] = 'correct';
          targetArr[i] = null;
          guessArr[i] = null;
        }
      }
      for (let i = 0; i < this.wordLength; i++) {
        if (guessArr[i]) {
          const idx = targetArr.indexOf(guessArr[i]);
          if (idx !== -1) {
            feedback[i] = 'present';
            targetArr[idx] = null;
          }
        }
      }
      return feedback;
    },
    resetGame() {
      this.customWordInput = '';
      this.targetWord = '';
      this.gameStarted = false;
      this.playing = false;
      this.currentGuess = '';
      this.guesses = Array(this.maxGuesses).fill('');
      this.feedbacks = Array(this.maxGuesses).fill(null);
      this.attemptIndex = 0;
      this.gameOver = false;
      this.win = false;
      this.shareableLink = '';
      // Remove URL param
      window.history.replaceState({}, document.title, window.location.pathname);
    },
  },
};
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
  width: 200px;
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
