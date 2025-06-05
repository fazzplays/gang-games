<template>
    <v-container class="hub-games pa-4">
      <v-row dense class="justify-center">
        <v-col
          v-for="card in cards"
          :key="card.title"
          cols="12"
          sm="6"
          class="d-flex pa-2"
        >
          <v-card
            class="game-card flex-grow-1"
            elevation="4"
            @click="navigateTo(card.title)"
          >
            <v-img
              :src="card.src"
              height="150"
              class="game-img"
              cover
            >
              <v-card-title class="title-overlay">
                {{ card.title }}
              </v-card-title>
            </v-img>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </template>
  
  <script setup>
  import { useRouter } from 'vue-router'
  
  const router = useRouter()
  
  const cards = [
    {
      title: 'Wordle',
      routeName: 'WordleGame',
      src: 'https://cdn.fatduckgaming.com/83724ce1-d9fc-407d-9841-6f2191b0762b_1749121268524.png',
    },
    {
      title: 'Coming soon?',
      routeName: 'ComingSoon',
      src: 'https://cdn.fatduckgaming.com/b0043d2d-6817-438b-8913-d256fa3cfbef_1749121226468.png',
    },
  ]
  
  const navigateTo = (title) => {
    const card = cards.find(c => c.title === title)
    if (card) {
      router.push({ name: card.routeName })
    }
  }
  </script>
  
  <style scoped>
  .hub-games {
    max-width: 800px;
    margin-left: auto;
    margin-right: auto;
  }
  
  /* Each card container */
  .game-card {
    width: 100%;
    border-radius: 12px;
    overflow: hidden;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    cursor: pointer;
  }
  
  /* Slight lift and shadow on hover */
  .game-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
  }
  
  /* Darken the image slightly for text contrast */
  .game-img {
    filter: brightness(0.85);
  }
  
  /* Overlay a semi‐transparent backdrop behind the title */
  .title-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(0, 0, 0, 0.4);
    color: #fff !important;
    padding: 8px;
    font-size: 1.1rem;
    justify-content: center;
  }
  </style>
  