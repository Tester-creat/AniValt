const tracks = document.querySelectorAll('.row-track');

tracks.forEach(track => {
  for (let i = 0; i < 10; i++) {
    const card = document.createElement('div');
    card.className = 'card';
    track.appendChild(card);
  }
});
